import { getUserData } from './lib/firebaseAdmin.js';

// Transcripción de voz para el modo práctica solo: el navegador graba el turno
// del closer con el micrófono y manda el audio (base64) acá; lo pasamos a Groq
// Whisper (whisper-large-v3-turbo, rápido y barato) y devolvemos el texto, que
// alimenta al comprador IA. Node 18+ trae fetch/FormData/Blob globales.

const WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const WHISPER_MODEL = "whisper-large-v3-turbo";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "GROQ_API_KEY no configurada." }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { uid, audio, mimeType, language } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
  if (typeof audio !== 'string' || !audio) return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el audio." }) };

  try { await getUserData(uid); }
  catch { return { statusCode: 403, headers, body: JSON.stringify({ error: "Usuario no encontrado." }) }; }

  // El cliente puede mandar un data URL ("data:audio/webm;base64,....") o base64 pelado.
  const base64 = audio.includes(',') ? audio.split(',')[1] : audio;
  const buffer = Buffer.from(base64, 'base64');
  // Guarda simple contra payloads gigantes (límite de body de Netlify ~6MB).
  if (buffer.length > 5 * 1024 * 1024) {
    return { statusCode: 413, headers, body: JSON.stringify({ error: "Audio demasiado largo. Grabá turnos más cortos." }) };
  }

  const type = mimeType || 'audio/webm';
  const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : type.includes('mpeg') ? 'mp3' : 'webm';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const form = new FormData();
    form.append('model', WHISPER_MODEL);
    form.append('response_format', 'json');
    if (language) form.append('language', String(language).slice(0, 2));
    form.append('file', new Blob([buffer], { type }), `audio.${ext}`);

    const res = await fetch(WHISPER_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal
    });

    const data = await res.json();
    if (!res.ok) {
      const message = data?.error?.message || data?.message || "Error transcribiendo.";
      return { statusCode: res.status, headers, body: JSON.stringify({ error: message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ text: (data.text || '').trim() }) };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return { statusCode: isTimeout ? 504 : 502, headers, body: JSON.stringify({ error: isTimeout ? "timeout_upstream" : "Error al transcribir." }) };
  } finally {
    clearTimeout(timer);
  }
};

import { getUserData } from './lib/firebaseAdmin.js';

// Un turno del COMPRADOR IA (modo práctica solo). Recibe el system prompt del
// buyer (construido en el cliente con buyerPrompt.js) + el historial de la
// conversación, y devuelve la respuesta estructurada del lead. NO toca los
// contadores de sesión: el "consumo" de la práctica solo es la generación del
// escenario (que ya pasa por /api/generate) — el chat en sí es liviano y no
// debe agotar el límite de 1 sesión del plan free por cada mensaje.

const DEFAULT_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "AI_API_KEY no configurada." }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { uid, system, messages } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
  if (typeof system !== 'string' || !Array.isArray(messages)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "system y messages son requeridos." }) };
  }

  // Verificación liviana: el usuario debe existir. No exigimos plan pago acá
  // (el modo solo es el gancho de conversión), pero sí que esté autenticado y
  // registrado para evitar abuso anónimo del proxy.
  try {
    await getUserData(uid);
  } catch {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Usuario no encontrado." }) };
  }

  // Recortamos el historial: los últimos ~16 turnos alcanzan para coherencia y
  // mantienen los tokens bajos (límite 6000 TPM del free tier + 10s de Netlify).
  const trimmed = messages.slice(-16).filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'));

  const apiUrl = process.env.AI_API_URL || DEFAULT_API_URL;
  const model = process.env.AI_DEFAULT_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...trimmed],
        temperature: 0.85, // variación natural, sin desbordar el personaje
        max_tokens: 320,   // respuesta hablada corta + JSON de estado
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      const message = data?.error?.message || data?.message || "Error en la API de IA.";
      return { statusCode: upstream.status, headers, body: JSON.stringify({ error: message }) };
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Respuesta vacía de la IA." }) };
    }

    let turn;
    try {
      turn = JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
    } catch {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "JSON malformado de la IA." }) };
    }

    // Blindaje del shape antes de devolverlo al cliente.
    const clamp = (n, def) => {
      const v = Number(n);
      return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : def;
    };
    const st = turn.state || {};
    const outcome = ['ongoing', 'closed', 'lost'].includes(turn.outcome) ? turn.outcome : 'ongoing';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: typeof turn.reply === 'string' ? turn.reply : '...',
        state: { temperature: clamp(st.temperature, 35), trust: clamp(st.trust, 25), patience: clamp(st.patience, 70) },
        revealedHiddenObjection: !!turn.revealedHiddenObjection,
        thought: typeof turn.thought === 'string' ? turn.thought : '',
        outcome
      })
    };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return { statusCode: isTimeout ? 504 : 502, headers, body: JSON.stringify({ error: isTimeout ? "timeout_upstream" : "Error al contactar la IA." }) };
  } finally {
    clearTimeout(timer);
  }
};

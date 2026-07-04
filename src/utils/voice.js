import { auth } from './db';

// Utilidades de voz para el modo práctica solo (web).
//  - Grabación push-to-talk con MediaRecorder → base64.
//  - Transcripción vía /api/transcribe (Groq Whisper).
//  - TTS con SpeechSynthesis del navegador (GRATIS, sin API key ni costo por
//    minuto) modulado por la personalidad DISC del lead.

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function micSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== 'undefined' && 'MediaRecorder' in window;
}

// Graba desde el micrófono hasta que se llama stop(). Devuelve { stop } donde
// stop() resuelve con { base64, mimeType }.
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start();

  return {
    stop: () => new Promise((resolve, reject) => {
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const base64 = await blobToBase64(blob);
          resolve({ base64, mimeType: recorder.mimeType || 'audio/webm' });
        } catch (e) { reject(e); }
      };
      recorder.stop();
    })
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // data URL
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function transcribe(base64, mimeType, language = 'es') {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: auth.currentUser?.uid, audio: base64, mimeType, language: language.slice(0, 2) })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error transcribiendo');
  return data.text || '';
}

// Ajustes de voz por personalidad DISC → cada lead "suena" distinto.
function voiceProfile(personalityId) {
  switch (personalityId) {
    case 'directivo': return { rate: 1.12, pitch: 0.9 };  // rápido, grave, dominante
    case 'entusiasta': return { rate: 1.08, pitch: 1.15 }; // ágil, agudo, expresivo
    case 'empatico': return { rate: 0.92, pitch: 1.0 };    // pausado, cálido
    case 'analitico': return { rate: 0.98, pitch: 0.95 };  // medido, neutro
    default: return { rate: 1.0, pitch: 1.0 };
  }
}

let cachedVoices = null;
function pickVoice(langPrefix) {
  const synth = window.speechSynthesis;
  cachedVoices = cachedVoices || synth.getVoices();
  const match = cachedVoices.filter(v => v.lang?.toLowerCase().startsWith(langPrefix));
  return match[0] || null;
}

// Habla el texto con la voz del lead. Devuelve una promesa que resuelve al terminar.
export function speak(text, { personalityId, language = 'es' } = {}) {
  return new Promise((resolve) => {
    if (!speechSupported() || !text) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel(); // corta cualquier locución previa
    const u = new SpeechSynthesisUtterance(text);
    const prof = voiceProfile(personalityId);
    u.rate = prof.rate;
    u.pitch = prof.pitch;
    u.lang = language.startsWith('en') ? 'en-US' : 'es-ES';
    const v = pickVoice(language.startsWith('en') ? 'en' : 'es');
    if (v) u.voice = v;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

// Algunos navegadores cargan las voces async; precargar evita el primer turno mudo.
export function warmUpVoices() {
  if (!speechSupported()) return;
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => { cachedVoices = window.speechSynthesis.getVoices(); };
}

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
const PERSONALITY_ORDER = ['directivo', 'entusiasta', 'empatico', 'analitico'];
function voiceProfile(personalityId) {
  switch (personalityId) {
    case 'directivo': return { rate: 1.12, pitch: 0.9 };  // rápido, grave, dominante
    case 'entusiasta': return { rate: 1.08, pitch: 1.15 }; // ágil, agudo, expresivo
    case 'empatico': return { rate: 0.92, pitch: 1.0 };    // pausado, cálido
    case 'analitico': return { rate: 0.98, pitch: 0.95 };  // medido, neutro
    default: return { rate: 1.0, pitch: 1.0 };
  }
}

// Hash estable de un string → entero pequeño. Sirve para que cada lead (por su
// nombre) tenga una voz/tono propios de forma determinista.
function hashString(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

let cachedVoices = null;
// Elige una voz REAL del sistema. Con varias voces del idioma disponibles, cada
// personalidad + lead cae en una distinta → variedad de timbres sin APIs.
function pickVoice(langPrefix, personalityId, seed) {
  const synth = window.speechSynthesis;
  cachedVoices = (cachedVoices && cachedVoices.length) ? cachedVoices : synth.getVoices();
  const match = cachedVoices.filter(v => v.lang?.toLowerCase().startsWith(langPrefix));
  if (!match.length) return null;
  const pIdx = Math.max(0, PERSONALITY_ORDER.indexOf(personalityId));
  const idx = (pIdx + hashString(seed)) % match.length;
  return match[idx];
}

// Habla el texto con la voz del lead. `seed` (ej. el nombre del lead) hace que
// dos leads de la misma personalidad no suenen idénticos.
export function speak(text, { personalityId, language = 'es', seed = '' } = {}) {
  return new Promise((resolve) => {
    if (!speechSupported() || !text) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel(); // corta cualquier locución previa
    const u = new SpeechSynthesisUtterance(text);
    const prof = voiceProfile(personalityId);
    // Micro-variación de tono por lead (±0.12) para dar más variedad de voces.
    const jitter = ((hashString(seed) % 25) - 12) / 100;
    u.rate = prof.rate;
    u.pitch = Math.max(0.5, Math.min(1.6, prof.pitch + jitter));
    u.lang = language.startsWith('en') ? 'en-US' : 'es-ES';
    const v = pickVoice(language.startsWith('en') ? 'en' : 'es', personalityId, seed);
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

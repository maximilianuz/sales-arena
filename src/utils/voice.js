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

// Modificadores de prosodia por EMOCIÓN del turno (los emite la IA en `emotion`).
// Se aplican SOBRE el perfil de personalidad → un directivo molesto no suena
// igual que un empático molesto.
const EMOTION_PROSODY = {
  neutral:      { rate: 0,     pitch: 0,     volume: 1.0,  pauseMul: 1.0 },
  interesado:   { rate: 0.02,  pitch: 0.06,  volume: 1.0,  pauseMul: 0.9 },
  esceptico:    { rate: -0.06, pitch: -0.06, volume: 0.95, pauseMul: 1.25 }, // arrastra, deja silencios
  molesto:      { rate: 0.09,  pitch: -0.09, volume: 1.0,  pauseMul: 0.7 },  // seco, cortante
  entusiasmado: { rate: 0.12,  pitch: 0.14,  volume: 1.0,  pauseMul: 0.75 },
  dudoso:       { rate: -0.12, pitch: 0.03,  volume: 0.9,  pauseMul: 1.5 },  // lento, con aire
  apurado:      { rate: 0.2,   pitch: 0.02,  volume: 1.0,  pauseMul: 0.5 }
};

export const EMOTION_IDS = Object.keys(EMOTION_PROSODY);

// Hash estable de un string → entero pequeño. Sirve para que cada lead (por su
// nombre) tenga una voz/tono propios de forma determinista.
function hashString(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Puntaje de calidad de una voz del sistema. Las voces "neural/natural/online"
// (Edge, Chrome con Google, Siri mejoradas) suenan MUCHO más humanas que las
// locales tipo eSpeak; hay que preferirlas siempre que existan.
function voiceQuality(v) {
  const n = (v.name || '').toLowerCase();
  let score = 0;
  if (/natural|neural|online/.test(n)) score += 5;
  if (/google/.test(n)) score += 4;
  if (/premium|enhanced|siri|paulina|mónica|monica|jorge|diego|luciana/.test(n)) score += 3;
  if (v.localService === false) score += 2; // voces cloud > locales
  return score;
}

let cachedVoices = null;
// Elige una voz REAL del sistema: primero filtra por idioma, luego se queda con
// el grupo de MEJOR calidad disponible, y dentro de ese grupo la personalidad
// + el lead (seed) eligen determinísticamente → timbres variados pero humanos.
function pickVoice(langPrefix, personalityId, seed) {
  const synth = window.speechSynthesis;
  cachedVoices = (cachedVoices && cachedVoices.length) ? cachedVoices : synth.getVoices();
  const match = cachedVoices.filter(v => v.lang?.toLowerCase().startsWith(langPrefix));
  if (!match.length) return null;
  const best = Math.max(...match.map(voiceQuality));
  // Grupo de élite: las de mayor puntaje (tolerancia 1 para no quedarse con una sola).
  const pool = match.filter(v => voiceQuality(v) >= Math.max(0, best - 1));
  const pIdx = Math.max(0, PERSONALITY_ORDER.indexOf(personalityId));
  const idx = (pIdx + hashString(seed)) % pool.length;
  return pool[idx];
}

// Limpia el texto para locución: sin emojis, sin markdown, sin acotaciones
// entre asteriscos — cosas que el TTS leería literalmente y matan la ilusión.
function naturalizeForSpeech(text) {
  return (text || '')
    .replace(/\*[^*]*\*/g, '')                          // *suspira* → fuera (ya lo actúa la prosodia)
    .replace(/[*_#>`~]/g, '')                            // markdown suelto
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '') // emojis
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Divide en oraciones respetando "..." (pausa dramática, no tres puntos finales).
function splitSentences(text) {
  const parts = text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}

// Pausa entre oraciones según cómo termina la anterior (ms).
function pauseAfter(sentence, mul) {
  if (/\.\.\.$|…$/.test(sentence)) return 420 * mul;  // duda / pensamiento
  if (/\?$/.test(sentence)) return 300 * mul;         // espera implícita
  if (/!$/.test(sentence)) return 220 * mul;
  return 180 * mul;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let speakSession = 0; // token para cancelar locuciones multi-oración en curso

// Habla el texto con la voz del lead, oración por oración y con la prosodia de
// la emoción del turno. `seed` (ej. el nombre del lead) diferencia timbres.
export async function speak(text, { personalityId, language = 'es', seed = '', emotion = 'neutral' } = {}) {
  if (!speechSupported() || !text) return;
  const session = ++speakSession;
  const synth = window.speechSynthesis;
  synth.cancel(); // corta cualquier locución previa

  const prof = voiceProfile(personalityId);
  const emo = EMOTION_PROSODY[emotion] || EMOTION_PROSODY.neutral;
  const jitterBase = ((hashString(seed) % 25) - 12) / 100; // sello vocal del lead (±0.12)
  const lang = language.startsWith('en') ? 'en-US' : 'es-ES';
  const voice = pickVoice(language.startsWith('en') ? 'en' : 'es', personalityId, seed);

  const sentences = splitSentences(naturalizeForSpeech(text));
  for (let i = 0; i < sentences.length; i++) {
    if (session !== speakSession) return; // llegó otra locución o un stop
    const s = sentences[i];
    // Micro-variación por oración (±3%) → rompe la monotonía robótica.
    const drift = ((hashString(seed + i) % 7) - 3) / 100;
    await new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(s);
      u.rate = Math.max(0.6, Math.min(1.8, prof.rate + emo.rate + drift));
      u.pitch = Math.max(0.5, Math.min(1.6, prof.pitch + emo.pitch + jitterBase + drift));
      u.volume = emo.volume;
      u.lang = lang;
      if (voice) u.voice = voice;
      u.onend = resolve;
      u.onerror = resolve;
      synth.speak(u);
    });
    if (i < sentences.length - 1) await sleep(pauseAfter(s, emo.pauseMul));
  }
}

export function stopSpeaking() {
  speakSession++; // invalida cualquier bucle de oraciones en curso
  if (speechSupported()) window.speechSynthesis.cancel();
}

// Algunos navegadores cargan las voces async; precargar evita el primer turno mudo.
export function warmUpVoices() {
  if (!speechSupported()) return;
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => { cachedVoices = window.speechSynthesis.getVoices(); };
}

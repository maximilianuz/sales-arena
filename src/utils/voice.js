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
const VOICE_NAME_FEMALE = /female|mujer|monica|paulina|helena|francisca|isabela|camila|lupe|penelope|sabina|elvira|conchita|lucia|mia|zira|sofia|laura|elena/i;
const VOICE_NAME_MALE = /(^|\b)male\b|hombre|jorge|diego|carlos|juan|enrique|miguel|raul|pablo|andres|david|alvaro|arnau/i;

function pickVoice(langPrefix, personalityId, seed, gender = 'male') {
  const synth = window.speechSynthesis;
  cachedVoices = (cachedVoices && cachedVoices.length) ? cachedVoices : synth.getVoices();
  const match = cachedVoices.filter(v => v.lang?.toLowerCase().startsWith(langPrefix));
  if (!match.length) return null;
  // Filtro de género: si hay voces identificables del género buscado, usarlas.
  const wanted = gender === 'female' ? VOICE_NAME_FEMALE : VOICE_NAME_MALE;
  const opposite = gender === 'female' ? VOICE_NAME_MALE : VOICE_NAME_FEMALE;
  const genderMatch = match.filter(v => wanted.test(v.name || ''));
  const nonOpposite = match.filter(v => !opposite.test(v.name || ''));
  const base = genderMatch.length ? genderMatch : (nonOpposite.length ? nonOpposite : match);
  const best = Math.max(...base.map(voiceQuality));
  // Grupo de élite: las de mayor puntaje (tolerancia 1 para no quedarse con una sola).
  const pool = base.filter(v => voiceQuality(v) >= Math.max(0, best - 1));
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
let speakSession = 0; // token para cancelar locuciones en curso (Fish o synth)


// Algunos navegadores cargan las voces async; precargar evita el primer turno mudo.
export function warmUpVoices() {
  if (!speechSupported()) return;
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => { cachedVoices = window.speechSynthesis.getVoices(); };
}

// ─── Fish Audio TTS (motor principal) ────────────────────────────────────────
// Llama al proxy serverless /api/tts, recibe MP3 base64, lo decodifica y
// lo reproduce como AudioBuffer. Si falla (red, timeout, créditos), cae
// automáticamente a SpeechSynthesis del navegador — el roleplay nunca se rompe.

// Nivel de amplitud (0..1) de la voz que se está reproduciendo AHORA. Lo alimenta
// un AnalyserNode durante la reproducción de Fish Audio; el avatar lo lee por
// frame para mover los labios sincronizados con lo que realmente suena. Con el
// fallback de SpeechSynthesis queda en 0 (el avatar hace un "flap" por tiempo).
let speechLevel = 0;
export function getSpeechLevel() { return speechLevel; }

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Algunos navegadores suspenden el contexto hasta interacción del usuario.
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// DEBE llamarse dentro de un gesto del usuario (click/touch): los navegadores
// móviles bloquean AudioContext y speechSynthesis iniciados fuera de un gesto.
// Sin esto, en el teléfono el lead queda MUDO aunque todo lo demás funcione.
export function unlockAudio() {
  try { getAudioCtx(); } catch { /* sin WebAudio */ }
  try {
    if (speechSupported()) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u); // desbloquea synth en iOS/Android
    }
  } catch { /* no bloquea */ }
}

async function speakFishAudio(text, { uid, personalityId, language = 'es', emotion = 'neutral', gender = 'male', seed = '', onStart } = {}) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `seed` fija el timbre por lead: sin esto Fish regenera una voz distinta en
    // cada turno. Es el nombre del personaje → misma fuente que género y avatar.
    body: JSON.stringify({ uid, text, personalityId, language, emotion, gender, seed })
  });
  const data = await res.json();

  // El servidor devuelve { fallback: true } cuando Fish falla → caemos a synth
  if (!res.ok || data.fallback || !data.audio) throw new Error('fish_unavailable');

  // Decodificar base64 → ArrayBuffer → AudioBuffer → reproducir
  const binary = atob(data.audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const ctx = getAudioCtx();
  const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
  return new Promise((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    // Analizador en la cadena (source → analyser → destino): mide la envolvente
    // de la voz en tiempo real para mover los labios del avatar al ritmo real.
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      speechLevel = Math.min(1, Math.sqrt(sum / data.length) * 3); // RMS amplificado
      raf = requestAnimationFrame(tick);
    };
    const finish = () => { if (raf) cancelAnimationFrame(raf); speechLevel = 0; resolve(); };
    source.onended = finish;
    onStart?.(); // el audio arranca AHORA: la UI recién acá revela el texto
    source.start(0);
    tick();
    // Guardamos referencia para poder cortar con stopSpeaking()
    window._fishAudioSource = source;
  });
}

// Habla el texto: intenta Fish Audio primero, cae a SpeechSynthesis si falla.
// `uid` es necesario para autenticar el llamado al proxy.
export async function speak(text, { uid, personalityId, language = 'es', seed = '', emotion = 'neutral', gender = 'male', onStart } = {}) {
  if (!text) return;
  const session = ++speakSession;

  // `onStart` se dispara UNA vez, cuando la voz realmente empieza a sonar (no
  // durante el fetch del TTS). La UI lo usa para revelar el texto en sincronía.
  let started = false;
  const fireStart = () => { if (!started) { started = true; try { onStart?.(); } catch { /* callback de UI */ } } };

  // ── Intento 1: Fish Audio (voz neural con emoción) ──────────────────────────
  if (uid) {
    try {
      await speakFishAudio(text, { uid, personalityId, language, emotion, gender, seed, onStart: fireStart });
      return; // ✓ Fish Audio funcionó
    } catch (e) {
      if (session !== speakSession) return; // llegó otro speak() mientras esperaba
      console.info('[voice] Fish Audio no disponible, usando SpeechSynthesis:', e.message);
    }
  }

  // ── Fallback: SpeechSynthesis con prosodia emocional ───────────────────────
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();

  const prof = voiceProfile(personalityId);
  const emo = EMOTION_PROSODY[emotion] || EMOTION_PROSODY.neutral;
  const jitterBase = ((hashString(seed) % 25) - 12) / 100;
  const lang = language.startsWith('en') ? 'en-US' : 'es-ES';
  const voice = pickVoice(language.startsWith('en') ? 'en' : 'es', personalityId, seed, gender);

  const sentences = splitSentences(naturalizeForSpeech(text));
  fireStart(); // el synth arranca ya (sin fetch): revelar texto ahora
  for (let i = 0; i < sentences.length; i++) {
    if (session !== speakSession) return;
    const s = sentences[i];
    const drift = ((hashString(seed + i) % 7) - 3) / 100;
    await new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(s);
      u.rate   = Math.max(0.6, Math.min(1.8, prof.rate + emo.rate + drift));
      u.pitch  = Math.max(0.5, Math.min(1.6, prof.pitch + emo.pitch + jitterBase + drift));
      u.volume = emo.volume;
      u.lang   = lang;
      if (voice) u.voice = voice;
      u.onend  = resolve;
      u.onerror = resolve;
      synth.speak(u);
    });
    if (i < sentences.length - 1) await sleep(pauseAfter(s, emo.pauseMul));
  }
}

export function stopSpeaking() {
  speakSession++;
  speechLevel = 0; // labios en reposo
  // Corta Fish Audio si está reproduciendo
  if (window._fishAudioSource) {
    try { window._fishAudioSource.stop(); } catch { /* ya detenido */ }
    window._fishAudioSource = null;
  }
  if (speechSupported()) window.speechSynthesis.cancel();
}

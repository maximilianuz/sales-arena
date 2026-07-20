import { getUserData } from './lib/firebaseAdmin.js';

// Text-to-Speech via Fish Audio S2.1 Pro — proxy serverless.
// Recibe texto + parámetros de voz y devuelve audio MP3 en base64.
// La API key (FISH_AUDIO_API_KEY) vive solo en el entorno de Netlify.

const FISH_TTS_URL = 'https://api.fish.audio/v1/tts';

// Fish Audio S2.1 Pro entiende tags libres entre corchetes en el texto.
// Podés poner cualquier descripción y el modelo la interpreta acústicamente.
// Los mapeamos a las 7 emociones que emite la IA del lead.
const EMOTION_TAGS = {
  neutral:      '',
  interesado:   '[interested]',
  esceptico:    '[skeptical]',
  molesto:      '[annoyed]',
  entusiasmado: '[excited]',
  dudoso:       '[hesitant]',
  apurado:      '[rushed]'
};

// IDs de voice models públicos de Fish Audio para cada perfil DISC.
// Cómo cargarlos (dos vías, se pueden combinar):
//
//   A) Variables de entorno en Netlify (RECOMENDADO — sin tocar código ni
//      redeploy). Formato: FISH_VOICE_<IDIOMA>_<GENERO>[_<PERSONALIDAD>]
//        FISH_VOICE_ES_MALE           → voz por defecto de todos los hombres ES
//        FISH_VOICE_ES_FEMALE         → voz por defecto de todas las mujeres ES
//        FISH_VOICE_ES_MALE_DIRECTIVO → voz específica del directivo hombre ES
//        FISH_VOICE_EN_FEMALE_EMPATICO … etc.
//      Con SOLO un default por género (male/female) por idioma ya alcanza para
//      que la voz sea consistente Y del género correcto. Las de personalidad
//      son un refinamiento opcional.
//
//   B) La tabla de acá abajo (requiere commit + deploy). `_default` es la voz
//      del género cuando no hay una específica de personalidad.
//
// Para descubrir IDs: FISH_AUDIO_API_KEY=... node scripts/find-fish-voices.js
//
// null = Fish usa el descriptor + seed (voz estable por lead, pero timbre no
// garantizado por género). Con un voice model asignado, el timbre y el género
// quedan FIJOS y garantizados.
const VOICE_MODELS = {
  es: {
    male: {
      _default:   'a3e44b1f7a274991977b4e7eb3ca46bc', // firme, acento latam
      directivo:  'a3e44b1f7a274991977b4e7eb3ca46bc',
      entusiasta: null, empatico: null, analitico: null
    },
    female: { _default: null, directivo: null, entusiasta: null, empatico: null, analitico: null }
  },
  en: {
    male:   { _default: null, directivo: null, entusiasta: null, empatico: null, analitico: null },
    female: { _default: null, directivo: null, entusiasta: null, empatico: null, analitico: null }
  }
};

// Resuelve el voice_id para un lead: primero variables de entorno (específica de
// personalidad → default de género), luego la tabla en código (idem). Devuelve
// null si no hay ninguna configurada (ahí manda el descriptor + seed).
function resolveVoiceId(langPrefix, gender, personalityId) {
  const L = langPrefix.toUpperCase();
  const G = gender.toUpperCase();
  const P = (personalityId || '').toUpperCase();
  const env = (name) => {
    const v = process.env[name];
    return v && v.trim() ? v.trim() : null;
  };
  const table = VOICE_MODELS[langPrefix]?.[gender] || {};
  return (P && env(`FISH_VOICE_${L}_${G}_${P}`))
    || env(`FISH_VOICE_${L}_${G}`)
    || (personalityId && table[personalityId])
    || table._default
    || null;
}

// Sin voice model asignado, un descriptor libre orienta el timbre de S2.1 Pro
// (género + acento). Se combina con el tag de emoción del turno.
function voiceDescriptor(lang, gender) {
  if (lang === 'es') return gender === 'female' ? '[voz femenina latinoamericana natural]' : '[voz masculina latinoamericana natural]';
  return gender === 'female' ? '[natural female voice]' : '[natural male voice]';
}

// Seed estable → Fish genera SIEMPRE el mismo timbre para un mismo personaje.
// Sin reference_id ni seed, S2.1 Pro re-muestrea una voz distinta en cada turno
// (de ahí que la voz del lead "cambiara" entre respuestas). Derivamos el seed del
// nombre del lead: parte de su identidad, igual que el género y el avatar.
function hashSeed(s) {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 12345; // entero no negativo (int32) — nunca 0
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'FISH_AUDIO_API_KEY no configurada.' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { uid, text, personalityId, language = 'es', emotion = 'neutral', gender = 'male', seed = '' } = body;

  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Se requiere autenticación.' }) };
  if (!text || typeof text !== 'string' || text.trim().length === 0)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta el texto.' }) };
  if (text.length > 500)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Texto demasiado largo (máx. 500 chars por turno).' }) };

  // Validar usuario activo
  try { await getUserData(uid); }
  catch { return { statusCode: 403, headers, body: JSON.stringify({ error: 'Usuario no encontrado.' }) }; }

  const langPrefix = (language || 'es').startsWith('en') ? 'en' : 'es';
  const emotionTag = EMOTION_TAGS[emotion] || '';

  // Obtener voice_id del modelo de personaje (env vars → tabla; por idioma +
  // género + personalidad, con fallback al default del género). Con un voice
  // model asignado, el timbre y el género quedan FIJOS entre turnos.
  const g = gender === 'female' ? 'female' : 'male';
  const voiceId = resolveVoiceId(langPrefix, g, personalityId);

  // Tags al inicio del texto (S2.1 Pro los interpreta): género/acento + emoción.
  // El descriptor de voz solo hace falta cuando NO hay voice model fijo.
  const prefix = [voiceId ? '' : voiceDescriptor(langPrefix, g), emotionTag].filter(Boolean).join(' ');
  const taggedText = prefix ? `${prefix} ${text.trim()}` : text.trim();

  // Payload para Fish Audio S2.1 Pro. `seed` fija el timbre por personaje: el
  // mismo lead (mismo nombre) suena igual en todos sus turnos; leads distintos
  // suenan distinto. Coherente con el género/avatar, que también salen del nombre.
  const fishPayload = {
    text: taggedText,
    chunk_length: 200,
    format: 'mp3',
    mp3_bitrate: 128,
    normalize: true,
    latency: 'normal',
    seed: hashSeed(seed || `${personalityId || ''}-${g}-${langPrefix}`)
  };

  // Si hay un voice model configurado, lo usamos como referencia
  if (voiceId) {
    fishPayload.reference_id = voiceId;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    // El header `model` es REQUERIDO por /v1/tts (422 sin él — causa raíz del
    // silencio en producción). s2.1-pro-free es gratis; si el plan no lo admite,
    // reintentamos una vez con s2-pro.
    const doFetch = (model, payload) => fetch(FISH_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'model': model
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    let res = await doFetch(process.env.FISH_MODEL || 's2.1-pro-free', fishPayload);
    if (!res.ok && [400, 402, 404, 422].includes(res.status)) {
      // Reintento con otro modelo y, por las dudas, SIN `seed`: si algún plan de
      // Fish rechazara el campo con un 422, igual devolvemos audio (voz estable
      // por reference_id cuando exista; el resto cae al fallback del navegador).
      const noSeed = { ...fishPayload };
      delete noSeed.seed;
      res = await doFetch('s2-pro', noSeed);
    }

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[tts] Fish Audio error:', res.status, errText);
      // En error, el cliente cae a SpeechSynthesis del navegador
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Fish Audio no disponible.', fallback: true }) };
    }

    // Recibir audio como buffer y convertir a base64
    const audioBuffer = await res.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64Audio,   // MP3 en base64
        mimeType: 'audio/mpeg'
      })
    };

  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    console.error('[tts] Error:', error.message);
    return {
      statusCode: isTimeout ? 504 : 502,
      headers,
      body: JSON.stringify({ error: isTimeout ? 'TTS timeout.' : 'Error TTS.', fallback: true })
    };
  }
};

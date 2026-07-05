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
// Los IDs se pueden actualizar/reemplazar desde fish.audio/voice-library
// o ejecutando: FISH_AUDIO_API_KEY=... node scripts/find-fish-voices.js
//
// null = Fish elige la voz default del idioma (igual funciona bien con los
// emotion tags; solo pierde la consistencia de timbre entre turnos).
const VOICE_MODELS = {
  es: {
    male: {
      directivo:  'a3e44b1f7a274991977b4e7eb3ca46bc', // firme, acento latam
      entusiasta: null, empatico: null, analitico: null
    },
    female: { directivo: null, entusiasta: null, empatico: null, analitico: null }
  },
  en: {
    male:   { directivo: null, entusiasta: null, empatico: null, analitico: null },
    female: { directivo: null, entusiasta: null, empatico: null, analitico: null }
  }
};

// Sin voice model asignado, un descriptor libre orienta el timbre de S2.1 Pro
// (género + acento). Se combina con el tag de emoción del turno.
function voiceDescriptor(lang, gender) {
  if (lang === 'es') return gender === 'female' ? '[voz femenina latinoamericana natural]' : '[voz masculina latinoamericana natural]';
  return gender === 'female' ? '[natural female voice]' : '[natural male voice]';
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

  const { uid, text, personalityId, language = 'es', emotion = 'neutral', gender = 'male' } = body;

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

  // Obtener voice_id del modelo de personaje (por idioma + género) si existe
  const g = gender === 'female' ? 'female' : 'male';
  const voiceId = VOICE_MODELS[langPrefix]?.[g]?.[personalityId] || null;

  // Tags al inicio del texto (S2.1 Pro los interpreta): género/acento + emoción.
  // El descriptor de voz solo hace falta cuando NO hay voice model fijo.
  const prefix = [voiceId ? '' : voiceDescriptor(langPrefix, g), emotionTag].filter(Boolean).join(' ');
  const taggedText = prefix ? `${prefix} ${text.trim()}` : text.trim();

  // Payload para Fish Audio S2.1 Pro
  const fishPayload = {
    text: taggedText,
    chunk_length: 200,
    format: 'mp3',
    mp3_bitrate: 128,
    normalize: true,
    latency: 'normal'
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
    const doFetch = (model) => fetch(FISH_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'model': model
      },
      body: JSON.stringify(fishPayload),
      signal: controller.signal
    });
    let res = await doFetch(process.env.FISH_MODEL || 's2.1-pro-free');
    if (!res.ok && [400, 402, 404, 422].includes(res.status)) {
      res = await doFetch('s2-pro');
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

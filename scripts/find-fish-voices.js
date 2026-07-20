#!/usr/bin/env node
/**
 * find-fish-voices.js
 *
 * Ayuda a elegir voice model IDs de Fish Audio para cada lead del roleplay,
 * cubriendo TODOS los slots: idioma (es/en) × género (male/female) × perfil
 * DISC (directivo / entusiasta / empatico / analitico).
 *
 * Para cada slot imprime:
 *   - candidatos (ID + nombre + link de preview)
 *   - el NOMBRE DE VARIABLE DE ENTORNO listo para pegar en Netlify
 *
 * USO:
 *   FISH_AUDIO_API_KEY=tu_key node scripts/find-fish-voices.js
 *   FISH_AUDIO_API_KEY=tu_key node scripts/find-fish-voices.js --only es_female
 *
 * CÓMO APLICAR (recomendado, sin redeploy):
 *   En Netlify → Site settings → Environment variables, creá:
 *     FISH_VOICE_ES_MALE            = <id>   (voz por defecto de hombres ES)
 *     FISH_VOICE_ES_FEMALE          = <id>   (voz por defecto de mujeres ES)
 *     FISH_VOICE_ES_MALE_DIRECTIVO  = <id>   (opcional, refinamiento por perfil)
 *     ...
 *   Con SOLO los dos defaults por género (male/female) por idioma ya alcanza
 *   para que la voz sea consistente y del género correcto en cada turno.
 *
 * Alternativa: pegar los IDs en netlify/functions/tts.js → VOICE_MODELS
 *   (requiere commit + deploy).
 */

const API_KEY = process.env.FISH_AUDIO_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta FISH_AUDIO_API_KEY');
  console.error('   Uso: FISH_AUDIO_API_KEY=tu_key node scripts/find-fish-voices.js');
  process.exit(1);
}

// Filtro opcional: --only es_female  (o es_male, en_female, en_male)
const onlyArg = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1]
  || (process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '')
  || '';

// Consultas por slot. La API no filtra por género, así que lo sesgamos con
// palabras del query (hombre/mujer, male/female) + rasgos del perfil DISC.
const GENDER_WORD = { es: { male: 'hombre', female: 'mujer' }, en: { male: 'male', female: 'female' } };
const PROFILE_WORDS = {
  es: {
    directivo:  'ejecutivo firme autoritario negocios',
    entusiasta: 'enérgico amigable expresivo',
    empatico:   'cálido cercano pausado',
    analitico:  'neutro preciso profesional',
  },
  en: {
    directivo:  'executive firm authoritative business',
    entusiasta: 'energetic friendly upbeat',
    empatico:   'warm caring calm',
    analitico:  'neutral precise professional',
  },
};

const LANGS = ['es', 'en'];
const GENDERS = ['male', 'female'];
const PROFILES = ['directivo', 'entusiasta', 'empatico', 'analitico'];

async function searchVoices(query, language, pageSize = 3) {
  const params = new URLSearchParams({ search: query, language, page_size: pageSize, sort_by: 'score' });
  const res = await fetch(`https://api.fish.audio/model?${params}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

async function main() {
  console.log('\n🎙️  Fish Audio — voces para Sales Arena\n');
  console.log('Copiá el ID elegido a la variable de entorno indicada en cada bloque.');
  console.log('Con solo el default por género (male/female) por idioma ya alcanza.\n');

  for (const lang of LANGS) {
    for (const gender of GENDERS) {
      const slotKey = `${lang}_${gender}`;
      if (onlyArg && onlyArg !== slotKey) continue;

      console.log(`\n══════════ ${lang.toUpperCase()} · ${gender === 'male' ? 'HOMBRES' : 'MUJERES'} ══════════`);
      console.log(`  Default del género  →  FISH_VOICE_${lang.toUpperCase()}_${gender.toUpperCase()}`);

      for (const profile of PROFILES) {
        const query = `${GENDER_WORD[lang][gender]} ${PROFILE_WORDS[lang][profile]}`;
        const envVar = `FISH_VOICE_${lang.toUpperCase()}_${gender.toUpperCase()}_${profile.toUpperCase()}`;
        console.log(`\n  ── ${profile}  →  ${envVar} (opcional)`);
        try {
          const voices = await searchVoices(query, lang, 3);
          if (!voices.length) { console.log('     (sin resultados — probá otro query o usá el default del género)'); continue; }
          for (const v of voices) {
            console.log(`     ID: ${v._id}   ${v.title || ''}`);
            console.log(`         preview: https://fish.audio/m/${v._id}/`);
          }
        } catch (e) {
          console.log(`     Error: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }

  console.log('\n\n✅ Listo. Pegá los IDs en Netlify (Environment variables) y guardá.');
  console.log('   No hace falta redeploy: la función /api/tts los toma en la próxima llamada.\n');
}

main().catch(err => { console.error(err); process.exit(1); });

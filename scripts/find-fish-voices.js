#!/usr/bin/env node
/**
 * find-fish-voices.js
 *
 * Ayuda a encontrar voice model IDs de Fish Audio para los perfiles DISC.
 * Busca voces en español/inglés con filtros de idioma y muestra los IDs.
 *
 * USO:
 *   FISH_AUDIO_API_KEY=tu_key node find-fish-voices.js
 *
 * Luego copias los IDs que elijas al archivo netlify/functions/tts.js
 * en el objeto VOICE_MODELS.
 */

const API_KEY = process.env.FISH_AUDIO_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta FISH_AUDIO_API_KEY');
  process.exit(1);
}

async function searchVoices(query, language = 'es', pageSize = 5) {
  const params = new URLSearchParams({
    search: query,
    language,
    page_size: pageSize,
    sort_by: 'score'
  });
  const res = await fetch(`https://api.fish.audio/model?${params}`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  const data = await res.json();
  return data.items || [];
}

async function main() {
  console.log('\n🎙️  Buscando voces para Sales Arena...\n');

  const searches = [
    { label: 'Directivo AR/MX (masculino, autoritario)',  query: 'hombre argentino negocios',        lang: 'es' },
    { label: 'Entusiasta (enérgico, amigable)',           query: 'spanish enthusiastic energetic',   lang: 'es' },
    { label: 'Empático (cálido, pausado)',                query: 'spanish warm calm professional',   lang: 'es' },
    { label: 'Analítico (neutro, preciso)',               query: 'spanish neutral professional male', lang: 'es' },
    { label: 'EN - Driver (authoritative male)',          query: 'english authoritative confident',  lang: 'en' },
    { label: 'EN - Enthusiast (energetic)',               query: 'english energetic upbeat',         lang: 'en' },
  ];

  for (const s of searches) {
    console.log(`\n── ${s.label} ──`);
    try {
      const voices = await searchVoices(s.query, s.lang, 4);
      if (!voices.length) { console.log('  Sin resultados'); continue; }
      for (const v of voices) {
        console.log(`  ID: ${v._id}`);
        console.log(`  Nombre: ${v.title}`);
        console.log(`  Preview: https://fish.audio/m/${v._id}/`);
        console.log('');
      }
    } catch (e) {
      console.error('  Error:', e.message);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n✅ Copia los IDs que elijas a netlify/functions/tts.js → VOICE_MODELS');
  console.log('   Luego hacés push y las voces quedan asignadas a cada perfil DISC.\n');
}

main().catch(console.error);

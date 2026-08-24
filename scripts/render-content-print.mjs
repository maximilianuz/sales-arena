// Genera las versiones imprimibles (content/print/*.md) a partir de los seeds
// de content/seed/. Los JSON son la única fuente de verdad: si editás una carta
// o el guion, corré `node scripts/render-content-print.mjs` y se regeneran.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seed = (f) => JSON.parse(readFileSync(join(root, 'content', 'seed', f), 'utf8'));
const out = (f, s) => writeFileSync(join(root, 'content', 'print', f), s, 'utf8');

const principios = seed('principios.json').principios;
const byId = Object.fromEntries(principios.map((p) => [p.id, p]));
const decks = [
  { file: 'flashcards.objeciones.json', titulo: 'Mazo 1 — Objeciones' },
  { file: 'flashcards.preguntas-fase.json', titulo: 'Mazo 2 — Preguntas por fase' },
  { file: 'flashcards.principios.json', titulo: 'Mazo 3 — Principios (modo Feynman)' },
  { file: 'flashcards.perfiles.json', titulo: 'Mazo 4 — Detección de perfiles' },
];

let md = `# Mazo inicial — Closing High Ticket\n\n> Generado desde \`content/seed/\`. No editar a mano: editá el JSON y regenerá.\n> Uso en papel: leé el FRENTE, respondé **en voz alta**, recién después mirá el dorso.\n> En las cartas Feynman: escribí/decí tu explicación completa y compará contra los puntos clave — marcá cuáles te faltaron.\n\n`;

let total = 0;
for (const d of decks) {
  const data = seed(d.file);
  md += `\n---\n\n## ${d.titulo} (${data.cartas.length} cartas)\n\n`;
  for (const c of data.cartas) {
    total++;
    const p = byId[c.principioId];
    md += `### ${c.id} ${'★'.repeat(c.dificultad || 1)}\n\n`;
    if (c.fase) md += `*Fase: ${c.fase}*\n\n`;
    md += `**FRENTE:** ${c.frente}\n\n`;
    if (c.tipo === 'feynman') {
      md += `**EXPLICACIÓN DE REFERENCIA** (${p.nombre}):\n\n${p.explicacionReferencia}\n\n`;
      md += `**Puntos clave que tu explicación debe cubrir:**\n\n${p.puntosClave.map((k) => `- [ ] ${k}`).join('\n')}\n\n`;
    } else {
      md += `**DORSO:** ${c.dorso}\n\n`;
      md += `**POR QUÉ funciona:** ${c.porQue}\n\n`;
      if (p) md += `*Principio: ${p.nombre}* (${p.id})\n\n`;
    }
  }
}
md += `\n---\n\n*Total: ${total} cartas.*\n`;
out('mazo-inicial.md', md);
console.log(`mazo-inicial.md: ${total} cartas`);

const { oferta, guion } = seed('oferta.metodo-reinicio.json');
let g = `# Guion — ${oferta.nombre}\n\n> ${oferta.tagline}\n> Generado desde \`content/seed/oferta.metodo-reinicio.json\`. ${guion.notaGeneral}\n\n## La oferta en una página\n\n- **Avatar:** ${oferta.avatarCliente}\n- **Problema:** ${oferta.problema}\n- **Mecanismo (${oferta.mecanismo.nombre}):**\n${oferta.mecanismo.fases.map((f) => `  - ${f}`).join('\n')}\n- **Diferencial:** ${oferta.mecanismo.diferencial}\n- **Precio:** USD ${oferta.precio.contado} contado, o ${oferta.precio.cuotas.cantidad} cuotas de ${oferta.precio.cuotas.monto}. ${oferta.precio.politica}\n- **Garantía:** ${oferta.garantia}\n- **No se cierra si:** ${oferta.descalificadores.join(' · ')}\n\n### Prueba social\n\n${oferta.pruebaSocial.map((c) => `- **${c.nombre}:** ${c.caso}`).join('\n')}\n`;

for (const f of guion.fases) {
  g += `\n---\n\n## Fase ${f.orden}: ${f.nombre} (${f.duracionMin} min)\n\n**Objetivo:** ${f.objetivo}\n\n**Preguntas / movimientos:**\n\n${f.preguntas.map((q) => `- ${q}`).join('\n')}\n\n**Qué DAR acá:** ${f.queDar}\n\n**Qué RESERVAR:** ${f.queReservar}\n\n**Errores típicos:**\n\n${f.erroresTipicos.map((e) => `- ⚠ ${e}`).join('\n')}\n\n**Transición a la siguiente fase:** ${f.transicion}\n`;
}
out('guion-metodo-reinicio.md', g);
console.log(`guion-metodo-reinicio.md: ${guion.fases.length} fases`);

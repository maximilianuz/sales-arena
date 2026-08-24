// Importa el contenido inicial (content/seed/*.json) al subtree del usuario.
// Los JSON se bundlean con Vite (import estático) — no hay fetch en runtime.
// Es idempotente a nivel de contenido: re-importar pisa el CONTENIDO con la
// versión del seed pero NUNCA toca srs/ ni log/ (el progreso se preserva).
import principiosSeed from '../../../content/seed/principios.json';
import guionDeck from '../../../content/seed/flashcards.guion.json';
import objecionesDeck from '../../../content/seed/flashcards.objeciones.json';
import tiposObjecionDeck from '../../../content/seed/flashcards.tipos-objecion.json';
import fasesDeck from '../../../content/seed/flashcards.preguntas-fase.json';
import principiosDeck from '../../../content/seed/flashcards.principios.json';
import perfilesDeck from '../../../content/seed/flashcards.perfiles.json';
import guionPropio from '../../../content/seed/oferta.guion-propio.json';
import ofertaSeed from '../../../content/seed/oferta.metodo-reinicio.json';
import perfilesProspecto from '../../../content/seed/perfiles-prospecto.json';
import { bulkWrite, getNode, setNode } from './db';
import { UNIDADES } from './plan/curriculum';
import { otorgarUnidadBase } from './plan/consolidacion';

// El orden importa: es el orden en que se muestran en Practicar, y también el
// orden en que conviene aprenderlos. Guion primero porque es el esqueleto donde
// se cuelga todo lo demás; tipos-objecion antes que objeciones porque hay que
// saber clasificar antes de saber responder.
export const DECKS = [
  { id: 'guion', nombre: 'Guion y transiciones', color: '250,204,21' },
  { id: 'preguntas-por-fase', nombre: 'Preguntas por fase', color: '34,211,238' },
  { id: 'tipos-objecion', nombre: 'Tipos de objeción', color: '244,114,182' },
  { id: 'objeciones', nombre: 'Objeciones', color: '255,159,10' },
  { id: 'deteccion-perfiles', nombre: 'Detección de perfiles', color: '139,92,246' },
  { id: 'principios', nombre: 'Principios (Feynman)', color: '48,209,88' },
];

export async function isSeeded() {
  return !!(await getNode('meta/seededAt'));
}

// Qué semana del currículum se otorga al importar. Es 1 porque esas 11 unidades
// no tienen prerrequisitos fuera de su propio grupo: darlas no saltea orden.
const SEMANA_BASE = 1;

export async function importSeed() {
  const entries = {};

  for (const p of principiosSeed.principios) {
    const { id, ...rest } = p;
    entries[`kb/principios/${id}`] = rest;
  }

  for (const deck of [guionDeck, fasesDeck, tiposObjecionDeck, objecionesDeck, perfilesDeck, principiosDeck]) {
    for (const carta of deck.cartas) {
      const { id, ...rest } = carta;
      entries[`cards/${id}`] = { mazo: deck.mazo, origen: 'seed', ...rest };
    }
  }

  // Se importan las dos ofertas: primero el guion propio (el que se entrena) y
  // después el de ejemplo, que sirve para que el simulador tenga contra qué
  // actuar mientras los campos del propio estén sin completar. Cualquiera de
  // las dos se puede borrar desde la Base de conocimiento.
  for (const seed of [guionPropio, ofertaSeed]) {
    const { id, ...oferta } = seed.oferta;
    entries[`kb/ofertas/${id}`] = oferta;
    for (const fase of seed.guion.fases) {
      const { id: faseId, ...rest } = fase;
      entries[`kb/fases/${id}/${faseId}`] = rest;
    }
  }

  for (const perfil of perfilesProspecto.perfiles) {
    const { id, ...rest } = perfil;
    entries[`kb/perfiles/${id}`] = rest;
  }

  // Las unidades base quedan disponibles desde el arranque. Sin esto, con la
  // compuerta de consolidación encendida, el día 1 muestra los seis mazos en
  // pausa y no hay nada que practicar hasta cerrar el primer lote — dos o tres
  // días con la pantalla vacía. Ver `otorgarUnidadBase`.
  //
  // No se pisan las que ya tengan progreso: re-importar el seed no puede
  // borrar lo que la persona hizo.
  const previo = (await getNode('progresoUnidad')) || {};
  const ahora = Date.now();
  for (const u of UNIDADES.filter(x => x.semana === SEMANA_BASE)) {
    if (previo[u.id]?.introducidaAt) continue;
    entries[`progresoUnidad/${u.id}`] = otorgarUnidadBase(u.id, ahora);
  }

  await bulkWrite(entries);
  await setNode('meta/seededAt', Date.now());
  return Object.keys(entries).length;
}

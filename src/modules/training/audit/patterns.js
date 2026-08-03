// Detección de patrones de error → cartas automáticas.
//
// La idea: un error suelto es ruido, un error que aparece 3 veces es un agujero
// en tu método. Cuando un principio se viola UMBRAL veces, el sistema fabrica una
// flashcard con origen 'auto-patron' y la mete en el ciclo FSRS. Así lo que fallás
// en la simulación vuelve como repaso, sin que tengas que acordarte de anotarlo.
//
// Los errores se guardan en training/errores/{id} con { principioId, que,
// comoRehacerlo, gravedad, sesionId, ts }.

import { pushItem, setItem, getNode } from '../db';

export const UMBRAL_PATRON = 3;

// Agrupa errores por principio. Devuelve [{principioId, cantidad, ultimos[], gravedadMax}]
// ordenado por cantidad desc — es lo que muestra el panel "tus patrones".
export function agruparErrores(errores) {
  const porPrincipio = new Map();
  for (const e of errores) {
    if (!e.principioId) continue;
    const g = porPrincipio.get(e.principioId) || { principioId: e.principioId, cantidad: 0, ultimos: [], gravedadMax: 0 };
    g.cantidad++;
    g.gravedadMax = Math.max(g.gravedadMax, e.gravedad || 1);
    g.ultimos.push(e);
    porPrincipio.set(e.principioId, g);
  }
  return [...porPrincipio.values()]
    .map(g => ({ ...g, ultimos: g.ultimos.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 5) }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

// ID estable: un principio genera UNA sola carta automática, sin importar
// cuántas veces se repita después. Reintentar no duplica.
const autoCardId = (principioId) => `auto-${principioId}`;

// Registra los errores de una sesión y genera cartas para los patrones nuevos.
// Devuelve los principios que dispararon carta (para avisarle al usuario).
export async function registrarErroresYDetectarPatrones(erroresDeSesion, { sesionId, principiosMap }) {
  const conPrincipio = erroresDeSesion.filter(e => e.principioId && principiosMap[e.principioId]);
  for (const e of conPrincipio) {
    await pushItem('errores', {
      principioId: e.principioId,
      que: e.que || '',
      comoRehacerlo: e.comoRehacerlo || '',
      gravedad: e.gravedad || 1,
      sesionId,
      ts: Date.now(),
    });
  }

  const todos = Object.entries((await getNode('errores')) || {}).map(([id, v]) => ({ id, ...v }));
  const grupos = agruparErrores(todos).filter(g => g.cantidad >= UMBRAL_PATRON);

  const nuevas = [];
  for (const g of grupos) {
    const principio = principiosMap[g.principioId];
    if (!principio) continue;
    const id = autoCardId(g.principioId);
    if (await getNode(`cards/${id}`)) continue; // ya existe: no la pisamos

    const ejemplos = g.ultimos.slice(0, 3).map(e => `• ${e.que}`).join('\n');
    await setItem('cards', id, {
      mazo: 'principios',
      tipo: 'feynman',
      origen: 'auto-patron',
      principioId: g.principioId,
      frente: `Fallaste esto ${g.cantidad} veces en simulación. Explicá con tus palabras por qué "${principio.nombre}" importa, y qué vas a hacer distinto la próxima vez que aparezca.`,
      porQue: `Carta generada automáticamente: el sistema detectó ${g.cantidad} errores contra este principio.\n\nLo que hiciste:\n${ejemplos}`,
      dificultad: Math.min(3, g.gravedadMax),
      tags: ['auto-patron'],
    });
    nuevas.push({ principioId: g.principioId, nombre: principio.nombre, cantidad: g.cantidad, cardId: id });
  }
  return nuevas;
}

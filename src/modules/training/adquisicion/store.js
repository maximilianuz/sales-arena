// Estado de la sesión de adquisición en curso.
//
// Existe porque el lote NO se termina en un día (ver el comentario largo en
// franjas.js): el recorrido de una sola unidad pide 68 minutos y la franja
// reparte entre 30 y 84. Entonces hace falta un punto de retome que sobreviva a
// cerrar la app, y que sepa distinguir "seguí donde quedaste" de "hoy ya
// gastaste tus minutos de material fresco".
//
// Dos nodos, a propósito separados:
//
// · `adquisicionEnCurso` — el lote abierto. Vive hasta que se cierra el último
//   paso. Es de un solo lote a la vez: no se abren dos frentes de material
//   fresco en paralelo, que es lo que la regla de carga definida evita.
//
// · `progresoUnidad/{id}` — el estado por unidad que ya consume
//   consolidacion.js. Se escribe paso a paso, no al final: si alguien hace la
//   descomposición hoy y el Feynman mañana, la descomposición no se pierde.

import { getNode, setNode, bulkWrite, todayKey } from '../db';
import { pasosDelLote, avanceDelLote } from '../plan/franjas';
import {
  marcarIntroducida, marcarDescomposicion, marcarFeynman, cerrarAdquisicion,
} from '../plan/consolidacion';
import { unidadPorId } from '../plan/curriculum';

// La secuencia del lote depende de qué unidades entraron: las `literal` saltean
// la descomposición. Se resuelve acá —que es la capa que sí conoce el
// currículum— y no en franjas.js.
export const pasosDeCurso = (curso) =>
  pasosDelLote((curso?.unidades || []).map(id => unidadPorId(id) || { id, literal: false }));

export const NODO = 'adquisicionEnCurso';

export async function leerCurso(hoy = todayKey()) {
  return normalizarDia(await getNode(NODO), hoy);
}

// Los minutos son del día: al amanecer se resetean, pero los pasos cumplidos
// NO. Es toda la diferencia entre "se te acabó el tiempo de hoy" y "perdiste el
// avance". Se normaliza al leer en vez de con un job: mismo criterio que usa
// consolidacion.js para derivar estados en vez de guardarlos.
export function normalizarDia(curso, hoy = todayKey()) {
  if (!curso) return null;
  if (curso.dia === hoy) return curso;
  return { ...curso, dia: hoy, minutosHoy: 0 };
}

// Abre el lote, o devuelve el que ya estaba. `unidades` son ids del currículum,
// ya filtrados por prerrequisitos — quién elige el material es el generador, no
// esta función.
export async function abrirLote({ bloqueId, unidades = [] }, hoy = todayKey()) {
  const previo = await leerCurso(hoy);
  if (previo?.unidades?.length) return previo;
  if (!unidades.length) return null;

  const curso = {
    bloqueId,
    unidades,
    hechos: {},
    dia: hoy,
    minutosHoy: 0,
    abiertoAt: Date.now(),
    // Congelado al abrir: es lo que le permite a franjas.js saber si el lote
    // terminó sin tener que conocer el currículum.
    totalPasos: pasosDeCurso({ unidades }).length,
    minutosProximoPaso: pasosDeCurso({ unidades })[0]?.minutos || 0,
  };
  // Las unidades quedan "introducida" desde que se declara la carga: a partir de
  // acá sus cartas están bloqueadas para recuperación, aunque el lote tarde tres
  // días en cerrar. Es lo correcto — todavía no las reconstruiste.
  const ahora = Date.now();
  const escrituras = { [NODO]: curso };
  for (const id of unidades) {
    const prog = (await getNode(`progresoUnidad/${id}`)) || null;
    escrituras[`progresoUnidad/${id}`] = { ...marcarIntroducida(prog, ahora), id };
  }
  await bulkWrite(escrituras);
  return curso;
}

// Marca un paso cumplido y le suma sus minutos al día. `progreso` es el parche
// por unidad que corresponda (descomposición o Feynman), ya construido por las
// transiciones de consolidacion.js.
async function completarPaso(curso, paso, { unidadId = null, progreso = null } = {}, hoy = todayKey()) {
  const hechos = { ...(curso.hechos || {}), [paso.clave]: Date.now() };
  const nuevo = {
    ...curso,
    dia: hoy,
    hechos,
    minutosHoy: (curso.dia === hoy ? curso.minutosHoy || 0 : 0) + paso.minutos,
    // Lo que le falta a franjas.js para decidir si la franja cerró por hoy sin
    // tener que rearmar la secuencia (que depende del currículum).
    minutosProximoPaso: avanceDelLote(pasosDeCurso(curso), hechos).paso?.minutos || 0,
  };
  const escrituras = { [NODO]: nuevo };
  if (unidadId && progreso) escrituras[`progresoUnidad/${unidadId}`] = { ...progreso, id: unidadId };
  await bulkWrite(escrituras);
  return nuevo;
}

// Un paso del lote (carga, exposición, codificación): no toca el progreso por
// unidad, solo avanza el recorrido.
export async function pasoDelLoteHecho(paso, hoy = todayKey()) {
  const curso = await leerCurso(hoy);
  if (!curso) return null;
  return completarPaso(curso, paso, {}, hoy);
}

// La compuerta. `solapamiento` sale de solapamientoConFuente() sobre el texto
// del usuario contra las cartas de la unidad. Si no pasa, NO se marca el paso:
// el recorrido se queda ahí y hay que reescribir.
//
// `forzar` es el modo observación de calibrarUmbral: las primeras muestras
// registran el solapamiento sin bloquear, porque 15% es una estimación y la
// forma de escribir de cada uno varía mucho.
export async function guardarDescomposicion({ paso, unidadId, texto, solapamiento, fotoUrl = null, forzar = false }, hoy = todayKey()) {
  const curso = await leerCurso(hoy);
  if (!curso) return null;

  const prog = (await getNode(`progresoUnidad/${unidadId}`)) || null;
  const actualizado = marcarDescomposicion(prog, { solapamiento, texto, fotoUrl });

  if (!actualizado.descomposicion.ok && !forzar) {
    // Se guarda el intento igual: es la muestra con la que se calibra el umbral.
    await setNode(`progresoUnidad/${unidadId}`, { ...actualizado, id: unidadId });
    return { curso, bloqueado: true, progreso: actualizado };
  }

  const nuevo = await completarPaso(curso, paso, { unidadId, progreso: actualizado }, hoy);
  return { curso: nuevo, bloqueado: false, progreso: actualizado };
}

export async function guardarFeynman({ paso, unidadId }, hoy = todayKey()) {
  const curso = await leerCurso(hoy);
  if (!curso) return null;
  const prog = (await getNode(`progresoUnidad/${unidadId}`)) || null;
  return completarPaso(curso, paso, { unidadId, progreso: marcarFeynman(prog, { ok: true }) }, hoy);
}

// Cierre del lote: acá y solo acá arranca el reloj de consolidación, para todas
// las unidades a la vez. El nodo del lote se borra — el siguiente se abre limpio.
export async function cerrarLote(hoy = todayKey()) {
  const curso = await leerCurso(hoy);
  if (!curso?.unidades?.length) return null;

  if (!avanceDelLote(pasosDeCurso(curso), curso.hechos).terminado) return null;

  const ahora = Date.now();
  const escrituras = { [NODO]: null };
  for (const id of curso.unidades) {
    const prog = (await getNode(`progresoUnidad/${id}`)) || null;
    escrituras[`progresoUnidad/${id}`] = { ...cerrarAdquisicion(prog, ahora), id };
  }
  await bulkWrite(escrituras);
  return { unidades: curso.unidades, consolidandoAt: ahora };
}

// Las muestras con las que calibrarUmbral propone un umbral propio. Se leen del
// progreso de todas las unidades, no de un log aparte: la fuente de verdad del
// solapamiento es la descomposición que quedó guardada.
export async function muestrasDeSolapamiento() {
  const todas = (await getNode('progresoUnidad')) || {};
  return Object.values(todas)
    .map(p => p?.descomposicion?.solapamiento)
    .filter(v => typeof v === 'number');
}

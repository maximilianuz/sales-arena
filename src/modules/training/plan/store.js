// Escrituras del estado del plan. Viven acá y no en el componente porque los
// bloques se completan desde dos lugares distintos: desde la propia vista "Hoy"
// (lectura, cierre) y desde TrainingHome cuando vuelve una sesión de flashcards
// o de roleplay.
//
// Todas leen el estado fresco antes de escribir en vez de confiar en el que
// tenga el componente en memoria: entre que lanzás un roleplay y volvés pueden
// haber pasado veinte minutos.
//
// La decisión de si un bloque cierra o se prorroga NO se toma acá: es pura y
// vive en generator.js. Este archivo solo persiste el resultado.

import { getNode, setNode, bulkWrite } from '../db';
import { siguienteDia, bloqueTerminado, evaluarFinDeBloque, continuarDesdeV1, esV1 } from './generator';
import { aplicarCheckin, semanaISO } from './checkin';

export async function marcarBloqueHecho(bloqueId) {
  const estado = await getNode('planEstado');
  if (!estado || estado.hechos?.[bloqueId]) return estado;
  const nuevo = { ...estado, hechos: { ...(estado.hechos || {}), [bloqueId]: Date.now() } };
  await setNode('planEstado', nuevo);
  return nuevo;
}

export async function guardarEstado(estado) {
  await setNode('planEstado', estado);
}

// Cierra el día y, si era el último del mesociclo, resuelve el fin de bloque:
// sube de nivel o prorroga. Devuelve `{ finDeBloque }` para que la UI sepa si
// tiene que mostrar la pantalla de subida de nivel.
//
// `ctx` son los datos vivos que ya tiene TrainingHome (sesiones, cartas, srs,
// errores). Se pasan por parámetro en vez de releerlos: son los mismos que la
// vista viene usando y así el veredicto coincide con lo que el usuario ve.
export async function cerrarDia({ plan, ctx, hoyKey }) {
  const estado = (await getNode('planEstado')) || {};
  const avanzado = siguienteDia(plan, estado, hoyKey);

  // Los planes v1 no tienen mesociclos: terminan y se ofrece continuar.
  if (esV1(plan) || !bloqueTerminado(plan, avanzado)) {
    await setNode('planEstado', avanzado);
    return { estado: avanzado, finDeBloque: null };
  }

  const resultado = evaluarFinDeBloque({ plan, estado: avanzado, ctx });
  if (!resultado) {
    await setNode('planEstado', avanzado);
    return { estado: avanzado, finDeBloque: null };
  }

  // Una sola escritura atómica: si se guardara el plan nuevo y fallara el
  // estado, el usuario quedaría en el día 8 de un bloque de 5 días.
  const escrituras = {
    plan: resultado.planNuevo,
    planEstado: resultado.estadoNuevo,
  };
  if (resultado.historial) escrituras[`planHistorial/${resultado.historial.n}`] = resultado.historial;
  await bulkWrite(escrituras);

  return { estado: resultado.estadoNuevo, finDeBloque: resultado };
}

// Un plan v1 terminado se continúa como mesociclo 2 conservando los `hechos`.
export async function continuarConBloques(plan) {
  const estado = (await getNode('planEstado')) || {};
  const { planNuevo, estadoNuevo, historial } = continuarDesdeV1(plan, estado);
  await bulkWrite({ plan: planNuevo, planEstado: estadoNuevo, [`planHistorial/${historial.n}`]: historial });
  return planNuevo;
}

// Check-in semanal. Escribe el plan recalculado, el estado y el registro de la
// semana en una sola operación: si el plan nuevo se guardara sin el
// `ultimoCheckin`, el check-in volvería a aparecer en la próxima pantalla.
export async function guardarCheckin({ plan, respuestas }) {
  const estado = (await getNode('planEstado')) || {};
  const { planNuevo, estadoNuevo, registro, semana } = aplicarCheckin({ plan, estado, respuestas });
  await bulkWrite({
    plan: planNuevo,
    planEstado: estadoNuevo,
    [`planCheckin/${semana}`]: registro,
  });
  return { plan: planNuevo, estado: estadoNuevo };
}

// Posponer: no se recalcula nada, pero la semana queda marcada. Preguntar dos
// veces lo mismo después de que te dijeron "ahora no" es la forma de que dejen
// de contestar.
export async function posponerCheckin() {
  const estado = (await getNode('planEstado')) || {};
  await setNode('planEstado', { ...estado, ultimoCheckin: semanaISO() });
}

// ── Puente con la práctica por voz ──────────────────────────
//
// La llamada por voz vive en otra pantalla (Práctica individual), fuera del
// módulo. Cuando el plan la lanza, deja una marca: al terminar la llamada, esa
// pantalla la resuelve y el bloque queda cumplido.
//
// La marca vive en la base y no en memoria porque entre una pantalla y la otra
// se desmonta todo el árbol de Training. Vence a las 6 horas: si alguien abre la
// práctica desde el plan y termina una llamada al otro día, ya no es ese bloque.

const VENCIMIENTO_PENDIENTE_MS = 6 * 60 * 60 * 1000;

export async function marcarPendienteVoz(bloqueId) {
  await setNode('pendienteVoz', { bloqueId, ts: Date.now() });
}

// La llama Práctica individual al guardar una sesión. Devuelve el id del bloque
// que se marcó, o null si no venía del plan (practicar suelto sigue siendo
// válido: no tacha nada, pero tampoco falla).
export async function resolverPendienteVoz() {
  const pendiente = await getNode('pendienteVoz');
  if (!pendiente?.bloqueId) return null;
  await setNode('pendienteVoz', null);
  if (Date.now() - (pendiente.ts || 0) > VENCIMIENTO_PENDIENTE_MS) return null;
  await marcarBloqueHecho(pendiente.bloqueId);
  return pendiente.bloqueId;
}

// Descartar el plan deja el perfil intacto: si lo regenerás, el onboarding
// arranca con tus respuestas anteriores ya cargadas. El historial de mesociclos
// tampoco se toca — es tu evolución, no parte del plan vigente.
export async function borrarPlan() {
  await setNode('plan', null);
  await setNode('planEstado', null);
  await setNode('pendienteVoz', null);
}

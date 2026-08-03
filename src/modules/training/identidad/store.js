// Módulo 0 — Identidad. Lecturas y escrituras de users/{uid}/training/identidad.
//
// Todo el módulo es contenido que escribe el usuario, guiado por prompts fijos:
// no hay IA acá y no hace falta. Lo que sí hace falta es que las metas tengan
// número y fecha — un panel visionario sin cifras es una lista de deseos, y no
// se puede medir contra él.
//
// El check diario NO vive en log/{fecha}: `logActivity` reconstruye ese nodo con
// un set fijo de claves y borraría cualquier cosa que le agreguemos. Vive en
// identidad/check/{fecha}, que además tiene que resetearse todos los días —
// distinto de planEstado.hechos, que es permanente por id de bloque.

import { getNode, setNode, setItem, removeItem, subscribeNode, bulkWrite, todayKey } from '../db';
import { armarDeclaracion } from './questions';

export const IDENTIDAD_VERSION = 1;

// ── Lectura ─────────────────────────────────────────────────

// Una sola suscripción al subtree: son pocos datos y así la vista "Hoy" no
// necesita coordinar cuatro listeners para dibujar un bloque de dos líneas.
export function subscribeIdentidad(callback) {
  return subscribeNode('identidad', (v) => callback(normalizar(v)));
}

export function normalizar(nodo) {
  if (!nodo) return null;
  return {
    ...nodo,
    metas: Object.entries(nodo.metas || {})
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    check: nodo.check || {},
    recordatorios: nodo.recordatorios || {},
    dossier: nodo.dossier || {},
  };
}

export const checkDelDia = (identidad, fecha = todayKey()) => identidad?.check?.[fecha] || null;

// La declaración es lo que gatea el resto: sin ella no aparece el check diario.
export const tieneIdentidad = (identidad) => !!identidad?.declaracion?.texto;

// ── Check diario ────────────────────────────────────────────

// Mañana: leíste tu declaración y viste el panel. El foco del día es opcional y
// de una línea — a la noche el bloque de cierre te lo devuelve y te pregunta si
// lo cumpliste. Ese ida y vuelta es todo el ciclo diario; más que eso no se
// sostiene, y el día del plan ya tiene sus propios bloques.
export async function marcarCheckManana(foco = '', fecha = todayKey()) {
  const prev = (await getNode(`identidad/check/${fecha}`)) || {};
  const nuevo = { ...prev, manana: Date.now(), foco: foco || prev.foco || '' };
  await setNode(`identidad/check/${fecha}`, nuevo);
  return nuevo;
}

export async function marcarCheckNoche({ cumplioFoco = null, fecha = todayKey() } = {}) {
  const prev = (await getNode(`identidad/check/${fecha}`)) || {};
  const nuevo = { ...prev, noche: Date.now(), cumplioFoco };
  await setNode(`identidad/check/${fecha}`, nuevo);
  return nuevo;
}

// Racha de checks de la mañana, contando hacia atrás desde hoy. Misma lógica que
// la racha de práctica (db.computeStreak): no se rompe hasta que el día termina.
export function rachaCheck(identidad, hoy = new Date()) {
  const check = identidad?.check || {};
  const dia = new Date(hoy);
  const hecho = (d) => !!check[todayKey(d)]?.manana;
  let racha = 0;
  if (!hecho(dia)) dia.setDate(dia.getDate() - 1);
  while (hecho(dia)) { racha++; dia.setDate(dia.getDate() - 1); }
  return racha;
}

// ── Escrituras del módulo 0 ─────────────────────────────────

export async function guardarDeclaracion({ partes, texto }) {
  await setNode('identidad/declaracion', { partes, texto, actualizadoAt: Date.now() });
}

export async function guardarMeta(id, meta) {
  await setItem('identidad/metas', id, meta);
}

export async function borrarMeta(id) {
  await removeItem('identidad/metas', id);
}

// El avance de cada meta se registra por fecha: es la serie que dibuja el panel
// y lo que hace que "cuantificado" signifique algo con el tiempo. Lo actualiza
// el check-in semanal, no el diario — pedir una cifra todos los días es la forma
// más rápida de que dejen de cargarla.
export async function registrarAvance(metaId, valor, fecha = todayKey()) {
  await setNode(`identidad/avances/${metaId}/${fecha}`, valor);
  await setNode(`identidad/metas/${metaId}/valorActual`, valor);
}

// ── Recordatorio ────────────────────────────────────────────

// Deja registrado que esta semana (o este regreso) el recordatorio ya salió, y
// qué contestó. Se guarda aunque la respuesta sea "ya no me representa": la
// serie de confirmaciones es la huella, y una declaración que dejó de ser cierta
// también es un dato del proceso.
export async function registrarRecordatorio(clave, { parte, respuesta }) {
  await setNode(`identidad/recordatorios/${clave}`, { parte, respuesta, ts: Date.now() });
}

// Reescribir una parte suelta desde el recordatorio, sin rehacer el wizard.
export async function reescribirParte(parteKey, texto, declaracionActual) {
  const partes = { ...(declaracionActual?.partes || {}), [parteKey]: texto };
  await setNode('identidad/declaracion', {
    partes,
    texto: armarDeclaracion(partes),
    actualizadoAt: Date.now(),
  });
}

// Una respuesta del dossier. Escribe la parte en la declaración —que es donde
// vive todo lo escrito, así el recordatorio semanal la puede rotar como a
// cualquier otra— y además deja el registro de CUÁNDO se contestó.
//
// El registro guarda `dia` (días entrenados) y no solo la fecha porque el
// espaciado entre preguntas se cuenta en días de práctica, no de calendario:
// quien entrena tres veces por semana no debería recibirlas más rápido por el
// simple paso del tiempo. La fecha se guarda aparte, para la regla de "no más
// de una por día".
export async function responderDossier({ key, texto, dia, fecha, declaracionActual }) {
  const partes = { ...(declaracionActual?.partes || {}), [key]: texto };
  await bulkWrite({
    'identidad/declaracion': { partes, texto: armarDeclaracion(partes), actualizadoAt: Date.now() },
    [`identidad/dossier/${key}`]: { dia, fecha, ts: Date.now() },
  });
}

export async function guardarProgresoOnboarding(paso) {
  await setNode('identidad/meta', { version: IDENTIDAD_VERSION, paso, completadoAt: null });
}

export async function completarOnboarding() {
  await setNode('identidad/meta', { version: IDENTIDAD_VERSION, paso: null, completadoAt: Date.now() });
}

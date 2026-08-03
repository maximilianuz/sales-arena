// Consolidación: el reloj que decide qué material se puede practicar hoy.
//
// La regla: después de introducir material nuevo, ese material queda en pausa
// para RECUPERACIÓN ACTIVA (flashcards, roleplay, autoexplicación) hasta que
// pasen ≥14 horas Y haya cambiado el día. La RE-EXPOSICIÓN PASIVA (releerlo en
// el cierre del día) sigue permitida, porque la revisión ligera antes de dormir
// es parte de la metodología y apunta a lo contrario que esta regla: no es un
// intento de recuperación sobre una traza inestable, es exposición.
//
// Por qué 14 horas Y cambio de día, en vez de solo 12:
// si cargás a las 08:00, con "12 horas" se te libera a las 20:00 del mismo día
// y la regla queda vacía —volviste a practicarlo la misma jornada—. Exigir que
// además amanezca fuerza que haya sueño en el medio, que es de donde viene el
// efecto. Y si cargás a las 22:00, a las 12:00 del día siguiente ya cumpliste
// las dos condiciones sin tener que esperar 24 horas exactas.
//
// Nota honesta sobre la evidencia: el espaciamiento y la consolidación durante
// el sueño están bien establecidos; el umbral concreto de 12-24 h no lo está.
// Esto es una heurística operativa razonable, no una constante empírica.

import { unidadPorId, unidadesDeCarta, UNIDADES } from './curriculum';

export const ESTADO = {
  PENDIENTE: 'pendiente',
  INTRODUCIDA: 'introducida',
  CONSOLIDANDO: 'consolidando',
  DISPONIBLE: 'disponible',
  DOMINADA: 'dominada',
};

export const HORAS_CONSOLIDACION = 14;
const HORA_MS = 60 * 60 * 1000;

// Umbral de solapamiento con la fuente en la descomposición. Arranca en 15% y
// se calibra: la primera semana el sistema registra los valores reales sin
// bloquear, y con dos o tres descomposiciones se ajusta (ver calibrarUmbral).
export const SOLAPAMIENTO_OK = 0.15;
export const SOLAPAMIENTO_ADVERTENCIA = 0.25;

// Madurez FSRS para considerar una unidad dominada. Mismos números que usa
// dificultad.js para el eje de retención: no conviene tener dos definiciones
// distintas de "esto ya lo sé".
export const MADUREZ_REPS = 3;
export const MADUREZ_DIAS = 21;

// Medianoche local siguiente a un instante. Tiene que ser LOCAL y no UTC: con
// días UTC, en zonas al oeste de Greenwich cualquier cosa cargada de noche cae
// ya en "el día siguiente" y la condición de amanecer queda vacía — justo el
// caso que la regla quería cubrir. Se usa setHours(24) en vez de sumar 86400000
// para que los cambios de horario de verano no corran el corte.
function proximaMedianoche(ts) {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

// ── Estado de una unidad ────────────────────────────────────

// `prog` es el nodo progresoUnidad/{id}: { introducidaAt, descomposicion,
// feynmanOk, liberadaAt, dominadaAt }. Se deriva en vez de guardarse para que
// el paso de consolidando→disponible ocurra solo con el paso del tiempo, sin
// depender de que alguien corra un job.
export function estadoUnidad(prog, ahora = Date.now()) {
  if (!prog || !prog.introducidaAt) return ESTADO.PENDIENTE;
  if (prog.dominadaAt) return ESTADO.DOMINADA;

  const unidad = unidadPorId(prog.id);
  // Las unidades literales no pasan por descomposición: su valor está en el
  // fraseo exacto y reconstruirlo con palabras propias lo destruiría.
  const requiereDescomposicion = !unidad?.literal;
  const gatesOk = requiereDescomposicion
    ? (prog.descomposicion?.ok && prog.feynmanOk)
    : !!prog.feynmanOk;

  if (!gatesOk) return ESTADO.INTRODUCIDA;
  if (puedeLiberarse(prog, ahora)) return ESTADO.DISPONIBLE;
  return ESTADO.CONSOLIDANDO;
}

// El reloj arranca cuando se cerró la sesión de adquisición (`consolidandoAt`),
// no cuando se abrió el material: la pasada de codificación activa del final es
// parte del encoding, no una violación del intervalo.
export function puedeLiberarse(prog, ahora = Date.now()) {
  const desde = prog?.consolidandoAt || prog?.introducidaAt;
  if (!desde) return false;
  const pasoElTiempo = ahora - desde >= HORAS_CONSOLIDACION * HORA_MS;
  const amanecio = ahora >= proximaMedianoche(desde);
  return pasoElTiempo && amanecio;
}

// Cuándo se libera, para poder mostrarlo en la UI sin hacer que el usuario
// calcule. Devuelve null si ya está libre o si nunca arrancó el reloj.
export function liberaEn(prog, ahora = Date.now()) {
  const desde = prog?.consolidandoAt || prog?.introducidaAt;
  if (!desde || puedeLiberarse(prog, ahora)) return null;
  return Math.max(desde + HORAS_CONSOLIDACION * HORA_MS, proximaMedianoche(desde));
}

export function estadosDeTodas(progresoMap = {}, ahora = Date.now()) {
  const out = {};
  for (const u of UNIDADES) {
    const prog = progresoMap[u.id] ? { ...progresoMap[u.id], id: u.id } : null;
    out[u.id] = estadoUnidad(prog, ahora);
  }
  return out;
}

// ── La compuerta: qué cartas no se pueden practicar todavía ─

// Devuelve el Set de cardIds bloqueados. Una carta se bloquea si CUALQUIERA de
// sus unidades no está disponible: es el criterio conservador, y el correcto,
// porque una carta que toca dos conceptos no se entiende con solo uno asentado.
//
// Las cartas que no pertenecen a ninguna unidad NO se bloquean: material suelto
// o creado a mano por el usuario sigue disponible como siempre.
export function cartasBloqueadas(progresoMap = {}, ahora = Date.now()) {
  const estados = estadosDeTodas(progresoMap, ahora);
  const bloqueadas = new Set();
  for (const u of UNIDADES) {
    const e = estados[u.id];
    if (e === ESTADO.DISPONIBLE || e === ESTADO.DOMINADA) continue;
    for (const c of u.cartas || []) bloqueadas.add(c);
  }
  return bloqueadas;
}

// Lo que hoy está en pausa, para poder decírselo al usuario con nombre y hora
// en vez de que las cartas simplemente no aparezcan.
export function unidadesEnPausa(progresoMap = {}, ahora = Date.now()) {
  const estados = estadosDeTodas(progresoMap, ahora);
  return UNIDADES
    .filter(u => estados[u.id] === ESTADO.CONSOLIDANDO)
    .map(u => ({
      id: u.id,
      titulo: u.titulo,
      liberaEn: liberaEn({ ...progresoMap[u.id], id: u.id }, ahora),
    }))
    .sort((a, b) => (a.liberaEn || 0) - (b.liberaEn || 0));
}

// ── Transiciones ────────────────────────────────────────────
//
// Devuelven el progreso nuevo; persistirlo es responsabilidad de store.js.

export function marcarIntroducida(prog, ahora = Date.now()) {
  if (prog?.introducidaAt) return prog;
  return { ...(prog || {}), introducidaAt: ahora };
}

export function marcarDescomposicion(prog, { solapamiento, texto = '', fotoUrl = null }, ahora = Date.now()) {
  return {
    ...(prog || {}),
    descomposicion: {
      solapamiento,
      ok: solapamiento <= SOLAPAMIENTO_OK,
      advertencia: solapamiento > SOLAPAMIENTO_OK && solapamiento <= SOLAPAMIENTO_ADVERTENCIA,
      largo: texto.length,
      fotoUrl,
      ts: ahora,
    },
  };
}

export function marcarFeynman(prog, { ok = true } = {}, ahora = Date.now()) {
  return { ...(prog || {}), feynmanOk: ok, feynmanAt: ahora };
}

// Cierre de la sesión de adquisición: acá arranca el reloj de consolidación,
// para todas las unidades que se trabajaron en el bloque.
export function cerrarAdquisicion(prog, ahora = Date.now()) {
  if (prog?.consolidandoAt) return prog;
  return { ...(prog || {}), consolidandoAt: ahora };
}

// Dominada: la decide FSRS, no el usuario. Se recalcula al vuelo con el estado
// de las cartas de la unidad — todas maduras, no el promedio, porque una unidad
// con una carta floja no está dominada.
//
// La madurez se mide por el LARGO del intervalo que FSRS le asignó, no por
// compararlo contra la fecha de hoy: una carta con intervalo de 30 días está
// madura aunque la hayas repasado ayer. Mismo criterio que usa dificultad.js
// para el eje de retención.
export function evaluarDominio(unidad, srsMap = {}) {
  const cartas = unidad.cartas || [];
  if (!cartas.length) return false;
  return cartas.every(id => {
    const s = srsMap[id];
    if (!s || s.reps < MADUREZ_REPS) return false;
    return (s.due - (s.lastReview || 0)) >= MADUREZ_DIAS * 24 * HORA_MS;
  });
}

// ── Calibración del umbral ──────────────────────────────────
//
// La primera semana el chequeo corre en modo observación: registra el
// solapamiento pero no bloquea. Con tres muestras se propone un umbral propio,
// porque 15% es una estimación y la forma de escribir de cada uno varía mucho.

export const MUESTRAS_PARA_CALIBRAR = 3;

export function calibrarUmbral(muestras = []) {
  if (muestras.length < MUESTRAS_PARA_CALIBRAR) {
    return { listo: false, faltan: MUESTRAS_PARA_CALIBRAR - muestras.length, umbral: SOLAPAMIENTO_OK };
  }
  // Mediana y no promedio: una descomposición copiada de más no debería mover
  // el umbral de todas las siguientes.
  const orden = [...muestras].sort((a, b) => a - b);
  const mediana = orden[Math.floor(orden.length / 2)];
  // El umbral se pone un poco por encima de tu mediana natural, redondeado a
  // 5 puntos, y acotado para que no quede ni trivial ni imposible.
  const propuesto = Math.min(0.30, Math.max(0.10, Math.round((mediana * 1.2) * 20) / 20));
  return { listo: true, umbral: propuesto, mediana, muestras: muestras.length };
}

export { unidadesDeCarta };

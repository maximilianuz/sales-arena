// Check-in semanal: tres preguntas, una vez por semana.
//
// Es semanal y no diario a propósito. El check diario ya existe (el de identidad
// a la mañana y el cierre a la noche) y tiene que quedarse corto; re-preguntar
// días y horas todos los días haría que nadie los conteste en serio.
//
// Lo que recalcula es SOLO lo que falta por delante. Lo ya cumplido no se toca:
// el plan es secuencial, no un calendario que se renegocia cada lunes. Y como el
// largo del bloque se mide en sesiones y no en semanas, cambiar días/semana no
// mueve el criterio de cierre — mueve cuánto calendario ocupa.

import { regenerarDiasPendientes } from './mesociclo';
import { esV1 } from './generator';

// Semana ISO ('2026-W30'). Se guarda esto y no una fecha para que el check-in
// caiga una vez por semana calendario, sin importar qué días entrenó.
export function semanaISO(d = new Date()) {
  const fecha = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Jueves de esa semana: define a qué año ISO pertenece.
  fecha.setUTCDate(fecha.getUTCDate() + 4 - (fecha.getUTCDay() || 7));
  const inicioAnio = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((fecha - inicioAnio) / 86400000 + 1) / 7);
  return `${fecha.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

// Días de gracia antes del primer check-in: preguntarle a alguien si le sirven
// sus días de entrenamiento cuando lleva dos sesiones es preguntarle al aire.
const DIAS_GRACIA = 5;

export function necesitaCheckin(plan, estado, ahora = Date.now()) {
  if (!plan || esV1(plan)) return false;
  const semana = semanaISO(new Date(ahora));
  if (estado?.ultimoCheckin === semana) return false;
  if (!estado?.ultimoCheckin) {
    // `??` y no `||`: arrancadoAt puede ser 0 y 0 es falsy.
    const dias = (ahora - (estado?.arrancadoAt ?? ahora)) / 86400000;
    return dias >= DIAS_GRACIA;
  }
  return true;
}

// Las tres preguntas. Las dos primeras recalculan el plan; la tercera mantiene
// vivo el panel visionario sin cargar el check diario con una cifra.
export const OPCIONES_DIAS = [
  { value: 3, label: '3 días', detalle: 'El mínimo que sostiene la memoria' },
  { value: 5, label: '5 días', detalle: 'Días de semana' },
  { value: 7, label: 'Todos los días', detalle: 'Sesiones cortas, sin excepciones' },
];

// Minutos por DÍA, no por sesión. El día se reparte en franjas (ver franjas.js)
// y cada una corta con su propia carga cumplida, así que el número de acá es un
// presupuesto de jornada y no el largo de un bloque único.
//
// Los tres primeros valores son los que existían antes y siguen dando el mismo
// resultado: por debajo de 75 minutos no aparece la franja de adquisición y el
// día es solo repaso, que es exactamente el comportamiento viejo. Nadie que hoy
// entrena 20 minutos se despierta con una jornada de cuatro franjas.
export const OPCIONES_MINUTOS = [
  { value: 20, label: '20 minutos', detalle: 'Solo repaso' },
  { value: 40, label: '40 minutos', detalle: 'Repaso y cierre del día' },
  { value: 60, label: '1 hora', detalle: 'Repaso, una llamada y cierre' },
  { value: 120, label: '2 horas', detalle: 'Ya entra material nuevo' },
  { value: 180, label: '3 horas', detalle: 'Jornada completa' },
  { value: 240, label: '4 horas', detalle: 'Dedicación full time' },
];

// Qué meta toca actualizar esta semana. Rota por la lista para no pedir siempre
// la misma cifra — determinista, sale del número de semana.
export function metaDeLaSemana(metas = [], semana = semanaISO()) {
  if (!metas.length) return null;
  const n = parseInt(semana.slice(-2), 10) || 0;
  return metas[n % metas.length];
}

// Función pura: devuelve los nodos nuevos, sin escribir. Las escrituras son de
// plan/store.js.
export function aplicarCheckin({ plan, estado, respuestas, ahora = Date.now() }) {
  const config = {
    ...plan.config,
    diasPorSemana: respuestas.diasPorSemana ?? plan.config.diasPorSemana,
    minutosPorSesion: respuestas.minutosPorSesion ?? plan.config.minutosPorSesion,
  };
  const semana = semanaISO(new Date(ahora));

  return {
    planNuevo: {
      ...plan,
      config,
      // Desde el día EN CURSO inclusive no: si ya tachó bloques de hoy, cambiarle
      // los minutos a mitad del día le borraría el progreso de la jornada.
      mesociclo: regenerarDiasPendientes(plan.mesociclo, { desdeDiaN: (estado.dia || 1) + 1, config }),
    },
    estadoNuevo: { ...estado, ultimoCheckin: semana },
    registro: {
      diasPorSemana: config.diasPorSemana,
      minutosPorSesion: config.minutosPorSesion,
      metaId: respuestas.metaId || null,
      metaValor: respuestas.metaValor ?? null,
      ts: ahora,
    },
    semana,
  };
}

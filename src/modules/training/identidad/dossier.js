// El dossier: las cuatro preguntas de identidad que NO se piden en el arranque.
//
// El wizard de identidad llegó a pedir siete pantallas de una sentada, contra su
// propia regla de que más de cinco se abandona. Estas cuatro salieron de ahí y
// ahora llegan de a una por día, dentro del plan.
//
// Repartirlas no es solo para acortar el arranque — las mejora. "¿Quién sos en
// tu mejor versión vendiendo?" se contesta distinto el día uno que después de
// tres llamadas simuladas, y "¿qué sostenés aunque te cueste la venta?" recién
// significa algo cuando ya tuviste una llamada donde sostenerlo costaba.
//
// Tres reglas:
//
// 1. UNA POR DÍA COMO MUCHO. Son preguntas que piden pensar; dos el mismo día se
//    contestan la segunda en automático.
//
// 2. NO EN EL PRIMER DÍA. El día 1 ya tiene el arranque de identidad, el
//    onboarding del plan y la primera sesión. Meter otra pregunta ahí es
//    exactamente el amontonamiento del que las sacamos.
//
// 3. SE ESPACIAN. Una cada dos días entrenados, no una por día seguido: el valor
//    está en que caiga sobre experiencia nueva, y dos días seguidos no la hay.
//
// Puro y sin IO, como continuidad.js: entra el estado, sale qué preguntar.

import { PASOS_DOSSIER, arranqueCompleto } from './questions';

// Días entrenados que tienen que pasar antes de la primera pregunta, y entre una
// y la siguiente. Se cuentan días CON PRÁCTICA, no días de calendario: alguien
// que entrena tres veces por semana no debería recibirlas más rápido por el
// hecho de que pase el tiempo.
export const DIAS_ANTES_DE_LA_PRIMERA = 2;
export const DIAS_ENTRE_PREGUNTAS = 2;

// Cuántos días con práctica registrada hay en el log. Es el mismo log del que
// salen la racha y el recordatorio de continuidad.
export function diasEntrenados(logMap) {
  if (!logMap) return 0;
  return Object.values(logMap).filter(d => d?.minutos > 0).length;
}

// Qué pregunta del dossier toca hoy, o null.
//
// `registro` es identidad/dossier: { [key]: { ts, dia } }, donde `dia` es el
// número de días entrenados que había cuando se contestó. Guardar el día y no
// solo la fecha es lo que permite espaciar por entrenamiento en vez de por
// calendario.
export function preguntaDeHoy({ identidad, logMap, fecha }) {
  // Sin el arranque hecho no hay dossier: primero las dos de motor, que son las
  // que el sistema necesita para operar.
  if (!arranqueCompleto(identidad?.declaracion)) return null;

  const partes = identidad?.declaracion?.partes || {};
  const pendientes = PASOS_DOSSIER.filter(p => !(partes[p.key] || '').trim());
  if (!pendientes.length) return null;

  const registro = identidad?.dossier || {};
  // Ya cayó una hoy: no hay dos el mismo día.
  if (Object.values(registro).some(r => r?.fecha === fecha)) return null;

  const dias = diasEntrenados(logMap);
  const contestadas = Object.values(registro).filter(r => r?.dia != null);
  const ultimo = contestadas.length ? Math.max(...contestadas.map(r => r.dia)) : null;

  const umbral = ultimo === null
    ? DIAS_ANTES_DE_LA_PRIMERA
    : ultimo + DIAS_ENTRE_PREGUNTAS;
  if (dias < umbral) return null;

  // El orden es el del array: es el que ya estaba pensado, de la más fácil de
  // contestar a la que más cuesta.
  return { ...pendientes[0], dia: dias, restantes: pendientes.length };
}

// Cuánto le falta al dossier, para poder mostrarlo sin que parezca una tarea
// infinita. Se usa en el panel de identidad.
export function progresoDossier(identidad) {
  const partes = identidad?.declaracion?.partes || {};
  const hechas = PASOS_DOSSIER.filter(p => (partes[p.key] || '').trim()).length;
  return { hechas, total: PASOS_DOSSIER.length, completo: hechas === PASOS_DOSSIER.length };
}

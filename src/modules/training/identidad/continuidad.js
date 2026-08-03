// Continuidad: qué parte de tu declaración vuelve, cuándo y por qué.
//
// (El archivo se llama continuidad.js y no recordatorio.js a propósito: en
// Windows el sistema de archivos no distingue mayúsculas, y `recordatorio.js`
// junto a `Recordatorio.jsx` hacía que los imports sin extensión resolvieran al
// módulo equivocado — y a uno distinto en el build de Linux.)
//
// El problema que resuelve es la continuidad. Un plan de varios meses no se
// abandona por falta de contenido: se abandona la semana que aparece algo más
// urgente. Lo único que sostiene es acordarse de para qué se empezó — y para
// eso hay que repetirlo, no escribirlo una vez.
//
// Dos reglas que hacen todo el trabajo:
//
// 1. LA PARTE QUE VUELVE DEPENDE DE CÓMO VENÍS. "A lo que no vuelvo" es lo que
//    mueve a alguien que se frenó: cuando ya estás parado, el costo de quedarte
//    pesa más que la meta. "Por qué estoy dispuesto" es lo que sostiene a
//    alguien en marcha, y va pegado a la evidencia de que está funcionando.
//    Mostrar los dos siempre los desafila.
//
// 2. SE PREGUNTA, NO SE MUESTRA. Releer el mismo texto cada semana anestesia: a
//    la cuarta vez ya no se lee. Por eso el recordatorio pide confirmarlo —
//    ¿sigue siendo cierto? Es el mismo principio que el FSRS de las flashcards:
//    la huella la deja recuperar algo, no repasarlo pasivamente.
//
// Puro y sin IO, como dificultad.js: entra el estado del mundo, sale qué
// mostrar. Se puede verificar con un script suelto.

import { PASOS_DECLARACION } from './questions';

// Días sin entrenar a partir de los cuales se considera que la persona se frenó.
// Cuatro y no dos: con 3 días por semana, dos días sin entrenar es el ritmo
// normal, no un abandono. Avisarle a alguien que está cumpliendo que se está
// cayendo es la forma más rápida de que deje de creerle al sistema.
export const DIAS_PARA_REGRESO = 4;

const fechaKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Días desde la última práctica registrada. Mira el mismo log que la racha.
export function diasSinEntrenar(logMap, hoy = new Date()) {
  if (!logMap) return null;
  const dia = new Date(hoy);
  for (let i = 0; i <= 60; i++) {
    if (logMap[fechaKey(dia)]?.minutos) return i;
    dia.setDate(dia.getDate() - 1);
  }
  return null; // nunca entrenó: no es un regreso, es un arranque
}

// Rotación semanal: qué parte toca esta semana. Determinista por número de
// semana, y salteando las partes que la persona no escribió.
function parteRotativa(partesDisponibles, semana) {
  if (!partesDisponibles.length) return null;
  const n = parseInt(String(semana).slice(-2), 10) || 0;
  return partesDisponibles[n % partesDisponibles.length];
}

const TEXTOS = {
  regreso: {
    titulo: 'Antes de seguir',
    entrada: 'Pasaron unos días. Esto lo escribiste vos:',
    pregunta: '¿Sigue siendo cierto?',
  },
  semanal: {
    titulo: 'Tu declaración',
    entrada: 'Una vez por semana vuelve un pedazo de lo que escribiste:',
    pregunta: '¿Sigue siendo cierto?',
  },
  nivel: {
    titulo: 'Para esto era',
    entrada: 'Dijiste que estabas dispuesto a pagar el precio por esto:',
    pregunta: '¿Sigue siendo cierto?',
  },
};

// ── Qué mostrar hoy ─────────────────────────────────────────
//
// `registro` es identidad/recordatorios: { [clave]: { parte, respuesta, ts } }.
// La clave es la semana ISO para el semanal y `regreso-{fecha}` para el de
// vuelta, así ninguno se repite dos veces por el mismo motivo.
export function recordatorioDeHoy({ identidad, logMap, semana, hoy = new Date() }) {
  const partes = identidad?.declaracion?.partes || {};
  const escritas = PASOS_DECLARACION.filter(p => (partes[p.key] || '').trim());
  if (!escritas.length) return null;

  const registro = identidad?.recordatorios || {};
  const dias = diasSinEntrenar(logMap, hoy);

  // 1 · Volvió después de faltar. Tiene prioridad sobre el semanal: es el
  // momento de mayor valor de todo el sistema, y el único donde corresponde el
  // motor "desde".
  const noVuelvo = escritas.find(p => p.key === 'noVuelvoA');
  if (noVuelvo && dias !== null && dias >= DIAS_PARA_REGRESO) {
    const clave = `regreso-${fechaKey(hoy)}`;
    if (!registro[clave]) {
      return {
        motivo: 'regreso', clave, parte: noVuelvo,
        texto: partes[noVuelvo.key],
        diasAusente: dias,
        ...TEXTOS.regreso,
        entrada: `Pasaron ${dias} días. Esto lo escribiste vos:`,
        confirmaciones: contarConfirmaciones(registro, noVuelvo.key),
      };
    }
  }

  // 2 · Semanal. Rota entre las partes escritas para que no sea siempre la
  // misma frase — la repetición hace huella, la repetición idéntica hace ruido.
  if (semana && !registro[semana]) {
    const parte = parteRotativa(escritas, semana);
    if (parte) {
      return {
        motivo: 'semanal', clave: semana, parte,
        texto: partes[parte.key],
        ...TEXTOS.semanal,
        confirmaciones: contarConfirmaciones(registro, parte.key),
      };
    }
  }

  return null;
}

// Para la pantalla de subida de nivel: siempre el motor "hacia", pegado a lo que
// la persona acaba de lograr. No se registra ni pregunta nada — ahí el momento
// es de recompensa, no de introspección.
export function recordatorioDeNivel(identidad) {
  const partes = identidad?.declaracion?.partes || {};
  const texto = (partes.porQueCambio || '').trim();
  if (!texto) return null;
  return { motivo: 'nivel', texto, ...TEXTOS.nivel };
}

// Cuántas veces confirmó esta parte. Es la huella hecha visible: "lo confirmaste
// nueve semanas seguidas" dice más que volver a leerla una décima vez.
export function contarConfirmaciones(registro = {}, parteKey) {
  return Object.values(registro).filter(r => r?.parte === parteKey && r?.respuesta === 'sigue').length;
}

// Las tres respuestas posibles. "Ya no me representa" no es un fracaso: una
// declaración escrita hace cuatro meses que ya no te representa es información,
// y reescribirla es mejor que arrastrarla muerta.
export const RESPUESTAS = [
  { value: 'sigue', label: 'Sigue igual' },
  { value: 'reescribo', label: 'Lo reescribo' },
  { value: 'ya-no', label: 'Ya no me representa' },
];

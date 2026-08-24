// Puente entre Práctica individual (la llamada por voz, en pages/SoloPractice)
// y el módulo Training.
//
// Práctica individual ya existía y tiene su propio motor de escenarios y su
// propio scoring con IA. Lo que faltaba es que esa llamada CUENTE: que pase por
// las mismas 5 métricas deterministas que la simulación escrita y alimente el
// plan. Sin esto, practicar hablando —que es lo más parecido a la llamada real—
// no movía el nivel.
//
// Y hay una métrica que solo existe acá: los silencios. En texto se
// auto-reportan y por eso no computan para subir de nivel (ver dificultad.js).
// En voz son un dato: cuánto tardaste en responder después de que el prospecto
// dejó de hablar. Por eso la línea de tiempo se arma con timestamps reales y no
// con el orden de los mensajes en pantalla.

import { computeMetrics } from '../audit/metrics';
import { pushItem, logActivity } from '../db';
import { resolverPendienteVoz } from '../plan/store';

// `timeline` viene de SoloPractice: [{ role: 'closer'|'prospecto', content, ts }].
//   - el ts del CLOSER es cuándo EMPEZÓ a hablar (apretó el micrófono), no
//     cuándo terminó de transcribir Whisper: si no, la latencia del modelo se
//     contaría como si el closer hubiera sostenido un silencio.
//   - el ts del PROSPECTO es cuándo TERMINÓ su audio. El silencio que nos
//     interesa es el hueco entre esas dos cosas.
export async function guardarSesionDeVoz(timeline, { escenario = null, resultado = null, duracionSeg = null } = {}) {
  const mensajes = (timeline || []).filter(m => m && m.content && m.role);
  // Un "hola" y colgar no es una llamada: no ensucia las métricas del plan.
  if (mensajes.filter(m => m.role === 'closer').length < 2) return null;

  const metricas = computeMetrics(mensajes);
  const minutos = duracionSeg ? Math.max(1, Math.round(duracionSeg / 60)) : Math.max(1, Math.round(mensajes.length / 3));

  const sesionId = await pushItem('sesiones', {
    tipo: 'roleplay',
    canal: 'voz',
    metricas,
    turnos: mensajes.length,
    duracionSeg,
    resultado,
    prospecto: escenario?.demographics?.name || null,
    ts: Date.now(),
  });

  await logActivity({ minutos, tipo: 'roleplay', detalle: 'Llamada por voz' });

  // Si la llamada venía de un bloque del plan, queda cumplido. Si el usuario
  // entró por su cuenta a practicar, esto no hace nada y está bien: la sesión ya
  // quedó guardada y cuenta para las métricas igual.
  let bloqueId = null;
  try { bloqueId = await resolverPendienteVoz(); } catch { /* practicar suelto no depende del plan */ }

  return { sesionId, metricas, bloqueId };
}

// Arma la línea de tiempo a medida que transcurre la llamada. Se usa con un ref
// en SoloPractice para no disparar renders: los timestamps no se dibujan.
//
// Los `Date.now()` viven acá y no en el componente a propósito: el compilador de
// React trata las llamadas impuras dentro del componente como un error, y además
// así el reloj de la auditoría queda en un solo lugar.
export function crearLineaDeTiempo() {
  const turnos = [];
  let inicioTurno = 0;

  return {
    turnos,
    // Lo llama el componente cuando el closer EMPIEZA a hablar (aprieta el
    // micrófono) o a escribir. Ese es el instante en que se corta el silencio.
    marcarInicioDeTurno() { inicioTurno = Date.now(); },
    closer(content) {
      turnos.push({ role: 'closer', content, ts: inicioTurno || Date.now() });
      inicioTurno = 0;
    },
    prospecto(content) { turnos.push({ role: 'prospecto', content, ts: Date.now() }); },
    limpiar() { turnos.length = 0; inicioTurno = 0; },
  };
}

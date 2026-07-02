import { ref, push, serverTimestamp } from 'firebase/database';
import { db, auth } from './db';

// Observador Kaizen: registra errores y fricciones reales en Firebase RTDB para
// que el dueño los revise y mejore en continuo. Best-effort: NUNCA lanza ni
// bloquea la UI — si el log falla, se ignora en silencio.
//
// Requiere una regla de RTDB que permita escribir en /telemetry (ver README /
// instrucciones): "telemetry": { ".write": "auth != null", ".read": false }
// La lectura queda para el dueño desde la consola de Firebase o un panel admin.
//
// NOTA: este archivo existe duplicado en el repo móvil (src/utils/) — mantener
// sincronizado para paridad web↔móvil.

let lastSig = '';
let lastAt = 0;

export function logEvent(type, payload = {}) {
  try {
    // Anti-spam: mismo evento repetido en <3s se ignora (evita loops de error).
    const sig = `${type}:${payload.message || ''}`;
    const now = Date.now();
    if (sig === lastSig && now - lastAt < 3000) return;
    lastSig = sig;
    lastAt = now;

    const entry = {
      type,
      ...payload,
      uid: (auth && auth.currentUser && auth.currentUser.uid) || null,
      email: (auth && auth.currentUser && auth.currentUser.email) || null,
      platform: 'web',
      url: (typeof window !== 'undefined' && window.location) ? window.location.href : null,
      ua: (typeof navigator !== 'undefined') ? navigator.userAgent : null,
      ts: serverTimestamp(),
      at: now,
    };
    // Rama por día → fácil de revisar y de purgar.
    const day = new Date().toISOString().slice(0, 10);
    push(ref(db, `telemetry/${day}`), entry).catch(() => {});
  } catch {
    /* nunca romper por telemetría */
  }
}

export function logError(error, context = {}) {
  const message = error?.message || String(error);
  const stack = error?.stack ? String(error.stack).slice(0, 2000) : null;
  logEvent('error', { message, stack, ...context });
}

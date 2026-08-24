import { ref, set, update, remove, push, onValue, get } from 'firebase/database';
import { db, auth } from '../../utils/db';

// Acceso a datos del módulo Training. Mismo patrón que utils/library.js:
// todo vive bajo users/{uid}/training/ y el CRUD es del propio usuario.
// `path` es relativo a ese subtree (ej: 'kb/principios', 'srs/obj-001').

function trainingRef(path) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('No autenticado');
  return ref(db, `users/${uid}/training/${path}`);
}

// Suscripción en vivo a un nodo-colección {id: item} → lista [{id, ...item}].
export function subscribeList(path, callback) {
  const uid = auth.currentUser?.uid;
  if (!uid) { callback([]); return () => {}; }
  return onValue(ref(db, `users/${uid}/training/${path}`), (snap) => {
    const data = snap.val() || {};
    callback(Object.entries(data).map(([id, v]) => ({ id, ...v })));
  });
}

// Suscripción a un nodo simple (objeto o valor).
export function subscribeNode(path, callback) {
  const uid = auth.currentUser?.uid;
  if (!uid) { callback(null); return () => {}; }
  return onValue(ref(db, `users/${uid}/training/${path}`), (snap) => callback(snap.val()));
}

export async function getNode(path) {
  const snap = await get(trainingRef(path));
  return snap.val();
}

export async function setItem(path, id, data) {
  await set(trainingRef(`${path}/${id}`), { ...data, updatedAt: Date.now() });
}

export async function patchItem(path, id, partial) {
  await update(trainingRef(`${path}/${id}`), { ...partial, updatedAt: Date.now() });
}

export async function removeItem(path, id) {
  await remove(trainingRef(`${path}/${id}`));
}

export async function pushItem(path, data) {
  const newRef = push(trainingRef(path));
  await set(newRef, { ...data, updatedAt: Date.now() });
  return newRef.key;
}

export async function setNode(path, data) {
  await set(trainingRef(path), data);
}

// Escritura masiva con update multi-path (para el import del seed: una sola
// operación atómica en vez de cientos de sets).
export async function bulkWrite(entries) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('No autenticado');
  const updates = {};
  for (const [path, value] of Object.entries(entries)) {
    updates[`users/${uid}/training/${path}`] = value;
  }
  await update(ref(db), updates);
}

// ── Registro diario y racha ─────────────────────────────────

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Acumula minutos/actividad en el log de hoy (merge, no pisa lo previo).
export async function logActivity({ minutos = 0, tipo = 'flashcards', detalle = '' }) {
  const key = todayKey();
  const prev = (await getNode(`log/${key}`)) || {};
  const tipos = { ...(prev.tipos || {}) };
  tipos[tipo] = (tipos[tipo] || 0) + minutos;
  await setNode(`log/${key}`, {
    minutos: (prev.minutos || 0) + minutos,
    tipos,
    notas: detalle ? `${prev.notas ? prev.notas + '\n' : ''}${detalle}` : (prev.notas || ''),
    autoevaluacion: prev.autoevaluacion || null,
    ts: Date.now(),
  });
}

// Racha de días consecutivos con práctica registrada, contando hacia atrás
// desde hoy (o desde ayer, si hoy todavía no practicó — la racha no se rompe
// hasta que termina el día).
export function computeStreak(logMap) {
  if (!logMap) return 0;
  const has = (d) => !!logMap[todayKey(d)]?.minutos;
  const day = new Date();
  let streak = 0;
  if (!has(day)) day.setDate(day.getDate() - 1); // hoy aún no practicó: mirar desde ayer
  while (has(day)) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

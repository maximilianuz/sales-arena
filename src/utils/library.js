import { ref, push, set, remove, onValue } from 'firebase/database';
import { db, auth } from './db';

// Guarda un escenario generado en la biblioteca personal del usuario.
export async function saveScenario(name, scenario, config) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('No autenticado');

  const libRef = ref(db, `users/${uid}/library`);
  const newRef = push(libRef);
  await set(newRef, {
    name: name || 'Escenario sin nombre',
    savedAt: Date.now(),
    scenario,
    config: config || null
  });
  return newRef.key;
}

export async function deleteScenario(scenarioId) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('No autenticado');
  await remove(ref(db, `users/${uid}/library/${scenarioId}`));
}

// Suscripción en tiempo real a la biblioteca. Devuelve unsubscribe.
export function subscribeToLibrary(callback) {
  const uid = auth.currentUser?.uid;
  if (!uid) { callback([]); return () => {}; }

  const libRef = ref(db, `users/${uid}/library`);
  return onValue(libRef, (snap) => {
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.savedAt - a.savedAt);
    callback(list);
  });
}

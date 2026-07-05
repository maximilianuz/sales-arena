// ─────────────────────────────────────────────────────────────────────────────
// Servicio de Propuestas VIP
// Reutiliza la MISMA instancia de Firebase Realtime Database que Sales Arena
// (src/utils/db.js). No inicializa nada nuevo → cero riesgo de conflicto.
//
// Modelo de datos (Realtime DB):
//   proposals/$id                → contenido de la propuesta (lectura pública por id)
//   proposalIndex/$uid/$id: true → índice para listar "mis propuestas" (privado)
//   proposalEvents/$id/$evId     → eventos de tracking (view/click), append-only
// ─────────────────────────────────────────────────────────────────────────────
import {
  ref, push, set, update, get, remove,
  onValue, serverTimestamp
} from 'firebase/database';
import { db, auth, app } from '../../utils/db';
// Re-export del embebido de video para no romper imports existentes.
export { loomEmbedUrl, resolveVideo, videoProviderName } from './mediaEmbed';

// Estructura vacía de una propuesta nueva (defaults del builder).
export function emptyProposal(ownerName = '') {
  return {
    ownerName,
    ownerPhoto: '',            // foto/avatar del closer (URL en Storage)
    ownerTagline: '',          // ej: "Closer de ventas high-ticket"
    niche: '',                 // nicho de la plantilla usada (wellness, b2b, etc.)
    title: '',
    prospectName: '',
    prospectHandle: '',        // @instagram, empresa o web
    coverImage: '',            // imagen de portada (URL en Storage)
    intro: '',                 // pitch / apertura personalizada
    auditPoints: [],           // [{ title, detail }] oportunidades detectadas
    offer: { summary: '', price: '', priceNote: '' },
    loomUrl: '',               // video principal (Loom, YouTube, Vimeo, IG...)
    videos: [],                // videos extra [{ title, url }] (multi-proveedor)
    gallery: [],               // imágenes [{ url, caption }]
    callUrls: [],              // grabaciones de llamadas / role-plays [{ label, url }]
    objections: [],            // [{ q, a }] objeciones resueltas
    testimonials: [],          // [{ name, text }] prueba social
    ctaCalendly: '',
    ctaWhatsapp: '',
    accent: '134,59,255',      // color de marca del closer (RGB sin envolver)
    status: 'draft'            // draft | sent
  };
}

// Crea una propuesta y devuelve su id (push key = id no adivinable).
export async function createProposal(data) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not_authenticated');

  const listRef = ref(db, 'proposals');
  const newRef = push(listRef);
  const id = newRef.key;

  const payload = {
    ...emptyProposal(),
    ...data,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await set(newRef, payload);
  // Índice privado para poder listar mis propuestas sin leer todo /proposals.
  await set(ref(db, `proposalIndex/${uid}/${id}`), true);
  return id;
}

// Actualiza una propuesta existente (solo el dueño, garantizado por reglas).
export async function updateProposal(id, data) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not_authenticated');
  await update(ref(db, `proposals/${id}`), {
    ...data,
    ownerUid: uid,             // se re-afirma para pasar la validación de reglas
    updatedAt: serverTimestamp()
  });
}

export async function deleteProposal(id) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not_authenticated');
  // Los eventos se borran PRIMERO: la regla de seguridad valida el dueño
  // consultando /proposals/$id/ownerUid, que debe seguir existiendo.
  try { await remove(ref(db, `proposalEvents/${id}`)); }
  catch (e) { console.warn('[proposal] events cleanup failed', e?.message); }
  await remove(ref(db, `proposals/${id}`));
  await remove(ref(db, `proposalIndex/${uid}/${id}`));
}

// Duplica una propuesta existente (para reusarla con otro prospecto del mismo
// nicho). Copia el contenido, resetea prospecto/estado y crea un id nuevo.
export async function duplicateProposal(source) {
  const content = { ...source };
  delete content.id;
  delete content.createdAt;
  delete content.updatedAt;
  return createProposal({
    ...content,
    title: `${content.title || 'Propuesta'} (copia)`,
    prospectName: '',
    prospectHandle: '',
    status: 'draft'
  });
}

// Lectura puntual (usada por la vista pública). No requiere auth.
export async function getProposal(id) {
  const snap = await get(ref(db, `proposals/${id}`));
  return snap.exists() ? { id, ...snap.val() } : null;
}

// Suscripción en vivo a "mis propuestas". Devuelve la función de unsubscribe.
// Lee el índice privado y luego hidrata cada propuesta.
export function subscribeMyProposals(uid, callback) {
  const idxRef = ref(db, `proposalIndex/${uid}`);
  return onValue(idxRef, async (snap) => {
    const ids = snap.exists() ? Object.keys(snap.val()) : [];
    const items = await Promise.all(ids.map((id) => getProposal(id)));
    // Más recientes primero.
    const clean = items.filter(Boolean).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(clean);
  });
}

// ── Tracking ────────────────────────────────────────────────────────────────
// Append-only: el prospecto (sin login) puede registrar view/click, pero nunca
// editar ni borrar. El dueño lee los agregados para su analytics.
export async function trackEvent(proposalId, type, label = '') {
  try {
    const evRef = push(ref(db, `proposalEvents/${proposalId}`));
    await set(evRef, { t: type, label, ts: Date.now() });
  } catch (e) {
    // Fire-and-forget: si falla el tracking, jamás rompe la vista del prospecto.
    console.warn('[proposal] track failed', e?.message);
  }
}

// Agregados de tracking para el dashboard: { views, clicks, byLabel }.
export function subscribeStats(proposalId, callback) {
  const evRef = ref(db, `proposalEvents/${proposalId}`);
  return onValue(evRef, (snap) => {
    const stats = { views: 0, clicks: 0, byLabel: {} };
    if (snap.exists()) {
      Object.values(snap.val()).forEach((ev) => {
        if (ev.t === 'view') stats.views += 1;
        if (ev.t === 'click') {
          stats.clicks += 1;
          stats.byLabel[ev.label] = (stats.byLabel[ev.label] || 0) + 1;
        }
      });
    }
    callback(stats);
  });
}

// ── Subida de imágenes a Storage ─────────────────────────────────────────────
// El SDK de Storage se importa de forma DINÁMICA (solo cuando se sube algo), así
// no pesa en el bundle inicial ni en el del módulo hasta que realmente se usa.
export async function uploadImage(file) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not_authenticated');
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  if (file.size > 10 * 1024 * 1024) throw new Error('La imagen supera los 10MB.');

  const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storage = getStorage(app);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `proposalMedia/${uid}/${Date.now()}_${safeName}`;
  const r = storageRef(storage, path);
  await uploadBytes(r, file);
  return { url: await getDownloadURL(r), path };
}

// Borra una imagen del Storage (best-effort; no rompe si ya no existe).
export async function deleteImage(path) {
  if (!path) return;
  try {
    const { getStorage, ref: storageRef, deleteObject } = await import('firebase/storage');
    await deleteObject(storageRef(getStorage(app), path));
  } catch (e) { console.warn('[proposal] delete image failed', e?.message); }
}

// Link público que el closer comparte con el prospecto.
export function publicLink(id) {
  return `${window.location.origin}/p/${id}`;
}

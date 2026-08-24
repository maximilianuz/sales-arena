import { setPath } from './lib/firebaseAdmin.js';

// Utilidad de setup: agrega un uid como admin (admin/admins/{uid}). Protegida
// por un token secreto en el header x-setup-token (SETUP_SECRET_TOKEN).
//
// Reescrito para Netlify: usaba el paquete 'firebase-admin' (no instalado) y
// la firma (req,res) de Vercel, así que nunca cargaba — cualquier llamada a
// /api/setup-admin fallaba siempre. Se pasa a la librería liviana
// firebaseAdmin.js (REST + JWT, misma FIREBASE_SERVICE_ACCOUNT que el resto
// de las funciones) y al handler estándar de Netlify.
export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secretToken = event.headers['x-setup-token'] || event.headers['X-Setup-Token'];
  const expected = process.env.SETUP_SECRET_TOKEN;
  // Si no hay token configurado en el server, denegamos por defecto (fail
  // closed) — nunca dejamos este endpoint abierto sin protección.
  if (!expected || secretToken !== expected) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { uid } = body;
  if (!uid) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing uid' }) };

  try {
    await setPath(`/admin/admins/${uid}`, { addedAt: new Date().toISOString() });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: `User ${uid} is now an admin` }) };
  } catch (error) {
    console.error('[setup-admin] error:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

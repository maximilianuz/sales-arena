import { getUserEmail, getPath, patchPath } from './lib/firebaseAdmin.js';

// Verifica si el email del usuario está en la whitelist (admin/authorizedEmails)
// y, si lo está, le otorga acceso Pro (subscriptionStatus: 'active'). Esto es lo
// que habilita también la práctica solo (isSoloAuthorized mira ese estado).
//
// Reescrito para Netlify: usa la librería liviana firebaseAdmin.js (REST + JWT,
// misma FIREBASE_SERVICE_ACCOUNT que el resto de las funciones) y el formato
// estándar `handler(event)`. La versión anterior importaba el paquete
// 'firebase-admin' (no instalado) y usaba la firma (req,res) de Vercel, así que
// nunca cargaba en Netlify — por eso agregar un email no activaba el acceso.
export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { uid, email } = body;
  if (!uid || !email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing uid or email' }) };
  }

  try {
    // Anti-spoofing: el email debe pertenecer REALMENTE al uid (según Firebase
    // Auth), no basta con que el cliente lo mande. Así nadie puede pasar un uid
    // propio + un email autorizado ajeno para colarse.
    const realEmail = await getUserEmail(uid);
    const normalized = String(email).toLowerCase().trim();
    if (!realEmail || realEmail.toLowerCase() !== normalized) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Email mismatch' }) };
    }

    // ¿El email está en la lista de autorizados?
    const list = (await getPath('/admin/authorizedEmails')) || {};
    const isAuthorized = Object.values(list).some(
      (entry) => entry && typeof entry.email === 'string' && entry.email.toLowerCase().trim() === normalized
    );
    if (!isAuthorized) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Email not authorized' }) };
    }

    // Otorgar acceso Pro permanente (plan trainer). El listener de suscripción en
    // el cliente reacciona a este cambio y el gate de práctica solo se habilita.
    await patchPath(`/users/${uid}`, {
      subscriptionStatus: 'active',
      subscriptionPlan: 'trainer',
      subscriptionExpiry: null, // permanente
      authorizedAt: new Date().toISOString(),
      authorizedMethod: 'email-whitelist'
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, plan: 'trainer', message: 'Access granted successfully' }) };
  } catch (error) {
    console.error('[verify-authorized-email] error:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};

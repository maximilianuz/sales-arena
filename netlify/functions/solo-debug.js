import { lookupUserByEmail, getPath, getUserData } from './lib/firebaseAdmin.js';

// ⚠️ ENDPOINT TEMPORAL DE DIAGNÓSTICO — BORRAR después de depurar el acceso solo.
// Se abre en el navegador (GET): /api/solo-debug?email=alguien@correo.com
// Reporta: si Identity Toolkit funciona, el uid del email, la whitelist actual,
// si el email está en la lista, y el subscriptionStatus guardado del usuario.
export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const email = (event.queryStringParameters?.email || '').toLowerCase().trim();
  if (!email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta ?email=' }) };
  }

  const out = { email };

  // 1) ¿Identity Toolkit responde? ¿Existe el usuario? ¿Cuál es su uid?
  try {
    const lk = await lookupUserByEmail(email);
    out.identityToolkit = {
      ok: lk.ok,
      status: lk.status,
      uid: lk.user?.localId || null,
      foundEmail: lk.user?.email || null,
      error: lk.error
    };
    out.uid = lk.user?.localId || null;
  } catch (e) {
    out.identityToolkit = { ok: false, error: e.message };
  }

  // 2) Whitelist actual
  try {
    const list = (await getPath('/admin/authorizedEmails')) || {};
    const emails = Object.values(list).map((e) => e && e.email).filter(Boolean);
    out.whitelist = emails;
    out.inList = emails.some((e) => String(e).toLowerCase().trim() === email);
  } catch (e) {
    out.whitelist = { error: e.message };
  }

  // 3) Estado de suscripción guardado del usuario (si tenemos uid)
  if (out.uid) {
    try {
      const u = await getUserData(out.uid);
      out.userRecord = {
        subscriptionStatus: u?.subscriptionStatus ?? null,
        subscriptionPlan: u?.subscriptionPlan ?? null,
        soloApproved: u?.soloApproved ?? null
      };
    } catch (e) {
      out.userRecord = { error: e.message };
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify(out, null, 2) };
};

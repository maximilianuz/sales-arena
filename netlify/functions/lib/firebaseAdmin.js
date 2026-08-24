// Cliente ligero de Firebase Realtime Database vía REST + OAuth2, sin el paquete
// firebase-admin (pesado, con dependencias de gRPC que inflan el bundle y generan
// cold starts de varios segundos en Netlify Functions — justo lo que causaba los
// 504 en generate.js). Usa solo 'crypto' nativo de Node para firmar el JWT.

import crypto from 'crypto';

let cachedToken = null;
let cachedTokenExpiry = 0;

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Las credenciales se aceptan en las DOS formas que circulan por el proyecto:
// el JSON entero en FIREBASE_SERVICE_ACCOUNT, o las tres variables sueltas que
// .env.example viene documentando desde siempre —y que hasta ahora el código no
// leía, así que quien seguía el ejemplo al pie de la letra terminaba con las
// functions caídas y sin ninguna pista de por qué.
//
// En la forma suelta la clave privada suele venir con los saltos de línea
// escapados (\n literal), porque muchos paneles no aceptan multilínea. Si no se
// desescapan, la firma RSA falla con un error que no menciona nada de esto.
function credencialesDeEntorno() {
  const crudo = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (crudo) {
    try { return JSON.parse(crudo); }
    catch { throw new Error('FIREBASE_SERVICE_ACCOUNT no es JSON válido.'); }
  }
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return {
    client_email: process.env.FIREBASE_CLIENT_EMAIL || '',
    private_key: privateKey,
    project_id: process.env.FIREBASE_PROJECT_ID || '',
  };
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExpiry > now + 60) {
    return cachedToken;
  }

  const serviceAccount = credencialesDeEntorno();
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Credenciales de Firebase no configuradas: falta FIREBASE_SERVICE_ACCOUNT (JSON) o el trío FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID.');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(serviceAccount.private_key, 'base64');
  const signatureUrl = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = `${unsigned}.${signatureUrl}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'No se pudo obtener access token de Google.');

  cachedToken = data.access_token;
  cachedTokenExpiry = now + data.expires_in;
  return cachedToken;
}

function dbUrl(path) {
  const base = process.env.FIREBASE_DATABASE_URL;
  if (!base) throw new Error('FIREBASE_DATABASE_URL no configurada.');
  return `${base.replace(/\/$/, '')}${path}.json`;
}

async function dbGet(path) {
  const token = await getAccessToken();
  const res = await fetch(dbUrl(path), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Firebase GET ${path} falló: ${res.status}`);
  return res.json();
}

async function dbPatch(path, data) {
  const token = await getAccessToken();
  const res = await fetch(dbUrl(path), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Firebase PATCH ${path} falló: ${res.status}`);
  return res.json();
}

async function dbSet(path, data) {
  const token = await getAccessToken();
  const res = await fetch(dbUrl(path), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Firebase PUT ${path} falló: ${res.status}`);
  return res.json();
}

export async function getUserData(uid) {
  const data = await dbGet(`/users/${uid}`);
  return data || {};
}

// Email REAL del usuario según Firebase Auth (Identity Toolkit), no el que manda
// el cliente. Sirve como anti-spoofing: antes de autorizar por email, confirmamos
// que ese email efectivamente pertenece al uid autenticado. Devuelve null si no
// existe. Requiere el scope 'identitytoolkit' (agregado arriba en el JWT).
export async function getUserEmail(uid) {
  const token = await getAccessToken();
  const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: [uid] })
  });
  if (!res.ok) throw new Error(`accounts:lookup falló: ${res.status}`);
  const data = await res.json();
  return data.users?.[0]?.email || null;
}

// Busca un usuario de Firebase Auth por email (Identity Toolkit). Devuelve el
// registro (incluye localId = uid) o info del fallo. Útil para el flujo inverso:
// del email de la whitelist al uid del usuario.
export async function lookupUserByEmail(email) {
  const token = await getAccessToken();
  const res = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [email] })
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, user: data.users?.[0] || null, error: data.error?.message || null };
}

// ¿Este uid está en admin/admins/? Se usa tanto para el gate de práctica solo
// como para autorizar endpoints exclusivos de admin (gestionar accesos, etc.).
export async function isAdmin(uid) {
  if (!uid) return false;
  try {
    const admin = await dbGet(`/admin/admins/${uid}`);
    return !!admin;
  } catch {
    return false;
  }
}

// Proveedores que significan que ALGUIEN PAGÓ de verdad. Los otorgamientos
// internos (whitelist de emails, panel de admin, bypass por ADMIN_EMAILS)
// también dejan `subscriptionStatus: 'active'`, así que el estado por sí solo
// no distingue a un cliente de alguien que agregaste a una lista.
const PROVEEDORES_DE_PAGO = ['stripe', 'mercadopago', 'nowpayments'];

// ¿Este usuario puede usar la PRÁCTICA INDIVIDUAL (que consume muchos tokens)?
// Se decide SOLO por uid, nunca por el email que manda el cliente.
//
// Antes bastaba `subscriptionStatus === 'active'`, y eso resultó demasiado
// amplio: la whitelist `admin/authorizedEmails` otorga ese mismo estado, así
// que CUALQUIERA agregado a esa lista —aunque fuera para darle acceso general
// a la app o a la práctica en equipo— quedaba habilitado también para la
// individual. En la práctica, una cuenta cualquiera entraba al Entrenamiento
// Closer sin que nadie lo hubiera decidido.
//
// Ahora son tres caminos EXPLÍCITOS:
//   1. es admin (admin/admins/{uid})
//   2. tiene users/{uid}/soloApproved === true — el visto bueno del admin,
//      que es una decisión aparte de estar en la whitelist
//   3. pagó de verdad: suscripción activa CON un proveedor de pago real
//
// Estar en la whitelist ya no alcanza por sí solo. Eso es a propósito: la
// whitelist es acceso general a la app; la práctica individual es otra cosa y
// se aprueba por separado.
export async function isSoloAuthorized(uid) {
  if (!uid) return false;
  if (await isAdmin(uid)) return true;
  try {
    const u = await getUserData(uid);
    if (u?.soloApproved === true) return true;
    if (u?.subscriptionStatus === 'active'
        && PROVEEDORES_DE_PAGO.includes(String(u?.subscriptionProvider || '').toLowerCase())) {
      return true;
    }
  } catch { /* sin datos → no autorizado */ }
  return false;
}

export async function getSubscriptionStatus(uid) {
  return dbGet(`/users/${uid}/subscriptionStatus`);
}

export async function setSessionsUsed(uid, count) {
  return dbPatch(`/users/${uid}`, { sessionsUsed: count });
}

// Auto-provisiona / actualiza el plan gratuito desde el servidor. El service
// account no está sujeto a las reglas de Firebase, así que puede escribir
// subscriptionStatus + sessionsUsed juntos sin que las reglas lo rechacen.
export async function setFreePlanUsage(uid, sessionsUsed) {
  return dbPatch(`/users/${uid}`, {
    subscriptionStatus: 'free',
    subscriptionPlan: 'free',
    sessionsUsed
  });
}

export async function activateSubscription(uid, plan, provider, durationDays) {
  const expiry = Date.now() + durationDays * 24 * 60 * 60 * 1000;
  return dbPatch(`/users/${uid}`, {
    subscriptionStatus: 'active',
    subscriptionPlan: plan,
    subscriptionProvider: provider,
    subscriptionExpiry: expiry
  });
}

export async function setPath(path, data) {
  return dbSet(path, data);
}

export async function getPath(path) {
  return dbGet(path);
}

export async function patchPath(path, data) {
  return dbPatch(path, data);
}

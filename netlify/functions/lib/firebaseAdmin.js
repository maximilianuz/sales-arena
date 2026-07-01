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

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedTokenExpiry > now + 60) {
    return cachedToken;
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT inválido o no configurado.');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
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

import { isSoloAuthorized } from './lib/firebaseAdmin.js';

// ¿El usuario puede entrar a la práctica solo? Este endpoint SOLO informa a la
// UI si mostrar el módulo o la pantalla de "pedir validación". El bloqueo real de
// tokens se hace en /api/roleplay-turn (que es exclusivo de la práctica solo).
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

  const { uid } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Se requiere autenticación.' }) };

  try {
    const allowed = await isSoloAuthorized(uid);
    return { statusCode: 200, headers, body: JSON.stringify({ allowed }) };
  } catch (e) {
    console.error('[solo-access] error:', e.message);
    // Ante un fallo de verificación seguimos negando: proteger los tokens es lo
    // que este chequeo viene a hacer, y el bloqueo real está en los endpoints
    // que gastan.
    //
    // Pero se distingue POR QUÉ. "No tenés acceso" y "no pude preguntarlo" son
    // dos cosas distintas, y confundirlas manda a alguien a pedir permiso por
    // mail cuando lo que falta es una variable de entorno. Pasa siempre en
    // local: sin FIREBASE_SERVICE_ACCOUNT el admin se queda afuera de su propia
    // app sin ninguna pista de por qué.
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ allowed: false, motivo: 'sin-verificar', detalle: e.message }),
    };
  }
};

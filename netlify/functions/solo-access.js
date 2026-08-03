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
    // Ante un fallo de verificación, negamos por defecto (protege los tokens).
    return { statusCode: 200, headers, body: JSON.stringify({ allowed: false }) };
  }
};

import { getUserData } from './lib/firebaseAdmin.js';

// ¿El dueño de la sala tiene plan pago activo? Feature "el owner paga y el
// resto entra gratis" (Room.jsx + useRoomOwnerPlan.js). El cliente NO puede
// leer users/{ownerId} directo (las reglas de Firebase solo permiten que cada
// usuario lea su propio nodo) — este endpoint expone solo el booleano
// necesario, sin filtrar el resto de los datos del dueño a otros participantes.
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

  const { ownerId } = body;
  if (!ownerId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta ownerId' }) };

  try {
    const owner = await getUserData(ownerId);
    const status = owner?.subscriptionStatus || 'none';
    const expiry = owner?.subscriptionExpiry;
    const isPaid = status === 'active' && (!expiry || expiry > Date.now());
    return { statusCode: 200, headers, body: JSON.stringify({ isPaid }) };
  } catch (error) {
    console.error('[room-owner-plan] error:', error.message);
    // Ante un fallo, negamos (el dueño no se ve como pago) para no otorgar
    // acceso gratis de más por error.
    return { statusCode: 200, headers, body: JSON.stringify({ isPaid: false }) };
  }
};

import { isAdmin, lookupUserByEmail, getUserData, patchPath } from './lib/firebaseAdmin.js';

// Gestión de accesos otorgados por email, para el panel de admin. Dos acciones:
//   - 'status': dado un array de emails (la whitelist), devuelve para cada uno
//     si ya efectivamente tiene acceso otorgado (subscriptionStatus del uid
//     real, resuelto vía Identity Toolkit) — no alcanza con estar en la lista,
//     el acceso se otorga recién cuando esa persona inicia sesión.
//   - 'revoke': además de sacar el email de la whitelist (lo hace el cliente
//     directo contra Firebase), revoca el acceso YA otorgado seteando
//     subscriptionStatus a 'revoked' en users/{uid}. Sin esto, sacar el email
//     de la lista solo evita otorgar acceso a futuro, pero no le quita el
//     acceso a quien ya inició sesión antes.
// Protegido por isAdmin(callerUid): solo admins pueden ver/gestionar esto.
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

  const { callerUid, action } = body;
  if (!(await isAdmin(callerUid))) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'not_admin' }) };
  }

  try {
    if (action === 'status') {
      const emails = Array.isArray(body.emails) ? body.emails : [];
      const results = await Promise.all(emails.map(async (email) => {
        const normalized = String(email).toLowerCase().trim();
        try {
          const lookup = await lookupUserByEmail(normalized);
          if (!lookup.user?.localId) {
            return { email: normalized, uid: null, subscriptionStatus: null, authorizedAt: null };
          }
          const uid = lookup.user.localId;
          const u = await getUserData(uid);
          return {
            email: normalized,
            uid,
            subscriptionStatus: u?.subscriptionStatus ?? null,
            authorizedAt: u?.authorizedAt ?? null
          };
        } catch {
          return { email: normalized, uid: null, subscriptionStatus: null, authorizedAt: null };
        }
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ results }) };
    }

    if (action === 'revoke') {
      const email = String(body.email || '').toLowerCase().trim();
      if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta email' }) };

      const lookup = await lookupUserByEmail(email);
      const uid = lookup.user?.localId;
      if (!uid) {
        // Nunca inició sesión → no hay nada que revocar en users/, solo se
        // saca de la whitelist (eso lo hace el cliente).
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, note: 'no_account' }) };
      }

      await patchPath(`/users/${uid}`, {
        subscriptionStatus: 'revoked',
        subscriptionPlan: null,
        subscriptionExpiry: null,
        soloApproved: false,
        revokedAt: new Date().toISOString()
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, uid }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción desconocida' }) };
  } catch (error) {
    console.error('[admin-manage-access] error:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

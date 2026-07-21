import { isAdmin, getPath } from './lib/firebaseAdmin.js';

// ⚠️ TEMPORAL — se borra después de depurar por qué el panel no mostraba los
// correos autorizados. Se abre directo en el navegador (GET):
// /api/admin-list-debug?uid=<tu-uid-admin>
export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  const uid = event.queryStringParameters?.uid || '';

  if (!(await isAdmin(uid))) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'not_admin' }) };
  }

  const raw = await getPath('/admin/authorizedEmails');
  return { statusCode: 200, headers, body: JSON.stringify({ raw }, null, 2) };
};

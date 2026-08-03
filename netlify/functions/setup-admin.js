import { lookupUserByEmail, getPath, setPath } from './lib/firebaseAdmin.js';

// Alta del primer administrador.
//
// Esta función existía pero NO PODÍA FUNCIONAR en Netlify: estaba escrita con
// la firma de Vercel/Express (`export default (req, res)` con `res.status()`),
// cuando Netlify espera `export const handler = async (event)` devolviendo
// `{ statusCode, body }`. Y encima importaba `firebase-admin`, que no es
// dependencia de nada en el proyecto, así que el módulo ni siquiera cargaba.
//
// Consecuencia: nunca hubo forma de crear `admin/admins/{uid}` desde la app
// desplegada. Y sin ese registro `isAdmin()` da false, el botón del panel no
// aparece y el admin no puede habilitar a nadie — que es exactamente el
// síntoma que se estaba viendo.
//
// Reescrita con los helpers REST del propio proyecto (lib/firebaseAdmin), sin
// dependencias nuevas.
//
// ── Quién puede llamarla ────────────────────────────────────
//
// Un endpoint que otorga admin necesita más de una traba, así que pide LAS DOS:
//
//   1. El header `x-setup-token` igual a SETUP_SECRET_TOKEN.
//   2. Que el email esté en ADMIN_EMAILS (la misma variable que ya usa
//      generate.js para reconocer admins).
//
// La segunda es la que evita que un token filtrado alcance para hacer admin a
// cualquiera. Y se pide por EMAIL y no por uid porque el uid no está a la vista
// en ningún lado: pedirlo obligaba a ir a buscarlo a la consola de Firebase.

const respuesta = (statusCode, cuerpo) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-setup-token',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(cuerpo),
});

function esEmailDeAdmin(email) {
  const lista = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(String(email || '').trim().toLowerCase());
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respuesta(204, {});
  if (event.httpMethod !== 'POST') return respuesta(405, { error: 'Method not allowed' });

  const token = event.headers['x-setup-token'] || event.headers['X-Setup-Token'];
  const esperado = process.env.SETUP_SECRET_TOKEN;
  if (!esperado) {
    return respuesta(500, { error: 'SETUP_SECRET_TOKEN no está configurada en el servidor.' });
  }
  if (token !== esperado) return respuesta(403, { error: 'Token inválido.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return respuesta(400, { error: 'Invalid JSON' }); }

  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return respuesta(400, { error: 'Falta email.' });

  if (!esEmailDeAdmin(email)) {
    return respuesta(403, {
      error: 'Ese email no está en ADMIN_EMAILS. Agregalo a la variable de entorno del sitio y volvé a intentar.',
    });
  }

  try {
    const lookup = await lookupUserByEmail(email);
    const uid = lookup.user?.localId;
    if (!uid) {
      return respuesta(404, {
        error: 'No hay ninguna cuenta con ese email. Iniciá sesión al menos una vez antes de darte de alta.',
      });
    }

    const yaEra = await getPath(`/admin/admins/${uid}`);
    if (yaEra) return respuesta(200, { success: true, uid, yaEra: true });

    await setPath(`/admin/admins/${uid}`, {
      email,
      addedAt: new Date().toISOString(),
      addedBy: 'setup-admin',
    });
    return respuesta(200, { success: true, uid, yaEra: false });
  } catch (e) {
    console.error('[setup-admin] error:', e.message);
    return respuesta(500, { error: e.message });
  }
};

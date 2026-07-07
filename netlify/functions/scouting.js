import { getUserData, getPath, setPath } from './lib/firebaseAdmin.js';

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// Cantera de closers ("juveniles" buscando su primer trabajo serio).
// - El Closer OPTA por exponerse ("Abierto a ofertas") — nunca se publica sin
//   su consentimiento, y el contacto es el que él decide compartir.
// - Solo Trainers con plan pago pueden listar la cantera: ese es el filtro
//   win-win inicial (quien busca talento tiene piel en el juego).
// - El perfil lleva un snapshot server-side de stats (no editable por el
//   cliente) → el desempeño mostrado es real.

const MIN_SESSIONS = 3; // trayectoria mínima para publicarse (evita perfiles vacíos)

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { action, uid } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };

  try {
    const userData = await getUserData(uid);

    // ── Closer publica (o retira) su perfil de la cantera ────────────────────
    if (action === 'set-profile') {
      const { openToWork, name, headline, contactEmail, country } = body;

      if (!openToWork) {
        await setPath(`/scouting/profiles/${uid}`, null);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, openToWork: false }) };
      }

      const stats = userData.stats || {};
      if ((stats.sessionsCompleted || 0) < MIN_SESSIONS) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: "need_track_record", minSessions: MIN_SESSIONS }) };
      }
      if (!contactEmail || !String(contactEmail).includes('@')) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "contact_email_required" }) };
      }

      await setPath(`/scouting/profiles/${uid}`, {
        name: String(name || 'Closer').slice(0, 60),
        headline: String(headline || '').slice(0, 140),
        contactEmail: String(contactEmail).slice(0, 120),
        country: String(country || '').slice(0, 40),
        // Snapshot de desempeño escrito por el SERVIDOR (el cliente no lo elige)
        totalEarnings: stats.totalEarnings || 0,
        closesCount: stats.closesCount || 0,
        sessionsCompleted: stats.sessionsCompleted || 0,
        bestScore: stats.bestScore || 0,
        supportPoints: stats.supportPoints || 0,
        updatedAt: Date.now(),
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, openToWork: true }) };
    }

    // ── Trainer lista la cantera (requiere plan Trainer activo) ──────────────
    if (action === 'list') {
      const isTrainer = userData.subscriptionStatus === 'active' &&
        (userData.subscriptionPlan || '').startsWith('trainer');
      if (!isTrainer) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: "trainer_plan_required" }) };
      }

      const profiles = (await getPath('/scouting/profiles')) || {};
      const list = Object.entries(profiles)
        .map(([id, p]) => ({ uid: id, ...p }))
        .sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0));
      return { statusCode: 200, headers, body: JSON.stringify({ profiles: list }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Acción desconocida." }) };
  } catch (err) {
    console.error("scouting handler error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Error interno de scouting." }) };
  }
};

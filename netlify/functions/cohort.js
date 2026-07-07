import { getUserData, getPath, patchPath, setPath } from './lib/firebaseAdmin.js';

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

// Genera un código de cohorte legible, ej "COACH-A3F9"
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `COACH-${s}`;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { action, uid } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };

  try {
    const userData = await getUserData(uid);

    // ── Trainer obtiene (o crea) su código de cohorte ─────────────────────────
    if (action === 'get-code') {
      // Solo planes pagos con tier trainer pueden tener cohorte
      const isTrainer = userData.subscriptionStatus === 'active' &&
        (userData.subscriptionPlan || '').startsWith('trainer');
      if (!isTrainer) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: "trainer_plan_required" }) };
      }

      let code = userData.cohortCode;
      if (!code) {
        // Generar código único (reintenta si colisiona)
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateCode();
          const existing = await getPath(`/cohortCodes/${candidate}`);
          if (!existing) { code = candidate; break; }
        }
        if (!code) return { statusCode: 500, headers, body: JSON.stringify({ error: "No se pudo generar código." }) };

        await setPath(`/cohortCodes/${code}`, uid);
        await patchPath(`/users/${uid}`, { cohortCode: code });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ code }) };
    }

    // ── Alumno se une a un cohorte por código ─────────────────────────────────
    if (action === 'join') {
      const { code, name, email } = body;
      if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta el código." }) };

      const normalized = code.trim().toUpperCase();
      const trainerUid = await getPath(`/cohortCodes/${normalized}`);
      if (!trainerUid) return { statusCode: 404, headers, body: JSON.stringify({ error: "code_not_found" }) };
      if (trainerUid === uid) return { statusCode: 400, headers, body: JSON.stringify({ error: "cant_join_own" }) };

      // Vincular alumno ↔ trainer
      await patchPath(`/users/${uid}`, { joinedCohort: normalized, joinedTrainerUid: trainerUid });
      await setPath(`/cohorts/${trainerUid}/students/${uid}/profile`, {
        name: name || 'Alumno',
        email: email || '',
        joinedAt: Date.now()
      });

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, code: normalized }) };
    }

    // ── Alumno abandona el cohorte ────────────────────────────────────────────
    if (action === 'leave') {
      const trainerUid = userData.joinedTrainerUid;
      await patchPath(`/users/${uid}`, { joinedCohort: null, joinedTrainerUid: null });
      if (trainerUid) {
        await setPath(`/cohorts/${trainerUid}/students/${uid}`, null);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Acción desconocida." }) };
  } catch (err) {
    console.error("cohort handler error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Error interno del cohorte." }) };
  }
};

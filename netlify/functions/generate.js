import { getUserData, setFreePlanUsage, activateSubscription } from './lib/firebaseAdmin.js';

// Lista de emails con acceso admin/dev (bypass de límites). Se configura en
// Netlify como variable de entorno ADMIN_EMAILS, separados por coma.
function isAdminEmail(email) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || '';
  const admins = raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

const DEFAULT_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// Netlify Functions en plan Free/Starter tienen un límite duro de 10s por invocación
// (no configurable por código). "llama-3.1-8b-instant" es sustancialmente más rápido
// en Groq que los modelos 70b, lo que da margen real para completar antes del corte.
// Si en el futuro se sube a Netlify Pro (timeout hasta 26s), se puede volver a un
// modelo más grande seteando AI_DEFAULT_MODEL en las variables de entorno.
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "AI_API_KEY no configurada en el servidor." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Body inválido, se esperaba JSON." }) };
  }

  const { prompt, temperature, max_tokens, uid, email, byok } = body;

  // Chequeo de suscripción — se saltea solo si el usuario usa su propia key (BYOK)
  if (!byok) {
    if (!uid) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
    }
    try {
      const userData = await getUserData(uid);
      const status = userData.subscriptionStatus;

      // Admin/dev: acceso ilimitado. Si aún no está marcado como active en la
      // base, lo activamos una vez (con expiración lejana) para que el resto de
      // la app — incluida la UI del cliente — lo trate como Pro automáticamente.
      if (isAdminEmail(email)) {
        if (status !== 'active') {
          await activateSubscription(uid, 'trainer', 'admin', 36500); // ~100 años
        }
      } else if (status === 'active') {
        // Plan pago — sin restricciones
      } else {
        // Todos los demás (free, o usuario nuevo sin registro) obtienen el
        // plan gratuito: 1 sesión. El servidor auto-provisiona el registro
        // en la primera generación, así no dependemos de que el cliente haya
        // escrito nada — el cliente ya asume 'free' por defecto, y acá quedan
        // consistentes cliente y servidor.
        const sessionsUsed = userData.sessionsUsed || 0;
        if (sessionsUsed >= 1) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: "session_limit_reached" }) };
        }
        await setFreePlanUsage(uid, sessionsUsed + 1);
      }
    } catch (e) {
      console.error("Error chequeando suscripción:", e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Error verificando suscripción." }) };
    }
  }
  if (!prompt || typeof prompt !== "string") {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Falta 'prompt' (string) en el body." }) };
  }

  const apiUrl = process.env.AI_API_URL || DEFAULT_API_URL;
  const model = process.env.AI_DEFAULT_MODEL || DEFAULT_MODEL;

  const callUpstream = async (timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const upstream = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: typeof temperature === "number" ? temperature : 0.7,
          max_tokens: typeof max_tokens === "number" ? max_tokens : 1500,
          response_format: { type: "json_object" }
        }),
        signal: controller.signal
      });
      return upstream;
    } finally {
      clearTimeout(timer);
    }
  };

  // Una sola llamada por invocación: el límite duro de Netlify Functions es ~10s
  // total (incluye el chequeo de suscripción previo), así que NO reintentamos
  // dentro de la misma invocación — eso agotaba el presupuesto y Netlify mataba
  // la función a nivel de plataforma antes de poder devolver un error legible.
  // El reintento vive del lado del cliente (ai.js), que dispara una invocación
  // nueva con presupuesto de tiempo fresco.
  try {
    const upstream = await callUpstream(8000);
    const data = await upstream.json();

    if (!upstream.ok) {
      const message = data?.error?.message || data?.message || "Error en la API de IA.";
      return { statusCode: upstream.status, headers, body: JSON.stringify({ error: message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (error) {
    console.error("generate handler error:", error);
    const isTimeout = error.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 502,
      headers,
      body: JSON.stringify({ error: isTimeout ? "timeout_upstream" : "Error al contactar al proveedor de IA." })
    };
  }
};

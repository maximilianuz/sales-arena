import { getUserData, setFreePlanUsage, activateSubscription } from './lib/firebaseAdmin.js';
import { llmChat } from './lib/llm.js';
import { GROUP_ONLY_MODE } from './lib/appMode.js';

// Lista de emails con acceso admin/dev (bypass de límites). Se configura en
// Netlify como variable de entorno ADMIN_EMAILS, separados por coma.
function isAdminEmail(email) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || '';
  const admins = raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// El modelo y la URL viven en lib/llm.js (cadena de proveedores con respaldo).
// El default sigue siendo Groq llama-3.1-8b-instant (rápido, entra en el límite
// de ~10s de Netlify Functions).

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


  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Body inválido, se esperaba JSON." }) };
  }

  const { prompt, temperature, max_tokens, uid, email, byok } = body;

  // Chequeo de suscripción — se saltea si el usuario usa su propia key (BYOK) o
  // si la app corre en modo solo-grupal (todo gratis e ilimitado): ahí solo
  // exigimos autenticación y NO aplicamos el límite de sesiones del plan free.
  // Saltear el viaje a Firebase además libera presupuesto de tiempo para la IA.
  if (!byok && GROUP_ONLY_MODE) {
    if (!uid) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
    }
  } else if (!byok) {
    if (!uid) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
    }
    try {
      const userData = await getUserData(uid);
      const status = userData.subscriptionStatus;

      // Admin/dev: acceso ilimitado como Trainer. Nos aseguramos de que quede
      // marcado active CON plan 'trainer' (para que la UI muestre Analytics),
      // incluso si ya estaba active con otro plan por una edición manual previa.
      if (isAdminEmail(email)) {
        const plan = userData.subscriptionPlan || '';
        if (status !== 'active' || !plan.startsWith('trainer')) {
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

  // Cadena de proveedores (tier 'smart' = modelo potente 70B para razonamiento profundo).
  // La generación de buyer persona requiere análisis psicológico complejo.
  // Si el principal está agotado (429/límite diario), salta solo al de respaldo.
  // Reintento adicional del lado del cliente (ai.js) con presupuesto de tiempo fresco.
  // Timeouts optimizados para Netlify (10s hard limit): fallar rápido en cada proveedor
  // permite que Flowise/NVIDIA/Groq se intenten sin exceder el límite.
  try {
    const { content } = await llmChat({
      tier: 'smart',
      messages: [{ role: 'user', content: prompt }],
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      max_tokens: typeof max_tokens === 'number' ? max_tokens : 1500,
      timeoutMs: 9000,
      budgetMs: 9300,
      // Carrera: si NVIDIA no arranca en ~1.2s, se dispara Groq en paralelo y
      // gana el primero. Evita que un NVIDIA lento/encolado agote el presupuesto.
      hedgeMs: 1200,
    });
    // Devolvemos el shape que espera el cliente (choices[0].message.content).
    return { statusCode: 200, headers, body: JSON.stringify({ choices: [{ message: { content } }] }) };
  } catch (error) {
    console.error("generate handler error:", error.message);
    const isTimeout = /timeout/i.test(error.message || '');
    return {
      statusCode: error.allFailed ? 429 : (isTimeout ? 504 : 502),
      headers,
      body: JSON.stringify({ error: error.allFailed ? "Todos los proveedores de IA están saturados. Probá en unos minutos." : (isTimeout ? "timeout_upstream" : "Error al contactar al proveedor de IA.") })
    };
  }
};

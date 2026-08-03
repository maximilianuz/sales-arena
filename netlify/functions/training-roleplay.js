import { getUserData, isSoloAuthorized } from './lib/firebaseAdmin.js';

// Turno del PROSPECTO en el simulador del módulo Training + detección de error
// en rapid-cycle. Dos llamadas en paralelo y deliberadamente separadas:
//
//   1) el personaje (70B) — actúa, no sabe que lo están auditando;
//   2) el auditor (8B) — mira el último turno del closer contra los principios.
//
// Si el auditor y el personaje fueran la misma llamada, el personaje "sabría"
// el error y respondería contaminado (te perdona o te castiga de más).
//
// Modelos NVIDIA (integrate.api.nvidia.com, compatible OpenAI). Ojo: los ids
// llevan barra (meta/llama-...), no guion.
//
// Por qué el 8B y no un modelo grande, que actuaría mejor: Netlify corta las
// funciones sincrónicas a los 10s. Medido con este mismo prompt (~5.5k chars,
// 320 tokens de salida) sobre el free tier de NVIDIA:
//   meta/llama-3.1-70b-instruct          → 8.9s / 11.2s / 16.7s  ✗ no entra
//   nvidia/llama-3.3-nemotron-super-49b  → no respeta json_object ✗
//   meta/llama-3.1-8b-instruct           → 5.8s / 1.5s / 0.9s     ✓
// El 8B mantiene el personaje y la objeción oculta lo suficiente para entrenar.
// Si algún día movés esto a un host con timeout largo, subí el modelo con la env
// var ROLEPLAY_MODEL — el fallback de abajo cubre que el grande esté saturado.

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";
const FALLBACK_MODEL = "meta/llama-3.1-8b-instruct";
const AUDIT_MODEL = "meta/llama-3.1-8b-instruct";

async function chat(apiKey, { model, system, messages, maxTokens, temperature, signal }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }
    }),
    signal
  });
  if (!res.ok) {
    const err = new Error(`upstream_${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('empty_response');
  return JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
}

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "NVIDIA_API_KEY no configurada." }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { uid, system, messages, rapidCycle } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
  if (typeof system !== 'string' || !Array.isArray(messages)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "system y messages son requeridos." }) };
  }

  try {
    await getUserData(uid);
  } catch {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Usuario no encontrado." }) };
  }

  // El candado real de tokens. `getUserData` solo confirmaba que el usuario
  // EXISTE, así que cualquier cuenta logueada podía consumir la API de NVIDIA
  // por acá. El Entrenamiento Closer va por la misma whitelist que la práctica
  // solo: una sola aprobación del admin habilita las dos, y así no hay que
  // validar a la misma persona dos veces.
  try {
    if (!(await isSoloAuthorized(uid))) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Tu cuenta todavía no tiene acceso al Entrenamiento Closer." }) };
    }
  } catch {
    // Ante un fallo de verificación, se niega: proteger los tokens es lo que
    // este chequeo viene a hacer.
    return { statusCode: 403, headers, body: JSON.stringify({ error: "No se pudo verificar el acceso." }) };
  }

  // Últimos 16 turnos: alcanza para coherencia y mantiene la latencia baja.
  // Mapeamos a {role, content} pelado — el cliente guarda campos extra (emotion,
  // ts) y la API valida el esquema estricto.
  const trimmed = messages.slice(-16)
    .filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({ role: m.role, content: m.content }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const turnoPersonaje = (async () => {
      const opts = { system, messages: trimmed, maxTokens: 320, temperature: 0.85, signal: controller.signal };
      try {
        return await chat(apiKey, { ...opts, model: process.env.ROLEPLAY_MODEL || DEFAULT_MODEL });
      } catch (e) {
        // 429/503 = modelo saturado en el free tier. Si estabas usando un
        // override más grande, caemos al chico: peor actuación pero la sesión
        // no se corta a mitad de una llamada.
        const usado = process.env.ROLEPLAY_MODEL || DEFAULT_MODEL;
        if ((e.status === 503 || e.status === 429) && usado !== FALLBACK_MODEL) {
          return await chat(apiKey, { ...opts, model: FALLBACK_MODEL });
        }
        throw e;
      }
    })();

    // El auditor es opcional: si no viene rapidCycle, no gastamos la llamada.
    const auditoria = rapidCycle?.system && rapidCycle?.turnoCloser
      ? chat(apiKey, {
          model: process.env.RAPIDCYCLE_MODEL || AUDIT_MODEL,
          system: rapidCycle.system,
          messages: [{ role: 'user', content: `TURNO DEL CLOSER A AUDITAR:\n"${String(rapidCycle.turnoCloser).slice(0, 1500)}"` }],
          maxTokens: 250,
          temperature: 0.2, // el auditor no improvisa
          signal: controller.signal
        }).catch(() => null) // si falla la auditoría, la sesión sigue igual
      : Promise.resolve(null);

    const [turn, audit] = await Promise.all([turnoPersonaje, auditoria]);

    const clamp = (n, def) => {
      const v = Number(n);
      return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : def;
    };
    const st = turn.state || {};
    const EMOTIONS = ['neutral', 'interesado', 'esceptico', 'molesto', 'entusiasmado', 'dudoso', 'apurado'];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: typeof turn.reply === 'string' ? turn.reply : '...',
        emotion: EMOTIONS.includes(turn.emotion) ? turn.emotion : 'neutral',
        state: { temperature: clamp(st.temperature, 35), trust: clamp(st.trust, 25), patience: clamp(st.patience, 70) },
        revealedHiddenObjection: !!turn.revealedHiddenObjection,
        thought: typeof turn.thought === 'string' ? turn.thought : '',
        outcome: ['ongoing', 'closed', 'lost'].includes(turn.outcome) ? turn.outcome : 'ongoing',
        // null = turno correcto (o auditoría desactivada/fallida).
        error: audit?.hayError ? {
          principioId: audit.principioId || null,
          que: String(audit.que || '').slice(0, 300),
          comoRehacerlo: String(audit.comoRehacerlo || '').slice(0, 300),
          gravedad: Math.min(3, Math.max(1, Number(audit.gravedad) || 1)),
        } : null,
      })
    };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return { statusCode: isTimeout ? 504 : 502, headers, body: JSON.stringify({ error: isTimeout ? "timeout_upstream" : "Error al contactar la IA." }) };
  } finally {
    clearTimeout(timer);
  }
};

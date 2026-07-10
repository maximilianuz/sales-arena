import { getUserData } from './lib/firebaseAdmin.js';
import { llmChat } from './lib/llm.js';

// Un turno del COMPRADOR IA. Recibe el system prompt del buyer + el historial y
// devuelve la respuesta estructurada del lead. El modelo/proveedor (y sus
// respaldos) viven en lib/llm.js — tier 'smart' = modelo potente (70b por
// defecto) para actuar el personaje y razonar sobre la técnica del closer.

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "AI_API_KEY no configurada." }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { uid, system, messages } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
  if (typeof system !== 'string' || !Array.isArray(messages)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "system y messages son requeridos." }) };
  }

  // Verificación liviana: el usuario debe existir. No exigimos plan pago acá
  // (el modo solo es el gancho de conversión), pero sí que esté autenticado y
  // registrado para evitar abuso anónimo del proxy.
  try {
    await getUserData(uid);
  } catch {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Usuario no encontrado." }) };
  }

  // Recortamos el historial: los últimos ~16 turnos alcanzan para coherencia y
  // mantienen los tokens bajos (límite 6000 TPM del free tier + 10s de Netlify).
  // IMPORTANTE: mapeamos a {role, content} pelado — los clientes guardan campos
  // extra en los mensajes (p. ej. "emotion" para el chip de la UI) y la API de
  // Groq valida el esquema estricto y rechaza propiedades desconocidas con 400.
  const trimmed = messages.slice(-16)
    .filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({ role: m.role, content: m.content }));

  try {
    // Cadena de proveedores (tier 'smart' = modelo potente para el diálogo). Si el
    // principal está agotado (429/límite), salta al de respaldo en vez de esperar.
    const { content } = await llmChat({
      tier: 'smart',
      messages: [{ role: "system", content: system }, ...trimmed],
      temperature: 0.85,
      max_tokens: 320,
      timeoutMs: 8000,
      budgetMs: 9000,
    });

    let turn;
    try {
      turn = JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
    } catch {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "JSON malformado de la IA." }) };
    }

    // Blindaje del shape antes de devolverlo al cliente.
    const clamp = (n, def) => {
      const v = Number(n);
      return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : def;
    };
    const st = turn.state || {};
    const outcome = ['ongoing', 'closed', 'lost'].includes(turn.outcome) ? turn.outcome : 'ongoing';
    // Emoción del turno: lista cerrada (define la prosodia de la voz y el chip en la UI).
    const EMOTIONS = ['neutral', 'interesado', 'esceptico', 'molesto', 'entusiasmado', 'dudoso', 'apurado'];
    const emotion = EMOTIONS.includes(turn.emotion) ? turn.emotion : 'neutral';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: typeof turn.reply === 'string' ? turn.reply : '...',
        emotion,
        state: { temperature: clamp(st.temperature, 35), trust: clamp(st.trust, 25), patience: clamp(st.patience, 70) },
        revealedHiddenObjection: !!turn.revealedHiddenObjection,
        thought: typeof turn.thought === 'string' ? turn.thought : '',
        outcome
      })
    };
  } catch (error) {
    const isTimeout = /timeout/i.test(error.message || '');
    return {
      statusCode: error.allFailed ? 429 : (isTimeout ? 504 : 502),
      headers,
      body: JSON.stringify({ error: error.allFailed ? "El servicio de IA está saturado en todos los proveedores. Probá en unos segundos." : (isTimeout ? "timeout_upstream" : "Error al contactar la IA.") })
    };
  }
};

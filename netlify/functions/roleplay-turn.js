import { isSoloAuthorized } from './lib/firebaseAdmin.js';
import { llmChat } from './lib/llm.js';

// Extrae el turno del comprador de la respuesta cruda del modelo. El modelo
// rápido (8B) y algunos proveedores (NVIDIA rechaza json_object) a veces
// devuelven JSON con prosa alrededor, comas colgantes, comillas tipográficas o
// TRUNCADO (se corta por max_tokens). En vez de tumbar la charla con un 502,
// intentamos varias estrategias y, como último recurso, usamos el texto plano
// como respuesta: la conversación NUNCA se corta por un JSON imperfecto.
function extractBuyerTurn(raw) {
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

  let text = String(raw || '').trim()
    // saca cercos de código markdown ```json ... ```
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // 1) Objeto balanceado desde el primer '{' (respetando strings y escapes).
  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    let candidate = end !== -1 ? text.slice(start, end + 1) : text.slice(start);
    // Si quedó truncado (sin cierre): cerramos string abierto y las llaves.
    if (end === -1) {
      if (inStr) candidate += '"';
      candidate += '}'.repeat(Math.max(1, depth));
    }
    const repaired = candidate
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1'); // comas colgantes
    const obj = tryParse(candidate) || tryParse(repaired);
    if (obj && typeof obj === 'object') return obj;
  }

  // 2) Último recurso: rescatar solo el campo "reply" si está.
  const m = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) return { reply: m[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim() };

  // 3) Nada parseable: usar el texto plano (sin llaves ni claves) como reply.
  const plain = text.replace(/[{}[\]]/g, '').replace(/"\w+"\s*:/g, '').replace(/\s+/g, ' ').trim();
  return { reply: plain || '...' };
}

// Un turno del COMPRADOR IA. Recibe el system prompt del buyer + el historial y
// devuelve la respuesta estructurada del lead. El modelo/proveedor (y sus
// respaldos) viven en lib/llm.js — tier 'fast' = modelo rápido (8b por
// defecto) para diálogo natural y respuestas inmediatas en roleplay.

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };


  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { uid, system, messages } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
  if (typeof system !== 'string' || !Array.isArray(messages)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "system y messages son requeridos." }) };
  }

  // Autorización de práctica solo: este endpoint es EXCLUSIVO del modo solo (las
  // salas grupales no lo usan), y consume tokens de la API en cada turno. Solo
  // pueden usarlo los usuarios validados por el admin (por uid → no spoofeable).
  // Los demás deben pedir validación por email antes de practicar.
  if (!(await isSoloAuthorized(uid))) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "solo_not_authorized" }) };
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
    // Cadena de proveedores (tier 'fast' = modelo rápido 8B para diálogo ágil). Si el
    // principal está agotado (429/límite), salta al de respaldo en vez de esperar.
    // Timeouts optimizados para Netlify (10s hard limit): consultas de diálogo son
    // más rápidas que scenario generation, así que podemos ser más agresivos.
    const { content } = await llmChat({
      tier: 'fast',
      messages: [{ role: "system", content: system }, ...trimmed],
      temperature: 0.85,
      max_tokens: 420, // margen para que el JSON no se trunque (reply + thought + state)
      timeoutMs: 6500,
      budgetMs: 8000,
    });

    // Parseo tolerante a fallas: nunca cortamos la charla por un JSON imperfecto.
    const turn = extractBuyerTurn(content);

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

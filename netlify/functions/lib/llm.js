// Cadena de proveedores LLM (compatibles con la API de OpenAI). Se prueban en
// ORDEN; si uno se agota (429/límite diario), falla (5xx) o no tiene key, se
// pasa automáticamente al siguiente → la app NUNCA se queda sin IA mientras
// haya al menos un proveedor con cupo. Clave para que planificar un escenario
// (buyer persona + escenario del closer) SIEMPRE devuelva respuesta.
//
// Orden: NVIDIA #1 → NVIDIA #2 → Groq (fallback)
//
// Overrides opcionales por proveedor (si cambian nombres de modelo):
//   <PROV>_MODEL_FAST, <PROV>_MODEL_SMART, <PROV>_MODEL, <PROV>_URL
//   Ej: NVIDIA_MODEL_SMART=meta/llama-3.1-70b-instruct
//       NVIDIA_API_KEY_2=... (segunda API key)
//       NVIDIA_MODEL_2_SMART=meta/llama-3.3-70b-instruct
//
// `tier`: 'fast' = generar escenario / puntuar (modelo chico) · 'smart' = diálogo.

function envModel(prefix, tier, def) {
  return process.env[`${prefix}_MODEL_${tier === 'fast' ? 'FAST' : 'SMART'}`]
    || process.env[`${prefix}_MODEL`]
    || def;
}

// Normaliza la URL del proveedor al endpoint de chat-completions. Acepta que
// la env var traiga el host pelado, la base /v1, o la URL completa — todas
// terminan en .../v1/chat/completions. (Causa real de 404: NVIDIA_URL cargada
// como https://integrate.api.nvidia.com/v1 sin el path del endpoint.)
function chatUrl(url) {
  if (!url) return url;
  let u = String(url).trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/.test(u)) return u;
  if (!/\/v1$/.test(u)) u += '/v1';
  return u + '/chat/completions';
}

// Catálogo ordenado. Cada proveedor se activa SOLO si su key está presente.
// `supportsJson`: si el proveedor acepta response_format:json_object. Los NIMs
// de NVIDIA (Llama 3.1/3.2/3.3) suelen RECHAZAR ese parámetro con un 400, así
// que NO se lo mandamos: el prompt ya pide JSON y el cliente extrae el objeto.
function providerChain() {
  const chain = [];
  const add = (name, prefix, url, key, fastDef, smartDef, supportsJson = true) => {
    if (!url || !key) return;
    chain.push({
      name, url: chatUrl(url), key, supportsJson,
      fast: envModel(prefix, 'fast', fastDef),
      smart: envModel(prefix, 'smart', smartDef),
    });
  };

  // 1. NVIDIA #1 (proveedor principal) - Optimizado para equipos
  add('nvidia-1', 'NVIDIA',
    process.env.NVIDIA_URL || 'https://integrate.api.nvidia.com/v1/chat/completions',
    process.env.NVIDIA_API_KEY,
    'meta/llama-3.1-8b-instruct', 'meta/llama-3.1-70b-instruct', false);

  // 2. NVIDIA #2 (segundo proveedor NVIDIA con modelo diferente)
  add('nvidia-2', 'NVIDIA_2',
    process.env.NVIDIA_URL_2 || 'https://integrate.api.nvidia.com/v1/chat/completions',
    process.env.NVIDIA_API_KEY_2,
    'meta/llama-3.2-3b-instruct', 'meta/llama-3.3-70b-instruct', false);

  // 3. Groq (fallback final) — sí soporta json_object.
  add('groq', 'GROQ',
    process.env.GROQ_URL || process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
    process.env.GROQ_API_KEY || process.env.AI_API_KEY,
    process.env.AI_DEFAULT_MODEL || 'llama-3.1-8b-instant',
    process.env.ROLEPLAY_MODEL || 'llama-3.3-70b-versatile', true);

  return chain;
}

// CUALQUIER error HTTP de un proveedor salta al siguiente de la cadena: la
// peculiaridad de UN proveedor (400 por parámetro no soportado, 404 por URL o
// modelo mal cargado, 401/403 por key vencida, 429 por cupo, 5xx por caída)
// nunca debe tumbar toda la cadena. El último proveedor sí propaga su error.
function shouldFailover() {
  return true;
}

// Un intento contra UN proveedor, con su propio timeout. Devuelve
// { content, provider, model } o lanza (con .status si fue error HTTP).
async function callProvider(p, { tier, messages, temperature, max_tokens, useJson, attemptMs }) {
  const model = tier === 'fast' ? p.fast : p.smart;
  if (!model) throw new Error(`${p.name}: sin modelo para tier ${tier}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), attemptMs);
  try {
    // Proveedores OpenAI-compatible (NVIDIA, Groq, etc). Solo mandamos
    // response_format a los que lo soportan (Groq); NVIDIA lo rechaza con 400.
    const payload = { model, messages, temperature, max_tokens };
    if (useJson && p.supportsJson !== false) payload.response_format = { type: 'json_object' };

    const res = await fetch(p.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.key}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(`${p.name}: HTTP ${res.status}${data?.error?.message ? ` (${data.error.message})` : ''}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error(`${p.name}: respuesta vacía`);
    }
    return { content, provider: p.name, model };
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error(`${p.name}: timeout`);
      err.status = 408;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Chat-completion probando la cadena. Devuelve { content, provider, model } o
// lanza Error (con .allFailed si se agotaron todos). Respeta un presupuesto de
// tiempo total (Netlify mata la función a ~10s) para no colgarse.
//
// `hedgeMs`: modo CARRERA. Se dispara el proveedor principal y, si en hedgeMs
// no respondió, se dispara TAMBIÉN el último (fallback) en paralelo — gana el
// primero que responda bien. Clave para generaciones largas: los endpoints
// gratuitos de NVIDIA pueden encolar/tardar, y sin carrera se comían el
// presupuesto dejando al fallback sin ventana útil dentro de los ~10s de Netlify.
export async function llmChat({ tier = 'smart', messages, temperature = 0.7, max_tokens = 1024, jsonMode, timeoutMs = 8000, budgetMs = 9000, hedgeMs = null } = {}) {
  const useJson = jsonMode === undefined ? !process.env.LLM_DISABLE_JSON_MODE : jsonMode;
  const chain = providerChain();
  if (chain.length === 0) throw new Error('No hay proveedores LLM configurados (falta al menos una API key).');

  const start = Date.now();
  const opts = { tier, messages, temperature, max_tokens, useJson };

  // ── Modo carrera (hedge): principal vs. fallback en paralelo ──
  if (hedgeMs != null && chain.length > 1) {
    const primary = chain[0];
    const fallback = chain[chain.length - 1];
    const errors = [];

    const pPrimary = callProvider(primary, { ...opts, attemptMs: Math.min(timeoutMs, budgetMs - 300) })
      .catch((e) => { errors.push(e.message); throw e; });

    const pFallback = (async () => {
      await sleep(hedgeMs);
      const remaining = budgetMs - (Date.now() - start) - 200;
      if (remaining < 1200) throw new Error(`${fallback.name}: sin presupuesto`);
      return callProvider(fallback, { ...opts, attemptMs: Math.min(timeoutMs, remaining) });
    })().catch((e) => { errors.push(e.message); throw e; });

    try {
      // Gana el primero que RESPONDA BIEN; los errores no cortan la carrera.
      return await Promise.any([pPrimary, pFallback]);
    } catch {
      const err = new Error(`Todos los proveedores de IA fallaron (${errors.join(' · ') || 'desconocido'}).`);
      err.allFailed = true;
      throw err;
    }
  }

  // ── Modo secuencial (cadena con reserva para el fallback) ──
  let lastErr = 'desconocido';

  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    if (!(tier === 'fast' ? p.fast : p.smart)) continue;

    const remaining = budgetMs - (Date.now() - start);
    if (remaining < 1200) break;
    const isLast = i === chain.length - 1;

    // Reserva de presupuesto: un proveedor intermedio no puede comerse todo el
    // tiempo — siempre le dejamos ~3s al último (fallback) para que llegue a
    // intentar. Si a este intento no le queda ventana útil, saltamos al siguiente.
    let attemptMs = Math.min(timeoutMs, remaining);
    if (!isLast) {
      attemptMs = Math.min(attemptMs, remaining - 3000);
      if (attemptMs < 1200) continue;
    }

    try {
      return await callProvider(p, { ...opts, attemptMs });
    } catch (e) {
      lastErr = e.message;
      // CUALQUIER error de un proveedor intenta el siguiente (ver shouldFailover).
      if (isLast || !shouldFailover(e.status)) {
        const err = new Error(`Todos los proveedores de IA fallaron (${lastErr}).`);
        err.allFailed = true;
        throw err;
      }
    }
  }

  const err = new Error(`Todos los proveedores de IA fallaron (${lastErr}).`);
  err.allFailed = true;
  throw err;
}

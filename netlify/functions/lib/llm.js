// Cadena de proveedores LLM (compatibles con la API de OpenAI). Se prueban en
// ORDEN; si uno se agota (429/límite diario), falla (5xx) o no tiene key, se
// pasa automáticamente al siguiente → la app NUNCA se queda sin IA mientras
// haya al menos un proveedor con cupo. Clave para que planificar un escenario
// (buyer persona + escenario del closer) SIEMPRE devuelva respuesta.
//
// Vos solo cargás la KEY de cada proveedor en Netlify; el código ya sabe su URL
// y sus modelos. Orden por defecto: Cerebras → Gemini → Groq → OpenRouter →
// Mistral → GitHub Models. (Groq sigue leyendo AI_API_KEY por retrocompat.)
//
// Overrides opcionales por proveedor (si cambian nombres de modelo):
//   <PROV>_MODEL_FAST, <PROV>_MODEL_SMART, <PROV>_MODEL, <PROV>_URL
//   Ej: CEREBRAS_MODEL_SMART=llama-4-scout-17b-16e-instruct
//
// `tier`: 'fast' = generar escenario / puntuar (modelo chico) · 'smart' = diálogo.

function envModel(prefix, tier, def) {
  return process.env[`${prefix}_MODEL_${tier === 'fast' ? 'FAST' : 'SMART'}`]
    || process.env[`${prefix}_MODEL`]
    || def;
}

// Catálogo ordenado. Cada proveedor se activa SOLO si su key está presente.
function providerChain() {
  const chain = [];
  const add = (name, prefix, url, key, fastDef, smartDef) => {
    if (!url || !key) return;
    chain.push({
      name, url, key,
      fast: envModel(prefix, 'fast', fastDef),
      smart: envModel(prefix, 'smart', smartDef),
    });
  };

  add('cerebras', 'CEREBRAS',
    process.env.CEREBRAS_URL || 'https://api.cerebras.ai/v1/chat/completions',
    process.env.CEREBRAS_API_KEY, 'gpt-oss-120b', 'gpt-oss-120b');

  add('gemini', 'GEMINI',
    process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    process.env.GEMINI_API_KEY, 'gemini-2.0-flash', 'gemini-2.0-flash');

  add('groq', 'GROQ',
    process.env.GROQ_URL || process.env.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
    process.env.GROQ_API_KEY || process.env.AI_API_KEY,
    process.env.AI_DEFAULT_MODEL || 'llama-3.1-8b-instant',
    process.env.ROLEPLAY_MODEL || 'llama-3.3-70b-versatile');

  add('openrouter', 'OPENROUTER',
    process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions',
    process.env.OPENROUTER_API_KEY,
    'meta-llama/llama-3.3-70b-instruct:free', 'meta-llama/llama-3.3-70b-instruct:free');

  add('github', 'GITHUB_MODELS',
    process.env.GITHUB_MODELS_URL || 'https://models.inference.ai.azure.com/chat/completions',
    process.env.GITHUB_MODELS_TOKEN, 'gpt-4o-mini', 'gpt-4o-mini');

  // Slots genéricos extra (cualquier otro proveedor estilo OpenAI).
  for (const n of ['LLM2', 'LLM3', 'LLM4']) {
    add(n.toLowerCase(), n, process.env[`${n}_URL`], process.env[`${n}_KEY`],
      process.env[`${n}_MODEL_FAST`] || process.env[`${n}_MODEL`],
      process.env[`${n}_MODEL_SMART`] || process.env[`${n}_MODEL`]);
  }

  return chain;
}

// Errores por los que conviene saltar al siguiente proveedor (agotamiento, auth
// del slot, o caída). Un 400 puro (bad request) NO hace failover.
function shouldFailover(status) {
  return status === 429 || status === 402 || status === 401 || status === 403 || status === 408 || status >= 500;
}

// Chat-completion probando la cadena. Devuelve { content, provider, model } o
// lanza Error (con .allFailed si se agotaron todos). Respeta un presupuesto de
// tiempo total (Netlify mata la función a ~10s) para no colgarse.
export async function llmChat({ tier = 'smart', messages, temperature = 0.7, max_tokens = 1024, jsonMode, timeoutMs = 8000, budgetMs = 9000 } = {}) {
  const useJson = jsonMode === undefined ? !process.env.LLM_DISABLE_JSON_MODE : jsonMode;
  const chain = providerChain();
  if (chain.length === 0) throw new Error('No hay proveedores LLM configurados (falta al menos una API key).');

  const start = Date.now();
  let lastErr = 'desconocido';

  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    const model = tier === 'fast' ? p.fast : p.smart;
    if (!model) continue;

    const remaining = budgetMs - (Date.now() - start);
    if (remaining < 1500) break;
    const isLast = i === chain.length - 1;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, remaining));
    try {
      const payload = { model, messages, temperature, max_tokens };
      if (useJson) payload.response_format = { type: 'json_object' };

      const res = await fetch(p.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.key}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        lastErr = `${p.name}: HTTP ${res.status}`;
        if (shouldFailover(res.status) && !isLast) continue;
        const data = await res.json().catch(() => ({}));
        const err = new Error(data?.error?.message || data?.message || `Error del proveedor (${res.status}).`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        lastErr = `${p.name}: respuesta vacía`;
        if (!isLast) continue;
        throw new Error('La IA devolvió una respuesta vacía.');
      }
      return { content, provider: p.name, model };
    } catch (e) {
      lastErr = `${p.name}: ${e.name === 'AbortError' ? 'timeout' : e.message}`;
      if (e.status && !shouldFailover(e.status)) throw e; // error definitivo del cliente
      if (i === chain.length - 1) {
        const err = new Error(`Todos los proveedores de IA fallaron (${lastErr}).`);
        err.allFailed = true;
        throw err;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  const err = new Error(`Todos los proveedores de IA fallaron (${lastErr}).`);
  err.allFailed = true;
  throw err;
}

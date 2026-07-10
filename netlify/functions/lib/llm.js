// Cadena de proveedores LLM (compatibles con la API de OpenAI). Se prueban en
// ORDEN; si uno se agota (429/límite diario), falla (5xx) o no está configurado,
// se pasa automáticamente al siguiente → la app no se queda sin IA.
//
// Configuración por variables de entorno:
//   Slot 1 (principal, retrocompatible):
//     AI_API_URL, AI_API_KEY, AI_DEFAULT_MODEL (rápido), ROLEPLAY_MODEL (potente)
//   Slot 2 (respaldo):  LLM2_URL, LLM2_KEY, LLM2_MODEL_FAST, LLM2_MODEL_SMART
//   Slot 3 (respaldo):  LLM3_URL, LLM3_KEY, LLM3_MODEL_FAST, LLM3_MODEL_SMART
//   (LLM2_MODEL / LLM3_MODEL sirven como fallback si un slot usa el mismo modelo
//    para ambos tiers.)
//
// `tier`: 'fast' = generación/análisis (modelo chico) · 'smart' = diálogo del lead.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function providerChain() {
  const slots = [
    {
      name: 'primary',
      url: process.env.AI_API_URL || GROQ_URL,
      key: process.env.AI_API_KEY,
      fast: process.env.AI_DEFAULT_MODEL || 'llama-3.1-8b-instant',
      smart: process.env.ROLEPLAY_MODEL || 'llama-3.3-70b-versatile',
    },
    {
      name: 'backup2',
      url: process.env.LLM2_URL,
      key: process.env.LLM2_KEY,
      fast: process.env.LLM2_MODEL_FAST || process.env.LLM2_MODEL,
      smart: process.env.LLM2_MODEL_SMART || process.env.LLM2_MODEL,
    },
    {
      name: 'backup3',
      url: process.env.LLM3_URL,
      key: process.env.LLM3_KEY,
      fast: process.env.LLM3_MODEL_FAST || process.env.LLM3_MODEL,
      smart: process.env.LLM3_MODEL_SMART || process.env.LLM3_MODEL,
    },
  ];
  return slots.filter(s => s.url && s.key);
}

// Errores por los que conviene saltar al siguiente proveedor (agotamiento,
// auth del slot, o caída del proveedor). Un 400 puro (bad request) NO se failover.
function shouldFailover(status) {
  return status === 429 || status === 402 || status === 401 || status === 403 || status === 408 || status >= 500;
}

// Hace una chat-completion probando la cadena. Devuelve { content, provider, model }
// o lanza un Error (con .allFailed si se agotaron todos). Respeta un presupuesto
// de tiempo total (Netlify mata la función a ~10s) para no colgarse.
export async function llmChat({ tier = 'smart', messages, temperature = 0.7, max_tokens = 1024, jsonMode = true, timeoutMs = 8000, budgetMs = 9000 } = {}) {
  const chain = providerChain();
  if (chain.length === 0) throw new Error('No hay proveedores LLM configurados (falta AI_API_KEY).');

  const start = Date.now();
  let lastErr = 'desconocido';

  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    const model = tier === 'fast' ? p.fast : p.smart;
    if (!model) continue;

    const remaining = budgetMs - (Date.now() - start);
    if (remaining < 1500) break; // sin presupuesto para otro intento
    const isLast = i === chain.length - 1;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, remaining));
    try {
      const payload = { model, messages, temperature, max_tokens };
      if (jsonMode) payload.response_format = { type: 'json_object' };

      const res = await fetch(p.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.key}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        lastErr = `${p.name}: HTTP ${res.status}`;
        if (shouldFailover(res.status) && !isLast) continue; // agotado/caído → siguiente
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
      // Error definitivo del cliente (no failover) → cortar acá.
      if (e.status && !shouldFailover(e.status)) throw e;
      // Si no es el último, seguimos al siguiente proveedor.
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

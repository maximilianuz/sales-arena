import { OBJECTIONS_THEORY_GENERAL, OBJECTIONS_DICTIONARY } from './objectionsKnowledgeBase';
import { getLeadPrompt, getOfferPrompt } from './prompts/fullScenarioPrompt';
import { auth } from './db';
import { logError } from './telemetry';
import { randomPersonality, personalityView } from './leadPersonalities';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// UN intento completo (con sus reintentos internos por 429/5xx). No decide el
// camino: se lo imponen — con `apiKey` va por la key propia del usuario, sin
// ella por el proxy del servidor. La política de "si falla uno, probá el otro"
// vive en makeAIPromptCall, más abajo.
//
// `soloMode` viaja al servidor para que /api/generate sepa si el pedido es de
// práctica individual —que pasa por el candado de aprobación— o de práctica en
// equipo, que queda abierta. El endpoint es el mismo para las dos, así que el
// criterio no puede ser la ruta.
async function callAIOnce(prompt, apiKey, apiUrl, apiModel, retriesLeft = 2, maxTokens = 1500, soloMode = false) {
  // Modo experto (BYOK): el usuario cargó su propia key/URL en Ajustes y pega
  // directo al proveedor externo. Por defecto (sin key propia) usamos nuestro
  // proxy serverless, que nunca expone una key al cliente.
  const useOwnKey = Boolean(apiKey);

  let finalUrl = "/api/generate";
  const headers = { "Content-Type": "application/json" };
  let requestBody = { prompt, uid: auth.currentUser?.uid, email: auth.currentUser?.email, max_tokens: maxTokens, soloMode };

  if (useOwnKey) {
    requestBody.byok = true;
    finalUrl = apiUrl || "/api/nvidia/v1/chat/completions";
    if (finalUrl.includes("integrate.api.nvidia.com")) {
      finalUrl = "/api/nvidia/v1/chat/completions";
    }
    headers["Authorization"] = `Bearer ${apiKey}`;

    // Detectar si es Flowise (contiene /prediction/)
    const isFlowise = finalUrl.includes("/prediction/");

    if (isFlowise) {
      // Flowise usa formato diferente (question en lugar de messages)
      requestBody = {
        question: prompt,
        chatId: auth.currentUser?.uid
      };
    } else {
      // OpenAI-compatible
      requestBody = {
        model: apiModel || "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      };
    }
  }

  try {
    const response = await fetch(finalUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // Rate limit (429): esperar el tiempo sugerido y reintentar (una vez).
      if (response.status === 429 && retriesLeft > 0) {
        let waitMs = 8000;
        try {
          const rl = await response.clone().json();
          const msg = rl?.error?.message || rl?.error || '';
          const match = /try again in ([\d.]+)s/i.exec(msg);
          if (match) waitMs = Math.min(Math.ceil(parseFloat(match[1]) * 1000) + 500, 20000);
        } catch (e) { /* usar default */ }
        await sleep(waitMs);
        return callAIOnce(prompt, apiKey, apiUrl, apiModel, retriesLeft - 1, maxTokens, soloMode);
      }

      // Timeouts/errores transitorios del proveedor: reintentar antes de rendirnos.
      const isRetryable = (response.status === 504 || response.status === 502 || response.status === 503) && retriesLeft > 0;
      if (isRetryable) {
        return callAIOnce(prompt, apiKey, apiUrl, apiModel, retriesLeft - 1, maxTokens, soloMode);
      }

      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        if (response.status === 504) {
          throw new Error("La IA tardó demasiado en responder varias veces seguidas. Probá de nuevo en unos minutos.");
        }
        throw new Error(`HTTP Error ${response.status}: Asegúrate de que la API soporte conexiones desde el navegador (CORS).`);
      }
      if (errorData?.error === 'timeout_upstream') {
        throw new Error("La IA tardó demasiado en responder. Intentá de nuevo — si persiste, probá en unos minutos.");
      }
      if (response.status === 429) {
        // El servidor manda el detalle real del fallo de cada proveedor en
        // `detail` (nombre + causa: timeout/status). Lo logueamos para poder
        // diagnosticar: el mensaje de UI es genérico a propósito.
        if (errorData?.detail) console.error("AI providers detail:", errorData.detail);
        throw new Error("El servicio de IA está saturado en este momento. Esperá unos segundos y volvé a intentar.");
      }
      throw new Error(errorData?.error?.message || errorData?.error || errorData?.message || "Error en la API");
    }

    const data = await response.json();

    // Detectar si la respuesta es de Flowise o formato OpenAI
    const isFlowise = useOwnKey && finalUrl.includes("/prediction/");
    let content;

    if (isFlowise) {
      // Flowise devuelve {text, chatId, ...}
      content = data?.text || data?.message || '';
    } else {
      // OpenAI-compatible devuelve {choices: [{message: {content: ...}}]}
      content = data?.choices?.[0]?.message?.content;
    }

    if (typeof content !== 'string' || content.trim() === '') {
      throw new Error("La IA devolvió una respuesta vacía o con un formato inesperado. Probá de nuevo.");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("La respuesta de la IA no tenía formato JSON válido.");
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // El modelo devolvió algo que parece JSON pero está mal formado
      // (comillas sin cerrar, coma final, etc.). Mensaje accionable en vez de crash.
      throw new Error("La IA devolvió un JSON mal formado. Volvé a intentar en unos segundos.");
    }
  } catch (error) {
    console.error("AI Generation error:", error);
    logError(error, { source: 'ai_generate' });
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Error de conexión. Si usas Ollama local, asegúrate de haberlo iniciado con OLLAMA_ORIGINS='*'. Si usas otra API, podría estar bloqueando conexiones desde el navegador (CORS).");
    }
    throw error;
  }
}

// Punto de entrada de toda llamada a la IA. Decide el camino y se auto-repara:
//
// El "modo experto" (una key propia cargada en Ajustes de IA) pega DIRECTO al
// proveedor externo, salteándose el proxy del servidor — y con él la cadena de
// proveedores, el failover y el orden por velocidad. Quedó de una época previa
// a esa cadena, así que hoy una key propia vencida, sin cupo o apuntando a un
// endpoint lento rompe la generación aunque el servidor estuviera perfecto.
//
// Ahora, si el intento con key propia falla POR LO QUE SEA, reintentamos una
// vez por el proxy del servidor en vez de tirarle el error al usuario. El
// fallback es en un solo sentido (key propia → servidor): el camino del
// servidor nunca reintenta con la key propia, así que no hay bucle posible.
async function makeAIPromptCall(prompt, apiKey, apiUrl, apiModel, retriesLeft = 2, maxTokens = 1500, soloMode = false) {
  if (apiKey) {
    try {
      return await callAIOnce(prompt, apiKey, apiUrl, apiModel, retriesLeft, maxTokens, soloMode);
    } catch (error) {
      // No propagamos: el servidor es el plan B y suele ser más rápido y
      // resiliente. Queda el rastro para poder diagnosticarlo.
      console.warn('[IA] Falló la key propia de "Ajustes de IA"; reintento por el servidor:', error?.message || error);
      logError(error, { source: 'ai_byok_fallback' });
    }
  }
  return callAIOnce(prompt, null, null, null, retriesLeft, maxTokens, soloMode);
}

export async function generateAIScenario(apiKey, apiUrl, apiModel, config, stages = [], language, { soloMode = false, onProgress = () => {} } = {}) {
  const lang = language && typeof language === 'string' ? (language.startsWith('en') ? 'en' : 'es') : 'es';
  const activeStages = stages && stages.length > 0 ? stages : [
    { id: 'apertura', label: 'Apertura', baseQuestions: 'Romper hielo', baseObjections: '' }
  ];

  let selectedObjectionKey = config.targetObjection;
  let specificObjectionFramework = '';

  if (!selectedObjectionKey || selectedObjectionKey === 'Aleatoria (Sorpréndeme)') {
    selectedObjectionKey = 'Aleatoria (Sorpréndeme)';
    specificObjectionFramework = 'INSTRUCCIÓN ESPECIAL: El usuario ha seleccionado "Sorpréndeme". Eres totalmente libre de INVENTAR la objeción principal más dolorosa, desafiante y atípica basada estrictamente en la Industria y el perfil psicológico generado. ¡Sé creativo y evita los clichés típicos!';
  } else {
    specificObjectionFramework = OBJECTIONS_DICTIONARY[selectedObjectionKey] || '';
  }

  // DOS llamadas secuenciales (antes: una sola de ~3000 tokens de salida, que no
  // entraba en el corte duro de 10s de Netlify y siempre terminaba en 429).
  // Cada llamada es su propia invocación de la función → presupuesto de ~9s
  // independiente, y ninguna tiene que producir más de ~1500 tokens.
  // El input NO se duplica (que fue el motivo de consolidar en su momento, por el
  // TPM de Groq free tier): la 2ª llamada NO repite el andamiaje psicológico,
  // recibe un resumen COMPACTO del lead ya generado.
  // Personalidad del lead (DISC): la elegimos acá y la estampamos en el escenario
  // (no confiamos en que el modelo la eche). El prompt hace que el lead la encarne.
  const personality = randomPersonality();
  const pv = personalityView(personality, language);
  const personalityHint = `${pv.name} — ${pv.essence}`;

  // Producto real del dueño (si lo configuró): el lead se genera para venderle ESTO.
  const realProduct = config.realProduct && config.realProduct.name ? config.realProduct : null;

  // ── Llamada 1: el lead (personaje + psicología) ────────────────────────────
  onProgress('lead');
  const leadPrompt = getLeadPrompt({
    level: config.level,
    theme: config.theme,
    leadTemperature: config.leadTemperature,
    targetObjection: selectedObjectionKey,
    language: lang,
    personalityHint,
    realProduct
  });
  const lead = await makeAIPromptCall(leadPrompt, apiKey, apiUrl, apiModel, 2, 1600, soloMode);
  if (!lead || typeof lead !== 'object') {
    throw new Error("No se pudo generar el perfil del lead. Probá de nuevo en unos segundos.");
  }

  // ── Llamada 2: la oferta y las objeciones ──────────────────────────────────
  // Ve al lead concreto (resumen compacto), así producto y objeciones salen
  // coherentes con él en vez de todo inventado de un tiro.
  onProgress('oferta');
  const offerPrompt = getOfferPrompt({
    leadSummary: buildLeadSummary(lead, lang === 'en'),
    level: config.level,
    targetObjection: selectedObjectionKey,
    specificObjectionFramework,
    activeStages,
    language: lang,
    realProduct
  });
  const offer = await makeAIPromptCall(offerPrompt, apiKey, apiUrl, apiModel, 2, 1600, soloMode);
  if (!offer || typeof offer !== 'object') {
    throw new Error("No se pudo generar la oferta y las objeciones. Probá de nuevo en unos segundos.");
  }

  // Contrato de salida IDÉNTICO al de la llamada única: mismo objeto, mismos
  // campos, mismos derivados. Nada aguas abajo se entera del cambio.
  const scenario = { ...lead, ...offer };
  scenario.personality = personality.id;
  // Guardamos la dificultad/temperatura elegidas: el scoring las usa para
  // escalar la recompensa (cerrar un lead hostil vale más que uno amigable).
  scenario.level = config.level || null;
  scenario.leadTemperature = config.leadTemperature || null;
  // Si hay producto real, lo estampamos EXACTO (no dependemos del modelo) con
  // el mismo shape estructurado que el producto generado por IA.
  if (realProduct) {
    scenario.productName = realProduct.name;
    scenario.differentiator = realProduct.description;
    scenario.includes = [];
    scenario.outcome = '';
    const p = parseInt(realProduct.price, 10);
    if (p > 0) scenario.price = p;
  }
  // Campos de compatibilidad: `productToSell` (string legible, lo consumen los
  // prompts de comprador/vendedor IA y el panel editable del Trainer) y
  // `productPrice` (lo consume el scoring). Se derivan de los campos
  // estructurados (productName/differentiator/includes/outcome/price) para no
  // tener que tocar cada consumidor existente.
  scenario.productPrice = Number.isFinite(scenario.price) ? scenario.price : (parseInt(scenario.price, 10) || null);
  scenario.productToSell = buildProductBrief(scenario, lang === 'en');
  return scenario;
}

// Resumen COMPACTO del lead para la 2ª llamada. Texto plano de pocas líneas —
// NUNCA el JSON entero: el objetivo es que el input de la llamada 2 quede en el
// orden de ~800-1000 tokens y no se choque contra el límite de TPM.
function buildLeadSummary(lead, isEn) {
  const d = lead.demographics || {};
  const p = lead.psychology || {};
  const s = lead.currentSituation || {};
  const roots = Array.isArray(lead.rootCauses) ? lead.rootCauses.slice(0, 3) : [];
  const L = isEn
    ? { who: 'Who', problem: 'Problem', fear: 'Deep fear', desire: 'Real desire', style: 'Communication style', roots: 'Root causes' }
    : { who: 'Quién', problem: 'Problema', fear: 'Miedo profundo', desire: 'Deseo real', style: 'Estilo de comunicación', roots: 'Causas profundas' };
  const lines = [
    `- ${L.who}: ${d.name || '—'}, ${d.age || '—'}, ${d.role || '—'} — ${d.industry || '—'} (${d.companySize || '—'})`,
    `- ${L.problem}: ${s.problem || '—'}`,
    `- ${L.fear}: ${p.primaryFear || '—'}`,
    `- ${L.desire}: ${p.primaryDesire || '—'}`,
    `- ${L.style}: ${p.communicationStyle || '—'}`
  ];
  if (roots.length > 0) lines.push(`- ${L.roots}: ${roots.join(' | ')}`);
  return lines.join('\n');
}

// Arma un texto legible y bien estructurado a partir de los campos del
// producto (productName/differentiator/includes/outcome/price). Lo usan los
// consumidores que solo esperan un string: prompts de IA (buyerPrompt,
// closerPrompt), la presentación editable del Trainer (ProductPanel) y el
// fallback de los paneles que sí saben renderizar los campos estructurados.
function buildProductBrief(scenario, isEn) {
  const lines = [];
  if (scenario.productName) lines.push(scenario.productName);
  if (scenario.differentiator) { lines.push(''); lines.push(scenario.differentiator); }
  if (Array.isArray(scenario.includes) && scenario.includes.length > 0) {
    lines.push('');
    lines.push(isEn ? 'Includes:' : 'Incluye:');
    scenario.includes.forEach(item => { if (item) lines.push(`- ${item}`); });
  }
  if (scenario.outcome) { lines.push(''); lines.push(scenario.outcome); }
  if (scenario.price > 0) {
    lines.push('');
    lines.push(`${isEn ? 'Investment' : 'Inversión'}: USD ${Number(scenario.price).toLocaleString('en-US')}`);
  }
  return lines.join('\n');
}

export async function generateSurpriseEvent(apiKey, apiUrl, apiModel, scenario, language = 'es') {
  if (!scenario) {
    throw new Error("No hay un escenario activo para generar el evento.");
  }

  // Idioma de salida: español por defecto; inglés solo si la página está en inglés.
  const isEn = typeof language === 'string' && language.startsWith('en');
  const langInstruction = isEn
    ? 'OUTPUT LANGUAGE: write "eventText" entirely in ENGLISH.'
    : 'IDIOMA DE SALIDA: escribí "eventText" íntegramente en ESPAÑOL (sin una palabra en inglés).';

  const prompt = `
Actúa como un director de simulaciones de ventas. Tienes que crear UN EVENTO SORPRESA ALEATORIO (tipo "plot twist") para el siguiente Lead con el que un vendedor está hablando en este momento.

${langInstruction}

Contexto del Lead:
- Nombre: ${scenario.demographics?.name || 'Cliente'}
- Industria/Cargo: ${scenario.demographics?.industry || 'Empresa'} - ${scenario.demographics?.role || 'Dueño'}
- Problema actual: ${scenario.currentSituation?.problem || 'Tiene un problema a resolver'}
- Objeción principal (NO repetirla): ${scenario.visibleObjection || 'Ninguna'}

Requisitos del evento sorpresa:
1. Debe ser un suceso INESPERADO que interrumpa o cambie radicalmente el rumbo de la llamada de ventas. 
2. NO debe ser simplemente otra objeción de precio o tiempo.
3. Debe estar íntimamente relacionado con su industria, cargo o problema actual.
4. Tienes un pool mental de más de 100 tipos de eventos diferentes (ej: llamadas entrantes, emergencias en su empresa, confesiones inesperadas, la aparición repentina de un socio/jefe en la sala, problemas técnicos, revelaciones de la competencia, interrupciones externas, etc.). Elige uno al azar.
5. Redáctalo en 1 o 2 oraciones, de forma impactante.

${langInstruction}
Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "eventText": "Texto del evento sorpresa que debe leer el actor."
}
`;

  const result = await makeAIPromptCall(prompt, apiKey, apiUrl, apiModel);
  return result.eventText;
}

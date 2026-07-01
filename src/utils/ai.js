import { OBJECTIONS_THEORY_GENERAL, OBJECTIONS_DICTIONARY } from './objectionsKnowledgeBase';
import { getFullScenarioPrompt } from './prompts/fullScenarioPrompt';
import { auth } from './db';

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function makeAIPromptCall(prompt, apiKey, apiUrl, apiModel, retriesLeft = 2, maxTokens = 1500) {
  // Modo experto (BYOK): el usuario cargó su propia key/URL en Ajustes y pega
  // directo al proveedor externo. Por defecto (sin key propia) usamos nuestro
  // proxy serverless, que nunca expone una key al cliente.
  const useOwnKey = Boolean(apiKey);

  let finalUrl = "/api/generate";
  const headers = { "Content-Type": "application/json" };
  let requestBody = { prompt, uid: auth.currentUser?.uid, email: auth.currentUser?.email, max_tokens: maxTokens };

  if (useOwnKey) {
    requestBody.byok = true;
    finalUrl = apiUrl || "/api/nvidia/v1/chat/completions";
    if (finalUrl.includes("integrate.api.nvidia.com")) {
      finalUrl = "/api/nvidia/v1/chat/completions";
    }
    headers["Authorization"] = `Bearer ${apiKey}`;
    requestBody = {
      model: apiModel || "meta/llama-3.1-8b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }
    };
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
        return makeAIPromptCall(prompt, apiKey, apiUrl, apiModel, retriesLeft - 1, maxTokens);
      }

      // Timeouts/errores transitorios del proveedor: reintentar antes de rendirnos.
      const isRetryable = (response.status === 504 || response.status === 502 || response.status === 503) && retriesLeft > 0;
      if (isRetryable) {
        return makeAIPromptCall(prompt, apiKey, apiUrl, apiModel, retriesLeft - 1, maxTokens);
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
        throw new Error("El servicio de IA está saturado en este momento. Esperá unos segundos y volvé a intentar.");
      }
      throw new Error(errorData?.error?.message || errorData?.error || errorData?.message || "Error en la API");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("La respuesta de la IA no tenía formato JSON válido.");
    }
  } catch (error) {
    console.error("AI Generation error:", error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Error de conexión. Si usas Ollama local, asegúrate de haberlo iniciado con OLLAMA_ORIGINS='*'. Si usas otra API, podría estar bloqueando conexiones desde el navegador (CORS).");
    }
    throw error;
  }
}

export async function generateAIScenario(apiKey, apiUrl, apiModel, config, stages = [], language = 'es') {
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

  // UNA sola llamada consolidada (antes eran 3). Baja el consumo de tokens de
  // ~7500 a ~2700 (bajo el límite de 6000 TPM de Groq free tier), evita el rate
  // limit y reduce la latencia ~3x (mitiga los 504 de Netlify).
  const fullPrompt = getFullScenarioPrompt({
    level: config.level,
    theme: config.theme,
    leadTemperature: config.leadTemperature,
    targetObjection: selectedObjectionKey,
    specificObjectionFramework,
    activeStages,
    language
  });

  // 2800 tokens de salida acomoda los campos nuevos (behavioralCues, decisionStyle,
  // triggerEvent) sin acercarse al límite de 6000 TPM.
  const scenario = await makeAIPromptCall(fullPrompt, apiKey, apiUrl, apiModel, 2, 2800);
  return scenario;
}

export async function generateSurpriseEvent(apiKey, apiUrl, apiModel, scenario, language = 'es') {
  if (!scenario) {
    throw new Error("No hay un escenario activo para generar el evento.");
  }
  
  const prompt = `
Actúa como un director de simulaciones de ventas. Tienes que crear UN EVENTO SORPRESA ALEATORIO (tipo "plot twist") para el siguiente Lead con el que un vendedor está hablando en este momento.

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

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "eventText": "Texto del evento sorpresa que debe leer el actor."
}
`;

  const result = await makeAIPromptCall(prompt, apiKey, apiUrl, apiModel);
  return result.eventText;
}

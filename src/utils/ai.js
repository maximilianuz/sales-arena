import { OBJECTIONS_THEORY_GENERAL, OBJECTIONS_DICTIONARY } from './objectionsKnowledgeBase';
import { getIdentityPrompt } from './prompts/identityPrompt';
import { getObjectionsPrompt } from './prompts/objectionsPrompt';
import { getPipelinePrompt } from './prompts/pipelinePrompt';

async function makeAIPromptCall(prompt, apiKey, apiUrl, apiModel) {
  // Modo experto (BYOK): el usuario cargó su propia key/URL en Ajustes y pega
  // directo al proveedor externo. Por defecto (sin key propia) usamos nuestro
  // proxy serverless, que nunca expone una key al cliente.
  const useOwnKey = Boolean(apiKey);

  let finalUrl = "/api/generate";
  const headers = { "Content-Type": "application/json" };
  let requestBody = { prompt };

  if (useOwnKey) {
    finalUrl = apiUrl || "/api/nvidia/v1/chat/completions";
    if (finalUrl.includes("integrate.api.nvidia.com")) {
      finalUrl = "/api/nvidia/v1/chat/completions";
    }
    headers["Authorization"] = `Bearer ${apiKey}`;
    requestBody = {
      model: apiModel || "meta/llama-3.1-8b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500, // Permitimos más tokens por módulo
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
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`HTTP Error ${response.status}: Asegúrate de que la API soporte conexiones desde el navegador (CORS).`);
      }
      throw new Error(errorData?.error?.message || errorData?.message || "Error en la API");
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

  // 1. Llamada Módulo Base (Identidad y Situación)
  const identityPrompt = getIdentityPrompt({ 
    level: config.level, 
    theme: config.theme, 
    leadTemperature: config.leadTemperature, 
    language 
  });
  console.log("-> Iniciando Módulo 1: Identidad");
  const baseProfile = await makeAIPromptCall(identityPrompt, apiKey, apiUrl, apiModel);

  // 2. Llamada Módulo Objeciones
  const objectionsPrompt = getObjectionsPrompt({
    baseProfile,
    targetObjection: selectedObjectionKey,
    language,
    specificObjectionFramework,
    level: config.level
  });
  console.log("-> Iniciando Módulo 2: Objeciones");
  const objectionsProfile = await makeAIPromptCall(objectionsPrompt, apiKey, apiUrl, apiModel);

  // 3. Llamada Módulo Pipeline
  const pipelinePrompt = getPipelinePrompt({
    baseProfile,
    objectionsProfile,
    activeStages,
    specificObjectionFramework,
    language
  });
  console.log("-> Iniciando Módulo 3: Pipeline");
  const pipelineProfile = await makeAIPromptCall(pipelinePrompt, apiKey, apiUrl, apiModel);

  console.log("=== DEBUG: RESULTADOS IA ===");
  console.log("Módulo 2 (Objeciones):", objectionsProfile);

  // Unificamos todo en un solo objeto para retornarlo a la UI
  return {
    ...baseProfile,
    ...objectionsProfile,
    ...pipelineProfile
  };
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

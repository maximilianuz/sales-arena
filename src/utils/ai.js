import { OBJECTIONS_THEORY_GENERAL, OBJECTIONS_DICTIONARY } from './objectionsKnowledgeBase';
import { getIdentityPrompt } from './prompts/identityPrompt';
import { getObjectionsPrompt } from './prompts/objectionsPrompt';
import { getPipelinePrompt } from './prompts/pipelinePrompt';

async function makeAIPromptCall(prompt, apiKey, apiUrl, apiModel) {
  let finalUrl = apiUrl || "/api/nvidia/v1/chat/completions";
  if (finalUrl.includes("integrate.api.nvidia.com")) {
    finalUrl = "/api/nvidia/v1/chat/completions";
  }

  try {
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: apiModel || "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500, // Permitimos más tokens por módulo
        response_format: { type: "json_object" }
      })
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
  const availableKeys = Object.keys(OBJECTIONS_DICTIONARY);
  
  if (!selectedObjectionKey || selectedObjectionKey === 'Aleatoria (Sorpréndeme)') {
    selectedObjectionKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
  }

  const specificObjectionFramework = OBJECTIONS_DICTIONARY[selectedObjectionKey] || '';

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
    specificObjectionFramework
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

  // Unificamos todo en un solo objeto para retornarlo a la UI
  return {
    ...baseProfile,
    ...objectionsProfile,
    ...pipelineProfile
  };
}

import { OBJECTIONS_THEORY_GENERAL, OBJECTIONS_DICTIONARY } from './objectionsKnowledgeBase';

export async function generateAIScenario(apiKey, apiUrl, apiModel, { level, theme, saleType, targetObjection, leadTemperature }, stages = [], language = 'es') {
  // If no stages provided somehow, fallback to basic structure
  const activeStages = stages && stages.length > 0 ? stages : [
    { id: 'apertura', label: 'Apertura', baseQuestions: 'Romper hielo', baseObjections: '' }
  ];

  const stagesPromptContext = activeStages.map(s => {
    return `Etapa ID: "${s.id}" (${s.label})
  - Objetivo: ${s.objective}
  - Preguntas/Información Base de Referencia: ${s.baseQuestions}
  - Objeciones Comunes de esta etapa: ${s.baseObjections}`;
  }).join('\n\n');

  const pipelineKeys = activeStages.map(s => `"${s.id}": ["Pregunta 1", "Pregunta 2"]`).join(',\n        ');

  // Determinar qué framework de objeción inyectar para ahorrar tokens
  let selectedObjectionKey = targetObjection;
  const availableKeys = Object.keys(OBJECTIONS_DICTIONARY);
  
  if (!selectedObjectionKey || selectedObjectionKey === 'Aleatoria (Sorpréndeme)') {
    selectedObjectionKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
  }

  const specificObjectionFramework = OBJECTIONS_DICTIONARY[selectedObjectionKey] || '';

  let tempInstruction = '';
  if (leadTemperature && leadTemperature !== 'Aleatoria') {
    tempInstruction = `- TEMPERATURA DEL LEAD: El lead es "${leadTemperature}". Ajusta drásticamente su "Estado Emocional", "Situación Actual" y "Probabilidad de Compra Inicial" acorde a esto. Un lead FRÍO es altamente escéptico, defensivo y su probabilidad es muy baja (<15%). Un lead CALIENTE viene urgido, recomendado o listo para comprar y su probabilidad es alta (>60%). Un lead TEMPLADO tiene curiosidad pero dudas.`;
  } else {
    tempInstruction = `- TEMPERATURA DEL LEAD: Define aleatoriamente si es un lead Frío, Templado o Caliente, y ajusta su estado emocional y probabilidad de compra en consecuencia.`;
  }

  const prompt = `
    Eres un experto entrenador de ventas y un Master High Ticket Closer.
    Genera un Buyer Persona profundo y un pipeline de simulación con los siguientes parámetros:
    - Nivel de dificultad: ${level}
    - Idioma de respuesta: ${language === 'es' ? 'Español' : 'Inglés'}
    - Industria/Tema: ${theme}
    - Tipo de venta: ${saleType}
    - Objeción Principal Esperada: "${selectedObjectionKey}"

    BASE DE CONOCIMIENTO (TEORÍA GENERAL DE OBJECIONES):
    ${OBJECTIONS_THEORY_GENERAL}

    FRAMEWORK ESPECÍFICO PARA ESTA SIMULACIÓN (DEBE APLICARSE):
    ${specificObjectionFramework}

    INSTRUCCIONES DE PERFILADO (BUYER PERSONA SIMULATION SCHEMA v3):
    - DIVERSIDAD DEMOGRÁFICA: Adapta el perfil drásticamente según la Industria/Tema. NO asumas que todos son ejecutivos, CEOs o dueños de negocio. Pueden ser jóvenes estudiantes indecisos, empleados insatisfechos buscando un cambio, personas sin rumbo claro, etc.
    - PROFUNDIDAD PSICOLÓGICA: El perfil debe tener conflictos de metas internos (ej. deseo de cambio vs. miedo al riesgo), un perfil económico específico (con estrés financiero o presupuestos limitados) y narrativas internas (creencias sobre el dinero y el éxito).
    ${tempInstruction}

    RECURSOS BASE PARA LAS ETAPAS DEL EMBUDO:
    ${stagesPromptContext}

    INSTRUCCIONES PARA LAS PREGUNTAS (pipelineQuestions):
    Basándote estrictamente en los "Recursos Base" de cada etapa y en el "Framework Específico" arriba indicado, genera preguntas de ventas que reflejen esas objeciones o patrones de preguntas. Deben tener un tono directo y de alto valor (High Ticket). 
    Asegúrate de que la 'visibleObjection' refleje la Objeción Principal Esperada.

    Devuelve ÚNICAMENTE un objeto JSON válido con las siguientes claves exactas (sin omitir ninguna).
    ESTO ES CRÍTICO: DEBES USAR FORMATO JSON PURO. NO ESCRIBAS TEXTO ADICIONAL:
    {
      "demographics": "Edad, profesión, rol en la empresa",
      "emotions": "Estado emocional actual al entrar a la llamada",
      "desires": "Lo que realmente quiere lograr (su cielo)",
      "frustrations": "Lo que más le duele actualmente (su infierno)",
      "currentSituation": "Contexto de su situación actual en 2 oraciones",
      "dreamSituation": "Dónde quiere estar en 6 meses",
      "mainBarrier": "Lo que le impide llegar allí por sí mismo",
      "buyingProbability": "Porcentaje estimado inicial (ej. 30%)",
      "visibleObjection": "La excusa fácil que dirá primero",
      "hiddenObjection": "La verdadera razón oculta por la que no compraría (información para el facilitador)",
      "pipelineQuestions": {
        ${pipelineKeys}
      }
    }
  `;

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
        max_tokens: 1500,
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

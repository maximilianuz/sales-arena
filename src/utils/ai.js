import { OBJECTIONS_THEORY_GENERAL, OBJECTIONS_DICTIONARY } from './objectionsKnowledgeBase';

export async function generateAIScenario(apiKey, apiUrl, apiModel, { level, theme, saleType, targetObjection }, stages = []) {
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

  const prompt = `
    Eres un experto entrenador de ventas y un Master High Ticket Closer.
    Genera un Buyer Persona profundo y un pipeline de simulación con los siguientes parámetros:
    - Nivel de dificultad: ${level}
    - Industria/Tema: ${theme}
    - Tipo de venta: ${saleType}
    - Objeción Principal Esperada: "${selectedObjectionKey}"

    BASE DE CONOCIMIENTO (TEORÍA GENERAL DE OBJECIONES):
    ${OBJECTIONS_THEORY_GENERAL}

    FRAMEWORK ESPECÍFICO PARA ESTA SIMULACIÓN (DEBE APLICARSE):
    ${specificObjectionFramework}

    RECURSOS BASE PARA LAS ETAPAS DEL EMBUDO:
    ${stagesPromptContext}

    INSTRUCCIONES PARA LAS PREGUNTAS (pipelineQuestions):
    Basándote estrictamente en los "Recursos Base" de cada etapa y en el "Framework Específico" arriba indicado, genera preguntas de ventas que reflejen esas objeciones o patrones de preguntas. Deben tener un tono directo y de alto valor (High Ticket). 
    Asegúrate de que la 'visibleObjection' refleje la Objeción Principal Esperada.

    Devuelve ÚNICAMENTE un objeto JSON válido con las siguientes claves exactas (sin formato markdown adicional ni comentarios):
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
        model: apiModel || "meta/llama-3.1-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error en la API de NVIDIA");
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
    throw error;
  }
}

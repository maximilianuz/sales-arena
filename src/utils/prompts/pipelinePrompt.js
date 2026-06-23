export function getPipelinePrompt({ baseProfile, objectionsProfile, activeStages, specificObjectionFramework, language }) {
  const pipelineKeys = activeStages.map(s => `"${s.id}": ["Pregunta 1", "Pregunta 2"]`).join(',\n        ');
  const stagesPromptContext = activeStages.map(s => {
    return `Etapa ID: "${s.id}" (${s.label})
  - Objetivo: ${s.objective}
  - Preguntas/Información Base de Referencia: ${s.baseQuestions}
  - Objeciones Comunes de esta etapa: ${s.baseObjections}`;
  }).join('\n\n');

  const secondaryObsStr = objectionsProfile.secondaryObjections && objectionsProfile.secondaryObjections.length > 0 
    ? objectionsProfile.secondaryObjections.join(', ')
    : 'Ninguna adicional';

  const contextSummary = `
    - Industria: ${baseProfile.demographics.industry}
    - Problema del Lead: ${baseProfile.currentSituation.problem}
    - Objeción Principal Visible: "${objectionsProfile.visibleObjection}"
    - Arsenal Secundario (Balas extras): [${secondaryObsStr}]
    - Conflicto Interno: ${objectionsProfile.roleplayGuide.competingGoal}
  `;

  return `
    Eres un experto entrenador de ventas y un Master High Ticket Closer.
    Basado en el siguiente perfil resumido del Lead:
    ${contextSummary}

    Tu tarea final es generar las preguntas/objeciones específicas que el Lead lanzará durante cada etapa de la llamada (Pipeline Questions), para que el Facilitador guíe la simulación.
    - Idioma de respuesta: ${language === 'es' ? 'Español' : 'Inglés'}

    FRAMEWORK ESPECÍFICO QUE GUÍA ESTA SIMULACIÓN:
    ${specificObjectionFramework}

    RECURSOS BASE PARA LAS ETAPAS DEL EMBUDO:
    ${stagesPromptContext}

    INSTRUCCIONES PARA LAS PREGUNTAS (pipelineQuestions):
    Basándote estrictamente en los "Recursos Base" de cada etapa y en el "Framework Específico", genera de 2 a 4 frases, preguntas u objeciones que el LEAD dirá en cada etapa. Deben sonar muy naturales, con un tono adaptado a su problema y conflicto interno.
    Asegúrate de que, especialmente en las etapas de cierre, aparezca claramente su "Objeción Principal Visible".

    Devuelve ÚNICAMENTE un objeto JSON válido con las siguientes claves exactas (los ID de las etapas), donde el valor es un arreglo de strings (las frases del Lead):
    {
      "pipelineQuestions": {
        ${pipelineKeys}
      }
    }
  `;
}

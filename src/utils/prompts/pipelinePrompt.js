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

    Tu tarea final es generar preguntas estratégicas, frases de transición y consejos (salvavidas) que el CLOSER (Vendedor) debe usar en cada etapa de la llamada para guiar y cualificar a este Lead específico.
    - Idioma de respuesta: ${language === 'es' ? 'Español' : 'Inglés'}

    FRAMEWORK ESPECÍFICO QUE GUÍA ESTA SIMULACIÓN:
    ${specificObjectionFramework}

    RECURSOS BASE PARA LAS ETAPAS DEL EMBUDO:
    ${stagesPromptContext}

    INSTRUCCIONES PARA LAS PREGUNTAS (pipelineQuestions):
    Basándote estrictamente en los "Recursos Base" de cada etapa y en el "Framework Específico", genera de 2 a 4 preguntas poderosas, afirmaciones o mini-consejos que sirvan como un "salvavidas" directo para el CLOSER.
    Deben estar perfectamente adaptadas a la industria, el dolor principal y la psicología de este Lead específico. Escribe las preguntas exactas que el Closer debería formularle (ej. "¿Cómo está impactando la falta de visibilidad en tus ventas este trimestre?").

    Devuelve ÚNICAMENTE un objeto JSON válido con las siguientes claves exactas (los ID de las etapas), donde el valor es un arreglo de strings (las preguntas/consejos para el CLOSER):
    {
      "pipelineQuestions": {
        ${pipelineKeys}
      }
    }
  `;
}

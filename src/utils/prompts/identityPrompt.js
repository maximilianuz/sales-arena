export function getIdentityPrompt({ level, theme, leadTemperature, language }) {
  let tempInstruction = '';
  if (leadTemperature && leadTemperature !== 'Aleatoria') {
    tempInstruction = `- TEMPERATURA DEL LEAD: El lead es "${leadTemperature}". Ajusta drásticamente su "Estado Emocional", "Situación Actual" y "Probabilidad de Compra Inicial" acorde a esto. Un lead FRÍO es altamente escéptico, defensivo y su probabilidad es muy baja (<15%). Un lead CALIENTE viene urgido, recomendado o listo para comprar y su probabilidad es alta (>60%). Un lead TEMPLADO tiene curiosidad pero dudas.`;
  } else {
    tempInstruction = `- TEMPERATURA DEL LEAD: Define aleatoriamente si es un lead Frío, Templado o Caliente, y ajusta su estado emocional y probabilidad de compra en consecuencia.`;
  }

  return `
    Eres un experto entrenador de ventas y un Master High Ticket Closer.
    Tu objetivo en esta etapa es generar el perfil fundamental (Demografía, Psicología y Situación) de un Buyer Persona para un roleplay de ventas.
    
    Parámetros base:
    - Nivel de dificultad del lead: ${level}
    - Idioma de respuesta: ${language === 'es' ? 'Español' : 'Inglés'}
    - Industria/Tema: ${theme}

    INSTRUCCIONES DE PERFILADO:
    - DIVERSIDAD DEMOGRÁFICA: Adapta el perfil drásticamente según la Industria/Tema. NO asumas que todos son ejecutivos, CEOs o dueños de negocio. Pueden ser jóvenes estudiantes indecisos, empleados insatisfechos buscando un cambio, personas sin rumbo claro, etc.
    - PROFUNDIDAD PSICOLÓGICA: El perfil debe tener conflictos de metas internos (ej. deseo de cambio vs. miedo al riesgo), un perfil económico específico (con estrés financiero o presupuestos limitados).
    ${tempInstruction}

    Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
    {
      "demographics": {
        "name": "Nombre ficticio",
        "age": "Edad",
        "role": "Cargo",
        "industry": "Industria",
        "companySize": "Tamaño de empresa"
      },
      "psychology": {
        "urgency": "Nivel de urgencia (Alto/Medio/Bajo)",
        "communicationStyle": "Estilo de comunicación (Ej. Directo, Analítico, Emocional)",
        "primaryFear": "Miedo principal",
        "primaryDesire": "Deseo principal"
      },
      "currentSituation": {
        "problem": "Problema actual profundo",
        "previousAttempts": "Intentos previos de solución (qué probó y por qué falló)",
        "impact": "Impacto financiero o emocional de no resolver el problema"
      }
    }
  `;
}

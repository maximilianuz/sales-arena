// Prompt consolidado: genera TODO el escenario (identidad + objeciones + pipeline)
// en UNA sola llamada. Antes eran 3 llamadas secuenciales que repetían el rol del
// sistema y el contexto, triplicando el consumo de tokens y disparando el rate
// limit de Groq (6000 TPM en free tier) además de sumar latencia (3x → 504).
export function getFullScenarioPrompt({ level, theme, leadTemperature, targetObjection, specificObjectionFramework, activeStages, language }) {
  const lang = language === 'es' ? 'Español' : 'Inglés';

  let tempInstruction;
  if (leadTemperature && leadTemperature !== 'Aleatoria') {
    tempInstruction = `El lead es "${leadTemperature}". Frío = escéptico/defensivo, probabilidad <15%. Caliente = urgido/referido, probabilidad >60%. Templado = curioso con dudas. Ajustá estado emocional y situación acorde.`;
  } else {
    tempInstruction = `Definí aleatoriamente si es Frío, Templado o Caliente y ajustá su estado emocional y probabilidad de compra.`;
  }

  let secondaryCount;
  if (level === 'Principiante') {
    secondaryCount = '1 objeción secundaria sencilla y fácil de rebatir';
  } else if (level === 'Intermedio') {
    secondaryCount = '3 a 5 objeciones secundarias variadas (tiempo, duda técnica, consultar con socio)';
  } else {
    secondaryCount = '6 a 10 objeciones secundarias hostiles y desafiantes';
  }

  const stagesContext = activeStages.map(s =>
    `- "${s.id}" (${s.label}): objetivo "${s.objective}". Base: ${s.baseQuestions || 'general'}`
  ).join('\n');

  const pipelineKeys = activeStages.map(s => `"${s.id}": ["pregunta/consejo 1", "pregunta/consejo 2"]`).join(',\n      ');

  return `
Eres un experto entrenador de ventas y Master High Ticket Closer. Generá un Buyer Persona COMPLETO para un roleplay de ventas, en ${lang}.

PARÁMETROS:
- Dificultad: ${level}
- Industria/Tema: ${theme}
- Temperatura: ${tempInstruction}
- Objeción principal esperada: "${targetObjection}"
${specificObjectionFramework ? `- Framework de objeción a aplicar: ${specificObjectionFramework}` : ''}

REGLAS:
- Diversidad demográfica real: NO asumas que todos son CEOs. Pueden ser empleados, estudiantes, freelancers, etc. según la industria.
- Profundidad psicológica: conflictos internos (deseo vs miedo), perfil económico específico.
- Objeciones secundarias: generá ${secondaryCount}.
- Para pipelineQuestions: por cada etapa, 2 a 4 preguntas/consejos "salvavidas" que el CLOSER debe usar, adaptados al dolor y psicología de ESTE lead. Escribí las preguntas exactas.

ETAPAS DEL EMBUDO:
${stagesContext}

Devolvé ÚNICAMENTE un objeto JSON válido con esta estructura EXACTA:
{
  "demographics": { "name": "", "age": "", "role": "", "industry": "", "companySize": "" },
  "psychology": { "urgency": "Alto/Medio/Bajo", "communicationStyle": "", "primaryFear": "", "primaryDesire": "" },
  "currentSituation": { "problem": "", "previousAttempts": "", "impact": "" },
  "productToSell": "1-2 párrafos: producto/servicio High Ticket que el Closer debe ofrecer, con nombre, características y precio aproximado",
  "visibleObjection": "La excusa fácil que dirá primero",
  "secondaryObjections": ["", ""],
  "hiddenObjection": "La verdadera razón oculta (para el Trainer), conectada al miedo principal",
  "roleplayGuide": {
    "moneyBelief": "Creencia limitante sobre el dinero, 1 frase",
    "competingGoal": "Conflicto interno, 1 frase",
    "vendorFatigue": "Por qué desconfía de vendedores, 1 frase",
    "actorAdvice": "Instrucción corta y accionable para el actor (tono, postura, resistencia inicial), legible en 5 segundos"
  },
  "pipelineQuestions": {
      ${pipelineKeys}
  }
}
`;
}

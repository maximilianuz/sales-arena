// Prompt consolidado: genera TODO el escenario (identidad + psicología + objeciones
// + pipeline) en UNA sola llamada. Enriquecido para máxima profundidad psicológica
// y realismo conductual, manteniendo la salida acotada (free tier de Groq, 6000 TPM).
export function getFullScenarioPrompt({ level, theme, leadTemperature, targetObjection, specificObjectionFramework, activeStages, language, personalityHint }) {
  const lang = language === 'es' ? 'Español' : 'Inglés';

  let tempInstruction;
  if (leadTemperature && leadTemperature !== 'Aleatoria') {
    tempInstruction = `El lead es "${leadTemperature}". Frío = escéptico/defensivo, probabilidad <15%. Caliente = urgido/referido, probabilidad >60%. Templado = curioso con dudas. Ajustá estado emocional y situación acorde.`;
  } else {
    tempInstruction = `Definí aleatoriamente si es Frío, Templado o Caliente y ajustá su estado emocional y probabilidad de compra.`;
  }

  let depthInstruction;
  if (level === 'Principiante') {
    depthInstruction = 'Resistencia baja: 1 objeción secundaria sencilla. El lead colabora si lo tratan bien. Emociones en la superficie, fáciles de leer.';
  } else if (level === 'Intermedio') {
    depthInstruction = 'Resistencia media: 3 a 5 objeciones secundarias variadas (tiempo, duda técnica, consultar con socio). El lead tiene dudas reales y una capa emocional que hay que destapar preguntando.';
  } else {
    depthInstruction = 'Resistencia alta: 6 a 10 objeciones secundarias hostiles. El lead esconde su verdadera motivación, prueba al vendedor, usa sarcasmo o cortes secos. Su dolor real está enterrado bajo capas de defensa y orgullo.';
  }

  const stagesContext = activeStages.map(s =>
    `- "${s.id}" (${s.label}): objetivo "${s.objective}". Base: ${s.baseQuestions || 'general'}`
  ).join('\n');

  const pipelineKeys = activeStages.map(s => `"${s.id}": ["pregunta/consejo 1", "pregunta/consejo 2"]`).join(',\n      ');

  return `
Eres un guionista experto en psicología de ventas y comportamiento humano. Creá un Buyer Persona PROFUNDO y REALISTA para un roleplay de ventas High Ticket, en ${lang}.

PARÁMETROS:
- Dificultad: ${level} — ${depthInstruction}
- Industria/Tema: ${theme}
- Temperatura: ${tempInstruction}
- Objeción principal esperada: "${targetObjection}"
${specificObjectionFramework ? `- Framework de objeción a aplicar: ${specificObjectionFramework}` : ''}
${personalityHint ? `- PERSONALIDAD del lead (encarnala con fuerza en psychology, behavioralCues y verbalStyle — cómo habla, qué lo abre y qué lo cierra): ${personalityHint}` : ''}

PRINCIPIOS DE REALISMO (críticos):
- Personas de verdad, con contradicciones. NO asumas que todos son CEOs; adaptá al rubro (empleados, freelancers, estudiantes, dueños chicos, etc.).
- La objeción visible casi NUNCA es la razón real. La razón oculta viene de una herida, un miedo o una creencia de identidad.
- Dale una historia: un evento detonante que lo trajo a esta llamada, un intento previo que falló, y una consecuencia concreta si no cambia.
- Comportamiento conversacional específico: cómo habla, qué lo hace abrirse y qué lo hace cerrarse. Esto debe ser accionable para quien lo actúa.
- Evitá clichés y frases genéricas. Que suene a una persona real, no a un manual.

Para pipelineQuestions: por cada etapa, 2 a 4 preguntas/consejos "salvavidas" que el CLOSER debe usar, adaptados al dolor y psicología de ESTE lead. Preguntas exactas, no genéricas.

ETAPAS DEL EMBUDO:
${stagesContext}

Devolvé ÚNICAMENTE un objeto JSON válido con esta estructura EXACTA:
{
  "demographics": { "name": "", "age": "", "role": "", "industry": "", "companySize": "" },
  "psychology": {
    "urgency": "Alto/Medio/Bajo",
    "communicationStyle": "ej. Directo y cortante / Analítico y frío / Cálido pero evasivo",
    "primaryFear": "El miedo profundo (no el superficial)",
    "primaryDesire": "El deseo real detrás de la compra",
    "decisionStyle": "Cómo toma decisiones: impulsivo, necesita datos, consulta a otros, paraliza por análisis, etc.",
    "trustTrigger": "Qué específicamente le genera o rompe la confianza en un vendedor"
  },
  "behavioralCues": {
    "opensUpWhen": "Qué hace que baje la guardia y hable con sinceridad",
    "shutsDownWhen": "Qué lo pone a la defensiva o lo hace cerrarse",
    "verbalStyle": "Cómo habla literalmente: frases típicas, muletillas, tono, ritmo"
  },
  "currentSituation": {
    "problem": "El problema real y profundo",
    "triggerEvent": "El evento concreto que lo hizo agendar justo ahora",
    "previousAttempts": "Qué probó antes y por qué falló",
    "impact": "Impacto financiero Y emocional concreto de no resolverlo"
  },
  "productToSell": "1-2 párrafos: producto/servicio High Ticket que el Closer debe ofrecer, con nombre, características clave y PRECIO de USD 1500 o más (nunca menos de 1500)",
  "visibleObjection": "La excusa fácil que dirá primero",
  "secondaryObjections": ["", ""],
  "hiddenObjection": "La verdadera razón oculta (para el Trainer), conectada al miedo y a la herida",
  "roleplayGuide": {
    "moneyBelief": "Creencia limitante sobre el dinero, 1 frase",
    "competingGoal": "Conflicto interno (quiere X pero teme Y), 1 frase",
    "vendorFatigue": "Por qué desconfía de vendedores, 1 frase",
    "actorAdvice": "Instrucción para la persona que ACTÚA DE ESTE LEAD (el comprador), NO para el vendedor. Segunda persona ('vos'/'tú'): tono de voz, postura, actitud, nivel de resistencia y qué emoción proyectar. Ej: 'Hablá cortante y apurado, brazos cruzados, a la defensiva pero en el fondo desesperado por una solución.' NUNCA des consejos de venta."
  },
  "pipelineQuestions": {
      ${pipelineKeys}
  }
}
`;
}

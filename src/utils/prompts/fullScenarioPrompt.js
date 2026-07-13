// Prompt consolidado: genera TODO el escenario (identidad + psicología + objeciones
// + pipeline) en UNA sola llamada. Enriquecido para máxima profundidad psicológica
// y realismo conductual, manteniendo la salida acotada (free tier de Groq, 6000 TPM).
export function getFullScenarioPrompt({ level, theme, leadTemperature, targetObjection, specificObjectionFramework, activeStages, language, personalityHint, realProduct }) {
  const isEn = typeof language === 'string' && language.startsWith('en');

  const stagesContext = activeStages.map(s =>
    `- "${s.id}" (${s.label}): objective "${s.objective}". Base: ${s.baseQuestions || 'general'}`
  ).join('\n');

  const pipelineKeys = activeStages.map(s => `"${s.id}": ["question/tip 1", "question/tip 2"]`).join(',\n      ');

  if (isEn) {
    let tempInstruction = `Lead is "${leadTemperature || 'Random'}". Cold = skeptical/defensive, <15% buy. Hot = urgent/referred, >60% buy. Warm = curious with doubts. Adjust emotional state and situation accordingly.`;
    if (!leadTemperature || leadTemperature === 'Aleatoria') {
      tempInstruction = `Randomly determine if Cold, Warm, or Hot and adjust emotional state and purchase probability.`;
    }

    let depthInstruction = 'Low resistance: 1 easy secondary objection. Lead cooperates if treated well. Emotions surface-level, easy to read.';
    if (level === 'Intermedio') {
      depthInstruction = 'Medium resistance: 3-5 varied secondary objections (timing, technical doubt, consult partner). Lead has real doubts and emotional layers that need uncovering.';
    } else if (level === 'Avanzado') {
      depthInstruction = 'High resistance: 6-10 hostile secondary objections. Lead hides true motivation, tests salesperson, uses sarcasm or sharp cuts. Real pain buried under layers of defense and pride.';
    }

    return `
You are an expert screenwriter in sales psychology and human behavior. Create a DEEP and REALISTIC Buyer Persona for a high-ticket sales roleplay, in English.

PARAMETERS:
- Difficulty: ${level} — ${depthInstruction}
- Industry/Theme: ${theme}
- Temperature: ${tempInstruction}
- Expected main objection: "${targetObjection}"
${specificObjectionFramework ? `- Objection framework to apply: ${specificObjectionFramework}` : ''}
${personalityHint ? `- PERSONALITY of the lead (embody it strongly in psychology, behavioralCues and verbalStyle — how they talk, what opens them up, what shuts them down): ${personalityHint}` : ''}
${realProduct ? `- FIXED PRODUCT the Closer sells (use EXACTLY this, DO NOT invent another): "${realProduct.name}" — ${realProduct.description}. USD ${realProduct.price}. Generate a lead who is a realistic prospect for THIS product/service, with a problem this product solves.` : ''}

REALISM PRINCIPLES (critical):
- Real people with contradictions. DO NOT assume everyone is a CEO; adapt to industry (employees, freelancers, students, small owners, etc.).
- Visible objection is almost NEVER the real reason: it's smokescreen. Behind it ALWAYS are 1-3 DEEP ROOT CAUSES in layers (past wound, fear, identity belief) — the deepest barely admitted even to oneself.
- Vary objection TYPES by person: structural (automatic procrastination), defensive (regain control), wound-based (been burned before), identity-based (don't know if I'm capable). Secondaries should NOT all be the same type or textbook generic: invent ones THIS lead would raise.
- Give them a story: a trigger event that brought them to this call, a previous attempt that failed, concrete consequence if unchanged.
- Specific conversational behavior: how they talk, what makes them open up, what shuts them down. This must be actionable for whoever plays them.
- Avoid clichés and generic phrases. Sound like a real person, not a manual.

For pipelineQuestions: per stage, 2-4 "lifesaver" questions/tips the CLOSER must use, tailored to THIS lead's pain and psychology. Exact questions, not generic.

FUNNEL STAGES:
${stagesContext}

Return ONLY a valid JSON object with this EXACT structure:
{
  "demographics": { "name": "", "age": "", "role": "", "industry": "", "companySize": "" },
  "psychology": {
    "urgency": "High/Medium/Low",
    "communicationStyle": "e.g. Direct and sharp / Analytical and cold / Warm but evasive",
    "primaryFear": "The deep fear (not superficial)",
    "primaryDesire": "The real desire behind the purchase",
    "decisionStyle": "How they make decisions: impulsive, needs data, consults others, analysis paralysis, etc.",
    "trustTrigger": "What specifically builds or breaks their trust in a salesperson"
  },
  "behavioralCues": {
    "opensUpWhen": "What makes them lower their guard and speak truthfully",
    "shutsDownWhen": "What puts them on defense or makes them close off",
    "verbalStyle": "How they literally talk: typical phrases, verbal tics, pace, tone"
  },
  "currentSituation": {
    "problem": "The real, deep problem",
    "triggerEvent": "The concrete event that made them book this call right now",
    "previousAttempts": "What they tried before and why it failed",
    "impact": "Financial AND emotional concrete impact of not solving it"
  },
  "productToSell": "1-2 paragraphs: high-ticket product/service the Closer offers, with name, key features and USD PRICE of 1500 or more (never less than 1500)",
  "productPrice": <integer in USD with NO symbols or text, equal to product price, 1500 or more>,
  "visibleObjection": "The easy excuse they'll say first (smokescreen)",
  "secondaryObjections": ["varied TYPES of objections (structural/defensive/wound/identity) specific to THIS lead"],
  "hiddenObjection": "The true hidden reason (for the Trainer), connected to fear and wound",
  "rootCauses": ["1-3 DEEP ROOT CAUSES in layers, shallowest to deepest. Each in 1 sentence with its type in brackets. E.g.: '[Wound] Paid USD 3,000 to an agency that disappeared and never told his wife', '[Identity] Deep down believes he's not the type who succeeds at this'"],
  "roleplayGuide": {
    "moneyBelief": "Limiting belief about money, 1 sentence",
    "competingGoal": "Inner conflict (wants X but fears Y), 1 sentence",
    "vendorFatigue": "Why they distrust salespeople, 1 sentence",
    "actorAdvice": "Direction for the person PLAYING THIS LEAD (the buyer), NOT the seller. Second person ('you'): voice tone, posture, attitude, resistance level and what emotion to project. E.g.: 'Speak sharp and rushed, arms crossed, defensive but deep down desperate for a solution.' NEVER give sales advice."
  },
  "pipelineQuestions": {
      ${pipelineKeys}
  }
}
`;
  }

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

  return `
IDIOMA OBLIGATORIO: TODO — absolutamente TODO — debe estar en ESPAÑOL. Sin excepciones. Ni una palabra en inglés.

Eres un guionista experto en psicología de ventas y comportamiento humano. Creá un Buyer Persona PROFUNDO y REALISTA para un roleplay de ventas High Ticket, completamente en ESPAÑOL.

PARÁMETROS:
- Dificultad: ${level} — ${depthInstruction}
- Industria/Tema: ${theme}
- Temperatura: ${tempInstruction}
- Objeción principal esperada: "${targetObjection}"
${specificObjectionFramework ? `- Framework de objeción a aplicar: ${specificObjectionFramework}` : ''}
${personalityHint ? `- PERSONALIDAD del lead (encarnala con fuerza en psychology, behavioralCues y verbalStyle — cómo habla, qué lo abre y qué lo cierra): ${personalityHint}` : ''}
${realProduct ? `- PRODUCTO FIJO que el Closer vende (usá EXACTAMENTE este, NO inventes otro): "${realProduct.name}" — ${realProduct.description}. Precio USD ${realProduct.price}. Generá un lead que sea un prospecto realista de ESTE producto/servicio, con un problema que este producto resuelve.` : ''}

PRINCIPIOS DE REALISMO (críticos):
- Personas de verdad, con contradicciones. NO asumas que todos son CEOs; adaptá al rubro (empleados, freelancers, estudiantes, dueños chicos, etc.).
- La objeción visible casi NUNCA es la razón real: es una cortina de humo. Detrás SIEMPRE hay 1 a 3 CAUSAS PROFUNDAS en capas (herida del pasado, miedo, creencia de identidad) — la más honda casi no se admite ni ante uno mismo.
- Variá el TIPO de objeciones según la persona: estructurales (postergación automática), defensivas (recuperar control), de herida (ya me fue mal antes) y de identidad (no sé si soy capaz). Las secundarias NO deben ser todas del mismo tipo ni las típicas de manual: inventá las que ESTE lead diría.
- Dale una historia: un evento detonante que lo trajo a esta llamada, un intento previo que falló, y una consecuencia concreta si no cambia.
- Comportamiento conversacional específico: cómo habla, qué lo hace abrirse y qué lo hace cerrarse. Esto debe ser accionable para quien lo actúa.
- Evitá clichés y frases genéricas. Que suene a una persona real, no a un manual.

Para pipelineQuestions: por cada etapa, 2 a 4 preguntas/consejos "salvavidas" que el CLOSER debe usar, adaptados al dolor y psicología de ESTE lead. Preguntas exactas, no genéricas.

ETAPAS DEL EMBUDO:
${stagesContext}

⚠️ RECORDATORIO CRÍTICO: TODOS los campos (nombre, role, problema, objeciones, miedos, deseos, causas profundas, producto, absolutamente TODO) deben estar en ESPAÑOL. Prohibido inglés en cualquier campo. Si detectas que escribiste algo en inglés, reemplazalo inmediatamente por español. Revisa DOS VECES antes de devolver el JSON.

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
  "productPrice": <número entero en USD SIN símbolos ni texto, igual al precio del producto, 1500 o más>,
  "visibleObjection": "La excusa fácil que dirá primero (cortina de humo)",
  "secondaryObjections": ["objeciones de TIPOS variados (estructural/defensiva/herida/identidad), propias de ESTE lead"],
  "hiddenObjection": "La verdadera razón oculta (para el Trainer), conectada al miedo y a la herida",
  "rootCauses": ["1 a 3 causas PROFUNDAS en capas, de la más superficial a la más honda. Cada una en 1 frase con su tipo entre corchetes. Ej: '[Herida] Pagó USD 3.000 a una agencia que desapareció y nunca se lo contó a su esposa', '[Identidad] En el fondo cree que no es de los que logran esto'"],
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

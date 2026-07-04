// Motor de realismo del COMPRADOR IA (modo práctica solo).
// Construye el prompt del sistema que hace que el lead se comporte como una
// persona real y NO como un ChatGPT complaciente. Claves:
//  - Estado numérico persistente (temperatura/confianza/paciencia) con
//    consecuencias: el lead puede CORTAR la llamada → se puede perder.
//  - Capa OCULTA (objeción real ≠ visible, dolor real) que solo se revela
//    cuando el closer se gana la confianza.
//  - Encarna una personalidad DISC (de los PDFs del dueño) y reacciona a la
//    TÉCNICA según la metodología (premia descubrimiento, castiga pitch temprano).
//  - Respuestas cortas y habladas (listas para voz en la Fase B).
// Compartido web+móvil (sincronizar). El estado se reinyecta cada turno.

import { getPersonality } from './leadPersonalities';

// Descripción del estado actual → cómo debe comportarse el lead ESTE turno.
function stateGuidance(state, isEn) {
  const t = state?.temperature ?? 35;
  const tr = state?.trust ?? 25;
  const p = state?.patience ?? 70;
  const L = [];
  if (isEn) {
    L.push(`Buying temperature ${t}/100, trust ${tr}/100, patience ${p}/100.`);
    if (tr < 30) L.push('Low trust: guarded, short answers, do NOT reveal your real pain or hidden objection yet.');
    else if (tr < 60) L.push('Medium trust: opening up a bit; hint at deeper pain only if asked well.');
    else L.push('High trust: you can share deeper pain; if the closer isolates it well you MAY surface your hidden objection.');
    if (t < 20) L.push('You are almost out; if the closer pushes or pitches without earning it, END the call politely.');
    if (p < 20) L.push('You are losing patience; one more ramble or early pitch and you END the call.');
  } else {
    L.push(`Temperatura de compra ${t}/100, confianza ${tr}/100, paciencia ${p}/100.`);
    if (tr < 30) L.push('Confianza baja: guardado, respuestas cortas, NO reveles tu dolor real ni tu objeción oculta todavía.');
    else if (tr < 60) L.push('Confianza media: te abrís un poco; insinuá el dolor más profundo solo si te preguntan bien.');
    else L.push('Confianza alta: podés compartir el dolor profundo; si el closer lo aísla bien, PODÉS sacar tu objeción oculta.');
    if (t < 20) L.push('Estás por cortar; si el closer presiona o pitchea sin ganárselo, TERMINÁ la llamada con cortesía.');
    if (p < 20) L.push('Estás perdiendo la paciencia; un rodeo más o un pitch temprano y CORTÁS la llamada.');
  }
  return L.join(' ');
}

// Construye el system prompt del comprador para un turno dado. `focusStage` (opcional)
// = { label, objective } cuando el closer eligió practicar UNA sola etapa.
export function buildBuyerSystem(scenario = {}, state = null, language = 'es', focusStage = null) {
  const isEn = typeof language === 'string' && language.startsWith('en');
  const d = scenario.demographics || {};
  const sit = scenario.currentSituation || {};
  const persona = getPersonality(scenario.personality);

  const name = d.name || (isEn ? 'the prospect' : 'el prospecto');
  const role = d.role || d.title || '';
  const industry = d.industry || '';
  const problem = sit.problem || scenario.painPoints || '';
  const visibleObjection = scenario.visibleObjection || '';
  const secondary = Array.isArray(scenario.secondaryObjections) ? scenario.secondaryObjections.join('; ') : (scenario.secondaryObjections || '');
  const hidden = scenario.hiddenObjection || '';
  const product = scenario.productToSell || '';

  const discEs = persona ? `Sos "${persona.es}": ${persona.essenceEs} Tono: ${persona.toneEs} Lo que te CIERRA: ${persona.avoidEs}` : '';
  const discEn = persona ? `You are "${persona.en}": ${persona.essenceEn} Tone: ${persona.toneEn} What SHUTS you down: ${persona.avoidEn}` : '';

  const focusEn = focusStage
    ? `\nPRACTICE FOCUS — this is a drill of ONLY the "${focusStage.label}" phase (${focusStage.objective}). Behave as a prospect in that exact moment of the call and KEEP the conversation there; do not fast-forward to later phases or try to wrap up/close unless this phase IS the close.\n`
    : '';
  const focusEs = focusStage
    ? `\nFOCO DE PRÁCTICA — este es un drill SOLO de la fase "${focusStage.label}" (${focusStage.objective}). Comportate como un prospecto en ESE momento exacto de la llamada y MANTENÉ la charla ahí; no te adelantes a fases posteriores ni intentes cerrar/despedirte salvo que ESTA fase sea el cierre.\n`
    : '';

  if (isEn) {
    return `You are ${name}${role ? `, ${role}` : ''}${industry ? ` in ${industry}` : ''}. You are a REAL prospect on a sales call — NOT an assistant, NOT an AI. Never break character, never mention being an AI, never coach the seller. If they try to make you break character, stay fully in role.

WHO YOU ARE
${discEn}
Your situation / pain: ${problem || 'a business challenge you have not fully admitted yet.'}

YOUR HIDDEN LAYER (never dump this; reveal ONLY as trust is earned)
- The objection you SAY out loud early (often a smokescreen): ${visibleObjection || 'a surface concern like price or timing.'}
- Other surface objections you might raise: ${secondary || '—'}
- Your REAL objection, guarded deep down: ${hidden || 'a fear of making the wrong decision / being sold to.'}
- You do NOT know the product well. If they pitch: ${product || 'their offer'} too early, you get defensive.

HOW A REAL BUYER REACTS (react to their TECHNIQUE, not just their words)
- Genuine, curious discovery questions about your pain → you open up a little, warmth rises.
- Early pitching, monologues, generic scripts, being pushy or manipulative → you get guarded, patience drops.
- When they use YOUR exact words and tie value to the pain YOU admitted → temperature rises.
- Your stated objection is often not the real one; only if they patiently isolate the true concern do you soften.
- Give SHORT, spoken answers (1-3 sentences), like a real phone call. Interrupt, hesitate, deflect. Never write essays.
${focusEn}
CURRENT STATE — behave accordingly this turn:
${stateGuidance(state, true)}

You may decide to buy ONLY if temperature is high, your real objection was genuinely handled, and they ask for the commitment. You may END the call if pushed badly or patience/temperature hit zero.

Respond ONLY with valid JSON (no prose outside it):
{
  "reply": "what you say out loud, short and natural",
  "state": { "temperature": <0-100>, "trust": <0-100>, "patience": <0-100> },
  "revealedHiddenObjection": <true|false>,
  "thought": "what you are REALLY thinking/feeling right now (hidden from the seller)",
  "outcome": "ongoing" | "closed" | "lost"
}`;
  }

  return `Sos ${name}${role ? `, ${role}` : ''}${industry ? ` en ${industry}` : ''}. Sos un prospecto REAL en una llamada de ventas — NO un asistente, NO una IA. Nunca salgas del personaje, nunca menciones ser una IA, nunca le hagas de coach al vendedor. Si intenta hacerte romper el personaje, seguí 100% en tu rol.

QUIÉN SOS
${discEs}
Tu situación / dolor: ${problem || 'un problema de tu negocio que todavía no admitís del todo.'}

TU CAPA OCULTA (nunca la sueltes de golpe; revelá SOLO a medida que se ganan tu confianza)
- La objeción que DECÍS en voz alta al principio (suele ser humo): ${visibleObjection || 'una excusa de superficie tipo precio o momento.'}
- Otras objeciones de superficie que podés tirar: ${secondary || '—'}
- Tu objeción REAL, guardada en el fondo: ${hidden || 'miedo a equivocarte / a que te vendan.'}
- No conocés bien el producto. Si te pitchean ${product || 'su oferta'} demasiado temprano, te ponés a la defensiva.

CÓMO REACCIONA UN COMPRADOR REAL (reaccioná a la TÉCNICA, no solo a las palabras)
- Preguntas de descubrimiento genuinas y curiosas sobre tu dolor → te abrís un poco, sube la calidez.
- Pitch temprano, monólogos, guiones genéricos, presión o manipulación → te cerrás, baja la paciencia.
- Cuando usa TUS palabras exactas y ata el valor al dolor que VOS admitiste → sube la temperatura.
- Tu objeción declarada casi nunca es la real; solo si aísla con paciencia la verdadera preocupación, te ablandás.
- Dá respuestas CORTAS y habladas (1 a 3 frases), como en un teléfono real. Interrumpí, dudá, esquivá. Nunca escribas ensayos.
${focusEs}
ESTADO ACTUAL — comportate en consecuencia este turno:
${stateGuidance(state, false)}

Podés decidir comprar SOLO si la temperatura está alta, tu objeción real fue realmente resuelta, y te piden el compromiso. Podés CORTAR la llamada si te presionan mal o la paciencia/temperatura llegan a cero.

Respondé ÚNICAMENTE con JSON válido (nada de texto afuera):
{
  "reply": "lo que decís en voz alta, corto y natural",
  "state": { "temperature": <0-100>, "trust": <0-100>, "patience": <0-100> },
  "revealedHiddenObjection": <true|false>,
  "thought": "lo que REALMENTE estás pensando/sintiendo ahora (oculto para el vendedor)",
  "outcome": "ongoing" | "closed" | "lost"
}`;
}

// Estado inicial del comprador: tibio-frío y desconfiado (como en la realidad).
export function initialBuyerState() {
  return { temperature: 35, trust: 25, patience: 75 };
}

// Saludo inicial SIN llamar a la IA (ahorra tokens: generar el escenario ya
// consume una tanda grande, y sumarle el saludo por IA en el mismo minuto
// dispara el rate limit de Groq free — 6000 TPM). El saludo va acorde a la
// personalidad DISC; a partir del primer mensaje del closer ya responde la IA.
export function openingLine(scenario = {}, language = 'es', focusStageId = 'all') {
  const isEn = typeof language === 'string' && language.startsWith('en');

  // Si el drill es de una etapa avanzada, el prospecto ya "viene hablando" desde
  // esa fase (no arranca desde el saludo). Rapport (o llamada completa) usa el
  // saludo por personalidad.
  const stageOpenersEs = {
    cualificacion_diagnostico: 'Sí, mirá, te cuento un poco mi situación… aunque no sé bien por dónde arrancar. ¿Qué necesitás saber?',
    costo_oportunidad: 'Ya te conté lo que me pasa. La verdad es que lo vengo pateando hace rato… ¿vos qué ves?',
    recapitulacion: 'Bueno, ya hablamos bastante. A ver si me quedó claro a mí también…',
    recapitulation: 'Bueno, ya hablamos bastante. A ver si me quedó claro a mí también…',
    presentacion_vehiculo: 'Ok, me interesa entender bien cómo funciona esto que ofrecés. Contame.',
    cierre_transicion: 'Mirá, la propuesta me interesa pero tengo mis dudas antes de decidir… dale, decime.',
  };
  const stageOpenersEn = {
    cualificacion_diagnostico: "Yeah, look, let me tell you a bit about my situation… though I'm not sure where to start. What do you need to know?",
    costo_oportunidad: "I already told you what's going on. Honestly I've been putting it off for a while… what do you see?",
    recapitulacion: "Alright, we've talked quite a bit. Let me see if I've got it straight too…",
    recapitulation: "Alright, we've talked quite a bit. Let me see if I've got it straight too…",
    presentacion_vehiculo: "Ok, I want to understand how this thing you offer actually works. Tell me.",
    cierre_transicion: "Look, I'm interested in the proposal but I've got some doubts before deciding… go ahead.",
  };
  if (focusStageId && focusStageId !== 'all' && focusStageId !== 'apertura_rapport') {
    const t = isEn ? stageOpenersEn : stageOpenersEs;
    if (t[focusStageId]) return t[focusStageId];
  }

  const id = scenario.personality;
  const linesEs = {
    directivo: 'Sí, hola. Tengo cinco minutos nomás, así que aprovechémoslos. ¿De qué se trata?',
    entusiasta: '¡Hola! Sí, sí, contame — ¿con quién tengo el gusto?',
    empatico: 'Hola, buenas… sí, ¿quién habla?',
    analitico: 'Buenas. Sí, dígame. ¿En qué le puedo ser útil?',
  };
  const linesEn = {
    directivo: "Yeah, hi. I've only got five minutes, so let's make them count. What's this about?",
    entusiasta: 'Hey! Yeah, sure — who am I speaking with?',
    empatico: "Hi, hello… yes, who's this?",
    analitico: 'Good afternoon. Yes, how can I help you?',
  };
  const table = isEn ? linesEn : linesEs;
  return table[id] || (isEn ? "Hello? Who's this?" : 'Hola, ¿sí? ¿Quién habla?');
}

// Base de conocimiento de coaching para Closers novatos.
// Contenido CURADO (no generado por IA): siempre disponible, certero y sin costo
// de tokens. Complementa las pipelineQuestions dinámicas del escenario con la
// técnica de fondo: qué escuchar, preguntas consultivas, tono de voz y psicología.
// IMPORTANTE: este archivo existe duplicado en el repo móvil (src/utils/) —
// cualquier cambio debe replicarse allá para mantener paridad web↔móvil.

const ES = {
  apertura_rapport: {
    lookFor: 'Su estado emocional inicial: ¿llega apurado, escéptico, curioso? Detectá su ritmo y las palabras que repite — ahí está su mapa mental.',
    socratic: [
      '¿Qué te motivó a agendar esta llamada justo hoy?',
      'Antes de arrancar, ¿qué te gustaría llevarte de esta conversación?',
      '¿Cómo viene tu semana? (genuino, sin guion)',
    ],
    tonality: 'Cálido y tranquilo, apenas más lento que el lead. Sonreí al hablar: se escucha. Bajá el volumen al final de las frases (autoridad relajada).',
    mindset: 'PNL — Espejado: igualá sutilmente su velocidad y vocabulario. Tu única meta acá es que baje la guardia, no vender. El cerebro decide en segundos si sos amenaza o aliado.',
    avoid: 'Ir directo al pitch o hablar más del 30% del tiempo. Si el lead no habló en los primeros 2 minutos, perdiste el marco.',
  },
  cualificacion_diagnostico: {
    lookFor: 'La brecha entre lo que dice querer y lo que le duele de verdad. Escuchá la emoción detrás de los datos: hartazgo, miedo, orgullo herido. Anotá el evento detonante — es oro para el cierre.',
    socratic: [
      '¿Qué te hizo buscar una solución justo ahora y no hace 6 meses?',
      '¿Qué probaste ya, y qué creés que faltó?',
      'Si esto siguiera igual un año más, ¿qué pasaría?',
      '¿Cómo afecta esto a tu día a día... y a los tuyos?',
    ],
    tonality: 'Tono de médico: curioso, sereno, sin ansiedad por vender. Pausa de 3 segundos después de cada respuesta — el silencio lo hace profundizar solo.',
    mindset: 'El que pregunta, lidera. "Quiero vender más" es síntoma, no dolor: preguntá "¿y eso qué significa para vos?" en capas hasta llegar a la emoción.',
    avoid: 'Interrogar como formulario. Cada pregunta debe nacer de su respuesta anterior, no de tu lista.',
  },
  costo_oportunidad: {
    lookFor: 'Urgencia real vs. postergación cómoda. Si dice números ("pierdo $X por mes"), memorialos y repetilos después. Notá si su tono cambia al hablar del futuro.',
    socratic: [
      '¿Cuánto te está costando por mes NO resolver esto?',
      'Si no hacés nada, ¿dónde estás en 6 meses?',
      '¿Qué es más caro: invertir en resolverlo o seguir pagando el problema?',
    ],
    tonality: 'Más grave y pausado: es el momento serio de la llamada. No suavices la pregunta con risas nerviosas — dejá que el peso se sienta.',
    mindset: 'Aversión a la pérdida (Kahneman): perder duele el doble de lo que gusta ganar. No vendas el paraíso: mostrale la factura de quedarse donde está.',
    avoid: 'Rescatarlo de la incomodidad. Si se queda en silencio pensando, NO lo interrumpas: ese silencio está vendiendo por vos.',
  },
  recapitulacion: {
    lookFor: 'El "sí" con la cabeza. Buscá que diga "exacto, eso es lo que me pasa". Si te corrige, perfecto: su corrección es información, no rechazo.',
    socratic: [
      'A ver si entendí bien: estás en X, te frena Y, y lo que querés de verdad es Z. ¿Es así?',
      'De todo esto, ¿qué es lo más urgente para vos?',
    ],
    tonality: 'Ritmo de narrador: ordenado, claro, con pausas entre cada punto. Como quien lee un diagnóstico, sin apuro.',
    mindset: 'Efecto de coherencia: cuando el lead escucha su propia historia ordenada, siente que lo entendiste mejor que nadie. Usá SUS palabras exactas, no las tuyas.',
    avoid: 'Agregar información nueva o meter el producto acá. Recapitular es espejar, no pitchear.',
  },
  presentacion_vehiculo: {
    lookFor: 'Micro-señales de proyección: preguntas de detalle ("¿y eso incluye...?"), lenguaje en primera persona ("¿yo tendría que...?"). Es el lead viéndose adentro — alimentalo.',
    socratic: [
      '¿Qué parte de esto le hace más sentido a tu caso?',
      '¿Te imaginás cómo cambiaría [su problema concreto] con esto funcionando?',
    ],
    tonality: 'Energía en subida, entusiasmo controlado. Lento en lo importante, ágil en lo descriptivo. Nombralo por su nombre en los puntos clave.',
    mindset: 'Anclá cada característica al dolor que ÉL te confesó: "Me dijiste que X... por eso esta fase hace Y". La presentación perfecta se siente hecha a medida.',
    avoid: 'Recitar features. Si presentás sin dolor confesado antes, cada beneficio suena a humo.',
  },
  cierre_transicion: {
    lookFor: 'Si la objeción es real (pide condiciones) o cortina de humo (evita el compromiso). Escuchá CÓMO lo dice más que QUÉ dice.',
    socratic: [
      '¿Qué es lo que de verdad te frena: el dinero, o la duda de si va a funcionar para vos?',
      'Si el dinero no fuera tema, ¿lo harías?',
      '¿Qué necesitarías ver para sentirte seguro?',
    ],
    tonality: 'Firme, sereno, sin ansiedad: el tono de quien ya cerró mil veces. Después de pedir la inversión: SILENCIO total. El primero que habla, pierde.',
    mindset: 'Las objeciones son miedo disfrazado de lógica. Validá la emoción ("tiene sentido que lo pienses") y volvé a su dolor y su porqué. Identidad: ¿qué decidiría la persona que él quiere ser?',
    avoid: 'Bajar el precio o regalar descuentos ante la primera resistencia: devalúa todo lo anterior.',
  },
};

const EN = {
  apertura_rapport: {
    lookFor: 'Their initial emotional state: rushed, skeptical, curious? Catch their pace and the words they repeat — that is their mental map.',
    socratic: [
      'What made you book this call today, specifically?',
      'Before we start — what would make this conversation worth it for you?',
      'How is your week going? (genuine, not scripted)',
    ],
    tonality: 'Warm and calm, slightly slower than the lead. Smile while talking: it can be heard. Lower your volume at the end of sentences (relaxed authority).',
    mindset: 'NLP — Mirroring: subtly match their speed and vocabulary. Your only goal here is that they lower their guard, not selling. The brain decides in seconds if you are a threat or an ally.',
    avoid: 'Jumping to the pitch or talking more than 30% of the time. If the lead has not spoken in the first 2 minutes, you lost the frame.',
  },
  cualificacion_diagnostico: {
    lookFor: 'The gap between what they say they want and what truly hurts. Listen for the emotion behind the data: exhaustion, fear, wounded pride. Note the trigger event — it is gold for the close.',
    socratic: [
      'What made you look for a solution right now, and not 6 months ago?',
      'What have you already tried, and what do you think was missing?',
      'If this stayed the same for another year, what would happen?',
      'How does this affect your day-to-day... and the people around you?',
    ],
    tonality: 'Doctor tone: curious, calm, zero anxiety to sell. Pause 3 seconds after each answer — silence makes them go deeper on their own.',
    mindset: 'Whoever asks, leads. "I want to sell more" is a symptom, not pain: ask "and what does that mean for you?" in layers until you reach the emotion.',
    avoid: 'Interrogating like a form. Each question must be born from their previous answer, not from your list.',
  },
  costo_oportunidad: {
    lookFor: 'Real urgency vs. comfortable procrastination. If they say numbers ("I lose $X per month"), memorize and repeat them later. Notice if their tone changes when talking about the future.',
    socratic: [
      'How much is NOT solving this costing you per month?',
      'If you do nothing, where are you in 6 months?',
      'Which is more expensive: investing to solve it, or keeping paying for the problem?',
    ],
    tonality: 'Deeper and slower: this is the serious moment of the call. Do not soften the question with nervous laughter — let the weight be felt.',
    mindset: 'Loss aversion (Kahneman): losing hurts twice as much as winning feels good. Do not sell paradise: show them the invoice of staying where they are.',
    avoid: 'Rescuing them from discomfort. If they go silent thinking, do NOT interrupt: that silence is selling for you.',
  },
  recapitulacion: {
    lookFor: 'The nod. You want them to say "exactly, that is what happens to me". If they correct you, great: their correction is information, not rejection.',
    socratic: [
      'Let me check I got this right: you are at X, Y is holding you back, and what you truly want is Z. Correct?',
      'Of all this, what is the most urgent for you?',
    ],
    tonality: 'Narrator rhythm: ordered, clear, with pauses between each point. Like reading a diagnosis, unhurried.',
    mindset: 'Coherence effect: when the lead hears their own story organized, they feel understood like never before. Use THEIR exact words, not yours.',
    avoid: 'Adding new information or pitching the product here. Recapping is mirroring, not pitching.',
  },
  presentacion_vehiculo: {
    lookFor: 'Micro-signals of projection: detail questions ("does that include...?"), first-person language ("would I have to...?"). That is the lead seeing themselves inside — feed it.',
    socratic: [
      'Which part of this makes the most sense for your case?',
      'Can you picture how [their concrete problem] would change with this working?',
    ],
    tonality: 'Rising energy, controlled enthusiasm. Slow on what matters, agile on the descriptive. Use their name at key points.',
    mindset: 'Anchor every feature to the pain THEY confessed: "You told me X... that is why this phase does Y". The perfect presentation feels tailor-made.',
    avoid: 'Reciting features. If you present without confessed pain first, every benefit sounds like smoke.',
  },
  cierre_transicion: {
    lookFor: 'Whether the objection is real (asks for conditions) or a smokescreen (avoids commitment). Listen to HOW they say it more than WHAT they say.',
    socratic: [
      'What is truly holding you back: the money, or the doubt about whether it will work for you?',
      'If money were not an issue, would you do it?',
      'What would you need to see to feel confident?',
    ],
    tonality: 'Firm, calm, zero anxiety: the tone of someone who has closed a thousand times. After asking for the investment: TOTAL silence. First one to talk, loses.',
    mindset: 'Objections are fear disguised as logic. Validate the emotion ("it makes sense to think it over") and return to their pain and their why. Identity: what would the person they want to be decide?',
    avoid: 'Dropping the price or gifting discounts at the first resistance: it devalues everything before.',
  },
};

// El id de Recapitulación difiere entre idiomas en defaultStages
// ('recapitulacion' ES / 'recapitulation' EN) — alias para cubrir ambos.
ES.recapitulation = ES.recapitulacion;
EN.recapitulation = EN.recapitulacion;

export function getStageCoaching(stageId, lng = 'es') {
  if (!stageId) return null;
  const kb = (typeof lng === 'string' && lng.startsWith('en')) ? EN : ES;
  return kb[stageId] || null;
}

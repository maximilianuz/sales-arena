// Personalidades del lead (tipología DISC de 4 perfiles), extraída y reelaborada
// del material de coaching del dueño — SIN copiar los nombres originales.
// Le sirve a dos cosas: (1) que el LEAD actúe con una personalidad realista, y
// (2) que el CLOSER reciba tips de cómo abordar/cerrar según ese perfil.
// Compartido web+móvil (sincronizar).

export const LEAD_PERSONALITIES = [
  {
    id: 'directivo',
    es: 'El Directivo', en: 'The Driver', color: '#ef4444',
    essenceEs: 'Orientado a resultados, impaciente y competitivo. Quiere control y ganar.',
    essenceEn: 'Results-driven, impatient and competitive. Wants control and to win.',
    connectEs: 'Mostrá confianza y andá al grano con un resultado en mente. Cumplidos sinceros y casos de éxito.',
    connectEn: 'Show confidence and get to the point with a result in mind. Sincere compliments and success cases.',
    closeEs: 'Proceso rápido y preciso. Hablá de resultados, repetí sus metas y dale opciones para que ELIJA. Le encanta ser el primero.',
    closeEn: 'Fast, precise process. Talk results, echo their goals, give options so THEY choose. They love being first.',
    avoidEs: 'Rodeos, lentitud o hacerle sentir que perdés el control de la charla.',
    avoidEn: 'Rambling, slowness, or making them feel they lose control.',
    toneEs: 'Directo, seguro y dinámico.',
    toneEn: 'Direct, confident, dynamic.',
  },
  {
    id: 'entusiasta',
    es: 'El Entusiasta', en: 'The Enthusiast', color: '#3b82f6',
    essenceEs: 'Social, optimista y emocional. Se mueve por la visión, las historias y la diversión.',
    essenceEn: 'Social, optimistic and emotional. Moved by vision, stories and fun.',
    connectEs: 'Sé optimista y amable, sonreí, mantené la charla simple y dejalo hablar. Mostrale el lado entusiasmante.',
    connectEn: 'Be upbeat and warm, smile, keep it simple and let them talk. Show the exciting side.',
    closeEs: 'Sencillo, nada técnico. Contá historias, pintá el cuadro (no todos los detalles), tono casual y creá una visión que sienta real.',
    closeEn: 'Keep it simple, no jargon. Tell stories, paint the picture (not every detail), casual tone, build a vision that feels real.',
    avoidEs: 'Tecnicismos, exceso de datos y negatividad — lo apagan.',
    avoidEn: 'Jargon, data overload and negativity — they shut down.',
    toneEs: 'Cálido, entusiasta y casual.',
    toneEn: 'Warm, enthusiastic, casual.',
  },
  {
    id: 'empatico',
    es: 'El Empático', en: 'The Relator', color: '#10b981',
    essenceEs: 'Relacional y sensible. Valora la confianza, la familia y sentirse cuidado. Decide despacio.',
    essenceEn: 'Relational and sensitive. Values trust, family and feeling cared for. Decides slowly.',
    connectEs: 'Sé cortés y cercano, bajá el tono de voz, hacé preguntas para que se abra y mostrá tu lado humano.',
    connectEn: 'Be courteous and warm, soften your voice, ask questions so they open up, show your human side.',
    closeEs: 'Decile que lo apoyás decida lo que decida. Mostrá cómo lo ayuda a él y a su familia, ESCUCHÁ y dale tiempo. Aprecia el toque personal.',
    closeEn: 'Tell them you support them whatever they decide. Show how it helps them and their family, LISTEN and give time. They value the personal touch.',
    avoidEs: 'Presión, apuro o frialdad — se cierran.',
    avoidEn: 'Pressure, rushing or coldness — they close up.',
    toneEs: 'Suave, cálido y paciente.',
    toneEn: 'Soft, warm, patient.',
  },
  {
    id: 'analitico',
    es: 'El Analítico', en: 'The Analyst', color: '#a78bfa',
    essenceEs: 'Metódico y profesional. Quiere datos, proceso y pruebas. Desconfía de la exageración.',
    essenceEn: 'Methodical and professional. Wants data, process and proof. Distrusts hype.',
    connectEs: 'Respetá su tiempo, sé profesional, hacé preguntas específicas y respondé directo. Mostrale el proceso y validá que funciona.',
    connectEn: 'Respect their time, be professional, ask specific questions and answer directly. Show the process and validate it works.',
    closeEs: 'Validá por qué funciona sin insistir, hablá con integridad, mostrá cómo ahorra dinero y tiene sentido. Si no sabés algo, admitilo y dá seguimiento puntual.',
    closeEn: 'Validate why it works without pushing, speak with integrity, show how it saves money and makes sense. If you don\'t know, admit it and follow up punctually.',
    avoidEs: 'Exagerar, presionar, ser vago o hacerte el listo.',
    avoidEn: 'Hype, pressure, vagueness or being a smart-aleck.',
    toneEs: 'Profesional, preciso y calmado.',
    toneEn: 'Professional, precise, calm.',
  },
];

export function getPersonality(id) {
  return LEAD_PERSONALITIES.find((p) => p.id === id) || null;
}

export function randomPersonality() {
  return LEAD_PERSONALITIES[Math.floor(Math.random() * LEAD_PERSONALITIES.length)];
}

// Vista localizada para la UI (tips del Closer).
export function personalityView(p, lng = 'es') {
  if (!p) return null;
  const en = typeof lng === 'string' && lng.startsWith('en');
  return {
    id: p.id,
    color: p.color,
    name: en ? p.en : p.es,
    essence: en ? p.essenceEn : p.essenceEs,
    connect: en ? p.connectEn : p.connectEs,
    close: en ? p.closeEn : p.closeEs,
    avoid: en ? p.avoidEn : p.avoidEs,
    tone: en ? p.toneEn : p.toneEs,
  };
}

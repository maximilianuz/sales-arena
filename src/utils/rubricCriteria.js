// Rúbrica de evaluación del Closer — 5 criterios, puntaje 1-5.
// Base: el checklist del Observador (i18n roles.checklistContent). Estos puntajes
// estructurados alimentan el análisis del coach (datos comparables y certeros,
// no solo notas libres). DUPLICADO en el repo móvil (src/utils/) — sincronizar.

export const RUBRIC_CRITERIA = [
  {
    id: 'rapport',
    es: 'Nivel de Rapport',
    en: 'Rapport level',
    hintEs: '¿Logró sintonía antes de interrogar? ¿Validó lo que decía el lead?',
    hintEn: 'Did they build rapport before probing? Did they validate the lead?',
  },
  {
    id: 'real_pain',
    es: 'Dolor real vs. superficial',
    en: 'Real vs. surface pain',
    hintEs: '¿Indagó hasta la causa real de la frustración o se quedó en el síntoma?',
    hintEn: 'Did they dig to the real cause or stay on the symptom?',
  },
  {
    id: 'value_gap',
    es: 'Brecha de valor',
    en: 'Value gap',
    hintEs: '¿Hizo que el lead exprese el costo de no actuar hoy?',
    hintEn: 'Did they make the lead express the cost of not acting today?',
  },
  {
    id: 'recap',
    es: 'Recapitulación',
    en: 'Recap',
    hintEs: '¿Ordenó el caos del lead y resumió antes de presentar la solución?',
    hintEn: 'Did they organize the lead\'s chaos and summarize before presenting?',
  },
  {
    id: 'objection_isolation',
    es: 'Aislamiento de objeción',
    en: 'Objection isolation',
    hintEs: '¿Indagó la objeción oculta o intentó convencer con lógica?',
    hintEn: 'Did they isolate the hidden objection or just argue with logic?',
  },
];

export function getRubricLabel(criterion, lng = 'es') {
  const en = typeof lng === 'string' && lng.startsWith('en');
  return {
    label: en ? criterion.en : criterion.es,
    hint: en ? criterion.hintEn : criterion.hintEs,
  };
}

// Promedio (0-5) de una rúbrica { criterioId: 1-5 }. null si no hay puntajes.
export function rubricAverage(rubric) {
  if (!rubric) return null;
  const vals = RUBRIC_CRITERIA.map((c) => rubric[c.id]).filter((v) => typeof v === 'number' && v > 0);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// Gamificación temática: la "CUENTA BANCARIA del Closer". En vez de XP abstracto,
// cada sesión analizada suma COMISIÓN en dólares (simulada) → engancha de verdad
// porque un closer piensa en plata. Compartido web+móvil (sincronizar).
// El cálculo también vive inline en netlify/functions/analyze-session.js.

export const TIERS = [
  { id: 'rookie',  es: 'Rookie',         en: 'Rookie',        min: 0,      color: '#94a3b8' },
  { id: 'junior',  es: 'Junior Closer',  en: 'Junior Closer', min: 2000,   color: '#22d3ee' },
  { id: 'closer',  es: 'Closer',         en: 'Closer',        min: 8000,   color: '#34d399' },
  { id: 'senior',  es: 'Senior Closer',  en: 'Senior Closer', min: 25000,  color: '#a78bfa' },
  { id: 'elite',   es: 'Closer Élite',   en: 'Elite Closer',  min: 60000,  color: '#ff9f0a' },
  { id: 'maestro', es: 'Maestro Closer', en: 'Master Closer', min: 150000, color: '#f43f5e' },
];

// Comisión (USD simulados) por sesión analizada. Debe coincidir con el cálculo
// inline del servidor (analyze-session.js).
export function commissionForSession({ overallScore = 0, rubricAvg = 0, closed = false }) {
  let usd = 50;
  usd += Math.round((overallScore || 0) * 45); // hasta +450
  usd += Math.round((rubricAvg || 0) * 40);      // hasta +200
  if (closed) usd += 200;                        // bonus por cerrar el trato
  return usd;
}

// Puntos de soporte por sesión para Lead y Observador. Todos los roles suman:
// menos que la comisión del Closer (el protagonista), pero el esfuerzo de
// actuar de lead u observar con rúbrica/bitácora completa se reconoce.
// Debe coincidir con el cálculo inline del servidor (analyze-session.js).
export function supportPointsForSession({ role, overallScore = 0, hasRubric = false, hasListeningLog = false }) {
  if (role === 'lead') {
    // El Lead hace posible la práctica: base + bonus por sesión bien jugada.
    return 100 + Math.round((overallScore || 0) * 10); // hasta 200
  }
  // Observador: base + bonus por entregar rúbrica y bitácora (trabajo real).
  let pts = 80;
  if (hasRubric) pts += 60;
  if (hasListeningLog) pts += 60;
  return pts; // hasta 200
}

// Nivel/rango actual + progreso hacia el siguiente según la comisión acumulada.
export function tierFromEarnings(total = 0) {
  let current = TIERS[0];
  let next = null;
  for (let i = 0; i < TIERS.length; i++) {
    if (total >= TIERS[i].min) {
      current = TIERS[i];
      next = TIERS[i + 1] || null;
    }
  }
  const floor = current.min;
  const ceil = next ? next.min : current.min;
  const progress = next ? Math.min(1, (total - floor) / (ceil - floor)) : 1;
  return { tier: current, next, progress, toNext: next ? Math.max(0, next.min - total) : 0 };
}

export function tierLabel(tier, lng = 'es') {
  const en = typeof lng === 'string' && lng.startsWith('en');
  return en ? tier.en : tier.es;
}

// $12,340 — formato con separadores de miles.
export function formatMoney(n = 0) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

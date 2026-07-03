// Insignias del dojo: se DERIVAN de users/{uid}/stats (función pura, sin
// escritura extra en RTDB → sin reglas nuevas y nunca desincronizadas).
// Compartido web+móvil (sincronizar).

export const BADGES = [
  { id: 'first_session', icon: '🎯', es: 'Primera sesión',    en: 'First session',   test: s => (s.sessionsCompleted || 0) >= 1 },
  { id: 'first_close',   icon: '🤝', es: 'Primer cierre',     en: 'First close',     test: s => (s.closesCount || 0) >= 1 },
  { id: 'closes_5',      icon: '💼', es: '5 cierres',         en: '5 closes',        test: s => (s.closesCount || 0) >= 5 },
  { id: 'closes_25',     icon: '🏆', es: '25 cierres',        en: '25 closes',       test: s => (s.closesCount || 0) >= 25 },
  { id: 'streak_7',      icon: '🔥', es: 'Racha de 7 días',   en: '7-day streak',    test: s => (s.streak || 0) >= 7 },
  { id: 'streak_30',     icon: '⚡', es: 'Racha de 30 días',  en: '30-day streak',   test: s => (s.streak || 0) >= 30 },
  { id: 'ace',           icon: '⭐', es: 'Sesión 9+',         en: '9+ session',      test: s => (s.bestScore || 0) >= 9 },
  { id: 'grinder',       icon: '🥋', es: '20 sesiones',       en: '20 sessions',     test: s => (s.sessionsCompleted || 0) >= 20 },
  { id: 'team_player',   icon: '🤲', es: 'Jugador de equipo', en: 'Team player',     test: s => ((s.sessionsAsLead || 0) + (s.sessionsAsObserver || 0)) >= 10 },
];

// Devuelve las insignias ganadas según los stats actuales.
export function earnedBadges(stats = {}) {
  return BADGES.filter(b => b.test(stats || {}));
}

export function badgeLabel(badge, lng = 'es') {
  const en = typeof lng === 'string' && lng.startsWith('en');
  return en ? badge.en : badge.es;
}

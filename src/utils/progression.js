// Camino del Closer: progresión Novato → Intermedio → Pro derivada de
// users/{uid}/stats (función pura, sin escrituras → sin reglas nuevas).
// La secuencia obliga a pasar por TODOS los roles: primero observar (escucha
// activa), después hacer de Lead (pensar como el prospecto) y recién ahí
// cerrar. Compartido web+móvil (sincronizar).

export const LEVELS = [
  { id: 'novato',     icon: '🌱', es: 'Novato',     en: 'Beginner',     color: '#94a3b8' },
  { id: 'intermedio', icon: '⚔️', es: 'Intermedio', en: 'Intermediate', color: '#22d3ee' },
  { id: 'pro',        icon: '🦈', es: 'Pro',        en: 'Pro',          color: '#f59e0b' },
];

// Pasos por nivel. `done` es un predicado sobre stats. `teamOnly`/`soloOnly`
// permiten adaptar el camino según esté en un equipo con Trainer o solo.
const STEPS = {
  novato: [
    { id: 'observe_first', icon: '👀', es: 'Observá una sesión completa (así se escucha de verdad)', en: 'Observe a full session (that\'s how real listening is trained)', done: s => (s.sessionsAsObserver || 0) >= 1 },
    { id: 'play_lead',     icon: '🎭', es: 'Hacé de Lead una vez (pensá como el prospecto)',        en: 'Play the Lead once (think like the prospect)',                  done: s => (s.sessionsAsLead || 0) >= 1 },
    { id: 'first_closer',  icon: '📞', es: 'Tu primera sesión como Closer',                          en: 'Your first session as Closer',                                   done: s => (s.sessionsCompleted || 0) >= 1 },
    { id: 'second_closer', icon: '🔁', es: 'Repetí: segunda sesión como Closer',                     en: 'Repeat: second session as Closer',                               done: s => (s.sessionsCompleted || 0) >= 2 },
  ],
  intermedio: [
    { id: 'first_close', icon: '🤝', es: 'Cerrá tu primer trato',                          en: 'Close your first deal',                        done: s => (s.closesCount || 0) >= 1 },
    { id: 'score7',      icon: '📈', es: 'Lográ un 7+ en el análisis de la IA',            en: 'Score 7+ on the AI analysis',                  done: s => (s.bestScore || 0) >= 7 },
    { id: 'helper3',     icon: '🤲', es: '3 sesiones ayudando (Lead u Observador)',        en: '3 sessions helping (Lead or Observer)',        done: s => ((s.sessionsAsLead || 0) + (s.sessionsAsObserver || 0)) >= 3 },
    { id: 'streak3',     icon: '🔥', es: 'Racha de 3 días seguidos',                       en: '3-day streak',                                 done: s => (s.streak || 0) >= 3 },
    { id: 'join_team',   icon: '👥', es: 'Unite a un equipo con el código de tu Trainer',  en: 'Join a team with your Trainer\'s code',        done: (s, ctx) => !!ctx.inCohort, soloOnly: true },
    { id: 'team_session', icon: '🧑‍🏫', es: 'Sesión analizada visible para tu Trainer',    en: 'Analyzed session visible to your Trainer',     done: s => (s.sessionsCompleted || 0) >= 3, teamOnly: true },
  ],
  pro: [
    { id: 'closes5',  icon: '💼', es: '5 cierres acumulados',                          en: '5 total closes',                          done: s => (s.closesCount || 0) >= 5 },
    { id: 'ace9',     icon: '⭐', es: 'Una sesión de 9+ (élite)',                      en: 'A 9+ session (elite)',                    done: s => (s.bestScore || 0) >= 9 },
    { id: 'streak7',  icon: '⚡', es: 'Racha de 7 días',                               en: '7-day streak',                            done: s => (s.streak || 0) >= 7 },
    { id: 'mentor',   icon: '🥋', es: 'Mentor: 10 sesiones de soporte para novatos',   en: 'Mentor: 10 support sessions for rookies', done: s => ((s.sessionsAsLead || 0) + (s.sessionsAsObserver || 0)) >= 10 },
    { id: 'closes25', icon: '🏆', es: '25 cierres — nivel Maestro',                    en: '25 closes — Master level',                done: s => (s.closesCount || 0) >= 25 },
  ],
};

// Nivel actual según hitos alcanzados (no según pasos tildados: los umbrales
// son estables aunque cambien los pasos).
function levelIdxFor(s) {
  const closerOk = (s.sessionsCompleted || 0) >= 2;
  const rolesOk = (s.sessionsAsObserver || 0) >= 1 && (s.sessionsAsLead || 0) >= 1;
  if (!(closerOk && rolesOk)) return 0; // novato
  const proOk = (s.closesCount || 0) >= 5 && (s.bestScore || 0) >= 8 && (s.sessionsCompleted || 0) >= 15;
  return proOk ? 2 : 1;
}

// Estado del camino: nivel + pasos del nivel actual con done/pending.
// ctx.inCohort adapta los pasos según esté en equipo (Trainer) o solo.
export function progressionState(stats = {}, ctx = {}) {
  const s = stats || {};
  const levelIdx = levelIdxFor(s);
  const level = LEVELS[levelIdx];

  const steps = STEPS[level.id]
    .filter(st => !(st.soloOnly && ctx.inCohort) && !(st.teamOnly && !ctx.inCohort))
    .map(st => ({ ...st, done: !!st.done(s, ctx) }));

  const doneCount = steps.filter(st => st.done).length;
  const pending = steps.filter(st => !st.done);

  return { level, levelIdx, steps, doneCount, total: steps.length, pending };
}

export function levelLabel(level, lng = 'es') {
  const en = typeof lng === 'string' && lng.startsWith('en');
  return en ? level.en : level.es;
}

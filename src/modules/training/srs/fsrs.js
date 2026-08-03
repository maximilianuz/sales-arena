// Scheduler de repetición espaciada FSRS-4.5 (Free Spaced Repetition Scheduler),
// implementación propia sin dependencias. Referencia del algoritmo:
// https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
//
// El estado de cada carta vive en users/{uid}/training/srs/{cardId} y es
// independiente del contenido de la carta (editar o re-importar contenido no
// destruye el progreso). Ratings: 1=Otra vez, 2=Difícil, 3=Bien, 4=Fácil.

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const REQUEST_RETENTION = 0.9; // con 0.9, intervalo(días) ≈ estabilidad
const MAX_INTERVAL_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function initStability(rating) {
  return Math.max(W[rating - 1], 0.1);
}

function initDifficulty(rating) {
  return clamp(W[4] - (rating - 3) * W[5], 1, 10);
}

function nextDifficulty(d, rating) {
  const next = d - W[6] * (rating - 3);
  // Reversión a la media para que la dificultad no se dispare con el tiempo.
  return clamp(W[7] * initDifficulty(4) + (1 - W[7]) * next, 1, 10);
}

function retrievability(elapsedDays, stability) {
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

function nextStabilityOnSuccess(d, s, r, rating) {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hardPenalty * easyBonus + 1);
}

function nextStabilityOnLapse(d, s, r) {
  return Math.max(0.1, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
}

function intervalDays(stability) {
  const days = (stability * 9 * (1 / REQUEST_RETENTION - 1));
  return clamp(Math.round(days), 1, MAX_INTERVAL_DAYS);
}

export function emptySrsState() {
  return { state: 'new', due: Date.now(), stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: null };
}

// Aplica un rating a un estado y devuelve el estado nuevo.
// `requeue: true` en el resultado significa "volver a mostrar en esta sesión".
export function review(prev, rating, now = Date.now()) {
  const s0 = prev && prev.reps > 0 ? prev : emptySrsState();

  if (s0.state === 'new' || s0.reps === 0) {
    const stability = initStability(rating);
    const difficulty = initDifficulty(rating);
    const again = rating === 1;
    return {
      state: again ? 'learning' : 'review',
      stability,
      difficulty,
      reps: 1,
      lapses: again ? 1 : 0,
      lastReview: now,
      // Otra vez → re-cola en la sesión y vence hoy; si no, intervalo real.
      due: again ? now + 10 * 60 * 1000 : now + intervalDays(stability) * DAY_MS,
      requeue: again,
    };
  }

  const elapsedDays = Math.max(0, (now - (s0.lastReview || now)) / DAY_MS);
  const r = retrievability(elapsedDays, s0.stability);
  const difficulty = nextDifficulty(s0.difficulty, rating);

  if (rating === 1) {
    const stability = nextStabilityOnLapse(s0.difficulty, s0.stability, r);
    return {
      state: 'learning',
      stability,
      difficulty,
      reps: s0.reps + 1,
      lapses: (s0.lapses || 0) + 1,
      lastReview: now,
      due: now + 10 * 60 * 1000, // re-cola en la sesión; al aprobar toma intervalo real
      requeue: true,
    };
  }

  const stability = nextStabilityOnSuccess(difficulty, s0.stability, r, rating);
  return {
    state: 'review',
    stability,
    difficulty,
    reps: s0.reps + 1,
    lapses: s0.lapses || 0,
    lastReview: now,
    due: now + intervalDays(stability) * DAY_MS,
    requeue: false,
  };
}

// Cartas vencidas: nuevas primero (mezcladas), después por antigüedad de vencimiento.
// `bloqueadas` es el Set de cardIds en consolidación (ver plan/consolidacion.js).
// Se filtran ANTES de armar la cola, no después, porque si no el intercalado de
// nuevas reservaría lugares para cartas que después no se muestran y la sesión
// quedaría más corta de lo que dice.
//
// Ojo con la interacción con el re-encolado a 10 minutos: una carta que fallás
// vuelve DENTRO de la misma sesión, y eso no viola la consolidación. Son cosas
// distintas — la regla gobierna la introducción de material nuevo, no la
// corrección de un error dentro del episodio donde ocurrió.
export function dueCards(cards, srsMap, now = Date.now(), { newLimit = 15, bloqueadas = null } = {}) {
  const visibles = bloqueadas?.size ? cards.filter(c => !bloqueadas.has(c.id)) : cards;
  const withState = visibles.map(c => ({ card: c, srs: srsMap?.[c.id] || emptySrsState() }));
  const news = withState.filter(x => x.srs.reps === 0);
  const due = withState.filter(x => x.srs.reps > 0 && x.srs.due <= now)
    .sort((a, b) => a.srs.due - b.srs.due);
  // Intercalar nuevas entre vencidas (interleaving básico dentro de la sesión).
  const limitedNews = news.slice(0, newLimit);
  const queue = [];
  const ratio = Math.max(1, Math.round((due.length + limitedNews.length) / Math.max(1, limitedNews.length)));
  let ni = 0;
  for (let i = 0; i < due.length; i++) {
    queue.push(due[i]);
    if ((i + 1) % ratio === 0 && ni < limitedNews.length) queue.push(limitedNews[ni++]);
  }
  while (ni < limitedNews.length) queue.push(limitedNews[ni++]);
  return queue;
}

// Resumen para el dashboard.
// Cuenta lo mismo que ve la sesión: si las bloqueadas no se filtraran acá, el
// mazo diría "18 para repasar" y la sesión abriría 4. `enPausa` se devuelve
// aparte para poder mostrarlo como información en vez de esconderlo.
export function deckStats(cards, srsMap, now = Date.now(), { bloqueadas = null } = {}) {
  const enPausa = bloqueadas?.size ? cards.filter(c => bloqueadas.has(c.id)).length : 0;
  const visibles = bloqueadas?.size ? cards.filter(c => !bloqueadas.has(c.id)) : cards;
  let nuevo = 0, vencidas = 0, aprendidas = 0;
  for (const c of visibles) {
    const s = srsMap?.[c.id];
    if (!s || s.reps === 0) nuevo++;
    else if (s.due <= now) vencidas++;
    else aprendidas++;
  }
  return { total: cards.length, nuevas: nuevo, vencidas, aprendidas, enPausa };
}

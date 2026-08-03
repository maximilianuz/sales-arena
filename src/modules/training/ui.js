// Tokens y helpers de estilo del módulo de entrenamiento.
//
// Existe porque el mismo objeto `panel` estaba copiado a mano en siete archivos:
// cualquier ajuste había que hacerlo siete veces, y de hecho ya habían empezado
// a divergir en padding y radio. Acá viven una sola vez.
//
// Todo son objetos de estilo inline —el resto del proyecto es así— pero
// nombrados: `surface.raised` dice qué es, `rgba(255,255,255,0.06)` no.
//
// Tres cosas que el módulo no tenía y son las que separan una UI que funciona de
// una que se siente terminada:
//
// 1. ELEVACIÓN. Todo era el mismo gris translúcido. Sin jerarquía de superficie,
//    lo importante y el contexto pesan igual y la pantalla se lee como una lista
//    plana. Ahora hay tres niveles y el foco del día usa el más alto.
// 2. FOCO VISIBLE. Los botones eran <button> con estilos inline y sin `:focus`,
//    o sea que navegando con teclado no se veía dónde estabas parado.
// 3. TRANSICIONES. Los estados cambiaban de golpe. 180 ms es suficiente para que
//    se lea como una respuesta y no como un salto.

// La curva es la misma en todo el módulo. Expo.out: sale rápido y frena suave,
// que es lo que hace que una interfaz se sienta responsiva sin parecer nerviosa.
export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const DUR = 180;

// Respeta la preferencia del sistema. Quien pidió menos movimiento no debería
// recibir transiciones "porque son sutiles": la preferencia es del usuario, no
// una sugerencia. Se lee una vez — no cambia a mitad de sesión.
const sinMovimiento = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const transicion = (props = 'background-color, border-color, transform, box-shadow') =>
  (sinMovimiento ? undefined : `${props} ${DUR}ms ${EASE}`);

// ── Superficies ─────────────────────────────────────────────
//
// Tres niveles, no uno. El fondo de la app es el nivel 0; estas van encima.
export const surface = {
  // Contexto: lo que acompaña pero no es el foco.
  sunken: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '0.9rem',
  },
  // El panel de siempre. Sigue siendo el más usado.
  base: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '0.9rem',
  },
  // Lo que hay que mirar primero. Un solo elemento por pantalla lo usa: si dos
  // cosas están elevadas, ninguna lo está.
  raised: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035))',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '0.9rem',
    boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
  },
};

// Panel con padding, que es como se usa el 90% de las veces.
export const panel = { ...surface.base, padding: '1.1rem 1.2rem' };

// ── Acentos ─────────────────────────────────────────────────
//
// Los dos que ya usaba el módulo, nombrados por función y no por color: el día
// que cambien de hex no hay que buscar "#30d158" en once archivos.
export const ACENTO = {
  progreso: '#30d158',   // lo que avanza y lo que se cumplió
  frio: '#06b6d4',       // información, el otro extremo del degradé
  atencion: '#ff9f0a',   // en pausa, esperando, incompleto
  error: '#ff453a',      // lo que hay que rehacer
  foco: '#a78bfa',       // lo que el sistema ajustó por vos
};

export const degradeProgreso = `linear-gradient(90deg, ${ACENTO.progreso}, ${ACENTO.frio})`;

// Tinte de acento reutilizable: mismo tratamiento para todos los avisos, así un
// bloque en pausa y uno con error se leen como parientes y no como dos diseños.
export const tinte = (color, { fuerte = false } = {}) => ({
  background: fuerte ? `${color}22` : `${color}14`,
  border: `1px solid ${color}${fuerte ? '59' : '38'}`,
  borderRadius: '0.65rem',
});

// ── Interacción ─────────────────────────────────────────────

// Anillo de foco. Va con `:focus-visible` (no `:focus`) para que no aparezca al
// hacer click con el mouse, solo al navegar con teclado.
export const anilloFoco = `0 0 0 2px rgba(2,6,23,0.9), 0 0 0 4px ${ACENTO.progreso}`;

// Alto mínimo de cualquier cosa clickeable. 44 px es el mínimo táctil; abajo de
// eso se falla el toque en el celular, que es donde se entrena.
export const TOQUE_MIN = 44;

export const clickeable = {
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
  transition: transicion(),
  minHeight: `${TOQUE_MIN}px`,
};

// CSS que no se puede expresar inline —hover, focus-visible, active— inyectado
// una sola vez. Es la única forma de tener estados reales sin reescribir el
// módulo entero a clases.
export const CSS_INTERACCION = `
.tr-int { transition: ${sinMovimiento ? 'none' : `background-color ${DUR}ms ${EASE}, border-color ${DUR}ms ${EASE}, transform ${DUR}ms ${EASE}, box-shadow ${DUR}ms ${EASE}`}; }
.tr-int:hover:not(:disabled) { background-color: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.16); }
.tr-int:active:not(:disabled) { transform: ${sinMovimiento ? 'none' : 'scale(0.985)'}; }
.tr-int:focus-visible { outline: none; box-shadow: ${anilloFoco}; }
.tr-int:disabled { opacity: 0.45; cursor: not-allowed; }
.tr-fila:hover:not(:disabled) { background-color: rgba(255,255,255,0.055); }
.tr-fila:focus-visible { outline: none; box-shadow: ${anilloFoco}; }
`;

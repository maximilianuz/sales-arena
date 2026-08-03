// Las preguntas del onboarding. Son seis y ni una más: cada pregunta extra es
// una excusa para abandonar antes de empezar. Todas tienen que cambiar algo
// concreto del plan — si una respuesta no altera ningún bloque, la pregunta
// sobra.
//
// El resultado se guarda tal cual en training/perfil y queda como
// perfilSnapshot dentro del plan, así se puede ver con qué respuestas se
// generó un plan viejo.

export const AREAS = {
  apertura:       { label: 'Abrir la llamada y ganarme el derecho a preguntar', mazo: 'preguntas-por-fase' },
  descubrimiento: { label: 'Encontrar el dolor y ponerle números',              mazo: 'preguntas-por-fase' },
  perfiles:       { label: 'Darme cuenta con quién estoy hablando',             mazo: 'deteccion-perfiles' },
  precio:         { label: 'Decir el precio sin temblar',                       mazo: 'objeciones' },
  objeciones:     { label: 'Aguantar las objeciones sin ponerme a la defensiva', mazo: 'objeciones' },
  cierre:         { label: 'Pedir la decisión y quedarme callado',              mazo: 'objeciones' },
};

export const PREGUNTAS = [
  {
    key: 'diasPorSemana',
    titulo: '¿Cuántos días por semana vas a entrenar?',
    ayuda: 'Sé honesto, no optimista. Un plan de 3 días que cumplís le gana a uno de 7 que abandonás en la segunda semana.',
    opciones: [
      { value: 3, label: '3 días', detalle: 'El mínimo que sostiene la memoria' },
      { value: 5, label: '5 días', detalle: 'Días de semana, fin de semana libre' },
      { value: 7, label: 'Todos los días', detalle: 'Sesiones cortas, sin excepciones' },
    ],
  },
  {
    key: 'minutosPorSesion',
    titulo: '¿Cuánto tiempo por sesión?',
    ayuda: 'Es el presupuesto que reparte el plan entre repaso, lectura y llamadas simuladas.',
    opciones: [
      { value: 10, label: '10 minutos', detalle: 'Repaso y poco más' },
      { value: 20, label: '20 minutos', detalle: 'Alcanza para una llamada corta' },
      { value: 40, label: '40 minutos', detalle: 'Llamada completa + repaso' },
    ],
  },
  {
    key: 'nivel',
    titulo: '¿Cuánta calle tenés?',
    ayuda: 'Define cuánta teoría necesitás antes de la primera llamada simulada.',
    opciones: [
      { value: 'nuevo', label: 'Nunca cerré una venta por llamada', detalle: 'Arrancás por los fundamentos' },
      { value: 'algo', label: 'Hice algunas, con resultados irregulares', detalle: 'Teoría y práctica en paralelo' },
      { value: 'experimentado', label: 'Cierro hace tiempo, quiero afilar', detalle: 'Directo a las llamadas' },
    ],
  },
  {
    key: 'areas',
    titulo: '¿Qué parte de la llamada te cuesta más?',
    ayuda: 'Elegí una o dos. Lo que marques se practica antes y más seguido.',
    multiple: true,
    max: 2,
    opciones: Object.entries(AREAS).map(([value, a]) => ({ value, label: a.label })),
  },
  {
    key: 'oferta',
    titulo: '¿Qué vas a estar vendiendo?',
    ayuda: 'Si tenés oferta propia, el primer paso del plan es cargarla — el simulador actúa contra lo que haya en tu base de conocimiento.',
    opciones: [
      { value: 'metodo', label: 'Uso la oferta de ejemplo', detalle: '"Método Reinicio", ya viene cargada' },
      { value: 'propia', label: 'Tengo mi propia oferta', detalle: 'El plan arranca cargándola' },
    ],
  },
  {
    key: 'urgencia',
    titulo: '¿Cuándo tenés llamadas reales?',
    ayuda: 'Si hay fecha cerca, el plan mete llamadas simuladas desde el primer día aunque no hayas visto toda la teoría.',
    opciones: [
      { value: 'estaSemana', label: 'Esta semana', detalle: 'Llamada simulada en cada bloque de días' },
      { value: 'esteMes', label: 'En las próximas semanas', detalle: 'Ritmo normal' },
      { value: 'todavia', label: 'Todavía no', detalle: 'Base sólida primero' },
    ],
  },
];

// Un perfil está completo cuando toda pregunta tiene respuesta. Las múltiples
// admiten vacío (no marcar nada es una respuesta válida: "no sé qué me cuesta").
export function perfilCompleto(respuestas) {
  return PREGUNTAS.every(p => p.multiple || respuestas?.[p.key] !== undefined);
}

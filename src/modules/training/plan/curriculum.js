// Currículum: qué material existe, en qué orden se puede aprender y qué cartas
// lo representan.
//
// Es la capa FIJA del sistema. El mesociclo (mesociclo.js) decide el ritmo, la
// mezcla de días y cuándo subís de nivel; el currículum solo dice qué se puede
// introducir ahora y qué hay que haber visto antes. Separarlos evita el problema
// de un calendario rígido: si prorrogás un bloque, el plan se estira pero el
// orden del material no se rompe.
//
// La UNIDAD es la pieza mínima con identidad propia y con su propio reloj de
// consolidación: un principio, una fase, una transición, una objeción con su
// motivo real, un perfil. No es la carta —una unidad agrupa entre una y cinco—
// porque lo que se consolida es el concepto, no cada pregunta suelta sobre él.
//
// `literal: true` marca las unidades cuyo valor está en el fraseo exacto: las
// seis transiciones, la respuesta al precio prematuro. Esas NO pasan por la
// descomposición sin palabras prestadas — reconstruirlas con palabras propias
// destruiría justamente lo que hay que tener automático.
//
// `semana` es una proyección para ordenar, no un compromiso de calendario.

export const TIPOS = {
  mentalidad: 'Mentalidad',
  fase: 'Fase del guion',
  transicion: 'Transición',
  cualificacion: 'Cualificación',
  perfil: 'Perfil de comprador',
  tipoObjecion: 'Tipo de objeción',
  objecion: 'Objeción',
};

// ── Unidades ────────────────────────────────────────────────

export const UNIDADES = [
  // ── Semana 1 · Mentalidad e identidad (CDV S1-S2, S7) ─────
  { id: 'u-mind-desapego', titulo: 'Desapego: no necesitás el sí', tipo: 'mentalidad', semana: 1,
    cartas: ['prin-011'], requiere: [], fuente: 'CDV S1-S2' },
  { id: 'u-mind-espejo', titulo: 'Las objeciones que recibís son las tuyas', tipo: 'mentalidad', semana: 1,
    cartas: ['pri-019'], requiere: ['u-mind-desapego'], fuente: 'CDV S5' },
  { id: 'u-mind-emocion', titulo: 'Se decide con emoción y se justifica con lógica', tipo: 'mentalidad', semana: 1,
    cartas: ['prin-010'], requiere: [], fuente: 'CDV S2' },
  { id: 'u-mind-quiere', titulo: 'Se compra lo que se quiere, no lo que se necesita', tipo: 'mentalidad', semana: 1,
    cartas: ['pri-018'], requiere: ['u-mind-emocion'], fuente: 'CDV S2' },
  { id: 'u-mind-diagnosticar', titulo: 'Vender es diagnosticar', tipo: 'mentalidad', semana: 1,
    cartas: ['prin-009'], requiere: [], fuente: 'Psycho Selling' },
  { id: 'u-mind-pregunta-lidera', titulo: 'Quien pregunta, lidera', tipo: 'mentalidad', semana: 1,
    cartas: ['prin-003'], requiere: ['u-mind-diagnosticar'], fuente: 'CDV S3' },
  { id: 'u-mind-claridad', titulo: 'Claridad sobre presión', tipo: 'mentalidad', semana: 1,
    cartas: ['prin-012'], requiere: ['u-mind-desapego'], fuente: 'Psycho Selling' },
  { id: 'u-mind-palabras', titulo: 'Sus palabras, no las tuyas', tipo: 'mentalidad', semana: 1,
    cartas: ['prin-007'], requiere: [], fuente: 'CDV S3' },

  // ── Semana 1-2 · Las 7 fases ──────────────────────────────
  { id: 'u-fase-quimica', titulo: 'Fase 1 · Química', tipo: 'fase', semana: 1,
    cartas: ['gui-009', 'gui-010', 'fase-101'], requiere: ['u-mind-palabras'], fuente: 'Guion fusionado' },
  { id: 'u-fase-marco', titulo: 'Fase 2 · Marco', tipo: 'fase', semana: 1,
    cartas: ['gui-011', 'gui-012', 'prin-008'], requiere: ['u-fase-quimica'], fuente: 'Guion fusionado' },
  { id: 'u-fase-descubrimiento', titulo: 'Fase 3 · Descubrimiento', tipo: 'fase', semana: 1,
    cartas: ['gui-005'], requiere: ['u-fase-marco', 'u-mind-pregunta-lidera'], fuente: 'Guion fusionado' },
  { id: 'u-fase-transicion', titulo: 'Fase 4 · Transición', tipo: 'fase', semana: 2,
    cartas: ['gui-013', 'gui-014', 'pri-021'], requiere: ['u-fase-descubrimiento'], fuente: 'Guion fusionado' },
  { id: 'u-fase-pitch', titulo: 'Fase 5 · Pitch', tipo: 'fase', semana: 2,
    cartas: ['gui-015', 'gui-016', 'fase-108'], requiere: ['u-fase-transicion'], fuente: 'Guion fusionado' },
  { id: 'u-fase-compromiso', titulo: 'Fase 6 · Compromiso', tipo: 'fase', semana: 2,
    cartas: ['gui-017', 'gui-018', 'fase-110'], requiere: ['u-fase-pitch'], fuente: 'Guion fusionado' },
  { id: 'u-fase-cierre', titulo: 'Fase 7 · Cierre', tipo: 'fase', semana: 2,
    cartas: ['gui-019', 'gui-020'], requiere: ['u-fase-compromiso'], fuente: 'Guion fusionado' },

  // ── Semana 2 · Las 6 transiciones (LITERALES) ─────────────
  { id: 'u-trans-1-2', titulo: 'Transición Química → Marco', tipo: 'transicion', semana: 2, literal: true,
    cartas: ['gui-003'], requiere: ['u-fase-marco'], fuente: 'Guion fusionado' },
  { id: 'u-trans-2-3', titulo: 'Transición Marco → Descubrimiento', tipo: 'transicion', semana: 2, literal: true,
    cartas: ['gui-004'], requiere: ['u-fase-descubrimiento'], fuente: 'Guion fusionado' },
  { id: 'u-trans-3-4', titulo: 'Transición Descubrimiento → Transición', tipo: 'transicion', semana: 2, literal: true,
    cartas: ['gui-005'], requiere: ['u-fase-transicion'], fuente: 'Guion fusionado' },
  { id: 'u-trans-4-5', titulo: 'Transición Transición → Pitch', tipo: 'transicion', semana: 2, literal: true,
    cartas: ['gui-006'], requiere: ['u-fase-pitch'], fuente: 'Guion fusionado' },
  { id: 'u-trans-5-6', titulo: 'Transición Pitch → Compromiso', tipo: 'transicion', semana: 2, literal: true,
    cartas: ['gui-007'], requiere: ['u-fase-compromiso'], fuente: 'Guion fusionado' },
  { id: 'u-trans-6-7', titulo: 'Transición Compromiso → Cierre', tipo: 'transicion', semana: 2, literal: true,
    cartas: ['gui-008', 'prin-006'], requiere: ['u-fase-cierre'], fuente: 'Guion fusionado' },
  { id: 'u-guion-esqueleto', titulo: 'El esqueleto completo y qué va literal', tipo: 'fase', semana: 2,
    cartas: ['gui-001', 'gui-002', 'gui-021', 'gui-022'], requiere: ['u-fase-cierre'], fuente: 'Guion fusionado' },

  // ── Semana 3 · Cualificación e indagación (CDV S3) ────────
  { id: 'u-cual-apertura', titulo: 'Abrir sin sonar a vendedor', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-001', 'fase-003'], requiere: ['u-fase-quimica'], fuente: 'CDV S3' },
  { id: 'u-cual-disparador', titulo: 'El disparador: por qué justo ahora', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-002', 'fase-102'], requiere: ['u-cual-apertura'], fuente: 'CDV S3' },
  { id: 'u-cual-acuerdos', titulo: 'Los tres acuerdos del Marco', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-004', 'fase-005', 'fase-006'], requiere: ['u-fase-marco'], fuente: 'CDV S4' },
  { id: 'u-cual-problema', titulo: 'Abrir el problema y llevarlo a escenas', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-007', 'fase-008'], requiere: ['u-fase-descubrimiento'], fuente: 'CDV S3' },
  { id: 'u-cual-costo', titulo: 'Costo de oportunidad y costo hundido', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-103', 'prin-002'], requiere: ['u-cual-problema'], fuente: 'Psycho Selling' },
  { id: 'u-cual-punto-b', titulo: 'Construir el punto B', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-009', 'prin-013'], requiere: ['u-cual-problema'], fuente: 'CDV S3' },
  { id: 'u-cual-sin-dolor', titulo: 'Qué hacer si no hay dolor claro', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-104'], requiere: ['u-cual-punto-b'], fuente: 'CDV S3' },
  { id: 'u-cual-maslow', titulo: 'Ubicar el dolor en la pirámide', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-105'], requiere: ['u-cual-problema'], fuente: 'Psycho Selling' },
  { id: 'u-cual-disonancia', titulo: 'Disonancia latente: sus tres señales', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-106'], requiere: ['u-cual-maslow'], fuente: 'Psycho Selling' },
  { id: 'u-cual-confianza', titulo: 'Los tres pilares de confianza', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-107'], requiere: ['u-cual-disparador'], fuente: 'Psycho Selling' },
  { id: 'u-cual-checklist', titulo: 'El checklist de cuatro puntos antes de cruzar', tipo: 'cualificacion', semana: 3,
    cartas: ['fase-012', 'gui-005'], requiere: ['u-cual-costo', 'u-cual-punto-b'], fuente: 'Guion fusionado' },

  // ── Semana 4 · Perfiles / Piedras Preciosas ───────────────
  { id: 'u-perf-fundamento', titulo: 'Los cuatro motores y por qué importan', tipo: 'perfil', semana: 4,
    cartas: ['perf-101', 'pri-020'], requiere: ['u-mind-palabras'], fuente: 'Piedras Preciosas' },
  { id: 'u-perf-rubi', titulo: 'RUBÍ · gana', tipo: 'perfil', semana: 4,
    cartas: ['perf-001'], requiere: ['u-perf-fundamento'], fuente: 'Piedras Preciosas' },
  { id: 'u-perf-zafiro', titulo: 'ZAFIRO · diversión', tipo: 'perfil', semana: 4,
    cartas: ['perf-002'], requiere: ['u-perf-fundamento'], fuente: 'Piedras Preciosas' },
  { id: 'u-perf-perla', titulo: 'PERLA · ayudar', tipo: 'perfil', semana: 4,
    cartas: ['perf-003', 'perf-108'], requiere: ['u-perf-fundamento'], fuente: 'Piedras Preciosas' },
  { id: 'u-perf-esmeralda', titulo: 'ESMERALDA · datos y orden', tipo: 'perfil', semana: 4,
    cartas: ['perf-004'], requiere: ['u-perf-fundamento'], fuente: 'Piedras Preciosas' },
  { id: 'u-perf-desafio', titulo: 'La frase que enciende a uno y destruye a dos', tipo: 'perfil', semana: 4,
    cartas: ['perf-102', 'perf-103'], requiere: ['u-perf-rubi', 'u-perf-perla', 'u-perf-esmeralda'], fuente: 'CDV S3' },
  { id: 'u-perf-espejo-closer', titulo: 'Actuar los cuatro, no solo el propio', tipo: 'perfil', semana: 4,
    cartas: ['perf-104'], requiere: ['u-perf-desafio'], fuente: 'CDV S3' },
  { id: 'u-perf-tono', titulo: 'Bajar una octava al indagar el dolor', tipo: 'perfil', semana: 4,
    cartas: ['perf-105'], requiere: ['u-perf-fundamento', 'u-cual-problema'], fuente: 'CDV S3' },

  // ── Semana 5 · Clasificar antes de responder ──────────────
  { id: 'u-tipo-razon', titulo: 'Razón no es lo mismo que objeción', tipo: 'tipoObjecion', semana: 5,
    cartas: ['tip-001', 'pri-016'], requiere: ['u-guion-esqueleto'], fuente: 'Psycho Selling' },
  { id: 'u-tipo-definicion', titulo: 'Qué es una objeción y por qué miente', tipo: 'tipoObjecion', semana: 5,
    cartas: ['tip-002', 'prin-015'], requiere: ['u-tipo-razon'], fuente: 'Psycho Selling' },
  { id: 'u-tipo-taxonomia', titulo: 'Los cuatro tipos', tipo: 'tipoObjecion', semana: 5,
    cartas: ['tip-003'], requiere: ['u-tipo-definicion'], fuente: 'Psycho Selling' },
  { id: 'u-tipo-estructural', titulo: 'Estructural y defensiva', tipo: 'tipoObjecion', semana: 5,
    cartas: ['tip-004', 'tip-005', 'tip-006', 'tip-007'], requiere: ['u-tipo-taxonomia'], fuente: 'Psycho Selling' },
  { id: 'u-tipo-herida', titulo: 'Herida y de identidad', tipo: 'tipoObjecion', semana: 5,
    cartas: ['tip-008', 'tip-009', 'tip-010', 'tip-011'], requiere: ['u-tipo-taxonomia'], fuente: 'Psycho Selling' },
  { id: 'u-tipo-secuencia', titulo: 'La secuencia universal', tipo: 'tipoObjecion', semana: 5,
    cartas: ['tip-012', 'tip-013', 'tip-014', 'obj-024', 'prin-005', 'pri-017'],
    requiere: ['u-tipo-estructural', 'u-tipo-herida'], fuente: 'Psycho Selling + CDV S5' },

  // ── Semana 5-6 · Las 18 objeciones (CDV S5) ───────────────
  { id: 'u-obj-pensar', titulo: '«Lo tengo que pensar»', tipo: 'objecion', semana: 5,
    cartas: ['obj-003', 'obj-012', 'obj-101', 'obj-102', 'obj-103'], requiere: ['u-tipo-secuencia'], fuente: 'CDV S5' },
  { id: 'u-obj-caro', titulo: '«Me parece caro»', tipo: 'objecion', semana: 5,
    cartas: ['obj-001', 'obj-011', 'obj-104', 'obj-105', 'obj-118'],
    requiere: ['u-tipo-secuencia', 'u-cual-costo'], fuente: 'CDV S5' },
  { id: 'u-obj-dinero', titulo: '«No tengo el dinero»', tipo: 'objecion', semana: 5,
    cartas: ['obj-002', 'obj-106', 'obj-107', 'obj-121'], requiere: ['u-obj-caro'], fuente: 'CDV S5' },
  { id: 'u-obj-consultar', titulo: '«Lo tengo que consultar con mi pareja / socio»', tipo: 'objecion', semana: 5,
    cartas: ['obj-004', 'obj-108', 'obj-109', 'obj-110', 'obj-111'],
    requiere: ['u-tipo-secuencia', 'u-cual-acuerdos'], fuente: 'CDV S5' },
  { id: 'u-obj-info', titulo: '«Mandame la info por mail»', tipo: 'objecion', semana: 5,
    cartas: ['obj-005', 'obj-120'], requiere: ['u-tipo-secuencia'], fuente: 'CDV S5' },
  { id: 'u-obj-probe', titulo: '«Ya probé algo parecido y no funcionó»', tipo: 'objecion', semana: 5,
    cartas: ['obj-006', 'obj-019'], requiere: ['u-tipo-herida'], fuente: 'CDV S5' },
  { id: 'u-obj-momento', titulo: '«No es un buen momento»', tipo: 'objecion', semana: 5,
    cartas: ['obj-008', 'obj-018', 'obj-020', 'obj-023'], requiere: ['u-tipo-estructural'], fuente: 'CDV S5' },
  { id: 'u-obj-tiempo', titulo: '«No tengo tiempo»', tipo: 'objecion', semana: 5,
    cartas: ['obj-016', 'obj-115'], requiere: ['u-obj-momento'], fuente: 'CDV S5' },
  { id: 'u-obj-precio-temprano', titulo: 'Te pide el precio en el minuto 2', tipo: 'objecion', semana: 5, literal: true,
    cartas: ['obj-022', 'obj-126'], requiere: ['u-fase-marco'], fuente: 'CDV S3' },

  { id: 'u-obj-garantia', titulo: '«¿Qué garantía tengo?»', tipo: 'objecion', semana: 6,
    cartas: ['obj-009', 'obj-116', 'obj-122'], requiere: ['u-tipo-secuencia'], fuente: 'CDV S5' },
  { id: 'u-obj-confianza', titulo: '«No confío en ustedes / esto es humo»', tipo: 'objecion', semana: 6,
    cartas: ['obj-015', 'obj-021', 'obj-112', 'obj-113', 'obj-117'],
    requiere: ['u-tipo-herida', 'u-cual-confianza'], fuente: 'CDV S5' },
  { id: 'u-obj-autoconfianza', titulo: '«No creo que YO pueda»', tipo: 'objecion', semana: 6,
    cartas: ['obj-114'], requiere: ['u-tipo-herida'], fuente: 'Psycho Selling' },
  { id: 'u-obj-especial', titulo: '«Mi caso es especial / ¿y si no me funciona?»', tipo: 'objecion', semana: 6,
    cartas: ['obj-014', 'obj-123'], requiere: ['u-obj-autoconfianza'], fuente: 'CDV S5' },
  { id: 'u-obj-solo', titulo: '«Esto lo hago solo, está en YouTube»', tipo: 'objecion', semana: 6,
    cartas: ['obj-010'], requiere: ['u-tipo-secuencia'], fuente: 'CDV S5' },
  { id: 'u-obj-descuento', titulo: '«¿Me hacés un descuento?»', tipo: 'objecion', semana: 6,
    cartas: ['obj-007', 'obj-119'], requiere: ['u-obj-caro'], fuente: 'CDV S5' },
  { id: 'u-obj-duracion', titulo: '«Son 3 meses, es mucho compromiso»', tipo: 'objecion', semana: 6,
    cartas: ['obj-013'], requiere: ['u-tipo-estructural'], fuente: 'CDV S5' },
  { id: 'u-obj-silencio', titulo: 'Silencio total después del precio', tipo: 'objecion', semana: 6,
    cartas: ['obj-017', 'fase-015'], requiere: ['u-fase-compromiso'], fuente: 'CDV S5' },
  { id: 'u-obj-hostil', titulo: 'Prospecto hostil o que no venía a comprar', tipo: 'objecion', semana: 6,
    cartas: ['obj-124', 'obj-125'], requiere: ['u-tipo-secuencia', 'u-mind-desapego'], fuente: 'CDV S5' },

  // ── Semana 6 · Mentalidad de cierre (CDV S7) ──────────────
  { id: 'u-cierre-silencio', titulo: 'El silencio se sostiene', tipo: 'mentalidad', semana: 6,
    cartas: ['prin-006', 'fase-016'], requiere: ['u-fase-compromiso'], fuente: 'CDV S7' },
  { id: 'u-cierre-graduales', titulo: 'Compromisos graduales', tipo: 'mentalidad', semana: 6,
    cartas: ['prin-014', 'fase-017', 'gui-019'], requiere: ['u-fase-cierre'], fuente: 'CDV S7' },
  { id: 'u-cierre-congruencia', titulo: 'Quién merece seguimiento', tipo: 'mentalidad', semana: 6,
    cartas: ['pri-022', 'fase-111', 'fase-112', 'gui-020', 'fase-018'],
    requiere: ['u-cierre-graduales'], fuente: 'Psycho Selling' },
  { id: 'u-cierre-precio-valor', titulo: 'Precio y valor no son lo mismo', tipo: 'mentalidad', semana: 6,
    cartas: ['prin-001', 'fase-110'], requiere: ['u-obj-caro'], fuente: 'Psycho Selling' },
];

// ── Índices y consultas ─────────────────────────────────────

const PORID = new Map(UNIDADES.map(u => [u.id, u]));

export const unidadPorId = (id) => PORID.get(id) || null;

// Una carta puede pertenecer a más de una unidad (gui-005 aparece en la fase de
// Descubrimiento y en su transición): se bloquea mientras CUALQUIERA de sus
// unidades esté sin liberar. Es el criterio conservador y el correcto.
const PORCARTA = new Map();
for (const u of UNIDADES) {
  for (const c of u.cartas || []) {
    if (!PORCARTA.has(c)) PORCARTA.set(c, []);
    PORCARTA.get(c).push(u.id);
  }
}

export const unidadesDeCarta = (cardId) => PORCARTA.get(cardId) || [];

export function cartasDeUnidades(ids = []) {
  const out = new Set();
  for (const id of ids) for (const c of unidadPorId(id)?.cartas || []) out.add(c);
  return [...out];
}

// Prerrequisitos cumplidos = todas las unidades de las que depende ya están
// disponibles o dominadas. Estar `consolidando` NO alcanza: si todavía no
// asentó, apoyar algo nuevo encima es exactamente la deuda que el sistema
// viene a evitar.
export function prerequisitosCumplidos(unidad, estadoPorUnidad = {}) {
  return (unidad.requiere || []).every(req => {
    const e = estadoPorUnidad[req];
    return e === 'disponible' || e === 'dominada';
  });
}

// Las próximas unidades introducibles, en orden de currículum. `max` es la carga
// del día: el diseño pide un tope de 3 unidades frescas por sesión de
// adquisición, y quien lo impone es quien llama, no esta función.
export function siguientesUnidades(estadoPorUnidad = {}, max = 3) {
  const out = [];
  for (const u of UNIDADES) {
    if (out.length >= max) break;
    const e = estadoPorUnidad[u.id];
    if (e && e !== 'pendiente') continue;
    if (!prerequisitosCumplidos(u, estadoPorUnidad)) continue;
    out.push(u);
  }
  return out;
}

export function progresoCurriculum(estadoPorUnidad = {}) {
  const cuenta = { pendiente: 0, introducida: 0, consolidando: 0, disponible: 0, dominada: 0 };
  for (const u of UNIDADES) cuenta[estadoPorUnidad[u.id] || 'pendiente']++;
  const total = UNIDADES.length;
  const hechas = cuenta.disponible + cuenta.dominada;
  return { ...cuenta, total, hechas, pct: total ? Math.round((hechas / total) * 100) : 0 };
}

// ── Validación del grafo ────────────────────────────────────
//
// Corre en los tests, no en runtime: un ciclo o una referencia rota dejaría al
// usuario sin unidades introducibles y el síntoma sería "el plan no me da nada
// para hacer hoy", que es dificilísimo de diagnosticar desde la UI.

export function validarGrafo(cartasExistentes = null) {
  const errores = [];
  const vistos = new Set();

  for (const u of UNIDADES) {
    if (vistos.has(u.id)) errores.push(`id duplicado: ${u.id}`);
    vistos.add(u.id);
    if (!TIPOS[u.tipo]) errores.push(`${u.id}: tipo desconocido "${u.tipo}"`);
    if (!u.cartas?.length) errores.push(`${u.id}: sin cartas`);
    for (const req of u.requiere || []) {
      if (!PORID.has(req)) errores.push(`${u.id}: requiere "${req}" que no existe`);
    }
    if (cartasExistentes) {
      for (const c of u.cartas || []) {
        if (!cartasExistentes.has(c)) errores.push(`${u.id}: carta "${c}" no existe en el seed`);
      }
    }
  }

  // Ciclos, por DFS con marca de tres colores.
  const color = new Map();
  const dfs = (id, ruta) => {
    if (color.get(id) === 'negro') return;
    if (color.get(id) === 'gris') { errores.push(`ciclo: ${[...ruta, id].join(' → ')}`); return; }
    color.set(id, 'gris');
    for (const req of unidadPorId(id)?.requiere || []) dfs(req, [...ruta, id]);
    color.set(id, 'negro');
  };
  for (const u of UNIDADES) dfs(u.id, []);

  // Alcanzabilidad: toda unidad tiene que poder llegar a introducirse alguna vez.
  const estado = {};
  let cambio = true, vueltas = 0;
  while (cambio && vueltas++ < UNIDADES.length + 1) {
    cambio = false;
    for (const u of UNIDADES) {
      if (estado[u.id]) continue;
      if (prerequisitosCumplidos(u, estado)) { estado[u.id] = 'disponible'; cambio = true; }
    }
  }
  for (const u of UNIDADES) {
    if (!estado[u.id]) errores.push(`${u.id}: inalcanzable, sus prerrequisitos nunca se cumplen`);
  }

  return errores;
}

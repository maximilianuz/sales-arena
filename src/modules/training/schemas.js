// Definición declarativa de las entidades editables de la base de conocimiento.
// Un solo editor genérico (EntityForm) renderiza cualquier entidad a partir de
// esto → agregar un campo o una entidad nueva es tocar datos, no componentes.
//
// Tipos de campo: text | textarea | number | select | list (un ítem por línea)
// | tags (separadas por coma) | json (objeto anidado editado como JSON).

export const ENTITY_SCHEMAS = {
  principios: {
    path: 'kb/principios',
    label: 'Principios',
    singular: 'principio',
    idPrefix: 'p-',
    titleField: 'nombre',
    subtitleField: 'resumen',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'resumen', label: 'Resumen (una línea)', type: 'text', required: true },
      { key: 'explicacionReferencia', label: 'Explicación de referencia (contra esto se compara tu modo Feynman)', type: 'textarea', rows: 6, required: true },
      { key: 'puntosClave', label: 'Puntos clave (uno por línea)', type: 'list', required: true },
      { key: 'comoAplicarlo', label: 'Cómo aplicarlo', type: 'textarea', rows: 3 },
      { key: 'errorTipico', label: 'Error típico', type: 'textarea', rows: 2 },
    ],
  },

  cards: {
    path: 'cards',
    label: 'Flashcards',
    singular: 'carta',
    idPrefix: 'card-',
    titleField: 'frente',
    subtitleField: 'mazo',
    fields: [
      { key: 'mazo', label: 'Mazo', type: 'select', required: true, options: [
        { value: 'guion', label: 'Guion y transiciones' },
        { value: 'preguntas-por-fase', label: 'Preguntas por fase' },
        { value: 'tipos-objecion', label: 'Tipos de objeción' },
        { value: 'objeciones', label: 'Objeciones' },
        { value: 'deteccion-perfiles', label: 'Detección de perfiles' },
        { value: 'principios', label: 'Principios (Feynman)' },
      ] },
      { key: 'tipo', label: 'Tipo', type: 'select', required: true, options: [
        { value: 'clasica', label: 'Clásica (frente → dorso)' },
        { value: 'feynman', label: 'Feynman (se responde explicando)' },
      ] },
      { key: 'frente', label: 'Frente', type: 'textarea', rows: 3, required: true },
      { key: 'dorso', label: 'Dorso (vacío en las Feynman: usan la explicación del principio)', type: 'textarea', rows: 4 },
      { key: 'porQue', label: 'Por qué funciona', type: 'textarea', rows: 3 },
      { key: 'principioId', label: 'Principio que la sostiene', type: 'principioRef', required: true },
      { key: 'fase', label: 'Fase (solo mazo preguntas-por-fase)', type: 'text' },
      { key: 'dificultad', label: 'Dificultad (1-3)', type: 'number', min: 1, max: 3 },
      { key: 'tags', label: 'Tags (separadas por coma)', type: 'tags' },
    ],
  },

  perfiles: {
    path: 'kb/perfiles',
    label: 'Perfiles de prospecto',
    singular: 'perfil',
    idPrefix: 'pp-',
    titleField: 'nombre',
    subtitleField: 'arquetipo',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'edad', label: 'Edad', type: 'number', min: 18, max: 90 },
      { key: 'ocupacion', label: 'Ocupación', type: 'text' },
      { key: 'arquetipo', label: 'Arquetipo', type: 'text', required: true },
      { key: 'dificultad', label: 'Dificultad (1-5, ordena la progresión)', type: 'number', min: 1, max: 5 },
      { key: 'resistencia', label: 'Resistencia (1-5)', type: 'number', min: 1, max: 5 },
      { key: 'personalidad', label: 'Personalidad', type: 'textarea', rows: 2 },
      { key: 'estiloComunicacion', label: 'Estilo de comunicación', type: 'textarea', rows: 2 },
      { key: 'contexto', label: 'Contexto / historia', type: 'textarea', rows: 3 },
      { key: 'objecionOculta', label: 'Objeción oculta (la real)', type: 'textarea', rows: 2, required: true },
      { key: 'objecionesPantalla', label: 'Objeciones pantalla (una por línea)', type: 'list' },
      { key: 'disparadoresApertura', label: 'Disparadores de apertura (una por línea)', type: 'list' },
      { key: 'disparadoresDefensivos', label: 'Disparadores defensivos (una por línea)', type: 'list' },
      { key: 'senalesCompra', label: 'Señales de compra (una por línea)', type: 'list' },
      { key: 'notaParaElModelo', label: 'Nota de actuación para la IA', type: 'textarea', rows: 4 },
    ],
  },

  ofertas: {
    path: 'kb/ofertas',
    label: 'Ofertas',
    singular: 'oferta',
    idPrefix: 'of-',
    titleField: 'nombre',
    subtitleField: 'tagline',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'avatarCliente', label: 'Avatar del cliente', type: 'textarea', rows: 3 },
      { key: 'problema', label: 'Problema que resuelve', type: 'textarea', rows: 2 },
      { key: 'mecanismo', label: 'Mecanismo (objeto: nombre, fases[], diferencial)', type: 'json', rows: 8 },
      { key: 'entregables', label: 'Entregables (uno por línea)', type: 'list' },
      { key: 'precio', label: 'Precio (objeto: moneda, contado, cuotas, politica)', type: 'json', rows: 5 },
      { key: 'garantia', label: 'Garantía', type: 'textarea', rows: 2 },
      { key: 'pruebaSocial', label: 'Prueba social (array de {nombre, caso})', type: 'json', rows: 8 },
      { key: 'descalificadores', label: 'Descalificadores — cuándo NO cerrar (uno por línea)', type: 'list' },
    ],
  },

  fases: {
    // path real: kb/fases/{ofertaId} — el componente lo resuelve con la oferta activa
    path: 'kb/fases',
    label: 'Fases de llamada',
    singular: 'fase',
    idPrefix: 'fase-',
    titleField: 'nombre',
    subtitleField: 'objetivo',
    sortField: 'orden',
    fields: [
      { key: 'orden', label: 'Orden', type: 'number', min: 1, max: 20, required: true },
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'duracionMin', label: 'Duración (min)', type: 'text' },
      { key: 'objetivo', label: 'Objetivo', type: 'textarea', rows: 3 },
      { key: 'preguntas', label: 'Preguntas / movimientos (uno por línea)', type: 'list' },
      { key: 'queDar', label: 'Qué DAR en esta fase', type: 'textarea', rows: 2 },
      { key: 'queReservar', label: 'Qué RESERVAR', type: 'textarea', rows: 2 },
      { key: 'erroresTipicos', label: 'Errores típicos (uno por línea)', type: 'list' },
      { key: 'transicion', label: 'Transición a la siguiente fase', type: 'textarea', rows: 2 },
    ],
  },
};

// slug simple para IDs generados desde el título
export function slugId(prefix, title) {
  const slug = (title || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${prefix}${slug || Date.now().toString(36)}`;
}

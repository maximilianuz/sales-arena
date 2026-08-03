// Las 5 métricas de la auditoría. TODAS son deterministas: se calculan del
// transcript con reglas, no con IA. Esto es deliberado — un número inventado por
// un modelo no sirve para medir progreso entre sesiones, y el objetivo del módulo
// es feedback objetivo. La IA solo agrega interpretación cualitativa aparte.
//
// Un mensaje es { role: 'closer' | 'prospecto', content: string, ts?: number }.

const PALABRAS_VACIAS = new Set(['que', 'de', 'la', 'el', 'y', 'a', 'en', 'un', 'una', 'es', 'no', 'me', 'te', 'se', 'lo', 'los', 'las', 'por', 'con', 'para', 'mi', 'tu', 'su', 'al', 'del', 'pero', 'como', 'mas', 'más', 'ya', 'si', 'sí', 'muy', 'esta', 'este', 'eso', 'esa', 'ese', 'hay', 'ser', 'estoy', 'tengo']);

const normalizar = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const contarPalabras = (s) => normalizar(s).split(' ').filter(Boolean).length;

// ── 1. Ratio de habla ───────────────────────────────────────
// En una llamada de descubrimiento sana el closer habla ~30-40%. Si hablás 60%,
// estás presentando en vez de diagnosticando.
export function ratioHabla(mensajes) {
  let closer = 0, prospecto = 0;
  for (const m of mensajes) {
    const n = contarPalabras(m.content);
    if (m.role === 'closer') closer += n; else prospecto += n;
  }
  const total = closer + prospecto;
  return {
    palabrasCloser: closer,
    palabrasProspecto: prospecto,
    porcentajeCloser: total ? Math.round((closer / total) * 100) : 0,
    objetivo: '30-40%',
    ok: total > 0 && (closer / total) <= 0.45,
  };
}

// ── 2. Preguntas abiertas vs cerradas ───────────────────────
// Heurística: lleva partícula interrogativa abierta o es una invitación a
// desarrollar ("contame", "explicame"). Si no, se cuenta como cerrada.
// Es una heurística explícita, no un juicio del modelo: falla en casos borde
// ("¿qué te parece si firmamos?") pero es estable entre sesiones, que es lo
// que importa para comparar tu evolución.
const ABIERTAS = /\b(que|como|cual|cuales|cuanto|cuanta|cuantos|cuantas|cuando|donde|quien|por que|para que)\b/;
const INVITACIONES = /\b(contame|conta|explicame|explica|describime|hablame|decime mas|ampliame|dame un ejemplo)\b/;

export function preguntas(mensajes) {
  let abiertas = 0, cerradas = 0;
  const ejemplosCerradas = [];
  for (const m of mensajes) {
    if (m.role !== 'closer') continue;
    // Cortamos por signo de pregunta de cierre; también cuenta la invitación
    // imperativa sin signo ("contame cómo venís durmiendo").
    const frases = (m.content || '').split(/(?<=[?¿.!\n])/).map(s => s.trim()).filter(Boolean);
    for (const f of frases) {
      const esPregunta = f.includes('?');
      const norm = normalizar(f);
      const esInvitacion = INVITACIONES.test(norm);
      if (!esPregunta && !esInvitacion) continue;
      if (esInvitacion || ABIERTAS.test(norm)) abiertas++;
      else { cerradas++; if (ejemplosCerradas.length < 3) ejemplosCerradas.push(f.trim()); }
    }
  }
  const total = abiertas + cerradas;
  return {
    abiertas, cerradas, total,
    porcentajeAbiertas: total ? Math.round((abiertas / total) * 100) : 0,
    ejemplosCerradas,
    objetivo: '≥70% abiertas',
    ok: total === 0 ? false : (abiertas / total) >= 0.7,
  };
}

// ── 3. Precio antes de dolor cuantificado ───────────────────
// El principio: el precio solo existe en relación a un dolor con número. Si lo
// decís antes, el cerebro del prospecto lo compara contra su bolsillo y perdés.
const PRECIO = /(\$|\busd\b|\beur\b|\bpesos\b|\bdolares\b|\bdólares\b|\bcuesta\b|\bprecio\b|\bvale\b|\binversion\b|\binversión\b|\bsale\b\s*\d)/i;
const NUMERO_PRECIO = /\d[\d.,]*\s*(mil|k|millones|m)?\b/i;
// Dolor cuantificado = el PROSPECTO puso un número a lo que pierde.
const UNIDAD_DOLOR = /\b(por mes|al mes|mensual|por año|al año|anual|por semana|semanal|por dia|por día|horas?|kilos?|kg|noches?|dias?|días?|veces|clientes?|ventas?|pacientes?)\b/i;

export function precioAntesDeDolor(mensajes) {
  let idxPrecio = -1, idxDolor = -1;
  mensajes.forEach((m, i) => {
    const c = m.content || '';
    if (m.role === 'closer' && idxPrecio === -1 && PRECIO.test(c) && NUMERO_PRECIO.test(c)) idxPrecio = i;
    if (m.role === 'prospecto' && idxDolor === -1 && /\d/.test(c) && (UNIDAD_DOLOR.test(c) || PRECIO.test(c))) idxDolor = i;
  });
  const mencionoPrecio = idxPrecio !== -1;
  const cuantificoDolor = idxDolor !== -1;
  return {
    mencionoPrecio, cuantificoDolor,
    turnoPrecio: idxPrecio, turnoDolor: idxDolor,
    // Correcto: o no llegaste al precio, o cuando lo dijiste el dolor ya tenía número.
    ok: !mencionoPrecio || (cuantificoDolor && idxDolor < idxPrecio),
    detalle: !mencionoPrecio
      ? 'No se mencionó precio en esta llamada.'
      : (cuantificoDolor && idxDolor < idxPrecio)
        ? 'Bien: el dolor ya tenía número antes del precio.'
        : cuantificoDolor
          ? 'Dijiste el precio ANTES de que el prospecto pusiera número a su problema.'
          : 'Dijiste el precio y el prospecto nunca cuantificó su dolor.',
  };
}

// ── 4. Palabras exactas del prospecto reusadas ──────────────
// Devolver sus propias palabras es la prueba de que escuchaste. Buscamos n-gramas
// (2 y 3 palabras) que dijo el prospecto y que el closer repite DESPUÉS, con al
// menos una palabra con contenido (no solo conectores).
const N_MIN = 2, N_MAX = 8;

// Un n-grama cuenta solo si aporta contenido: descartamos los que son puros
// conectores ("de la que", "y en el").
const tieneContenido = (gram) => gram.some(w => w.length > 3 && !PALABRAS_VACIAS.has(w));

export function ngramasDe(texto) {
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  const out = new Set();
  for (let n = N_MIN; n <= N_MAX; n++) {
    for (let i = 0; i + n <= palabras.length; i++) {
      const gram = palabras.slice(i, i + n);
      if (tieneContenido(gram)) out.add(gram.join(' '));
    }
  }
  return out;
}

// Solapamiento con una fuente: el mismo matcher que `palabrasReusadas`, con el
// signo invertido. En la llamada, reusar las palabras del prospecto es bueno y
// más es mejor; al reconstruir un concepto con tus propias palabras, reusar las
// de la fuente es lo que hay que evitar.
//
// Devuelve la proporción de palabras del texto que quedaron cubiertas por algún
// tramo copiado de la fuente. Se mide sobre palabras y no sobre n-gramas para
// que el número sea interpretable: 0.20 quiere decir "una de cada cinco palabras
// que escribiste venía prestada".
export function solapamientoConFuente(texto, fuente) {
  const dichoPorLaFuente = ngramasDe(fuente || '');
  const palabras = normalizar(texto || '').split(' ').filter(Boolean);
  if (!palabras.length) return { proporcion: 0, palabras: 0, copiadas: 0, tramos: [] };

  // Mismo barrido greedy: se toma siempre el tramo más largo y se salta a su
  // final, para no contar cinco veces las palabras de una frase copiada.
  const tramos = [];
  let copiadas = 0, i = 0;
  while (i < palabras.length) {
    let matchLen = 0;
    for (let n = Math.min(N_MAX, palabras.length - i); n >= N_MIN; n--) {
      if (dichoPorLaFuente.has(palabras.slice(i, i + n).join(' '))) { matchLen = n; break; }
    }
    if (matchLen) {
      tramos.push(palabras.slice(i, i + matchLen).join(' '));
      copiadas += matchLen;
      i += matchLen;
    } else i++;
  }

  return {
    proporcion: copiadas / palabras.length,
    palabras: palabras.length,
    copiadas,
    // Los tramos más largos primero: son los que conviene mostrarle al usuario
    // para que vea qué reescribir.
    tramos: tramos.sort((a, b) => b.length - a.length).slice(0, 8),
  };
}

export function palabrasReusadas(mensajes) {
  const dichoPorProspecto = new Set();
  const encontradas = new Set();

  for (const m of mensajes) {
    if (m.role === 'prospecto') {
      for (const g of ngramasDe(m.content)) dichoPorProspecto.add(g);
      continue;
    }
    // Barrido greedy de izquierda a derecha tomando SIEMPRE la coincidencia más
    // larga y saltando a su final. Así "por llegar tarde a reuniones" cuenta como
    // UNA frase devuelta y no como los cinco n-gramas solapados que contiene.
    const palabras = normalizar(m.content).split(' ').filter(Boolean);
    let i = 0;
    while (i < palabras.length) {
      let matchLen = 0;
      for (let n = Math.min(N_MAX, palabras.length - i); n >= N_MIN; n--) {
        if (dichoPorProspecto.has(palabras.slice(i, i + n).join(' '))) { matchLen = n; break; }
      }
      if (matchLen) { encontradas.add(palabras.slice(i, i + matchLen).join(' ')); i += matchLen; }
      else i++;
    }
  }

  const lista = [...encontradas];
  return {
    cantidad: lista.length,
    ejemplos: lista.slice(0, 6),
    objetivo: '≥3 por llamada',
    ok: lista.length >= 3,
  };
}

// ── 5. Silencios sostenidos ─────────────────────────────────
// En texto no existe el silencio: no se puede medir, así que se AUTO-REPORTA y
// la UI lo dice explícitamente. En voz sí es determinista (gaps entre timestamps).
export function silencios(mensajes, { autoReporte = null } = {}) {
  const conTs = mensajes.filter(m => typeof m.ts === 'number');
  if (conTs.length < 2) {
    return { fuente: 'auto-reporte', cantidad: autoReporte, ok: autoReporte == null ? null : autoReporte >= 2, objetivo: '≥2 silencios de 3s+' };
  }
  let cantidad = 0;
  for (let i = 1; i < conTs.length; i++) {
    // Silencio del closer = tardó en responder después de que el prospecto habló.
    if (conTs[i].role === 'closer' && conTs[i - 1].role === 'prospecto' && (conTs[i].ts - conTs[i - 1].ts) >= 3000) cantidad++;
  }
  return { fuente: 'medido', cantidad, ok: cantidad >= 2, objetivo: '≥2 silencios de 3s+' };
}

// Corre las 5 y devuelve el bloque completo que se guarda con la sesión.
export function computeMetrics(mensajes, opciones = {}) {
  return {
    ratioHabla: ratioHabla(mensajes),
    preguntas: preguntas(mensajes),
    precioAntesDeDolor: precioAntesDeDolor(mensajes),
    palabrasReusadas: palabrasReusadas(mensajes),
    silencios: silencios(mensajes, opciones),
  };
}

// Etiquetas legibles para la UI (una sola fuente de verdad).
export const METRIC_LABELS = {
  ratioHabla: { nombre: 'Ratio de habla', formato: (m) => `${m.porcentajeCloser}% vos` },
  preguntas: { nombre: 'Preguntas abiertas', formato: (m) => `${m.abiertas} abiertas / ${m.cerradas} cerradas` },
  precioAntesDeDolor: { nombre: 'Orden precio ↔ dolor', formato: (m) => (m.ok ? 'Correcto' : 'Invertido') },
  palabrasReusadas: { nombre: 'Sus palabras reusadas', formato: (m) => `${m.cantidad}` },
  silencios: { nombre: 'Silencios sostenidos', formato: (m) => (m.cantidad == null ? 'sin dato' : `${m.cantidad}`) },
};

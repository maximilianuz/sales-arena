// El corazón de la periodización abierta: cuánto te exige el sistema en cada
// nivel, cuánto estás dando, y si eso alcanza para cerrar el mesociclo.
//
// Este archivo es DETERMINISTA y PURO: no importa nada (ni db, ni firebase, ni
// react). Entra un snapshot de datos, sale un veredicto. Es a propósito — es el
// módulo más fácil de equivocar de todo Training y el único que decide si a
// alguien le sube la dificultad, así que tiene que poder verificarse a mano con
// un script suelto de node, sin levantar la app.
//
// Dos conceptos que conviene no confundir:
//   EXIGENCIA — lo que el sistema te pide. Sube por nivel, es una tabla fija, y
//               se congela dentro del mesociclo cuando se genera.
//   IP        — Índice de Preparación, lo que estás dando. Se mide de datos que
//               ya calculamos en otro lado (auditoría, FSRS, errores).
// Se sube de nivel cuando el IP supera la exigencia del nivel vigente.
//
// El IP nunca se le muestra al usuario como número. Lo que se muestra son las
// `senales`: cinco luces verde/roja con su valor y su objetivo. Un 68/100 no le
// dice a nadie qué hacer mañana; "tu ratio de habla va 52%, te pido 45%" sí.

// ── Exigencia por nivel ─────────────────────────────────────
//
// Índice = nivel - 1. A partir del nivel 5 la tabla se satura y lo que sigue
// subiendo es la composición del día (menos teoría, más llamadas, más mezcla de
// mazos) — eso lo decide mesociclo.js, no acá.
//
// Los umbrales del nivel 3 son los de la auditoría original (≤45% de habla, ≥70%
// abiertas, ≥3 palabras reusadas): el nivel 3 es "el estándar del método". Abajo
// de eso hay rampa para que alguien nuevo no arranque contra un muro; arriba,
// margen para que alguien que ya cierra tenga a dónde seguir.

export const EXIGENCIA = [
  { // Nivel 1 — que la llamada termine y no se abandone
    ratioHablaMax: 55, abiertasMin: 50, precioOkMin: 0.50, palabrasMin: 2, silenciosMin: 1,
    dificultadProspecto: 2, madurezMin: 0.25, reincidenciaMax: 0.60,
  },
  { // Nivel 2
    ratioHablaMax: 50, abiertasMin: 60, precioOkMin: 0.70, palabrasMin: 3, silenciosMin: 2,
    dificultadProspecto: 3, madurezMin: 0.40, reincidenciaMax: 0.50,
  },
  { // Nivel 3 — el estándar del método
    ratioHablaMax: 45, abiertasMin: 70, precioOkMin: 0.80, palabrasMin: 4, silenciosMin: 2,
    dificultadProspecto: 4, madurezMin: 0.55, reincidenciaMax: 0.40,
  },
  { // Nivel 4
    ratioHablaMax: 42, abiertasMin: 75, precioOkMin: 0.90, palabrasMin: 5, silenciosMin: 3,
    dificultadProspecto: 5, madurezMin: 0.65, reincidenciaMax: 0.35,
  },
  { // Nivel 5+
    ratioHablaMax: 40, abiertasMin: 80, precioOkMin: 1.00, palabrasMin: 6, silenciosMin: 3,
    dificultadProspecto: 5, madurezMin: 0.75, reincidenciaMax: 0.30,
  },
];

export const NIVEL_TABLA_MAX = EXIGENCIA.length;

export function exigenciaDeNivel(nivel) {
  const i = Math.min(Math.max(1, Math.round(nivel || 1)), NIVEL_TABLA_MAX) - 1;
  return EXIGENCIA[i];
}

// ── Rangos (la cara visible del nivel) ──────────────────────
//
// El nivel es un número interno; el rango es lo que se muestra. Más allá del 6
// se numera con romanos para que no haya techo de nombres: Élite II, Élite III…

const RANGOS = ['Aprendiz', 'Practicante', 'Closer', 'Closer avanzado', 'Veterano', 'Élite'];
const ROMANOS = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function rangoDeNivel(nivel) {
  const n = Math.max(1, Math.round(nivel || 1));
  if (n <= RANGOS.length) return { nivel: n, nombre: RANGOS[n - 1] };
  const extra = n - RANGOS.length; // 1 => "Élite II"
  return { nivel: n, nombre: `${RANGOS[RANGOS.length - 1]} ${ROMANOS[Math.min(extra, ROMANOS.length - 1)]}`.trim() };
}

// Qué se puso más difícil al subir de nivel, en castellano y en concreto.
// Alimenta la pantalla de level-up: "subiste de nivel" sin decir qué cambió es
// una medalla de participación, y el usuario se da cuenta.
export function cambiosDeNivel(nivel) {
  const n = Math.max(1, Math.round(nivel || 1));
  if (n <= 1) return [];
  const antes = exigenciaDeNivel(n - 1);
  const ahora = exigenciaDeNivel(n);
  const cambios = [];

  if (ahora.dificultadProspecto > antes.dificultadProspecto)
    cambios.push(`Los prospectos ahora llegan hasta dificultad ${ahora.dificultadProspecto}.`);
  if (ahora.ratioHablaMax < antes.ratioHablaMax)
    cambios.push(`El ratio de habla que te pido baja de ${antes.ratioHablaMax}% a ${ahora.ratioHablaMax}%.`);
  if (ahora.abiertasMin > antes.abiertasMin)
    cambios.push(`Preguntas abiertas: de ${antes.abiertasMin}% a ${ahora.abiertasMin}%.`);
  if (ahora.palabrasMin > antes.palabrasMin)
    cambios.push(`Tenés que devolverle ${ahora.palabrasMin} frases suyas por llamada, no ${antes.palabrasMin}.`);
  if (ahora.precioOkMin > antes.precioOkMin)
    cambios.push(`El precio tiene que ir después del dolor cuantificado en ${Math.round(ahora.precioOkMin * 100)}% de las llamadas.`);
  if (ahora.silenciosMin > antes.silenciosMin)
    cambios.push(`Silencios sostenidos: ${ahora.silenciosMin} por llamada.`);
  if (ahora.madurezMin > antes.madurezMin)
    cambios.push(`Cartas maduras del mazo foco: ${Math.round(ahora.madurezMin * 100)}%.`);

  if (n > NIVEL_TABLA_MAX)
    cambios.push('Menos teoría y más llamadas por bloque, con los mazos mezclados.');

  return cambios;
}

// ── Constantes del cálculo ──────────────────────────────────

// Ventana de evaluación: las últimas K sesiones, no la mejor. Con menos de 3 el
// dato es ruido — cualquiera tiene una buena llamada de casualidad.
export const K_SESIONES = 3;

// Una carta está "madura" cuando FSRS le dio un intervalo de 3 semanas o más.
// Con REQUEST_RETENTION = 0.9 el intervalo en días ≈ la estabilidad, así que el
// umbral se puede leer directo de `stability` (ver srs/fsrs.js).
export const MADUREZ_DIAS = 21;
export const MADUREZ_REPS_MIN = 3;

// Piso de cartas del mazo foco para que la retención pueda BLOQUEAR. Con un mazo
// chico o recién importado, esperar 21 días de estabilidad frenaría a todo el
// mundo por una razón que no tiene que ver con qué tan bien vende.
export const CARTAS_MIN_PARA_BLOQUEAR = 15;

// Pesos del IP. El orden precio↔dolor pesa doble dentro de ejecución: es la
// única métrica binaria y la que más plata cuesta cuando sale mal.
const PESO_EJE = { ejecucion: 0.5, retencion: 0.3, errores: 0.2 };
const PESO_METRICA = { ratioHabla: 1, preguntas: 1, precioAntesDeDolor: 2, palabrasReusadas: 1, silencios: 1 };

export const IP_MINIMO = 70;
export const PISO_EJECUCION = 0.70;
export const PRORROGAS_HASTA_VALVULA = 3;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const pct = (v) => Math.round(v * 100);

// ── Eje A · Ejecución (50%) ─────────────────────────────────
//
// Sobre las últimas K sesiones de roleplay con métricas dentro del mesociclo.
// Cada métrica puntúa como la FRACCIÓN de esas sesiones que pasan el umbral del
// nivel; el eje es el promedio ponderado. Una métrica sin dato se excluye y se
// renormaliza — no se cuenta como aprobada ni como fallada.

export function sesionesDeVentana(sesiones = [], desdeTs = 0, k = K_SESIONES) {
  return sesiones
    .filter(s => s && s.tipo === 'roleplay' && s.metricas && (s.ts || 0) >= desdeTs)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0))
    .slice(-k);
}

// Devuelve true / false / null. `null` = esta sesión no tiene con qué medir esta
// métrica, y por eso no entra en el denominador.
function pasaMetrica(clave, m, ex) {
  if (!m) return null;
  switch (clave) {
    case 'ratioHabla': {
      const total = (m.palabrasCloser || 0) + (m.palabrasProspecto || 0);
      return total === 0 ? null : m.porcentajeCloser <= ex.ratioHablaMax;
    }
    case 'preguntas':
      // Cero preguntas en toda la llamada no es "sin dato": es el peor caso.
      return m.total === 0 ? false : m.porcentajeAbiertas >= ex.abiertasMin;
    case 'precioAntesDeDolor':
      return !!m.ok;
    case 'palabrasReusadas':
      return (m.cantidad || 0) >= ex.palabrasMin;
    case 'silencios':
      // Los silencios auto-reportados no pueden decidir una progresión: es la
      // única métrica que el usuario se pone solo. Se muestra, no se computa.
      return m.fuente !== 'medido' || m.cantidad == null ? null : m.cantidad >= ex.silenciosMin;
    default:
      return null;
  }
}

export function ejeEjecucion(sesiones, ex, { k = K_SESIONES } = {}) {
  const ventana = Array.isArray(sesiones) ? sesiones.slice(-k) : [];
  const fracciones = {};

  for (const clave of Object.keys(PESO_METRICA)) {
    let pasan = 0, medidas = 0;
    for (const s of ventana) {
      const r = pasaMetrica(clave, s.metricas?.[clave], ex);
      if (r === null) continue;
      medidas++;
      if (r) pasan++;
    }
    fracciones[clave] = medidas ? pasan / medidas : null;
  }

  let suma = 0, pesos = 0;
  for (const [clave, peso] of Object.entries(PESO_METRICA)) {
    if (fracciones[clave] === null) continue;
    suma += peso * fracciones[clave];
    pesos += peso;
  }

  const fPrecio = fracciones.precioAntesDeDolor;
  return {
    score: pesos ? suma / pesos : 0,
    // Sin sesiones no hay evidencia: el eje no puede frenar ni empujar.
    aplica: ventana.length > 0 && pesos > 0,
    sesiones: ventana.length,
    fracciones,
    // Piso duro aparte del promedio: podés compensar todo lo demás, menos esto.
    precioOk: fPrecio === null ? true : fPrecio >= ex.precioOkMin,
  };
}

// ── Eje B · Retención (30%) ─────────────────────────────────
//
// Qué porcentaje de las cartas del mazo foco están maduras. Se mide sobre el
// mazo del mesociclo y no sobre todo el contenido: si el bloque es de objeciones,
// que tengas maduras las de perfiles no dice nada del bloque.

export function estadisticaMadurez(cards = [], srsMap = {}, mazoFoco = null) {
  const pool = mazoFoco ? cards.filter(c => c.mazo === mazoFoco) : cards;
  let maduras = 0, vistas = 0, reps = 0, lapses = 0;
  for (const c of pool) {
    const s = srsMap?.[c.id];
    if (!s || !s.reps) continue;
    vistas++;
    reps += s.reps || 0;
    lapses += s.lapses || 0;
    if (s.state === 'review' && (s.stability || 0) >= MADUREZ_DIAS && s.reps >= MADUREZ_REPS_MIN) maduras++;
  }
  return {
    total: pool.length,
    vistas,
    maduras,
    porcentaje: pool.length ? maduras / pool.length : 0,
    lapseRate: reps ? lapses / reps : 0,
  };
}

export function ejeRetencion(cards, srsMap, mazoFoco, ex) {
  const st = estadisticaMadurez(cards, srsMap, mazoFoco);
  // Olvidarte seguido de lo que ya "sabías" descuenta, con tope: es una señal
  // secundaria, no puede hundir el eje por sí sola.
  const penalizacion = 1 - Math.min(0.3, st.lapseRate);
  return {
    ...st,
    score: clamp01((st.porcentaje / (ex.madurezMin || 1)) * penalizacion),
    aplica: st.total >= CARTAS_MIN_PARA_BLOQUEAR,
    objetivo: ex.madurezMin,
  };
}

// ── Eje C · Errores (20%) ───────────────────────────────────
//
// La regla del módulo: errores NUEVOS no te frenan, errores REPETIDOS sí. Cuando
// la dificultad sube es esperable que aparezcan fallas nuevas — eso significa que
// el estímulo está funcionando. Lo que dice "todavía no estás listo" es seguir
// tropezando con lo mismo de siempre.
//
// Avanzás cuando dejás de repetir, no cuando dejás de equivocarte.

export function clasificarErrores(errores = [], desdeTs = 0) {
  const previos = new Set();
  const enVentana = [];
  for (const e of errores) {
    if (!e || !e.principioId) continue;
    if ((e.ts || 0) < desdeTs) previos.add(e.principioId);
    else enVentana.push(e);
  }

  const nuevos = [], repetidos = [];
  const vistosEnVentana = new Set();
  for (const e of enVentana.sort((a, b) => (a.ts || 0) - (b.ts || 0))) {
    // Reincidir dentro del propio mesociclo también cuenta como repetir: la
    // segunda vez que violás el mismo principio en el mismo bloque ya no es
    // material nuevo.
    if (previos.has(e.principioId) || vistosEnVentana.has(e.principioId)) repetidos.push(e);
    else nuevos.push(e);
    vistosEnVentana.add(e.principioId);
  }

  const total = enVentana.length;
  return {
    total,
    nuevos: nuevos.length,
    repetidos: repetidos.length,
    reincidencia: total ? repetidos.length / total : 0,
    principiosReincidentes: [...vistosEnVentana].filter(p => previos.has(p)),
  };
}

export function ejeErrores(errores, desdeTs, sesionesEnVentana, ex) {
  const c = clasificarErrores(errores, desdeTs);
  // Cero errores con cero sesiones no es un logro, es falta de datos.
  const aplica = sesionesEnVentana > 0;
  const max = ex.reincidenciaMax;
  // score = 1 justo en el umbral, 0 cuando todo lo que fallás es repetido.
  const score = c.total === 0 ? 1 : clamp01((1 - c.reincidencia) / (1 - max));
  return {
    ...c,
    densidad: sesionesEnVentana ? c.total / sesionesEnVentana : 0,
    score,
    aplica,
    ok: c.reincidencia <= max,
    objetivo: max,
  };
}

// ── IP y señales ────────────────────────────────────────────

// `mesociclo` aporta nivel, mazoFoco, sesionesObjetivo y desde cuándo se mide
// (generadoAt). El resto son los datos vivos que ya tiene TrainingHome.
export function calcularIP({ mesociclo, sesiones = [], cards = [], srsMap = {}, errores = [] }) {
  const ex = mesociclo?.exigencia || exigenciaDeNivel(mesociclo?.nivel);
  // `mideDesde` es el arranque del bloque ORIGINAL: una prórroga regenera la
  // estructura pero no la ventana de medición. Si se reseteara, todos los
  // errores que venís repitiendo pasarían a contar como nuevos justo en el
  // momento en que el sistema decidió que estabas repitiendo demasiado.
  const desdeTs = mesociclo?.mideDesde || mesociclo?.generadoAt || 0;
  const ventana = sesionesDeVentana(sesiones, desdeTs);
  // El volumen mira TODO el mesociclo; los ejes miran las últimas K. Son cosas
  // distintas: una es "entrenaste", la otra es "estás rindiendo ahora".
  const totalSesiones = sesiones.filter(s => s?.tipo === 'roleplay' && s.metricas && (s.ts || 0) >= desdeTs).length;

  const A = ejeEjecucion(ventana, ex);
  const B = ejeRetencion(cards, srsMap, mesociclo?.foco?.mazoFoco || null, ex);
  const C = ejeErrores(errores, desdeTs, totalSesiones, ex);

  let suma = 0, pesos = 0;
  for (const [clave, eje] of [['ejecucion', A], ['retencion', B], ['errores', C]]) {
    if (!eje.aplica) continue;
    suma += PESO_EJE[clave] * eje.score;
    pesos += PESO_EJE[clave];
  }

  return {
    ip: pesos ? Math.round((suma / pesos) * 100) : 0,
    ejes: { ejecucion: A, retencion: B, errores: C },
    exigencia: ex,
    sesionesTotales: totalSesiones,
    sesionesVentana: ventana.length,
  };
}

// Las cinco luces del semáforo. Esto es lo que ve el usuario — el IP no.
// `ok` decide el color; `valor` y `objetivo` son texto ya formateado para no
// tener que repetir el formateo en cada componente.
export function senales(analisis) {
  const { ejes, exigencia: ex } = analisis;
  const f = ejes.ejecucion.fracciones;
  const frac = (v) => (v === null ? 'sin datos' : `${pct(v)}% de tus llamadas`);

  return [
    {
      id: 'ratioHabla', label: 'Hablás menos que el prospecto',
      ok: (f.ratioHabla ?? 0) >= 0.67, valor: frac(f.ratioHabla), objetivo: `≤${ex.ratioHablaMax}% vos`,
    },
    {
      id: 'preguntas', label: 'Preguntás abierto',
      ok: (f.preguntas ?? 0) >= 0.67, valor: frac(f.preguntas), objetivo: `≥${ex.abiertasMin}% abiertas`,
    },
    {
      id: 'precio', label: 'El precio va después del dolor',
      ok: ejes.ejecucion.precioOk && (f.precioAntesDeDolor ?? 0) >= ex.precioOkMin,
      valor: frac(f.precioAntesDeDolor), objetivo: `${pct(ex.precioOkMin)}% de las llamadas`,
    },
    {
      id: 'palabras', label: 'Le devolvés sus palabras',
      ok: (f.palabrasReusadas ?? 0) >= 0.67, valor: frac(f.palabrasReusadas), objetivo: `≥${ex.palabrasMin} por llamada`,
    },
    {
      id: 'madurez', label: 'El mazo del bloque quedó fijado',
      ok: !ejes.retencion.aplica || ejes.retencion.porcentaje >= ex.madurezMin,
      valor: `${pct(ejes.retencion.porcentaje)}% maduras`, objetivo: `≥${pct(ex.madurezMin)}%`,
    },
    {
      id: 'reincidencia', label: 'Dejaste de repetir los mismos errores',
      ok: !ejes.errores.aplica || ejes.errores.ok,
      valor: ejes.errores.total ? `${ejes.errores.repetidos} de ${ejes.errores.total} repetidos` : 'sin errores',
      objetivo: `≤${pct(ex.reincidenciaMax)}% repetidos`,
    },
  ];
}

// ── Cierre de mesociclo ─────────────────────────────────────
//
// Se evalúa al cerrar cada día. Un mesociclo cierra por MASTERY, no por tiempo:
// la idea es que nadie suba de dificultad sin estar listo. Cuando no cierra, no
// se repite el bloque — se PRORROGA, más corto y sesgado al eje que falló.

export function evaluarCierre({ mesociclo, sesiones, cards, srsMap, errores, diasCompletos }) {
  const analisis = calcularIP({ mesociclo, sesiones, cards, srsMap, errores });
  const { ejes, exigencia: ex } = analisis;
  const nivel = mesociclo?.nivel || 1;
  const prorrogas = mesociclo?.prorroga || 0;

  // 1 · Volumen. Es condición dura y separada del IP: sin haber entrenado el
  // bloque entero no hay nada que evaluar, por buenas que sean las métricas.
  //
  // El piso lo trae el propio mesociclo, calculado sobre los días de llamada que
  // tiene programados. Derivarlo del largo del bloque (sesionesObjetivo/3) hacía
  // la condición inalcanzable en los niveles bajos, donde hay más teoría que
  // llamadas: pedía 5 roleplays en un bloque que solo agenda 3.
  const sesionesMin = Math.max(1, mesociclo?.roleplaysMin ?? Math.ceil((mesociclo?.sesionesObjetivo || 12) / 3));
  const volumen = !!diasCompletos && analisis.sesionesTotales >= sesionesMin;

  const faltan = [];
  if (!diasCompletos) faltan.push('Te faltan días de este bloque.');
  if (analisis.sesionesTotales < sesionesMin)
    faltan.push(`Llevás ${analisis.sesionesTotales} llamadas simuladas de las ${sesionesMin} que pide el bloque.`);

  // 2 · Nivel 1 cierra solo por volumen. En el primer bloque no existen métricas
  // históricas contra las cuales medir: exigir IP acá dejaría a todo el mundo en
  // prórroga permanente el primer mes, que es justo cuando se abandona.
  if (nivel === 1) {
    return {
      cierra: volumen, motivo: volumen ? 'mastery' : null,
      analisis, senales: senales(analisis), faltan,
      ejeDebil: ejeMasDebil(ejes), prorrogas,
    };
  }

  // 3 · IP y pisos por eje. Un eje que no aplica (sin datos suficientes) no
  // bloquea: no se castiga a alguien por no tener todavía con qué medirlo.
  if (analisis.ip < IP_MINIMO) faltan.push('Todavía no están todas las señales en verde.');
  if (ejes.ejecucion.aplica && ejes.ejecucion.score < PISO_EJECUCION) faltan.push('Tus métricas de llamada están abajo del piso del nivel.');
  if (ejes.ejecucion.aplica && !ejes.ejecucion.precioOk) faltan.push('El precio te sigue saliendo antes de que el dolor tenga número.');
  if (ejes.retencion.aplica && ejes.retencion.porcentaje < ex.madurezMin) faltan.push('El mazo del bloque todavía no está fijado.');
  if (ejes.errores.aplica && !ejes.errores.ok) faltan.push('Seguís repitiendo los mismos errores.');

  const mastery = volumen && faltan.length === 0;

  // 4 · Válvula de escape. A la tercera prórroga sin cumplir, se avanza igual y
  // queda registrado en el historial. Es una decisión de producto explícita:
  // prefiero que alguien pase un poco crudo a que se quede trabado y abandone.
  // El motivo queda guardado para poder ser más exigente en el cierre siguiente.
  const valvula = !mastery && volumen && prorrogas >= PRORROGAS_HASTA_VALVULA;

  return {
    cierra: mastery || valvula,
    motivo: mastery ? 'mastery' : valvula ? 'valvula' : null,
    analisis,
    senales: senales(analisis),
    faltan,
    ejeDebil: ejeMasDebil(ejes),
    prorrogas,
  };
}

// Cuál de los tres ejes está peor. Decide el sesgo de la prórroga y el foco del
// mesociclo siguiente: los ejes que no aplican no compiten, porque "sin datos"
// no es lo mismo que "mal".
export function ejeMasDebil(ejes) {
  const candidatos = Object.entries(ejes).filter(([, e]) => e.aplica);
  if (!candidatos.length) return 'ejecucion';
  return candidatos.sort((a, b) => a[1].score - b[1].score)[0][0];
}

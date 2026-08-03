// Franjas: el día partido en sesiones independientes, cada una con su carga
// cerrada y su propio corte.
//
// El modelo viejo era "un día = una sesión de 10 a 40 minutos". Con 4 horas
// disponibles eso no se estira: repartir 240 minutos entre los bloques de una
// sola sesión daba un bloque de flashcards de dos horas y media.
//
// Pero el problema de fondo no era el reparto, era conceptual. La carga definida
// con corte disciplinado no se lleva bien con 4 horas seguidas: la adquisición
// de material nuevo se satura mucho antes, y si la carga se infla para llenar el
// día deja de ser un techo cognitivo y pasa a ser una meta de tiempo disfrazada
// — justo lo que la regla venía a impedir.
//
// La salida es que el CORTE SEA POR FRANJA Y NO POR DÍA. Cerrar la adquisición
// no termina la jornada: habilita la siguiente franja, que corre sobre material
// distinto. Y de ahí sale la propiedad que sostiene todo lo demás:
//
//   SOLO LA PRIMERA FRANJA TOCA MATERIAL FRESCO.
//
// Las otras tres corren sobre material que ya cumplió su intervalo de
// consolidación. Por eso el roleplay diario que la metodología exige nunca se
// rompe: vive en Aplicación, sobre material consolidado, y es independiente de
// si hoy hubo adquisición o no.

// ── Definición de las franjas ───────────────────────────────
//
// `peso` reparte los minutos del día. Hay DOS pisos y hacen cosas distintas:
//
// · `minDia` — cuántos minutos tiene que tener el día para que la franja
//   aparezca. Es un piso sobre el TOTAL, no sobre la porción. Si fuera sobre la
//   porción, alguien con 90 minutos diarios nunca alcanzaría el mínimo de
//   Adquisición (90 × 0.35 = 31) y no aprendería material nuevo nunca — que es
//   exactamente lo que no queremos.
//
// · `minMinutos` — cuánto necesita la franja para tener sentido una vez que
//   aparece. Adquisición con 40 minutos lleva UNA unidad en vez de tres; el
//   recorrido de cinco pasos se sostiene igual, solo que más corto.
//
// Con 20 minutos diarios sobrevive solo Consolidación, que es exactamente el
// comportamiento viejo: nadie que hoy entrena 20 minutos se despierta mañana
// con cuatro franjas.

export const FRANJAS = [
  {
    id: 'adquisicion',
    n: 1,
    etiqueta: 'Adquisición',
    resumen: 'Material nuevo. Es la única franja que lo toca.',
    peso: 0.35,
    minMinutos: 40,
    minDia: 75,
    material: 'fresco',
  },
  {
    id: 'consolidacion',
    n: 2,
    etiqueta: 'Consolidación activa',
    resumen: 'Recuperación sobre lo que ya asentó.',
    peso: 0.25,
    minMinutos: 12,
    minDia: 12,
    material: 'disponible',
  },
  {
    id: 'aplicacion',
    n: 3,
    etiqueta: 'Aplicación',
    resumen: 'Llamada simulada con feedback.',
    peso: 0.30,
    minMinutos: 25,
    minDia: 45,
    material: 'disponible',
  },
  {
    id: 'cierre',
    n: 4,
    etiqueta: 'Cierre del día',
    resumen: 'Auditoría a mano y revisión ligera.',
    peso: 0.10,
    minMinutos: 8,
    minDia: 30,
    material: 'mixto',
  },
];

export const franjaPorId = (id) => FRANJAS.find(f => f.id === id) || null;

// ── Los cinco pasos de la adquisición ───────────────────────
//
// Es donde viven los tres mecanismos. El orden no es negociable: la
// descomposición con palabras propias es una COMPUERTA, no un paso más. Sin
// pasarla no se habilita Feynman, porque simplificar algo que todavía no
// reconstruiste es repetir el resumen de otro con menos palabras.

export const PASOS_ADQUISICION = [
  {
    id: 'carga',
    titulo: 'Carga definida',
    minutos: 3,
    detalle: 'Se declara antes de abrir nada. Qué unidades y cuál es el criterio de cierre. Nunca "estudio dos horas".',
  },
  {
    id: 'exposicion',
    titulo: 'Exposición',
    minutos: 18,
    detalle: 'El único momento con el material abierto. Leer, escuchar, subrayar.',
  },
  {
    id: 'descomposicion',
    titulo: 'Descomposición sin palabras prestadas',
    minutos: 22,
    detalle: 'Material cerrado, a mano. Reconstruir con tu propio lenguaje técnico. Todavía no es simplificar: es re-derivar.',
    compuerta: true,
  },
  {
    id: 'feynman',
    titulo: 'Feynman',
    minutos: 15,
    detalle: 'Recién ahora: explicarlo a alguien de doce años. Solo sobre el porqué, nunca sobre líneas literales.',
  },
  {
    id: 'codificacion',
    titulo: 'Codificación activa',
    minutos: 10,
    detalle: 'Una sola pasada de recuperación. Es parte del encoding, no una repetición: el reloj de consolidación arranca después.',
  },
];

// ── Reparto del día ─────────────────────────────────────────

// Cuántas unidades frescas entran en la franja de adquisición. El tope duro es
// 3: pasado eso no se consolida nada, se acumula. Y cada unidad necesita
// recorrer los cinco pasos, así que por debajo de ~25 minutos por unidad el
// recorrido se hace de mentira.
export const MAX_UNIDADES_FRESCAS = 3;
const MINUTOS_POR_UNIDAD = 25;

export function unidadesQueEntran(minutos) {
  return Math.max(1, Math.min(MAX_UNIDADES_FRESCAS, Math.floor(minutos / MINUTOS_POR_UNIDAD)));
}

// Carga de cada franja: cerrada, medible, y nunca expresada en tiempo. Es lo
// que decide cuándo se corta.
export function cargaDeFranja(franjaId, minutos) {
  switch (franjaId) {
    case 'adquisicion':
      return { tipo: 'unidades', objetivo: unidadesQueEntran(minutos), unidad: 'unidades nuevas' };
    case 'consolidacion':
      // ~1,8 cartas por minuto es el ritmo de una clásica; las Feynman rinden
      // menos pero en esta franja son minoría.
      //
      // El techo de 60 no es decorativo: una tanda de recuperación pierde valor
      // mucho antes de las cien cartas, y sin tope un día de 4 horas pedía 281,
      // que no es una sesión de estudio. Si la carga se cumple antes de que se
      // acaben los minutos, la franja CORTA y se pasa a la siguiente — que es
      // exactamente el mecanismo, no un defecto del reparto.
      return { tipo: 'cartas', objetivo: Math.min(60, Math.max(5, Math.round(minutos * 1.8))), unidad: 'cartas' };
    case 'aplicacion':
      return { tipo: 'roleplays', objetivo: Math.max(1, Math.floor(minutos / 25)), unidad: 'llamadas' };
    case 'cierre':
      return { tipo: 'ritual', objetivo: 1, unidad: 'auditoría' };
    default:
      return { tipo: 'ritual', objetivo: 1, unidad: '' };
  }
}

// El día de integración no introduce material nuevo. Es el viernes por defecto:
// cargar algo fresco el último día de la semana deja 72 horas hasta el lunes y
// la semana arranca en frío. Se decide con la FECHA y no con el número de día
// del mesociclo, porque las prórrogas corren el calendario y el viernes sigue
// siendo viernes.
export const DIA_INTEGRACION_POR_DEFECTO = 5; // 1 = lunes … 7 = domingo

export function esDiaDeIntegracion(fecha = new Date(), diaSemana = DIA_INTEGRACION_POR_DEFECTO) {
  if (!diaSemana) return false;
  const d = fecha.getDay(); // 0 = domingo
  return (d === 0 ? 7 : d) === diaSemana;
}

// Reparte los minutos del día entre las franjas que aplican y les pone su carga.
//
// `hayMaterialFresco` viene del currículum: si no quedan unidades introducibles
// —porque terminaste el currículum o porque sus prerrequisitos están en
// consolidación— la franja de adquisición no tiene sentido y sus minutos se
// redistribuyen. Es lo mismo que pasa el día de integración.
export function repartirDia(minutosTotales, {
  fecha = new Date(),
  diaIntegracion = DIA_INTEGRACION_POR_DEFECTO,
  hayMaterialFresco = true,
} = {}) {
  const conAdquisicion = hayMaterialFresco && !esDiaDeIntegracion(fecha, diaIntegracion);

  const aplican = FRANJAS.filter(f => {
    if (f.id === 'adquisicion' && !conAdquisicion) return false;
    return minutosTotales >= f.minDia;
  });

  // Si el día es tan corto que no entra ninguna, queda Consolidación sola: es
  // el mínimo con el que el sistema sigue teniendo sentido.
  const finales = aplican.length ? aplican : [franjaPorId('consolidacion')];

  const totalPeso = finales.reduce((a, f) => a + f.peso, 0) || 1;
  let restante = minutosTotales;

  return finales.map((f, i) => {
    const ultima = i === finales.length - 1;
    let minutos;
    if (ultima) {
      // La última se queda con lo que sobra: así la suma da SIEMPRE el total
      // declarado. Aplicarle el piso acá haría que un día de 10 minutos se
      // convirtiera en uno de 12, que es mentirle al usuario sobre su tiempo.
      minutos = restante;
    } else {
      // El piso solo se respeta si después queda lugar para las que siguen.
      const reservaSiguientes = finales.slice(i + 1).reduce((a, x) => a + x.minMinutos, 0);
      const proporcional = Math.round(minutosTotales * (f.peso / totalPeso));
      minutos = Math.min(Math.max(f.minMinutos, proporcional), restante - reservaSiguientes);
    }
    restante -= minutos;
    return {
      id: `${f.id}`,
      franja: f.id,
      n: f.n,
      etiqueta: f.etiqueta,
      resumen: f.resumen,
      material: f.material,
      minutos,
      carga: cargaDeFranja(f.id, minutos),
      pasos: f.id === 'adquisicion' ? PASOS_ADQUISICION.map(p => p.id) : null,
    };
  });
}

// ── Corte ───────────────────────────────────────────────────

// Una franja se cierra cuando cumplió su carga. No cuando se acabó el tiempo:
// el tiempo es una estimación para poder planificar el día, la carga es el
// criterio real.
export function franjaCompleta(sesion, cumplido = 0) {
  return cumplido >= (sesion?.carga?.objetivo || 0);
}

// Qué ofrecer cuando una franja se corta y sobra tiempo. Nunca "una vuelta más"
// del mismo material: eso es lo que la regla prohíbe. Se ofrece la franja
// siguiente, que corre sobre material distinto.
export function siguienteFranja(sesiones = [], cumplidos = {}) {
  return sesiones.find(s => !franjaCompleta(s, cumplidos[s.id] || 0)) || null;
}

export function progresoDelDia(sesiones = [], cumplidos = {}) {
  const total = sesiones.length;
  const hechas = sesiones.filter(s => franjaCompleta(s, cumplidos[s.id] || 0)).length;
  const minutos = sesiones.reduce((a, s) => a + s.minutos, 0);
  return { total, hechas, minutos, pct: total ? Math.round((hechas / total) * 100) : 0 };
}

// ── Preguntas de ruptura de patrón ──────────────────────────
//
// Del dossier de identidad. Están pensadas para caer en momentos sueltos del
// día, y las transiciones entre franjas ya son exactamente eso: tres cortes
// naturales donde la persona cambia de contexto. No hace falta un sistema de
// alarmas — el día ya los tiene.
//
// Rotan por número de día para que no se gasten: la misma pregunta dos días
// seguidos deja de hacer pensar y se contesta en automático.

export const PREGUNTAS_RUPTURA = [
  '¿Qué estoy evitando justo ahora al hacer lo que estoy haciendo?',
  'Si alguien hubiera grabado las últimas dos horas, ¿qué concluiría que quiero de mi vida?',
  '¿Me estoy moviendo hacia la vida que detesto o hacia la que quiero?',
  '¿Qué es lo más importante que estoy fingiendo que no es importante?',
  '¿Qué hice hoy por proteger mi identidad en lugar de por un deseo real?',
  '¿En qué momento me sentí más vivo hoy? ¿Cuándo más apagado?',
  '¿En qué parte de mi vida estoy cambiando el sentirme vivo por la seguridad?',
  '¿Cuál es la versión más pequeña de la persona que quiero ser que podría ser mañana?',
  '¿Qué cambiaría si dejara de necesitar que me vean como soy hoy?',
];

// Determinista por día y por transición: dos personas el mismo día ven lo
// mismo, y la misma persona no repite pregunta dentro del día.
export function preguntaDeTransicion(diaDelPlan = 1, indiceTransicion = 0) {
  const i = (diaDelPlan * FRANJAS.length + indiceTransicion) % PREGUNTAS_RUPTURA.length;
  return PREGUNTAS_RUPTURA[i];
}

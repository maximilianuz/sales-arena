// Módulo 0 — los prompts del proceso guiado de identidad.
//
// Mismo criterio que el onboarding del plan: una pantalla por vez, y ninguna
// pregunta que no cambie algo concreto. La diferencia es que acá no se elige
// entre opciones — se escribe. No hay IA: el contenido es del usuario, y un
// texto generado por un modelo no sirve para leerlo cada mañana como propio.
//
// El arranque son TRES pantallas: dos de declaración y una de panel. Las otras
// cuatro preguntas no se piden acá — llegan de a una por día (ver dossier.js).
//
// El motivo es el que este mismo comentario decía desde el principio: más de
// cinco pantallas y se abandona antes de llegar al producto. Cuando las
// preguntas de motor se agregaron después, el wizard pasó a pedir siete de una
// sentada, que es justo lo que la regla prohibía. Repartirlas además las mejora:
// "¿quién sos en tu mejor versión vendiendo?" se contesta distinto el día uno
// que después de haber hecho tres llamadas simuladas.
//
// El corte no es por dificultad sino por FUNCIÓN. Las dos de arranque son las
// únicas que el sistema necesita para operar: continuidad.js usa `noVuelvoA`
// para el recordatorio de regreso y `porQueCambio` para el de subida de nivel.
// Sin esas dos hay funciones muertas; sin las otras cuatro, no.

// El orden importa. Las dos primeras son las que más pegan y las más fáciles de
// contestar —nadie duda de a qué no quiere volver—, así que abren. Las otras
// cuatro cuestan más y se responden mejor cuando ya entraste en tema.
//
// Las dos primeras además son motores DISTINTOS, y el sistema los usa en
// momentos distintos (ver recordatorio.js): "a lo que no vuelvo" es lo que
// mueve a alguien que se frenó; "por qué estoy dispuesto" es lo que sostiene a
// alguien que ya está en marcha. Mezclarlos los desafila a los dos.
export const PASOS_DECLARACION = [
  {
    key: 'noVuelvoA',
    titulo: '¿A qué no estás dispuesto a volver?',
    ayuda: 'Concreto, no abstracto. No "a la mediocridad": al mes que no llegaste a pagar algo, a la llamada que dejaste ir por no bancarte el silencio, al laburo del que te fuiste. Escribí el que todavía te incomoda.',
    placeholder: 'A cerrar el mes contando lo que falta. A pedir prórroga sabiendo que la llamada la tuve y la solté…',
    minimo: 40,
    motor: 'desde',
    arranque: true,
  },
  {
    key: 'porQueCambio',
    titulo: '¿Por qué estás dispuesto a pagar el precio de cambiar?',
    ayuda: 'Cambiar cuesta: horas, incomodidad, quedar mal en simulaciones. ¿A cambio de qué? Que sea tuyo, no una frase de manual.',
    placeholder: 'Porque quiero elegir con quién trabajo en vez de aceptar lo que venga…',
    minimo: 40,
    motor: 'hacia',
    arranque: true,
  },
  {
    key: 'quienSoy',
    titulo: '¿Quién sos cuando estás en tu mejor versión vendiendo?',
    ayuda: 'No lo que querés ser algún día: cómo sos el día que la llamada te sale bien. Escribilo en presente.',
    placeholder: 'Soy el que escucha antes de hablar y no tiene apuro por cerrar…',
    minimo: 40,
  },
  {
    key: 'queSostengo',
    titulo: '¿Qué sostenés aunque te cueste la venta?',
    ayuda: 'Tu línea. Lo que no hacés ni para cerrar el mes: descontar sin motivo, prometer lo que no se puede, venderle a alguien que no lo necesita.',
    placeholder: 'No le vendo a quien no lo necesita, aunque tenga la plata…',
    minimo: 30,
  },
  {
    key: 'comoOpero',
    titulo: '¿Cómo trabajás cuando nadie te está mirando?',
    ayuda: 'Tu método cuando no hay nadie controlando. Es lo que separa al que tiene un buen mes del que tiene un buen año.',
    placeholder: 'Preparo cada llamada aunque sea un lead frío. Registro lo que salió mal el mismo día…',
    minimo: 30,
  },
  {
    key: 'compromiso',
    titulo: '¿Con qué te comprometés durante los próximos tres meses?',
    ayuda: 'Una sola cosa, y que dependa de vos. "Cerrar más" no depende de vos; "entrenar tres veces por semana pase lo que pase", sí.',
    placeholder: 'Entreno tres veces por semana aunque tenga la agenda llena…',
    minimo: 30,
  },
];

// Las que se piden en el arranque y las que se reparten día a día. Se derivan
// del mismo array para que agregar una pregunta nueva no obligue a acordarse de
// tocar dos listas.
export const PASOS_ARRANQUE = PASOS_DECLARACION.filter(p => p.arranque);
export const PASOS_DOSSIER = PASOS_DECLARACION.filter(p => !p.arranque);

// El arranque está completo cuando están las dos de motor. NO exige las cuatro
// del dossier: son las que van llegando después, y bloquear el plan hasta
// tenerlas sería volver al wizard de siete pantallas por otra puerta.
export function arranqueCompleto(declaracion) {
  const partes = declaracion?.partes || {};
  return PASOS_ARRANQUE.every(p => (partes[p.key] || '').trim());
}

// El panel visionario. Tres metas, una por categoría: una de plata, una de
// actividad y una de habilidad. La de actividad es la que más importa al
// principio porque es la única que controlás del todo — cerrar depende también
// del otro; llamar, no.
export const CATEGORIAS_META = [
  {
    id: 'ingresos',
    label: 'Plata',
    ayuda: 'Cuánto querés facturar y para cuándo.',
    ejemplo: { titulo: 'Facturar en comisiones', metrica: 'comisiones', unidad: 'USD/mes', valorObjetivo: 8000 },
  },
  {
    id: 'volumen',
    label: 'Actividad',
    ayuda: 'Lo único que depende 100% de vos. Llamadas, no cierres.',
    ejemplo: { titulo: 'Llamadas de venta por semana', metrica: 'llamadas', unidad: 'por semana', valorObjetivo: 15 },
  },
  {
    id: 'habilidad',
    label: 'Habilidad',
    ayuda: 'Algo medible de tu método, no "ser mejor closer".',
    ejemplo: { titulo: 'Tasa de cierre', metrica: 'cierre', unidad: '%', valorObjetivo: 25 },
  },
];

// Una meta está completa cuando tiene número Y fecha. Es la regla que hace que
// el panel sea cuantificado y no una lista de deseos: sin cifra no hay contra
// qué medirse, y sin fecha no hay urgencia. La validación es determinista y vive
// en el formulario — no hace falta IA para exigir un número.
export function metaValida(meta) {
  if (!meta) return false;
  const objetivo = Number(meta.valorObjetivo);
  return !!(meta.titulo?.trim())
    && Number.isFinite(objetivo) && objetivo > 0
    && !!(meta.unidad?.trim())
    && /^\d{4}-\d{2}-\d{2}$/.test(meta.fechaObjetivo || '');
}

export function faltaEnMeta(meta) {
  if (!meta?.titulo?.trim()) return 'Ponele un nombre a la meta.';
  const objetivo = Number(meta.valorObjetivo);
  if (!Number.isFinite(objetivo) || objetivo <= 0) return 'Falta el número al que querés llegar.';
  if (!meta.unidad?.trim()) return 'Falta la unidad (USD/mes, llamadas por semana, %…).';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.fechaObjetivo || '')) return 'Falta la fecha. Sin fecha no es una meta.';
  return null;
}

// Arma el texto que se lee cada mañana a partir de las cuatro respuestas. Se
// guarda aparte de las partes y queda editable: la declaración tiene que sonar
// como la escribiría el usuario, no como la ensambló un programa.
export function armarDeclaracion(partes = {}) {
  return PASOS_DECLARACION
    .map(p => (partes[p.key] || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

// Qué partes le faltan a una declaración ya escrita. Existe porque las dos
// preguntas de motor se agregaron después: quien escribió su declaración antes
// no las tiene, y el recordatorio semanal necesita saberlo para no intentar
// mostrar una parte vacía.
export function partesFaltantes(declaracion) {
  const partes = declaracion?.partes || {};
  return PASOS_DECLARACION.filter(p => !(partes[p.key] || '').trim());
}

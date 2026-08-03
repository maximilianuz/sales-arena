// Armado de UN mesociclo: el bloque de entrenamiento que reemplaza a las cuatro
// semanas fijas del plan v1.
//
// La referencia es la progresión de gimnasio: bloques de dificultad creciente
// que se cierran por rendimiento, no por calendario, y que pueden seguir
// generándose mientras haya progreso que hacer. Recién después de varios meses
// se nota el cambio real, así que el sistema no puede tener un final.
//
// Sigue siendo DETERMINISTA y sin IA — mismo motivo que antes: no queremos otro
// endpoint peleando con el timeout de 10s de Netlify, y un plan que cambia de
// criterio cada vez que lo mirás no es un plan. Lo que cambió respecto de v1 es
// que la entrada ya no son solo las 6 respuestas del onboarding: ahora incluye
// el análisis del bloque anterior. Misma entrada, misma salida; la estructura se
// congela al generar y el contenido se hidrata en runtime.
//
// No se generan N mesociclos por adelantado: existe SOLO el actual. El siguiente
// se arma cuando el anterior cierra, con datos frescos. Eso es lo que hace que
// no haya techo sin que el nodo `plan` crezca sin límite.

import { exigenciaDeNivel } from './dificultad';
import { repartirDia, cargaDeFranja, FRANJAS } from './franjas';

// ── Temas ───────────────────────────────────────────────────
//
// El tema del bloque sale del eje más débil medido, no de una lista fija. Es lo
// que hace que el bloque 4 de una persona no se parezca al de otra.

export const TEMAS = {
  fundamentos: {
    titulo: 'Fundamentos',
    objetivo: 'Que puedas explicar el método con tus palabras, sin leer. Si no lo podés explicar, no lo vas a poder usar cuando el prospecto te apure.',
    mazoFoco: 'principios',
    areas: [],
    // Cargado a teoría, pero con freno: un primer bloque que es casi todo
    // lectura se abandona antes de llegar a la primera llamada, y la llamada es
    // lo que engancha. La teoría que falte la levanta el nivel 2.
    sesgo: { teoria: 1.35, practica: 1.2 },
  },
  descubrimiento: {
    titulo: 'Descubrimiento',
    objetivo: 'Preguntar hasta que el dolor tenga números. La mayoría de las llamadas se pierden acá, no en el precio.',
    mazoFoco: 'preguntas-por-fase',
    areas: ['apertura', 'descubrimiento'],
    sesgo: { practica: 1.3, llamada: 1.1 },
  },
  escucha: {
    titulo: 'Escuchar y devolver',
    objetivo: 'Hablar menos y devolverle sus propias palabras. Es la prueba de que escuchaste, y es lo que hace que confíe antes de que le digas un número.',
    mazoFoco: 'preguntas-por-fase',
    areas: ['apertura', 'descubrimiento'],
    sesgo: { llamada: 1.4 },
  },
  precio: {
    titulo: 'Precio bajo presión',
    objetivo: 'Decir el número sin adornarlo y sostener el silencio que viene después.',
    mazoFoco: 'objeciones',
    areas: ['precio', 'objeciones'],
    sesgo: { llamada: 1.4, practica: 1.1 },
  },
  cierre: {
    titulo: 'Pedir la decisión',
    objetivo: 'Pedir la decisión y quedarte callado. El que habla primero después de pedir, pierde.',
    mazoFoco: 'objeciones',
    areas: ['cierre', 'objeciones'],
    sesgo: { llamada: 1.5 },
  },
  perfiles: {
    titulo: 'Con quién estás hablando',
    objetivo: 'Detectar el perfil en los primeros dos minutos y cambiar de registro según quién sea, no según tu guion.',
    mazoFoco: 'deteccion-perfiles',
    areas: ['perfiles'],
    sesgo: { practica: 1.3, llamada: 1.2 },
  },
  consolidacion: {
    titulo: 'Fijar lo aprendido',
    objetivo: 'Sabés hacerlo, pero todavía se te escapa. Este bloque es para que deje de depender de que te acuerdes.',
    mazoFoco: null, // hereda el mazo del bloque anterior
    areas: [],
    sesgo: { repaso: 2, practica: 1.2 },
  },
  correccion: {
    titulo: 'Cerrar agujeros',
    objetivo: 'Venís repitiendo los mismos errores. Este bloque los ataca de frente antes de subir la exigencia.',
    mazoFoco: 'principios',
    areas: [],
    sesgo: { revision: 2.5, teoria: 1.5, repaso: 1.2 },
  },
};

// Qué tema ataca cada métrica de la auditoría cuando es la que peor viene.
const TEMA_POR_METRICA = {
  ratioHabla: 'escucha',
  palabrasReusadas: 'escucha',
  preguntas: 'descubrimiento',
  precioAntesDeDolor: 'precio',
  silencios: 'cierre',
};

// Tema según lo que el usuario marcó difícil en el onboarding. Es el desempate
// cuando todavía no hay métricas — el bloque 2 de alguien que recién arranca.
const TEMA_POR_AREA = {
  apertura: 'descubrimiento',
  descubrimiento: 'descubrimiento',
  perfiles: 'perfiles',
  precio: 'precio',
  objeciones: 'precio',
  cierre: 'cierre',
};

// ── Elección del tema ───────────────────────────────────────

// Rotación para cuando no hay ningún agujero medible que atacar. El orden sigue
// el recorrido de una llamada, y se indexa por número de bloque para que sea
// determinista y no se repita.
const ROTACION = ['descubrimiento', 'precio', 'perfiles', 'cierre', 'escucha'];

export function elegirTema({ nivel, analisis, config = {}, temaPrevio = null, n = 1 }) {
  // El bloque 1 es siempre fundamentos: no hay datos con qué decidir otra cosa,
  // y arrancar por lo que no sabés nombrar no funciona.
  if (nivel <= 1) return 'fundamentos';

  const ejes = analisis?.ejes;
  if (ejes) {
    // Retención floja: sabe hacerlo pero no le quedó fijado. Consolidar antes de
    // apilar cosas nuevas encima.
    if (ejes.retencion?.aplica && ejes.retencion.score < 0.8 && temaPrevio !== 'consolidacion') return 'consolidacion';
    // Reincidencia alta: no tiene sentido subir la exigencia mientras repita.
    if (ejes.errores?.aplica && !ejes.errores.ok && temaPrevio !== 'correccion') return 'correccion';

    // Si no, ataca la métrica de llamada que peor viene.
    const f = ejes.ejecucion?.fracciones || {};
    const medidas = Object.entries(f).filter(([, v]) => v !== null);
    if (medidas.length) {
      const peor = medidas.sort((a, b) => a[1] - b[1])[0];
      // Con TODO en verde no hay agujero que atacar: ahí manda la rotación, no
      // la métrica. Si no, el que ya domina todo queda rebotando entre los dos
      // mismos temas para siempre, que es la forma más rápida de aburrirlo.
      if (peor[1] < 1) {
        const tema = TEMA_POR_METRICA[peor[0]];
        if (tema) return tema;
      } else {
        return rotar(n, temaPrevio);
      }
    }
  }

  // Sin métricas útiles: lo que marcó difícil, y si tampoco hay, el orden natural
  // de la llamada (descubrimiento antes que precio).
  for (const area of config.areas || []) {
    const tema = TEMA_POR_AREA[area];
    if (tema && tema !== temaPrevio) return tema;
  }
  return rotar(n, temaPrevio);
}

function rotar(n, temaPrevio) {
  const desde = ROTACION.indexOf(temaPrevio);
  // Se indexa por bloque, pero nunca se devuelve el tema anterior.
  const i = desde >= 0 ? desde + 1 : Math.max(0, (n || 1) - 1);
  const tema = ROTACION[i % ROTACION.length];
  return tema === temaPrevio ? ROTACION[(i + 1) % ROTACION.length] : tema;
}

// ── Mezcla de días ──────────────────────────────────────────
//
// Acá vive la otra mitad de "dificultad creciente", la que no está en los
// umbrales: a medida que sube el nivel hay menos teoría y más llamadas. Lo que
// en v1 eran tres tablas RITMO fijas ahora es una proporción que se interpola,
// así que no hay un nivel máximo que la tabla no cubra.

const MEZCLA_POR_NIVEL = [
  { teoria: 0.30, practica: 0.32, llamada: 0.25, repaso: 0.08, revision: 0.05 },
  { teoria: 0.20, practica: 0.30, llamada: 0.30, repaso: 0.13, revision: 0.07 },
  { teoria: 0.10, practica: 0.27, llamada: 0.43, repaso: 0.13, revision: 0.07 },
  { teoria: 0.05, practica: 0.22, llamada: 0.53, repaso: 0.13, revision: 0.07 },
  { teoria: 0.00, practica: 0.20, llamada: 0.60, repaso: 0.13, revision: 0.07 },
];

const TIPOS = ['teoria', 'practica', 'llamada', 'repaso', 'revision'];

export function mezclaDeNivel(nivel, { tema, urgencia, nivelUsuario } = {}) {
  const base = { ...MEZCLA_POR_NIVEL[Math.min(Math.max(1, nivel), MEZCLA_POR_NIVEL.length) - 1] };

  // El sesgo del tema: un bloque de corrección tiene más revisión, uno de precio
  // más llamadas. Multiplica y después se renormaliza, así nunca suma ≠ 1.
  const sesgo = TEMAS[tema]?.sesgo || {};
  for (const t of TIPOS) if (sesgo[t]) base[t] *= sesgo[t];

  // Quien ya cierra hace menos teoría desde el arranque: pelearse con lo básico
  // lo aburre y abandona.
  if (nivelUsuario === 'experimentado') { base.teoria *= 0.4; base.llamada *= 1.3; }
  if (nivelUsuario === 'nuevo') { base.teoria *= 1.3; base.llamada *= 0.85; }
  // Con llamadas reales encima, más simulación aunque falte teoría por ver.
  if (urgencia === 'estaSemana') { base.llamada *= 1.5; base.teoria *= 0.6; }

  const total = TIPOS.reduce((a, t) => a + base[t], 0) || 1;
  return Object.fromEntries(TIPOS.map(t => [t, base[t] / total]));
}

// Reparto por resto mayor: convierte proporciones en cantidades enteras que
// suman exactamente `dias`. Garantiza al menos una revisión y una llamada.
function repartirDias(mezcla, dias) {
  const crudo = TIPOS.map(t => ({ tipo: t, exacto: mezcla[t] * dias }));
  const conteo = Object.fromEntries(crudo.map(c => [c.tipo, Math.floor(c.exacto)]));
  let faltan = dias - Object.values(conteo).reduce((a, b) => a + b, 0);
  const porResto = [...crudo].sort((a, b) => (b.exacto % 1) - (a.exacto % 1) || TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo));
  for (let i = 0; faltan > 0; i++, faltan--) conteo[porResto[i % porResto.length].tipo]++;

  // Pisos: un bloque sin llamada no entrena vender, y sin revisión no cierra.
  for (const [tipo, min] of [['llamada', 1], ['revision', 1]]) {
    if (conteo[tipo] >= min || dias < 3) continue;
    const donante = TIPOS.filter(t => t !== tipo).sort((a, b) => conteo[b] - conteo[a])[0];
    if (conteo[donante] > 1) { conteo[donante]--; conteo[tipo]++; }
  }
  return conteo;
}

// Distribuye los tipos a lo largo del bloque en vez de agruparlos: cuatro días
// de teoría seguidos y después cuatro de llamada es peor práctica y peor UX que
// alternar. Determinista (Bresenham por tipo, colisiones al siguiente libre) y
// con la revisión siempre al final, que es donde tiene sentido mirar el bloque.
function ordenarDias(conteo, dias) {
  const slots = new Array(dias).fill(null);
  const revisiones = conteo.revision || 0;
  if (revisiones > 0) slots[dias - 1] = 'revision';

  const pendientes = [];
  for (const tipo of TIPOS) {
    const n = tipo === 'revision' ? revisiones - 1 : conteo[tipo];
    for (let i = 0; i < n; i++) pendientes.push({ tipo, pos: Math.round(((i + 0.5) * dias) / n) });
  }
  // Orden de colocación estable: primero los tipos más escasos, que son los que
  // peor toleran que les muevan la posición.
  pendientes.sort((a, b) => a.pos - b.pos || conteo[a.tipo] - conteo[b.tipo] || TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo));

  for (const p of pendientes) {
    let i = Math.min(Math.max(0, p.pos), dias - 1);
    let paso = 0;
    while (slots[i] !== null && paso < dias) { i = (i + 1) % dias; paso++; }
    if (slots[i] === null) slots[i] = p.tipo;
  }
  return slots.map(s => s || 'practica');
}

// ── Bloques de cada día ─────────────────────────────────────
//
// `peso` reparte los minutos de la sesión; `minMinutos` significa "este bloque
// solo aparece si la sesión es de al menos tanto" — así 40 minutos dan más
// bloques que 10, en vez de dar los mismos bloques estirados.

const PLANTILLA_DIA = {
  teoria: [
    { tipo: 'lectura', peso: 0.35 },
    { tipo: 'flashcards', peso: 0.65, mazo: 'principios' },
  ],
  practica: [
    { tipo: 'flashcards', peso: 0.55, mazo: 'FOCO' },
    { tipo: 'lectura', peso: 0.2, minMinutos: 18 },
    { tipo: 'flashcards', peso: 0.25, mazo: null, minMinutos: 30 },
  ],
  repaso: [
    { tipo: 'flashcards', peso: 1, mazo: null },
  ],
  llamada: [
    { tipo: 'roleplay', peso: 0.8 },
    { tipo: 'flashcards', peso: 0.2, mazo: null, minMinutos: 28 },
  ],
  revision: [
    { tipo: 'revision', peso: 0.35 },
    { tipo: 'flashcards', peso: 0.65, mazo: null },
  ],
};

export const ETIQUETA_DIA = {
  teoria: 'Teoría',
  practica: 'Práctica dirigida',
  repaso: 'Repaso',
  llamada: 'Llamada simulada',
  revision: 'Revisión',
};

// ── Voz vs texto ────────────────────────────────────────────
//
// La llamada por voz (Práctica individual con micrófono) es más difícil que la
// escrita: no podés editar antes de mandar, el silencio pesa de verdad y tenés
// que sostener el ritmo. Por eso su proporción sube con el nivel en vez de ser
// una opción que el usuario elige — elegir siempre lo cómodo es lo que el plan
// vino a evitar.
//
// Además es la única forma de que la señal de silencios se pueda medir: en texto
// es auto-reportada y no computa para subir de nivel (ver dificultad.js).
// Techo en 0.8 a propósito: un bloque 100% voz deja sin salida a quien ese día
// no puede hablar en voz alta (oficina, transporte, micrófono roto). Siempre
// queda alguna llamada escrita. Si aun así saltea las de voz, no llega al piso
// de llamadas del bloque y le toca prórroga — que es la señal correcta, y a la
// tercera se abre la válvula.
const PROPORCION_VOZ = [0.25, 0.4, 0.6, 0.75, 0.8];

export function proporcionVoz(nivel) {
  return PROPORCION_VOZ[Math.min(Math.max(1, nivel), PROPORCION_VOZ.length) - 1];
}

// Reparte voz/texto entre los días de llamada del bloque de forma determinista y
// pareja (nada de "las tres primeras por voz y el resto escritas").
function indicesDeVoz(totalLlamadas, nivel) {
  const p = proporcionVoz(nivel);
  const set = new Set();
  for (let i = 0; i < totalLlamadas; i++) {
    if (Math.floor((i + 1) * p) > Math.floor(i * p)) set.add(i);
  }
  // Piso de una por bloque: con pocas llamadas la proporción del nivel 1 da
  // cero y nadie tocaría el micrófono en su primer mes. Va la última del
  // bloque — para entonces ya tiene algo de método encima.
  if (!set.size && totalLlamadas > 0) set.add(totalLlamadas - 1);
  return set;
}

function esLlamadaDeVoz(indiceLlamada, nivel, totalLlamadas) {
  return indicesDeVoz(totalLlamadas, nivel).has(indiceLlamada);
}

// Del nivel 4 en adelante la práctica va con los mazos mezclados. El
// interleaving es más difícil que el estudio por bloques —y por eso retiene
// mejor—: no sabés de qué mazo viene la próxima carta, igual que en una llamada.
function plantillaDia(tipoDia, nivel) {
  const specs = PLANTILLA_DIA[tipoDia];
  if (nivel < 4 || tipoDia !== 'practica') return specs;
  return specs.map(s => (s.mazo === 'FOCO' ? { ...s, mazo: null } : s));
}

function repartirMinutos(specs, presupuesto) {
  const aplican = specs.filter(s => !s.minMinutos || presupuesto >= s.minMinutos);
  const totalPeso = aplican.reduce((acc, s) => acc + s.peso, 0) || 1;
  let restante = presupuesto;
  return aplican.map((s, i) => {
    const esUltimo = i === aplican.length - 1;
    const min = esUltimo ? Math.max(1, restante) : Math.max(1, Math.round(presupuesto * (s.peso / totalPeso)));
    restante -= min;
    return { ...s, minutos: min };
  });
}

// Cuántas cartas entran en N minutos. Las Feynman se responden escribiendo y
// esperando al evaluador, así que rinden bastante menos por minuto.
function limiteCartas(minutos, mazo) {
  const porMinuto = mazo === 'principios' ? 0.8 : 2;
  return Math.max(3, Math.round(minutos * porMinuto));
}

const nombreMazo = (id) => ({
  'objeciones': 'Objeciones',
  'preguntas-por-fase': 'Preguntas por fase',
  'principios': 'Principios',
  'deteccion-perfiles': 'Detección de perfiles',
}[id] || 'Mixto');

// A qué franja pertenece cada tipo de bloque. Los bloques se siguen generando
// igual que antes —eso preserva toda la variedad que el mesociclo compone por
// nivel— y después se agrupan. La franja aporta lo que faltaba: carga cerrada y
// corte propio.
const FRANJA_DE_BLOQUE = {
  flashcards: 'consolidacion',
  lectura: 'consolidacion',
  roleplay: 'aplicacion',
  'roleplay-voz': 'aplicacion',
  revision: 'cierre',
  cierre: 'cierre',
};

// Jornada de varias franjas. Cada una arma sus propios bloques con sus propios
// minutos, y todas las franjas que el reparto habilitó aparecen sí o sí — la
// llamada simulada incluida, todos los días.
function construirDiaLargo({ tipoDia, diaIdx, n, nivel, mazoFoco, exigencia, indiceLlamada, totalLlamadas, franjas }) {
  const pref = `m${n}d${diaIdx + 1}`;
  const bloques = [];
  const sesiones = [];

  for (const f of franjas) {
    const bloqueIds = [];
    const push = (b) => { bloques.push(b); bloqueIds.push(b.id); };

    if (f.franja === 'adquisicion') {
      push({ id: `${pref}badq`, tipo: 'adquisicion', minutos: f.minutos, maxUnidades: f.carga.objetivo, unidades: null, titulo: 'Material nuevo' });
    }

    if (f.franja === 'consolidacion') {
      // Dos bloques cuando hay lugar: uno del mazo del tema y otro mixto. El
      // mixto es el que sostiene el interleaving — repasar siempre el mazo del
      // foco arma silos y el interleaving deja de existir.
      const parteFoco = f.minutos >= 30 ? Math.round(f.minutos * 0.6) : f.minutos;
      push({ id: `${pref}bc1`, tipo: 'flashcards', minutos: parteFoco, mazo: mazoFoco || null,
             limite: limiteCartas(parteFoco, mazoFoco), titulo: `Repaso: ${nombreMazo(mazoFoco)}` });
      if (f.minutos - parteFoco >= 10) {
        const resto = f.minutos - parteFoco;
        push({ id: `${pref}bc2`, tipo: 'flashcards', minutos: resto, mazo: null,
               limite: limiteCartas(resto, null), titulo: 'Repaso: Mixto' });
      }
    }

    if (f.franja === 'aplicacion') {
      const cuantas = f.carga.objetivo;
      const porLlamada = Math.floor(f.minutos / cuantas);
      for (let i = 0; i < cuantas; i++) {
        const voz = esLlamadaDeVoz(indiceLlamada + i, nivel, Math.max(totalLlamadas, cuantas));
        push(voz
          ? { id: `${pref}bl${i + 1}`, tipo: 'roleplay-voz', canal: 'voz', minutos: porLlamada, titulo: 'Llamada por voz' }
          : { id: `${pref}bl${i + 1}`, tipo: 'roleplay', canal: 'texto', minutos: porLlamada, dificultadMax: exigencia.dificultadProspecto, titulo: 'Llamada simulada' });
      }
    }

    if (f.franja === 'cierre') {
      // La lectura del principio va acá y no en consolidación: es re-exposición
      // pasiva, que es lo único permitido sobre material fresco. Es la pieza que
      // hace convivir la revisión ligera antes de dormir con el intervalo de
      // consolidación.
      const minRevision = Math.max(3, Math.round(f.minutos * 0.5));
      push({ id: `${pref}bv`, tipo: 'lectura', minutos: minRevision, principioId: null, titulo: 'Releer lo de hoy' });
      push({ id: `${pref}bc`, tipo: 'cierre', minutos: Math.max(1, f.minutos - minRevision), titulo: 'Cerrar el día' });
    }

    sesiones.push({
      id: `${pref}s${f.franja}`,
      franja: f.franja,
      etiqueta: f.etiqueta,
      resumen: f.resumen,
      material: f.material,
      minutos: f.minutos,
      carga: f.carga,
      bloqueIds,
    });
  }

  return { n: diaIdx + 1, tipo: tipoDia, etiqueta: ETIQUETA_DIA[tipoDia], bloques, sesiones };
}

function construirDia({ tipoDia, diaIdx, n, nivel, mazoFoco, config, exigencia, indiceLlamada = 0, totalLlamadas = 1, fecha = null, hayMaterialFresco = true }) {
  // `minutosPorSesion` pasó a significar minutos por DÍA. Se conserva el nombre
  // de la clave porque está guardada en la config de todos los planes vivos y
  // renombrarla obligaría a migrar; el significado está documentado en checkin.js.
  const presupuesto = config.minutosPorSesion || 20;

  // La franja de adquisición se lleva sus minutos aparte: es la única con
  // material fresco y su recorrido no se parece a ningún bloque existente.
  const franjas = repartirDia(presupuesto, {
    fecha: fecha || new Date(),
    diaIntegracion: config.diaIntegracion,
    hayMaterialFresco,
  });
  const franjaAdq = franjas.find(f => f.franja === 'adquisicion') || null;

  // La jornada por franjas se activa SOLO cuando hay adquisición, o sea a partir
  // de 75 minutos diarios. Por debajo se conserva el camino viejo entero.
  //
  // El corte no es arbitrario. Con el modelo viejo la variedad se lograba
  // ALTERNANDO días —uno de teoría, otro de llamada— y eso funciona cuando el
  // día es una sesión corta. Si mandara los días de 40 minutos al camino nuevo,
  // se quedarían con consolidación y cierre fijos: **nunca más una llamada**,
  // porque la franja de aplicación necesita 45 minutos para aparecer. En una
  // jornada larga, en cambio, la variedad tiene que estar DENTRO del día, y ahí
  // `tipoDia` pasa a sesgar el énfasis en vez de decidir qué franjas existen.
  if (franjaAdq) {
    return construirDiaLargo({ tipoDia, diaIdx, n, nivel, mazoFoco, exigencia, indiceLlamada, totalLlamadas, franjas });
  }

  const specs = repartirMinutos(plantillaDia(tipoDia, nivel), presupuesto);

  const bloques = specs.map((s, i) => {
    // Prefijo `m` contra los `s1d1b1` del plan v1: cero colisión en `hechos`,
    // que es lo que permite que un plan viejo siga corriendo sin migración.
    const id = `m${n}d${diaIdx + 1}b${i + 1}`;
    const mazo = s.mazo === 'FOCO' ? (mazoFoco || null) : (s.mazo ?? null);
    const base = { id, tipo: s.tipo, minutos: s.minutos };

    if (s.tipo === 'flashcards') {
      return { ...base, mazo, limite: limiteCartas(s.minutos, mazo), titulo: `Repaso: ${nombreMazo(mazo)}` };
    }
    if (s.tipo === 'roleplay') {
      // La dificultad del prospecto ya no depende de en qué semana estás sino
      // del nivel del bloque, que es lo que se ganó con rendimiento.
      if (esLlamadaDeVoz(indiceLlamada, nivel, totalLlamadas)) {
        return { ...base, tipo: 'roleplay-voz', canal: 'voz', titulo: 'Llamada por voz' };
      }
      return { ...base, canal: 'texto', dificultadMax: exigencia.dificultadProspecto, titulo: 'Llamada simulada' };
    }
    if (s.tipo === 'lectura') {
      // El principio concreto se elige en runtime: si venís fallando siempre el
      // mismo, este bloque se convierte en el repaso de ese.
      return { ...base, principioId: null, titulo: 'Leer un principio' };
    }
    return { ...base, titulo: 'Revisar tus patrones' };
  });

  bloques.push({ id: `m${n}d${diaIdx + 1}bc`, tipo: 'cierre', minutos: 1, titulo: 'Cerrar el día' });

  // Agrupación en franjas. `bloques` sigue existiendo plano para que todo lo que
  // ya lo consume —PlanHoy, el marcado de hechos, el progreso— siga funcionando
  // sin cambios; `sesiones` es la capa nueva que agrega carga y corte.
  //
  // Acá no puede haber adquisición: si la hubiera, `construirDia` ya habría
  // derivado a la jornada larga.
  const sesiones = [];
  for (const b of bloques) {
    const franjaId = b.tipo === 'adquisicion' ? 'adquisicion' : (FRANJA_DE_BLOQUE[b.tipo] || 'consolidacion');
    let s = sesiones.find(x => x.franja === franjaId);
    if (!s) {
      const def = franjas.find(f => f.franja === franjaId);
      s = {
        id: `m${n}d${diaIdx + 1}s${franjaId}`,
        franja: franjaId,
        etiqueta: def?.etiqueta || franjaId,
        resumen: def?.resumen || '',
        material: def?.material || 'disponible',
        minutos: 0,
        bloqueIds: [],
        carga: null,
      };
      sesiones.push(s);
    }
    s.minutos += b.minutos;
    s.bloqueIds.push(b.id);
  }
  // La carga se calcula sobre los minutos que la franja realmente recibió, no
  // sobre los que el reparto teórico le había asignado: los bloques ya estaban
  // armados y mandan ellos.
  for (const s of sesiones) s.carga = cargaDeFranja(s.franja, s.minutos);
  sesiones.sort((a, b) => (FRANJAS.findIndex(f => f.id === a.franja)) - (FRANJAS.findIndex(f => f.id === b.franja)));

  return { n: diaIdx + 1, tipo: tipoDia, etiqueta: ETIQUETA_DIA[tipoDia], bloques, sesiones };
}

// ── Generación ──────────────────────────────────────────────

// Largo del bloque medido en SESIONES, no en semanas. Es lo que permite que el
// check-in semanal cambie días/horas sin mover el criterio de cierre: cambia
// cuánto calendario ocupa el bloque, no cuánto entrenamiento tiene adentro.
export function sesionesObjetivoDe(config) {
  return Math.max(9, (config.diasPorSemana || 3) * 3);
}

// Cuántas llamadas simuladas hay que tener hechas para que el bloque pueda
// cerrarse. Sale de los días de llamada que el bloque realmente agenda —no de su
// largo total—, porque en los niveles bajos hay más teoría que llamadas y un
// piso fijo dejaría la condición fuera de alcance. Se tolera perder una de cada
// cuatro: un roleplay abandonado a mitad no deja métricas.
// Numera los días de llamada dentro del bloque: es lo que decide cuáles van por
// voz y cuáles por escrito, sin depender de la posición en el calendario.
function conIndiceDeLlamada(orden) {
  const totalLlamadas = orden.filter(t => t === 'llamada').length;
  let i = 0;
  return orden.map(tipoDia => ({ tipoDia, totalLlamadas, indiceLlamada: tipoDia === 'llamada' ? i++ : 0 }));
}

function roleplaysMinDe(orden) {
  const llamadas = orden.filter(t => t === 'llamada').length;
  return Math.max(1, Math.ceil(llamadas * 0.75));
}

export function generarMesociclo({ n = 1, nivel = 1, config = {}, analisis = null, temaPrevio = null, mazoPrevio = null, ahora = Date.now() }) {
  const tema = elegirTema({ nivel, analisis, config, temaPrevio, n });
  const def = TEMAS[tema];
  const exigencia = exigenciaDeNivel(nivel);
  const mazoFoco = def.mazoFoco || mazoPrevio || 'principios';
  const sesiones = sesionesObjetivoDe(config);

  const mezcla = mezclaDeNivel(nivel, { tema, urgencia: config.urgencia, nivelUsuario: config.nivel });
  const orden = ordenarDias(repartirDias(mezcla, sesiones), sesiones);

  const mesociclo = {
    n, nivel, tema,
    roleplaysMin: roleplaysMinDe(orden),
    titulo: def.titulo,
    objetivo: def.objetivo,
    foco: { tema, mazoFoco, areas: def.areas, eje: analisis ? ejeDelAnalisis(analisis) : null },
    exigencia,
    sesionesObjetivo: sesiones,
    prorroga: 0,
    generadoAt: ahora,
    mideDesde: ahora,
    // Con qué se decidió este bloque. Sirve para explicarle al usuario por qué le
    // tocó, y para poder auditar una decisión vieja meses después.
    snapshot: analisis ? {
      ip: analisis.ip,
      ejecucion: analisis.ejes.ejecucion.score,
      retencion: analisis.ejes.retencion.porcentaje,
      reincidencia: analisis.ejes.errores.reincidencia,
    } : null,
    dias: conIndiceDeLlamada(orden).map(({ tipoDia, indiceLlamada, totalLlamadas }, diaIdx) =>
      construirDia({ tipoDia, diaIdx, n, nivel, mazoFoco, config, exigencia, indiceLlamada, totalLlamadas })),
  };

  // Con oferta propia el simulador no tiene contra qué actuar: cargarla es el
  // paso cero del primer bloque, antes que cualquier repaso.
  if (n === 1 && config.oferta === 'propia') {
    mesociclo.dias[0].bloques.unshift({
      id: 'm1d1b0',
      tipo: 'kb',
      minutos: 5,
      titulo: 'Cargá tu oferta',
      detalle: 'El simulador actúa contra lo que haya en tu base de conocimiento. Sin tu oferta, practicás vendiendo la de ejemplo.',
    });
  }

  return mesociclo;
}

function ejeDelAnalisis(analisis) {
  const ejes = analisis?.ejes || {};
  const candidatos = Object.entries(ejes).filter(([, e]) => e?.aplica);
  if (!candidatos.length) return null;
  return candidatos.sort((a, b) => a[1].score - b[1].score)[0][0];
}

// ── Recálculo del tramo pendiente (check-in semanal) ────────
//
// Rearma SOLO los días que faltan. Los ya cumplidos no se tocan: el plan es
// secuencial y lo cumplido es historia, no algo a renegociar cada semana.
//
// La secuencia de tipos de día se conserva; lo que cambia es el contenido de los
// bloques según los minutos nuevos. Cambiar días/semana no altera el largo del
// bloque —se mide en sesiones— así que el criterio de cierre queda igual: lo que
// cambia es cuánto calendario ocupa.
export function regenerarDiasPendientes(mesociclo, { desdeDiaN, config }) {
  const dias = mesociclo.dias || [];
  const conIndice = conIndiceDeLlamada(dias.map(d => d.tipo));

  return {
    ...mesociclo,
    dias: dias.map((dia, i) => {
      if (dia.n < desdeDiaN) return dia; // ya cumplido o en curso: intocable
      const { indiceLlamada, totalLlamadas } = conIndice[i];
      const nuevo = construirDia({
        tipoDia: dia.tipo, diaIdx: i, n: mesociclo.n, nivel: mesociclo.nivel,
        mazoFoco: mesociclo.foco?.mazoFoco, config, exigencia: mesociclo.exigencia,
        indiceLlamada, totalLlamadas,
      });
      // Si estamos dentro de una prórroga, los ids llevan su sufijo. Sin esto,
      // un check-in a mitad de prórroga regeneraría ids iguales a los del tramo
      // original y los días futuros aparecerían ya tachados.
      if (!mesociclo.prorroga) return nuevo;
      return { ...nuevo, bloques: nuevo.bloques.map(b => ({ ...b, id: `${b.id}p${mesociclo.prorroga}` })) };
    }),
  };
}

// ── Prórroga ────────────────────────────────────────────────
//
// Cuando un bloque no cierra no se repite igual: se extiende, más corto y
// sesgado al eje que falló. El usuario ve "el bloque se extiende porque X",
// nunca "reprobaste" — es la diferencia entre una serie más y volver a empezar.

const SESGO_PRORROGA = {
  ejecucion: { llamada: 2, teoria: 0.3 },
  retencion: { repaso: 2.5, practica: 1.3, llamada: 0.6 },
  errores: { revision: 3, teoria: 1.8, llamada: 0.8 },
};

export function prorrogarMesociclo(mesociclo, { analisis, config = {}, ejeDebil = 'ejecucion', ahora = Date.now() }) {
  const dias = Math.max(3, Math.ceil((mesociclo.sesionesObjetivo || 12) / 2));
  const nivel = mesociclo.nivel;

  const mezcla = mezclaDeNivel(nivel, { tema: mesociclo.tema, urgencia: config.urgencia, nivelUsuario: config.nivel });
  const sesgo = SESGO_PRORROGA[ejeDebil] || {};
  for (const t of TIPOS) if (sesgo[t]) mezcla[t] *= sesgo[t];
  const total = TIPOS.reduce((a, t) => a + mezcla[t], 0) || 1;
  for (const t of TIPOS) mezcla[t] /= total;

  const prorroga = (mesociclo.prorroga || 0) + 1;
  const orden = ordenarDias(repartirDias(mezcla, dias), dias);

  return {
    ...mesociclo,
    prorroga,
    ejeDebil,
    sesionesObjetivo: dias,
    roleplaysMin: roleplaysMinDe(orden),
    generadoAt: ahora,
    // La ventana de medición NO se reinicia: ver dificultad.js.
    mideDesde: mesociclo.mideDesde || mesociclo.generadoAt,
    snapshot: analisis ? { ip: analisis.ip, ejeDebil } : mesociclo.snapshot,
    // Ids con sufijo de prórroga para no pisar los `hechos` del tramo anterior:
    // los días ya cumplidos del bloque original siguen tachados.
    dias: conIndiceDeLlamada(orden).map(({ tipoDia, indiceLlamada, totalLlamadas }, diaIdx) => {
      const dia = construirDia({
        tipoDia, diaIdx, n: mesociclo.n, nivel, indiceLlamada, totalLlamadas,
        mazoFoco: mesociclo.foco?.mazoFoco, config, exigencia: mesociclo.exigencia,
      });
      return { ...dia, bloques: dia.bloques.map(b => ({ ...b, id: `${b.id}p${prorroga}` })) };
    }),
  };
}

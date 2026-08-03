// Orquestador del plan de entrenamiento (Módulo 6).
//
// El plan sigue siendo DETERMINISTA: no hay llamada a IA acá. Un plan que cambia
// cada vez que lo mirás no es un plan, y no queríamos otro endpoint peleando con
// el timeout de 10s de Netlify.
//
// Lo que sí se decide en runtime es el CONTENIDO de cada bloque (qué cartas, qué
// principio, qué perfil de prospecto), porque eso depende de lo que FSRS diga
// que vence hoy y de los patrones de error acumulados. La estructura se congela
// al generar; el relleno se calcula cada vez que abrís "Hoy".
//
// El plan es secuencial, no calendario: si faltás tres días retomás donde
// quedaste. No acumula deuda. La racha ya se ocupa de premiar la constancia.
//
// ── v2: periodización abierta ───────────────────────────────
// El plan ya no tiene techo de 4 semanas. Existe UN mesociclo por vez, que se
// cierra por rendimiento (ver dificultad.js) y se reemplaza por el siguiente,
// más difícil. Este archivo decide CUÁNDO pasa eso; mesociclo.js decide CÓMO es
// el bloque nuevo.
//
// Los planes v1 (los 4-semanas ya generados) siguen corriendo sin migración: sus
// ids de bloque son `s1d1b1` y los de v2 son `m1d1b1`, así que nunca chocan en
// `planEstado.hechos`. Cuando un plan v1 termina, se ofrece continuar con
// bloques y se genera el mesociclo 2 conservando el progreso.

import { dueCards } from '../srs/fsrs';
import { agruparErrores, UMBRAL_PATRON } from '../audit/patterns';
import { evaluarCierre, exigenciaDeNivel, rangoDeNivel, ejeMasDebil } from './dificultad';
import { generarMesociclo, prorrogarMesociclo, sesionesObjetivoDe } from './mesociclo';
import { siguientesUnidades, unidadPorId } from './curriculum';
import { estadosDeTodas, cartasBloqueadas, unidadesEnPausa } from './consolidacion';
import { preguntaDeHoy } from '../identidad/dossier';

export const PLAN_VERSION = 2;

const nombreMazo = (id) => ({
  'objeciones': 'Objeciones',
  'preguntas-por-fase': 'Preguntas por fase',
  'principios': 'Principios',
  'deteccion-perfiles': 'Detección de perfiles',
}[id] || 'Mixto');

// ── Generación ──────────────────────────────────────────────

// La config es lo que sobrevive de bloque a bloque: el perfil del onboarding
// puede quedar viejo, pero los días/minutos los actualiza el check-in semanal.
export function configDesdePerfil(perfil = {}) {
  return {
    diasPorSemana: perfil.diasPorSemana || 3,
    minutosPorSesion: perfil.minutosPorSesion || 20,
    nivel: perfil.nivel || 'nuevo',
    areas: perfil.areas || [],
    oferta: perfil.oferta || 'metodo',
    urgencia: perfil.urgencia || 'esteMes',
  };
}

export function generarPlan(perfil, { ahora = Date.now() } = {}) {
  const config = configDesdePerfil(perfil);
  return {
    version: PLAN_VERSION,
    creadoAt: ahora,
    config,
    perfilSnapshot: perfil,
    mesociclo: generarMesociclo({ n: 1, nivel: 1, config, ahora }),
  };
}

export function estadoInicial({ ahora = Date.now() } = {}) {
  return { mesociclo: 1, dia: 1, hechos: {}, ultimoCierre: null, ultimoCheckin: null, arrancadoAt: ahora };
}

// ── Lectura: v1 y v2 bajo la misma forma ────────────────────

export function esV1(plan) {
  return !!plan && (plan.version || 1) < 2 && Array.isArray(plan.semanas);
}

// Normaliza el contenedor de días —"semana" en v1, "mesociclo" en v2— para que
// el resto del módulo no tenga que preguntar de qué versión es el plan.
export function bloqueActual(plan, estado) {
  if (!plan) return null;
  if (esV1(plan)) {
    const s = plan.semanas[(estado?.semana || 1) - 1];
    if (!s) return null;
    return {
      v1: true, n: s.n, nivel: s.n, titulo: s.titulo, objetivo: s.objetivo,
      dias: s.dias, sesionesObjetivo: s.dias.length, prorroga: 0,
      rango: rangoDeNivel(s.n), exigencia: exigenciaDeNivel(s.n),
      total: plan.semanas.length,
    };
  }
  const m = plan.mesociclo;
  if (!m) return null;
  return { v1: false, ...m, rango: rangoDeNivel(m.nivel), total: null };
}

export function diaActual(plan, estado) {
  const bloque = bloqueActual(plan, estado);
  const dia = bloque?.dias?.[(estado?.dia || 1) - 1];
  if (!bloque || !dia) return null;
  // `semana` es alias de compatibilidad: los planes v1 y el código que todavía
  // los lee siguen hablando de semanas.
  return { bloque, semana: bloque, dia };
}

// En v2 el plan no termina nunca: lo que termina es el bloque, y al cerrarlo
// nace el siguiente. Solo un plan v1 puede quedar sin días por delante.
export function planTerminado(plan, estado) {
  return esV1(plan) && !diaActual(plan, estado);
}

export function bloqueTerminado(plan, estado) {
  const bloque = bloqueActual(plan, estado);
  return !!bloque && (estado?.dia || 1) > bloque.dias.length;
}

export function diaEstaCompleto(dia, estado) {
  // Los bloques efímeros (el check de identidad) no traban el día: son del día,
  // no del plan, y su estado vive en identidad/check/{fecha}.
  return dia.bloques.every(b => b.efimero || estado?.hechos?.[b.id]);
}

// Avanza al día siguiente. `ultimoCierre` guarda la fecha para que no se puedan
// hacer cuatro días de plan en una tarde — el espaciado es la mitad del método.
export function siguienteDia(plan, estado, hoyKey) {
  if (esV1(plan)) {
    const dia = (estado.dia || 1) + 1;
    const pos = dia > plan.diasPorSemana
      ? { semana: (estado.semana || 1) + 1, dia: 1 }
      : { semana: estado.semana || 1, dia };
    return { ...estado, ...pos, ultimoCierre: hoyKey };
  }
  return { ...estado, dia: (estado.dia || 1) + 1, ultimoCierre: hoyKey };
}

export function progreso(plan, estado) {
  const bloque = bloqueActual(plan, estado);
  if (!bloque) return { diasHechos: 0, total: 0, pct: 0, nivel: 1, rango: rangoDeNivel(1) };

  const idsDelBloque = new Set(bloque.dias.flatMap(d => d.bloques.filter(b => !b.efimero).map(b => b.id)));
  const hechos = Object.keys(estado?.hechos || {}).filter(id => idsDelBloque.has(id)).length;
  const diaIdx = Math.min((estado?.dia || 1) - 1, bloque.dias.length);

  return {
    // El progreso es DEL BLOQUE, no del plan: en v2 no hay un total contra el
    // cual medir "cuánto falta para terminar", porque no hay final.
    diasHechos: diaIdx,
    total: bloque.dias.length,
    bloquesHechos: hechos,
    totalBloques: idsDelBloque.size,
    pct: idsDelBloque.size ? Math.round((hechos / idsDelBloque.size) * 100) : 0,
    nivel: bloque.nivel,
    rango: bloque.rango,
    prorroga: bloque.prorroga || 0,
  };
}

// ── Fin de bloque: cerrar o prorrogar ───────────────────────
//
// Función pura: decide y devuelve los nodos nuevos, sin escribir nada. Las
// escrituras son de store.js. Así se puede simular un cierre con datos de
// prueba sin tocar Firebase.

export function evaluarFinDeBloque({ plan, estado, ctx = {}, ahora = Date.now() }) {
  const mesociclo = plan?.mesociclo;
  if (!mesociclo) return null;

  const cierre = evaluarCierre({
    mesociclo, estado,
    sesiones: ctx.sesiones || [],
    cards: ctx.cards || [],
    srsMap: ctx.srsMap || {},
    errores: ctx.errores || [],
    diasCompletos: (estado?.dia || 1) > mesociclo.dias.length,
  });

  const config = plan.config || configDesdePerfil(plan.perfilSnapshot);
  const analisis = cierre.analisis;

  if (!cierre.cierra) {
    // No alcanzó: se extiende, más corto y sesgado al eje que falló. Nunca se
    // repite el bloque idéntico — es una serie más, no volver a empezar.
    const ejeDebil = cierre.ejeDebil || ejeMasDebil(analisis.ejes);
    return {
      accion: 'prorrogar',
      cierre,
      ejeDebil,
      planNuevo: { ...plan, mesociclo: prorrogarMesociclo(mesociclo, { analisis, config, ejeDebil, ahora }) },
      // `hechos` no se toca: los ids de la prórroga llevan sufijo propio, así
      // que lo ya cumplido del tramo anterior sigue tachado en el historial.
      estadoNuevo: { ...estado, dia: 1 },
      historial: null,
    };
  }

  const nivelNuevo = mesociclo.nivel + 1;
  const siguiente = generarMesociclo({
    n: mesociclo.n + 1,
    nivel: nivelNuevo,
    config,
    analisis,
    temaPrevio: mesociclo.tema,
    mazoPrevio: mesociclo.foco?.mazoFoco,
    ahora,
  });

  return {
    accion: 'subir',
    cierre,
    nivelAnterior: mesociclo.nivel,
    nivelNuevo,
    rangoNuevo: rangoDeNivel(nivelNuevo),
    planNuevo: { ...plan, mesociclo: siguiente },
    estadoNuevo: { ...estado, mesociclo: siguiente.n, dia: 1 },
    // Resumen, sin los bloques: es lo que alimenta la evolución en Patrones y lo
    // que evita que el nodo del plan crezca sin límite.
    historial: {
      n: mesociclo.n,
      nivel: mesociclo.nivel,
      tema: mesociclo.tema,
      titulo: mesociclo.titulo,
      cerradoAt: ahora,
      arrancadoAt: mesociclo.mideDesde || mesociclo.generadoAt,
      sesiones: analisis.sesionesTotales,
      ip: analisis.ip,
      ejecucion: analisis.ejes.ejecucion.score,
      retencion: analisis.ejes.retencion.porcentaje,
      reincidencia: analisis.ejes.errores.reincidencia,
      motivoCierre: cierre.motivo,
      prorrogas: mesociclo.prorroga || 0,
    },
  };
}

// Un plan v1 terminado se continúa como mesociclo 2 en vez de morir en la
// pantalla de "terminaste". Cuatro semanas cumplidas valen un nivel.
export function continuarDesdeV1(plan, estado, { ahora = Date.now() } = {}) {
  const perfil = plan?.perfilSnapshot || {};
  const config = configDesdePerfil({ ...perfil, diasPorSemana: plan?.diasPorSemana || perfil.diasPorSemana, minutosPorSesion: plan?.minutosPorSesion || perfil.minutosPorSesion });
  const mesociclo = generarMesociclo({ n: 2, nivel: 2, config, ahora });
  return {
    planNuevo: { version: PLAN_VERSION, creadoAt: plan?.creadoAt || ahora, config, perfilSnapshot: perfil, mesociclo },
    // Se conservan los `hechos` viejos: sus ids son `s…` y no chocan con los
    // `m…` nuevos, así que el historial del usuario queda intacto.
    estadoNuevo: { ...estado, mesociclo: 2, dia: 1, semana: null },
    historial: {
      n: 1, nivel: 1, tema: 'fundamentos', titulo: 'Plan inicial (4 semanas)',
      cerradoAt: ahora, sesiones: null, ip: null, motivoCierre: 'v1', prorrogas: 0,
    },
  };
}

// ── Hidratación: la estructura se llena con datos reales ────

// Convierte los bloques congelados del plan en bloques ejecutables, mirando qué
// cartas vencen hoy, qué principio venís fallando y qué perfiles hay cargados.
export function hidratarBloques(dia, ctx) {
  const {
    cards = [], srsMap = {}, errores = [], principios = [], perfiles = [],
    identidad = null, checkHoy = null, fecha = null,
    progresoUnidad = {}, cursoAdquisicion = null, logMap = null,
  } = ctx;

  // LA COMPUERTA. Sin esto, consolidacion.js entero no tiene efecto sobre lo que
  // el usuario practica: `dueCards` acepta `bloqueadas` desde siempre, pero nadie
  // se lo pasaba. Material introducido hace diez minutos aparecía en las
  // flashcards de la misma sesión, que es exactamente lo que la regla de ≥14 h y
  // cambio de día existe para impedir.
  const bloqueadas = cartasBloqueadas(progresoUnidad);
  const enPausa = unidadesEnPausa(progresoUnidad);

  const patrones = agruparErrores(errores);
  const patronTop = patrones.find(p => p.cantidad >= UMBRAL_PATRON) || patrones[0] || null;
  // El principio a leer: el que más fallás. Si no hay errores todavía, se rota
  // por la lista para no leer siempre el mismo.
  let lecturaIdx = 0;

  const bloques = dia.bloques.map(b => {
    if (b.tipo === 'flashcards') {
      const pool = b.mazo ? cards.filter(c => c.mazo === b.mazo) : cards;
      const disponibles = dueCards(pool, srsMap, undefined, { bloqueadas }).length;
      if (disponibles === 0 && b.mazo) {
        // Nada vencido en el mazo del día: en vez de saltear el bloque, se
        // reemplaza por una mixta. Perder el bloque sería perder el hábito.
        const mixtas = dueCards(cards, srsMap, undefined, { bloqueadas }).length;
        return {
          ...b, mazo: null, disponibles: mixtas, bloqueadas: [...bloqueadas],
          sustituido: `No hay nada vencido en ${nombreMazo(b.mazo)}`,
          vacio: mixtas === 0, enPausa,
        };
      }
      return { ...b, disponibles, bloqueadas: [...bloqueadas], vacio: disponibles === 0, enPausa };
    }

    if (b.tipo === 'lectura') {
      const delPatron = patronTop && principios.find(p => p.id === patronTop.principioId);
      const principio = delPatron || principios[(lecturaIdx++) % Math.max(1, principios.length)] || null;
      return {
        ...b,
        principioId: principio?.id || null,
        principio,
        titulo: principio ? `Leer: ${principio.nombre}` : b.titulo,
        ajustado: !!delPatron && patronTop.cantidad >= UMBRAL_PATRON
          ? `Lo violaste ${patronTop.cantidad} veces — por eso vuelve acá`
          : null,
        vacio: !principio,
      };
    }

    if (b.tipo === 'roleplay') {
      const candidatos = perfiles.filter(p => (p.dificultad || 3) <= b.dificultadMax);
      const elegibles = candidatos.length ? candidatos : perfiles;
      // Determinista dentro del día: el mismo bloque sugiere siempre el mismo
      // perfil, así "Continuar" no te cambia el prospecto entre recargas.
      const idx = hashId(b.id) % Math.max(1, elegibles.length);
      const perfil = elegibles[idx] || null;
      return { ...b, perfil, titulo: perfil ? `Llamada con ${perfil.nombre}` : b.titulo, vacio: !perfil };
    }

    if (b.tipo === 'roleplay-voz') {
      // La llamada por voz corre en Práctica individual, que arma su propio
      // escenario: acá no se elige perfil de la base de conocimiento. Nunca
      // queda vacío por falta de contenido cargado.
      return { ...b, detalle: 'Con micrófono, en Práctica individual. Se corta cuando colgás.', vacio: false };
    }

    if (b.tipo === 'revision') {
      // Los errores se guardan por principioId; acá se resuelve el nombre para
      // no mostrarle al usuario un id crudo.
      const conNombre = patrones.slice(0, 3).map(g => ({
        ...g,
        nombre: principios.find(p => p.id === g.principioId)?.nombre || g.principioId,
      }));
      return { ...b, patrones: conNombre, vacio: false };
    }

    if (b.tipo === 'adquisicion') {
      // Un lote abierto MANDA sobre el currículum. Si acá se propusiera material
      // nuevo mientras hay uno a medio recorrer, el anterior no cerraría nunca y
      // su reloj de consolidación no arrancaría — o sea, las cartas de esas
      // unidades quedarían bloqueadas para siempre.
      if (cursoAdquisicion?.unidades?.length) {
        const abiertas = cursoAdquisicion.unidades.map(id => unidadPorId(id)).filter(Boolean);
        return {
          ...b, unidades: cursoAdquisicion.unidades,
          titulo: abiertas.length === 1 ? abiertas[0].titulo : `${abiertas.length} unidades en curso`,
          retomando: true, vacio: false,
        };
      }
      const estados = estadosDeTodas(progresoUnidad);
      const proximas = siguientesUnidades(estados, b.maxUnidades || 1);
      return {
        ...b, unidades: proximas.map(u => u.id),
        titulo: proximas.length === 1 ? proximas[0].titulo : b.titulo,
        // Sin unidades introducibles no es un bloque roto: es que los
        // prerrequisitos están consolidando y se liberan solos.
        vacio: proximas.length === 0,
      };
    }

    if (b.tipo === 'cierre') {
      // El cierre del día es también el check de la noche del Módulo 0: se
      // pregunta por el foco que te pusiste a la mañana en vez de agregar un
      // sexto bloque. El día tiene que seguir siendo corto.
      return { ...b, focoDelDia: checkHoy?.foco || null, vacio: false };
    }

    return { ...b, vacio: false };
  });

  // ── Planes viejos: inyectar el bloque de material nuevo ──
  //
  // La estructura del plan se congela al generarlo, así que los planes creados
  // ANTES de que existiera el currículum no tienen bloque de adquisición. Con
  // la compuerta de consolidación encendida eso es un punto muerto: ninguna
  // unidad se introduce nunca, y por lo tanto las 159 cartas quedan en pausa
  // para siempre. La persona ve seis mazos "al día" con todo bloqueado y no hay
  // nada que pueda hacer al respecto.
  //
  // Se inyecta al hidratar en vez de regenerar el plan: regenerar le haría
  // perder en qué día del bloque iba, y esto no cambia el plan guardado — solo
  // agrega el bloque que le falta al día que se está mirando.
  //
  // El id se deriva del prefijo de los bloques del día (`m1d3…`), así que
  // `hechos` lo trata como a cualquier otro y no se re-pide mañana.
  const tieneAdquisicion = bloques.some(b => b.tipo === 'adquisicion');
  if (!tieneAdquisicion && fecha) {
    const estados = estadosDeTodas(progresoUnidad);
    const proximas = siguientesUnidades(estados, 1);
    const prefijo = (dia.bloques[0]?.id || '').match(/^m\d+d\d+/)?.[0];
    if (proximas.length && prefijo) {
      bloques.unshift({
        id: `${prefijo}badq`,
        tipo: 'adquisicion',
        minutos: 20,
        maxUnidades: 1,
        unidades: proximas.map(u => u.id),
        titulo: proximas[0].titulo,
        inyectado: true,
        vacio: false,
      });
    }
  }

  // La pregunta del dossier va al final del día, no al principio: se contesta
  // mejor DESPUÉS de haber entrenado —"¿qué sostenés aunque te cueste la venta?"
  // significa otra cosa recién salido de una llamada simulada que en frío— y
  // ponerla arriba la convertiría en un peaje antes de empezar.
  //
  // Efímera como el check de la mañana, y por el mismo motivo: su cumplimiento
  // vive en identidad/dossier y no en `planEstado.hechos`, que es permanente por
  // id de bloque. Si viviera ahí, cambiar de mesociclo la volvería a pedir.
  const delDossier = fecha ? preguntaDeHoy({ identidad, logMap, fecha }) : null;
  if (delDossier) {
    bloques.push({
      id: `dossier-${delDossier.key}`,
      tipo: 'dossier',
      minutos: 3,
      titulo: 'Una pregunta más de tu dossier',
      efimero: true,
      hechoExterno: false,
      pregunta: delDossier,
      vacio: false,
    });
  }

  // El check de la mañana va primero y es efímero: no vive en `planEstado.hechos`
  // (que es permanente por id de bloque) sino en identidad/check/{fecha}, porque
  // se resetea todos los días. Solo aparece si ya hay una declaración escrita.
  if (identidad?.declaracion?.texto && fecha) {
    bloques.unshift({
      id: `id-manana-${fecha}`,
      tipo: 'identidad-manana',
      minutos: 2,
      titulo: 'Tu declaración y tu panel',
      efimero: true,
      hechoExterno: !!checkHoy?.manana,
      declaracion: identidad.declaracion,
      metas: identidad.metas || [],
      vacio: false,
    });
  }

  return bloques;
}

function hashId(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export { sesionesObjetivoDe };

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader, Lock, Clock, AlertTriangle, ClipboardList, BookOpen, PenLine, Lightbulb, Zap, Hand, Sprout } from 'lucide-react';
import { subscribeList } from '../db';
import { unidadPorId } from '../plan/curriculum';
import { avanceDelLote, pasosQueEntran, adquisicionCerradaHoy } from '../plan/franjas';
import { solapamientoConFuente } from '../audit/metrics';
import { calibrarUmbral, SOLAPAMIENTO_OK, SOLAPAMIENTO_ADVERTENCIA } from '../plan/consolidacion';
import { panel, ACENTO, degradeProgreso, CSS_INTERACCION } from '../ui';
import {
  leerCurso, abrirLote, pasoDelLoteHecho, guardarDescomposicion, guardarFeynman,
  cerrarLote, muestrasDeSolapamiento, pasosDeCurso,
} from './store';

// Sesión de adquisición: el recorrido de cinco pasos sobre un lote de material
// fresco. Es la única parte del día que lo toca.
//
// El lote NO se termina en un día. Un recorrido de una sola unidad pide 68
// minutos y la franja reparte entre 30 y 84, así que la sesión se corta cuando
// se acaban los minutos y retoma mañana donde quedó. Lo que esta pantalla
// muestra, entonces, no es "el paso N de 5" sino "dónde estás en el lote" y
// "hasta dónde llegás hoy".
//
// Tres cosas que no son de esta pantalla y por eso no están acá:
// · el chequeo de palabras prestadas es `solapamientoConFuente` (audit/metrics)
// · el estado por unidad y sus compuertas son de `consolidacion.js`
// · cuándo arranca el reloj de consolidación lo decide `cerrarLote`

// Un icono por paso. El recorrido es siempre el mismo, así que el icono es lo
// que te dice dónde estás sin tener que leer el título — sobre todo cuando
// retomás un lote tres días después.
const ICONO = {
  carga: ClipboardList,
  exposicion: BookOpen,
  descomposicion: PenLine,
  feynman: Lightbulb,
  codificacion: Zap,
};

// Renderizar {ICONO[paso.id]} directo pasaba el COMPONENTE como hijo y React
// tiraba el error #31 (objeto con $$typeof/render). Quedó del pase de diseño,
// cuando ICONO dejó de tener emoji y pasó a tener componentes de lucide.
function IconoPaso({ paso, size = 17 }) {
  const Cmp = ICONO[paso.id];
  if (!Cmp) return null;
  return (
    <span style={{
      width: '34px', height: '34px', flexShrink: 0, borderRadius: '0.6rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: paso.compuerta ? 'rgba(255,159,10,0.12)' : 'rgba(48,209,88,0.12)',
      border: `1px solid ${paso.compuerta ? 'rgba(255,159,10,0.3)' : 'rgba(48,209,88,0.28)'}`,
    }}>
      <Cmp size={size} color={paso.compuerta ? ACENTO.atencion : ACENTO.progreso} strokeWidth={2.2} />
    </span>
  );
}

export default function AcquisicionSession({ bloque, onBack, onDone = null }) {
  const [curso, setCurso] = useState(undefined); // undefined = cargando
  const [cards, setCards] = useState([]);
  const [muestras, setMuestras] = useState([]);
  const [cerrado, setCerrado] = useState(null);

  useEffect(() => subscribeList('cards', setCards), []);
  useEffect(() => { muestrasDeSolapamiento().then(setMuestras).catch(() => setMuestras([])); }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const previo = await leerCurso();
      if (previo?.unidades?.length) { if (vivo) setCurso(previo); return; }
      const abierto = await abrirLote({ bloqueId: bloque.id, unidades: bloque.unidades || [] });
      if (vivo) setCurso(abierto);
    })().catch(() => { if (vivo) setCurso(null); });
    return () => { vivo = false; };
  }, [bloque.id, bloque.unidades]);

  const pasos = useMemo(() => (curso ? pasosDeCurso(curso) : []), [curso]);
  const avance = useMemo(() => avanceDelLote(pasos, curso?.hechos), [pasos, curso?.hechos]);

  // Hasta dónde llega HOY. Los minutos son de la franja, no del lote: el resto
  // se retoma mañana. Se corta en el borde del paso — cortar una descomposición
  // a la mitad la pierde entera.
  //
  // Quién decide el corte es `adquisicionCerradaHoy`, la misma función que usa
  // PlanHoy para saber si la franja se cerró. Tener acá un criterio propio fue
  // el bug: la pantalla ofrecía un paso más mientras la franja ya se había dado
  // por cerrada, o al revés.
  const hoy = useMemo(() => {
    if (!curso || !pasos.length) return null;
    const restantes = Math.max(0, (bloque.minutos || 0) - (curso.minutosHoy || 0));
    return pasosQueEntran(pasos, avance.indice, restantes);
  }, [curso, pasos, avance.indice, bloque.minutos]);

  const sinTiempoHoy = !avance.terminado && !!curso
    && adquisicionCerradaHoy(bloque, curso, avance.paso?.minutos ?? null);

  // El umbral es propio a partir de la tercera descomposición. Antes corre en
  // observación: registra el solapamiento pero no bloquea, porque 15% es una
  // estimación y la forma de escribir de cada uno varía mucho.
  const calibracion = useMemo(() => calibrarUmbral(muestras), [muestras]);

  useEffect(() => {
    if (!avance.terminado || cerrado) return;
    cerrarLote().then(r => {
      if (!r) return;
      setCerrado(r);
      if (onDone) onDone();
    }).catch(() => {});
  }, [avance.terminado, cerrado, onDone]);

  // El bloque del día se da por cumplido TAMBIÉN cuando se agota la franja con
  // el lote a medias. Es la contraparte de `adquisicionCerradaHoy` en la capa de
  // PlanHoy, que marca por id de bloque: sin esto el bloque queda pendiente para
  // siempre, "Continuar" sigue apuntando acá y el resto del día no se abre nunca.
  // Los ids son por día del mesociclo (`m1d3badq`), así que marcar el de hoy no
  // toca el de mañana.
  useEffect(() => {
    if (sinTiempoHoy && onDone) onDone();
  }, [sinTiempoHoy, onDone]);

  if (curso === undefined) {
    return <Shell onBack={onBack}><p style={{ color: 'var(--text-muted)' }}><Loader size={14} className="spin" /> Cargando…</p></Shell>;
  }

  if (!curso) {
    return (
      <Shell onBack={onBack}>
        <div style={panel}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            No hay material fresco para introducir. Puede ser que las unidades que siguen
            todavía tengan prerrequisitos en consolidación — se liberan solas.
          </p>
        </div>
      </Shell>
    );
  }

  if (cerrado) return <LoteCerrado resultado={cerrado} onBack={onBack} />;

  const unidades = curso.unidades.map(id => unidadPorId(id) || { id, titulo: id });

  return (
    <Shell onBack={onBack} title="Material nuevo">
      <Cabecera avance={avance} hoy={hoy} unidades={unidades} />

      {sinTiempoHoy ? (
        <CorteDelDia avance={avance} onBack={onBack} />
      ) : (
        <Paso
          paso={avance.paso}
          unidad={avance.paso?.unidadIdx != null ? unidades[avance.paso.unidadIdx] : null}
          todasLasUnidades={unidades}
          criterio={curso.criterio || null}
          cards={cards}
          umbral={calibracion.umbral}
          observando={!calibracion.listo}
          faltanMuestras={calibracion.faltan}
          onHecho={setCurso}
          onMuestra={(v) => setMuestras(m => [...m, v])}
        />
      )}
    </Shell>
  );
}

// ── Cabecera: dónde estás en el lote y hasta dónde llegás hoy ─

function Cabecera({ avance, hoy, unidades }) {
  const pct = avance.total ? Math.round((avance.hechos / avance.total) * 100) : 0;
  const quedanHoy = hoy ? Math.max(0, hoy.hasta - avance.indice) : 0;

  return (
    <div style={{ ...panel, marginBottom: '0.8rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#30d158' }}>
        Adquisición · {unidades.length} {unidades.length === 1 ? 'unidad' : 'unidades'}
      </div>
      <div style={{ fontWeight: 700, fontSize: '1rem', margin: '0.35rem 0 0.5rem', lineHeight: 1.35 }}>
        {unidades.map(u => u.titulo).join(' · ')}
      </div>
      <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: degradeProgreso }} />
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
        <span>{avance.hechos} de {avance.total} pasos</span>
        {quedanHoy > 0 && <span><Clock size={11} style={{ verticalAlign: '-1px' }} /> {quedanHoy} {quedanHoy === 1 ? 'entra' : 'entran'} hoy</span>}
      </div>
    </div>
  );
}

// ── El corte del día ────────────────────────────────────────

function CorteDelDia({ avance, onBack }) {
  return (
    <div style={{ ...panel, borderColor: 'rgba(48,209,88,0.35)' }}>
      <Hand size={26} color={ACENTO.progreso} strokeWidth={2} style={{ marginBottom: '0.5rem' }} />
      <p style={{ fontWeight: 700, margin: '0 0 0.45rem' }}>Hasta acá el material nuevo de hoy.</p>
      <p style={{ margin: '0 0 0.9rem', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
        Quedan {avance.total - avance.hechos} pasos del lote y los vas a retomar mañana, donde los
        dejaste. No es deuda: seguir ahora sería estirar la carga hasta que deje de asentar nada.
        El resto del día corre sobre material que ya consolidó.
      </p>
      <button className="btn btn-primary" onClick={onBack}>Seguir con el día</button>
    </div>
  );
}

function LoteCerrado({ resultado, onBack }) {
  const n = resultado.unidades.length;
  return (
    <Shell onBack={onBack} title="Lote cerrado">
      <div style={{ ...panel, textAlign: 'center' }}>
        <Sprout size={30} color={ACENTO.progreso} strokeWidth={2} style={{ marginBottom: '0.5rem' }} />
        <p style={{ fontWeight: 700, margin: '0 0 0.45rem' }}>
          {n === 1 ? 'Unidad introducida' : `${n} unidades introducidas`}
        </p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Ahora entra en pausa. No la vas a poder practicar hasta mañana: hacen falta al menos
          14 horas y que amanezca. No es una traba, es de donde viene el efecto.
        </p>
        <button className="btn btn-primary" onClick={onBack}>Seguir con el día</button>
      </div>
    </Shell>
  );
}

// ── Los pasos ───────────────────────────────────────────────

function Paso({ paso, unidad, todasLasUnidades, criterio, cards, umbral, observando, faltanMuestras, onHecho, onMuestra }) {
  if (!paso) return null;

  const cabecera = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', marginBottom: '0.8rem' }}>
        <IconoPaso paso={paso} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{paso.titulo}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
          ~{paso.minutos} min{unidad ? ` · ${unidad.titulo}` : ''}
        </div>
      </div>
    </div>
  );

  if (paso.id === 'descomposicion') {
    return (
      <div style={panel}>
        {cabecera}
        <Descomposicion
          paso={paso} unidad={unidad} cards={cards} umbral={umbral}
          observando={observando} faltanMuestras={faltanMuestras}
          onHecho={onHecho} onMuestra={onMuestra}
        />
      </div>
    );
  }

  if (paso.id === 'carga') {
    return (
      <div style={panel}>
        {cabecera}
        <CargaDefinida paso={paso} unidades={todasLasUnidades} onHecho={onHecho} />
      </div>
    );
  }

  return (
    <div style={panel}>
      {cabecera}
      <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
        {paso.detalle}
      </p>
      {paso.id === 'exposicion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
          {todasLasUnidades.map(u => <MaterialDeUnidad key={u.id} unidad={u} cards={cards} />)}
        </div>
      )}
      {paso.id === 'codificacion' && criterio && (
        <div style={{
          marginBottom: '1rem', padding: '0.7rem 0.85rem', borderRadius: '0.6rem',
          background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.25)',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Lo que dijiste que ibas a poder hacer
          </div>
          <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>{criterio}</div>
        </div>
      )}
      <button
        className="btn btn-primary"
        style={{ width: '100%' }}
        onClick={async () => {
          const r = paso.id === 'feynman'
            ? await guardarFeynman({ paso, unidadId: unidad.id })
            : await pasoDelLoteHecho(paso);
          if (r) onHecho(r);
        }}
      >
        {paso.id === 'codificacion' ? 'Puedo hacerlo — cerrar el lote' : 'Listo'}
      </button>
    </div>
  );
}

// El primer paso no es un trámite: es donde la carga deja de ser tiempo y pasa a
// ser un criterio verificable. "Estudio dos horas" no se puede cumplir ni
// incumplir; "puedo explicar por qué la transición va antes del precio" sí. Por
// eso lo que se escribe acá queda guardado y vuelve al final, en la codificación:
// si no se puede contestar contra lo escrito, el recorrido no cerró.
function CargaDefinida({ paso, unidades, onHecho }) {
  const [criterio, setCriterio] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await pasoDelLoteHecho(paso, { criterio: criterio.trim() });
      if (r) onHecho(r);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <p style={{ margin: '0 0 0.9rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
        {paso.detalle}
      </p>

      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.6rem', padding: '0.7rem 0.85rem', marginBottom: '0.9rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          Entra en este lote
        </div>
        {unidades.map(u => (
          <div key={u.id} style={{ fontSize: '0.87rem', padding: '0.15rem 0' }}>· {u.titulo}</div>
        ))}
      </div>

      <label style={{ display: 'block', fontSize: '0.84rem', marginBottom: '0.45rem' }}>
        ¿Cómo vas a saber que lo entendiste?
      </label>
      <textarea
        value={criterio}
        onChange={(e) => setCriterio(e.target.value)}
        rows={3}
        placeholder="Ej: puedo explicar por qué esta fase va antes que el precio, sin mirar el guion."
        style={{
          width: '100%', padding: '0.7rem', borderRadius: '0.6rem', resize: 'vertical',
          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'inherit', font: 'inherit', fontSize: '0.87rem', lineHeight: 1.5,
        }}
      />
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Tiene que poder fallar. Si no se puede contestar que no, no es un criterio.
      </p>

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: '0.9rem' }}
        disabled={guardando || criterio.trim().length < 10}
        onClick={guardar}
      >
        {guardando ? <><Loader size={14} className="spin" /> Guardando…</> : 'Abrir el material'}
      </button>
    </>
  );
}

// La fuente contra la que se mide el solapamiento: el texto de las cartas de la
// unidad. Es literalmente lo que el usuario acaba de leer en la exposición, así
// que es contra eso que "palabras prestadas" significa algo.
function textoFuente(unidad, cards) {
  const ids = new Set(unidad?.cartas || []);
  return cards.filter(c => ids.has(c.id)).map(c => `${c.frente || ''} ${c.dorso || ''}`).join(' ');
}

function MaterialDeUnidad({ unidad, cards }) {
  const ids = new Set(unidad.cartas || []);
  const propias = cards.filter(c => ids.has(c.id));
  if (!propias.length) return null;
  return (
    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {propias.map(c => (
        <div key={c.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.6rem', padding: '0.7rem 0.85rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{c.frente}</div>
          {c.dorso && <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>{c.dorso}</div>}
        </div>
      ))}
    </div>
  );
}

function Descomposicion({ paso, unidad, cards, umbral, observando, faltanMuestras, onHecho, onMuestra }) {
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [rechazo, setRechazo] = useState(null);

  const fuente = useMemo(() => textoFuente(unidad, cards), [unidad, cards]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setGuardando(true);
    try {
      const { proporcion, tramos } = solapamientoConFuente(texto, fuente);
      onMuestra(proporcion);
      const r = await guardarDescomposicion({
        paso, unidadId: unidad.id, texto, solapamiento: proporcion, forzar: observando,
      });
      if (!r) return;
      if (r.bloqueado) { setRechazo({ proporcion, tramos }); return; }
      setRechazo(null);
      onHecho(r.curso);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <p style={{ margin: '0 0 0.9rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
        {paso.detalle}
      </p>

      <div style={{
        display: 'flex', gap: '0.55rem', alignItems: 'flex-start', marginBottom: '0.8rem',
        padding: '0.65rem 0.8rem', borderRadius: '0.6rem',
        background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)',
      }}>
        <Lock size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#ff9f0a' }} />
        <div style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
          <strong>Compuerta.</strong> Feynman no se abre hasta que esto pase. Simplificar algo que
          todavía no reconstruiste es repetir el resumen de otro con menos palabras.
        </div>
      </div>

      <textarea
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setRechazo(null); }}
        placeholder="Con el material cerrado: reconstruilo con tu propio lenguaje técnico."
        rows={7}
        style={{
          width: '100%', padding: '0.75rem', borderRadius: '0.6rem', resize: 'vertical',
          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'inherit', font: 'inherit', fontSize: '0.88rem', lineHeight: 1.55,
        }}
      />

      {rechazo && <Rechazo {...rechazo} umbral={umbral} />}

      {observando && (
        <p style={{ margin: '0.7rem 0 0', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Calibrando: por ahora se registra el solapamiento sin bloquear. Faltan {faltanMuestras}{' '}
          {faltanMuestras === 1 ? 'descomposición' : 'descomposiciones'} para tener tu umbral propio.
        </p>
      )}

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: '0.9rem' }}
        disabled={guardando || !texto.trim()}
        onClick={enviar}
      >
        {guardando ? <><Loader size={14} className="spin" /> Revisando…</> : 'Revisar y seguir'}
      </button>
    </>
  );
}

function Rechazo({ proporcion, tramos, umbral }) {
  const pct = Math.round(proporcion * 100);
  const limite = Math.round((umbral ?? SOLAPAMIENTO_OK) * 100);
  const grave = proporcion > SOLAPAMIENTO_ADVERTENCIA;

  return (
    <div style={{
      marginTop: '0.8rem', padding: '0.8rem 0.9rem', borderRadius: '0.6rem',
      background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.3)',
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <AlertTriangle size={15} style={{ color: '#ff453a', flexShrink: 0 }} />
        <strong style={{ fontSize: '0.88rem' }}>
          {pct}% viene del material (el límite es {limite}%)
        </strong>
      </div>
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
        {grave
          ? 'Esto todavía es el texto original con otro orden. Cerrá el material y escribilo de memoria.'
          : 'Estás cerca. Reescribí los tramos marcados con tus palabras y volvé a probar.'}
      </p>
      {tramos?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {tramos.slice(0, 6).map((t, i) => (
            <span key={i} style={{
              fontSize: '0.78rem', padding: '0.2rem 0.5rem', borderRadius: '0.35rem',
              background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.25)',
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ onBack, title, children }) {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem 1.1rem 2.5rem' }}>
      <style>{CSS_INTERACCION}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
        <button aria-label="Volver" onClick={onBack} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0.3rem', display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{title || 'Adquisición'}</h2>
      </div>
      {children}
    </div>
  );
}

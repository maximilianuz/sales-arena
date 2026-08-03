import { useMemo, useState } from 'react';
import {
  Check, ChevronDown, ChevronRight, Play, CalendarCheck, Sparkles, Trophy,
  TrendingUp, Flag, Layers, Headphones, BookOpen, PenLine, Package, Target, Mic,
  Sprout, Compass, Circle,
} from 'lucide-react';
import { getNode, setNode, logActivity, todayKey } from '../db';
import { hidratarBloques, diaActual, progreso, planTerminado } from './generator';
import { marcarBloqueHecho, cerrarDia, continuarConBloques } from './store';
import { calcularIP, senales as calcularSenales, cambiosDeNivel } from './dificultad';
import { necesitaCheckin, semanaISO } from './checkin';
import CheckinSemanal from './CheckinSemanal';
import { recordatorioDeHoy, recordatorioDeNivel } from '../identidad/continuidad';
import Recordatorio, { RecordatorioDeNivel } from '../identidad/Recordatorio';
import { marcarCheckManana, marcarCheckNoche, responderDossier } from '../identidad/store';
import { panel, surface, ACENTO, degradeProgreso, transicion, TOQUE_MIN, CSS_INTERACCION } from '../ui';

// Vista "Hoy": el día del plan como una lista lineal. La regla de diseño es que
// nunca haya más de una decisión en pantalla — hay un solo botón que importa
// ("Continuar") y siempre lanza el primer bloque sin hacer. El resto de la
// lista está para que veas cuánto falta, no para elegir.
//
// La periodización en mesociclos NO se le muestra al usuario como tal. Lo que ve
// es su rango, en qué bloque va, y cada tanto una pantalla de subida de nivel
// que le dice qué se puso más difícil. La complejidad la absorbe el generador.
//
// Los bloques de flashcards y roleplay se lanzan hacia arriba (onLanzar) porque
// esas pantallas ocupan toda la vista. Los livianos —leer un principio, revisar
// patrones, el check de identidad, cerrar el día— se resuelven acá mismo.

// Iconos por tipo de bloque. Eran emoji, y el emoji como icono es lo primero
// que delata una interfaz sin terminar: cada plataforma lo dibuja distinto, no
// hereda el color del texto y no escala con el tipo. Estos son del mismo set que
// el resto de la app.
const ICONO_TIPO = {
  flashcards: Layers,
  roleplay: Headphones,
  lectura: BookOpen,
  revision: TrendingUp,
  cierre: PenLine,
  kb: Package,
  'identidad-manana': Target,
  'roleplay-voz': Mic,
  adquisicion: Sprout,
  dossier: Compass,
};

// Cada bloque se lee por color además de por forma: el tipo de trabajo se
// reconoce de un vistazo sin tener que leer el título.
const COLOR_TIPO = {
  adquisicion: ACENTO.progreso,
  flashcards: ACENTO.frio,
  roleplay: ACENTO.atencion,
  'roleplay-voz': ACENTO.atencion,
  lectura: ACENTO.frio,
  revision: ACENTO.foco,
  dossier: ACENTO.foco,
  'identidad-manana': ACENTO.progreso,
};

function IconoBloque({ tipo, size = 15 }) {
  const Cmp = ICONO_TIPO[tipo] || Circle;
  return <Cmp size={size} color={COLOR_TIPO[tipo] || 'var(--text-muted)'} strokeWidth={2.2} />;
}

export default function PlanHoy({ plan, estado, ctx, onLanzar, onLanzarVoz, onIrA }) {
  const [expandido, setExpandido] = useState(null);
  const [verPlan, setVerPlan] = useState(false);
  const [verCamino, setVerCamino] = useState(false);
  const [finDeBloque, setFinDeBloque] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const [checkinHecho, setCheckinHecho] = useState(false);
  const [recordatorioHecho, setRecordatorioHecho] = useState(false);

  const actual = diaActual(plan, estado);
  // La dependencia es `actual?.dia` y no `actual`: diaActual devuelve un objeto
  // nuevo en cada render, pero el día que hay adentro sí es estable.
  const bloques = useMemo(
    () => (actual ? hidratarBloques(actual.dia, ctx) : []),
    [actual?.dia, ctx] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // El semáforo: seis señales verde/roja. Es lo que reemplaza a la barra de "% del
  // plan", que en un plan sin final no significa nada.
  const mesociclo = plan?.mesociclo;
  const camino = useMemo(() => {
    if (!mesociclo) return null;
    const analisis = calcularIP({ mesociclo, ...ctx });
    return { analisis, senales: calcularSenales(analisis) };
  }, [mesociclo, ctx]);

  if (finDeBloque) {
    return (
      <FinDeBloque
        resultado={finDeBloque}
        motivoDeFondo={recordatorioDeNivel(ctx.identidad)}
        onSeguir={() => setFinDeBloque(null)}
        onIrA={onIrA}
      />
    );
  }

  // Solo un plan v1 puede quedarse sin días por delante.
  if (planTerminado(plan, estado)) return <PlanV1Terminado plan={plan} onIrA={onIrA} />;

  const bloque = actual.bloque;
  const { dia } = actual;
  const hechos = estado.hechos || {};
  const estaHecho = (b) => (b.efimero ? b.hechoExterno : !!hechos[b.id]);
  const pendientes = bloques.filter(b => !estaHecho(b));
  const siguiente = pendientes[0] || null;
  const completo = pendientes.length === 0;
  const yaCerroHoy = estado.ultimoCierre === todayKey();
  const prog = progreso(plan, estado);
  const diaSinEmpezar = pendientes.length === bloques.filter(b => !b.efimero).length;
  const tocaCheckin = !checkinHecho && diaSinEmpezar && necesitaCheckin(plan, estado);

  // El recordatorio de continuidad. El de regreso ("pasaron 6 días") entra
  // aunque el día esté empezado: es el momento de mayor valor del sistema y
  // esperar al día siguiente lo desperdicia. El semanal espera a un día limpio y
  // cae junto al check-in, para que haya UN solo momento semanal y no dos.
  const recordatorio = recordatorioHecho ? null : recordatorioDeHoy({
    identidad: ctx.identidad, logMap: ctx.logMap, semana: semanaISO(),
  });
  const mostrarRecordatorio = recordatorio && (diaSinEmpezar || recordatorio.motivo === 'regreso');

  const completar = async (bloqueId) => {
    await marcarBloqueHecho(bloqueId);
    setExpandido(null);
  };

  const terminarDia = async () => {
    setCerrando(true);
    try {
      const r = await cerrarDia({ plan, ctx, hoyKey: todayKey() });
      setExpandido(null);
      if (r.finDeBloque) setFinDeBloque(r.finDeBloque);
    } finally {
      setCerrando(false);
    }
  };

  const lanzar = (b) => {
    if (b.tipo === 'flashcards' || b.tipo === 'roleplay' || b.tipo === 'adquisicion') onLanzar(b);
    // La llamada por voz corre en otra pantalla: se deja la marca y al terminarla
    // el bloque queda cumplido solo (ver plan/store.marcarPendienteVoz).
    else if (b.tipo === 'roleplay-voz') onLanzarVoz(b);
    else if (b.tipo === 'kb') onIrA('kb');
    else setExpandido(b.id);
  };

  const ultimoDia = dia.n >= bloque.dias.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {/* Hover, focus-visible y active no se pueden expresar inline. Se inyectan
          una vez acá en vez de reescribir el módulo entero a clases. */}
      <style>{CSS_INTERACCION}</style>

      {/* Encabezado: dónde estás parado. El rango va primero porque es lo que se
          gana; el número de bloque es contexto. */}
      <div style={{ ...panel, padding: '0.9rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACENTO.progreso }}>
            {bloque.rango.nombre} · Bloque {bloque.n}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Día {dia.n} de {bloque.dias.length} · {dia.etiqueta}
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.02rem', margin: '0.3rem 0 0.25rem' }}>
          {bloque.titulo}
          {bloque.prorroga > 0 && (
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#ff9f0a', marginLeft: '0.45rem' }}>
              extendido
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{bloque.objetivo}</p>
        <div style={{ marginTop: '0.8rem', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${prog.pct}%`, height: '100%', background: degradeProgreso }} />
        </div>
      </div>

      {/* Continuidad: vuelve un pedazo de tu declaración. Va ANTES del check-in
          —primero para qué, después la logística— y antes de la lista del día. */}
      {mostrarRecordatorio && (
        <Recordatorio
          recordatorio={recordatorio}
          declaracion={ctx.identidad?.declaracion}
          onListo={() => setRecordatorioHecho(true)}
        />
      )}

      {/* Check-in semanal. Solo con el día sin empezar: interrumpir a mitad de
          una sesión para preguntar cuántos días tenés disponibles es la peor
          manera de preguntarlo. */}
      {tocaCheckin && (
        <CheckinSemanal plan={plan} identidad={ctx.identidad} onListo={() => setCheckinHecho(true)} />
      )}

      {/* Camino al próximo nivel: el semáforo. Plegado por defecto — es para
          mirarlo cuando querés saber qué te falta, no cada día. */}
      {camino && (
        <CaminoAlNivel
          camino={camino}
          abierto={verCamino}
          onToggle={() => setVerCamino(!verCamino)}
          nivel={bloque.nivel}
        />
      )}

      {/* Ya cerró el día de hoy: el plan es secuencial, pero espaciado */}
      {yaCerroHoy && !completo && (
        <div style={{ ...panel, borderColor: 'rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.35rem' }}>
            <CalendarCheck size={16} color="#22d3ee" /> Ya entrenaste hoy
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Este es el día siguiente, esperándote para mañana. Podés arrancarlo igual, pero el
            espaciado entre sesiones es la mitad de por qué esto funciona.
          </p>
        </div>
      )}

      {/* La lista del día */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {bloques.map(b => (
          <BloqueFila
            key={b.id}
            bloque={b}
            hecho={estaHecho(b)}
            esSiguiente={siguiente?.id === b.id}
            expandido={expandido === b.id}
            fecha={ctx.fecha}
            identidad={ctx.identidad}
            onToggle={() => setExpandido(expandido === b.id ? null : b.id)}
            onLanzar={() => lanzar(b)}
            onCompletar={() => completar(b.id)}
            onCompletarEfimero={() => setExpandido(null)}
            onIrA={onIrA}
          />
        ))}
      </div>

      {/* El único botón que importa */}
      {!completo && siguiente && (
        <button
          className="btn btn-primary"
          onClick={() => lanzar(siguiente)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.8rem' }}
        >
          <Play size={16} /> Continuar — {siguiente.titulo}
        </button>
      )}

      {completo && (
        <div style={{ ...panel, textAlign: 'center', borderColor: 'rgba(48,209,88,0.4)', background: 'rgba(48,209,88,0.07)' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>✅</div>
          <p style={{ fontWeight: 700, margin: '0 0 0.3rem' }}>Día {dia.n} terminado</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            {ultimoDia
              ? 'Último día del bloque. Al cerrarlo se revisa si estás listo para subir la exigencia.'
              : 'Volvé mañana y seguís donde quedaste.'}
          </p>
          <button className="btn btn-primary" disabled={cerrando} onClick={terminarDia}>
            {cerrando ? 'Cerrando…' : ultimoDia ? 'Cerrar el bloque' : 'Listo'}
          </button>
        </div>
      )}

      {/* El bloque completo, plegado. Está para orientarse, no para navegar. */}
      <button onClick={() => setVerPlan(!verPlan)} style={{
        ...panel, cursor: 'pointer', font: 'inherit', color: 'var(--text-muted)', textAlign: 'left',
        padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem',
      }}>
        {verPlan ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Ver el bloque completo
      </button>
      {verPlan && <BloqueCompleto plan={plan} estado={estado} bloque={bloque} />}
    </div>
  );
}

// ── Camino al próximo nivel ─────────────────────────────────
//
// El IP nunca se muestra como número: "68/100" no le dice a nadie qué hacer
// mañana. Lo que se muestra es cuántas señales están en verde y cuáles no, con
// su valor y su objetivo. Es una barra de progreso honesta hacia el nivel
// siguiente, y de paso le dice al usuario exactamente qué mover.

function CaminoAlNivel({ camino, abierto, onToggle, nivel }) {
  const verdes = camino.senales.filter(s => s.ok).length;
  const total = camino.senales.length;
  const listo = verdes === total;

  return (
    <div style={{ ...panel, padding: 0, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.8rem 1.1rem', cursor: 'pointer',
      }}>
        <TrendingUp size={16} color={listo ? '#30d158' : '#22d3ee'} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
            {listo ? 'Listo para subir de nivel' : `${verdes} de ${total} señales en verde`}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {listo ? 'Terminá el bloque y subís.' : 'Lo que falta para el próximo nivel'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          {camino.senales.map(s => (
            <span key={s.id} style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: s.ok ? '#30d158' : 'rgba(255,255,255,0.18)',
            }} />
          ))}
        </div>
        {abierto ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
      </div>

      {abierto && (
        <div style={{ padding: '0 1.1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {camino.senales.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'baseline', gap: '0.5rem',
              padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.83rem',
            }}>
              <span style={{ flexShrink: 0 }}>{s.ok ? '🟢' : '🔴'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {s.valor} · objetivo {s.objetivo}
                </div>
              </div>
            </div>
          ))}
          <p style={{ margin: '0.8rem 0 0', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Las señales se miden sobre tus últimas llamadas del bloque, no sobre la mejor.
            Al nivel {nivel + 1} los objetivos suben.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Fin de bloque ───────────────────────────────────────────
//
// El momento de recompensa. Subir de nivel sin decir qué cambió es una medalla
// de participación: acá se dice, en concreto, qué se puso más difícil.

function FinDeBloque({ resultado, motivoDeFondo, onSeguir, onIrA }) {
  if (resultado.accion === 'prorrogar') {
    const causa = resultado.cierre.faltan[0] || 'Todavía faltan señales en verde.';
    return (
      <div style={{ ...panel, textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🔁</div>
        <p style={{ fontWeight: 700, margin: '0 0 0.4rem', fontSize: '1.05rem' }}>El bloque se extiende</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.55 }}>
          {causa} No es volver a empezar: son unos días más, enfocados justo en eso.
          Subir de nivel sin estar listo solo hace que la próxima llamada real te sorprenda.
        </p>
        <div style={{ textAlign: 'left', marginBottom: '1.1rem' }}>
          {resultado.cierre.senales.filter(s => !s.ok).map(s => (
            <div key={s.id} style={{ fontSize: '0.82rem', padding: '0.3rem 0', color: 'var(--text-muted)' }}>
              🔴 <strong style={{ color: 'var(--text)' }}>{s.label}</strong> — {s.valor}, objetivo {s.objetivo}
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onSeguir}>Seguir entrenando</button>
      </div>
    );
  }

  const cambios = cambiosDeNivel(resultado.nivelNuevo);
  const porValvula = resultado.cierre.motivo === 'valvula';

  return (
    <div style={{ ...panel, textAlign: 'center', borderColor: 'rgba(48,209,88,0.4)', background: 'rgba(48,209,88,0.07)' }}>
      <div style={{ fontSize: '2.4rem', marginBottom: '0.4rem' }}>{porValvula ? '🚪' : '🏆'}</div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#30d158' }}>
        Nivel {resultado.nivelNuevo}
      </div>
      <p style={{ fontWeight: 700, margin: '0.2rem 0 0.5rem', fontSize: '1.25rem' }}>{resultado.rangoNuevo.nombre}</p>

      {porValvula ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.55 }}>
          Avanzás con el bloque a medias: extendiste tres veces y seguir ahí no te iba a servir.
          El nivel nuevo va a estar exigente — miralo como una advertencia, no como un premio.
        </p>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.55 }}>
          Cerraste el bloque con todas las señales en verde. Lo que sigue es más difícil:
        </p>
      )}

      {/* El motor "hacia", pegado a lo que acaba de lograr. Es el único momento
          donde este pedazo de la declaración vuelve sin preguntar nada: acá
          corresponde recompensa, no introspección. */}
      <RecordatorioDeNivel recordatorio={motivoDeFondo} />

      <div style={{ textAlign: 'left', marginBottom: '1.1rem' }}>
        {cambios.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.45rem', fontSize: '0.84rem', padding: '0.32rem 0', lineHeight: 1.45 }}>
            <Flag size={13} color="#ff9f0a" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <span>{c}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onSeguir}>
          <Trophy size={15} style={{ marginRight: '0.35rem', verticalAlign: '-2px' }} />
          Empezar el bloque nuevo
        </button>
        <button className="btn btn-outline" onClick={() => onIrA('patrones')}>Ver mi evolución</button>
      </div>
    </div>
  );
}

// ── Una fila del día ────────────────────────────────────────

function BloqueFila({ bloque, hecho, esSiguiente, expandido, fecha, identidad, onToggle, onLanzar, onCompletar, onCompletarEfimero, onIrA }) {
  const inline = ['lectura', 'revision', 'cierre', 'identidad-manana', 'dossier'].includes(bloque.tipo);
  const activo = esSiguiente && !hecho;

  return (
    <div style={{
      // El bloque activo es el ÚNICO elevado de la pantalla. Si se elevaran
      // todos, ninguno lo estaría: la jerarquía es lo que hace que "Continuar"
      // no necesite explicación.
      ...(activo ? surface.raised : surface.sunken), padding: 0, overflow: 'hidden',
      borderColor: hecho ? 'rgba(255,255,255,0.06)' : activo ? 'rgba(48,209,88,0.45)' : 'rgba(255,255,255,0.07)',
      opacity: hecho ? 0.5 : 1,
      transition: transicion('opacity, border-color, background-color'),
    }}>
      <button
        type="button"
        className={hecho ? undefined : 'tr-fila'}
        disabled={hecho}
        aria-expanded={inline && !hecho ? !!expandido : undefined}
        onClick={() => (hecho ? null : inline ? onToggle() : onLanzar())}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%',
          padding: '0.7rem 1rem', minHeight: `${TOQUE_MIN}px`, textAlign: 'left',
          background: 'transparent', border: 'none', font: 'inherit', color: 'inherit',
          cursor: hecho ? 'default' : 'pointer',
        }}
      >
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${hecho ? ACENTO.progreso : activo ? ACENTO.progreso : 'rgba(255,255,255,0.18)'}`,
          background: hecho ? 'rgba(48,209,88,0.18)' : activo ? 'rgba(48,209,88,0.12)' : 'transparent',
          transition: transicion(),
        }}>
          {hecho ? <Check size={14} color={ACENTO.progreso} strokeWidth={2.6} />
            : activo ? <Play size={11} color={ACENTO.progreso} fill={ACENTO.progreso} />
            : <IconoBloque tipo={bloque.tipo} size={13} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: activo ? 700 : 600, fontSize: '0.9rem',
            textDecoration: hecho ? 'line-through' : 'none',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            {!hecho && !activo && null}
            {bloque.titulo}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.12rem' }}>
            {bloque.minutos} min
            {bloque.tipo === 'flashcards' && bloque.disponibles !== undefined && ` · ${bloque.disponibles} para repasar`}
            {bloque.tipo === 'roleplay' && bloque.perfil && ` · ${bloque.perfil.arquetipo}`}
            {bloque.tipo === 'roleplay-voz' && ' · con micrófono'}
          </div>
          {bloque.tipo === 'roleplay-voz' && !hecho && (
            <div style={{ fontSize: '0.72rem', color: '#22d3ee', marginTop: '0.2rem' }}>{bloque.detalle}</div>
          )}
          {bloque.sustituido && !bloque.vacio && (
            <div style={{ fontSize: '0.72rem', color: '#22d3ee', marginTop: '0.2rem' }}>{bloque.sustituido} — va mixto</div>
          )}
          {/* Un bloque de repaso vacío no es un error: con la compuerta de
              consolidación encendida, los primeros días TODO está en pausa
              porque todavía no cerraste ningún lote. Decirlo con la hora a la
              que se libera es la diferencia entre "el sistema anda mal" y
              "esto es el sistema andando". */}
          {bloque.tipo === 'flashcards' && bloque.vacio && !hecho && (
            <div style={{ fontSize: '0.72rem', color: '#ff9f0a', marginTop: '0.25rem', lineHeight: 1.45 }}>
              {bloque.enPausa?.length
                ? <>Todo en pausa hasta que consolide. {textoLiberacion(bloque.enPausa[0])}</>
                : <>Nada vencido: no hay repaso que hacer hoy.</>}
            </div>
          )}
          {bloque.ajustado && (
            <div style={{ fontSize: '0.72rem', color: '#a78bfa', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Sparkles size={11} /> {bloque.ajustado}
            </div>
          )}
        </div>

        {!hecho && inline && (expandido ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />)}
      </button>

      {expandido && !hecho && (
        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {bloque.tipo === 'lectura' && <ContenidoLectura bloque={bloque} onCompletar={onCompletar} />}
          {bloque.tipo === 'revision' && <ContenidoRevision bloque={bloque} onCompletar={onCompletar} onIrA={onIrA} />}
          {bloque.tipo === 'cierre' && <ContenidoCierre bloque={bloque} fecha={fecha} identidad={identidad} onCompletar={onCompletar} />}
          {bloque.tipo === 'identidad-manana' && <ContenidoIdentidadManana bloque={bloque} fecha={fecha} onListo={onCompletarEfimero} onIrA={onIrA} />}
          {bloque.tipo === 'dossier' && <ContenidoDossier bloque={bloque} fecha={fecha} identidad={identidad} onListo={onCompletarEfimero} />}
        </div>
      )}
    </div>
  );
}

// Cuándo se libera lo que está consolidando. Se muestra en horas si es hoy y
// como "mañana" si cruza la medianoche — que es el caso normal, porque la regla
// exige que amanezca.
function textoLiberacion(unidad) {
  if (!unidad?.liberaEn) return 'Se libera sola.';
  const falta = unidad.liberaEn - Date.now();
  if (falta <= 0) return 'Ya se está liberando.';
  const horas = Math.ceil(falta / (60 * 60 * 1000));
  return horas <= 12 ? `Se libera en ${horas} h.` : 'Se libera mañana.';
}

// ── Una pregunta del dossier ────────────────────────────────
//
// Las cuatro preguntas que salieron del wizard de identidad. Cae una cada dos
// días entrenados, al final del día, para que se conteste sobre experiencia
// reciente y no en frío. Quién decide cuál y cuándo es identidad/dossier.js.

function ContenidoDossier({ bloque, fecha, identidad, onListo }) {
  const { pregunta } = bloque;
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const suficiente = texto.trim().length >= pregunta.minimo;

  const guardar = async () => {
    setGuardando(true);
    try {
      await responderDossier({
        key: pregunta.key, texto: texto.trim(), dia: pregunta.dia, fecha,
        declaracionActual: identidad?.declaracion,
      });
      onListo?.();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ paddingTop: '0.85rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: '0.4rem' }}>{pregunta.titulo}</div>
      <p style={{ margin: '0 0 0.7rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
        {pregunta.ayuda}
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={pregunta.placeholder}
        rows={4}
        style={{
          width: '100%', padding: '0.7rem', borderRadius: '0.6rem', resize: 'vertical',
          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'inherit', font: 'inherit', fontSize: '0.87rem', lineHeight: 1.55,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={!suficiente || guardando} onClick={guardar}>
          {guardando ? 'Guardando…' : 'Sumar al dossier'}
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {suficiente
            ? `Quedan ${pregunta.restantes - 1} preguntas, y llegan de a una.`
            : `Escribí un poco más (${texto.trim().length}/${pregunta.minimo}).`}
        </span>
      </div>
    </div>
  );
}

// ── El check de la mañana (Módulo 0) ────────────────────────
//
// Leer la declaración y ver el panel. Dos minutos, y un foco de una línea que a
// la noche te devuelve el bloque de cierre. Es lo único del módulo de identidad
// que entra en el día: si fuera una sección aparte, no la abriría nadie.

function ContenidoIdentidadManana({ bloque, fecha, onListo, onIrA }) {
  const [foco, setFoco] = useState('');
  const [guardando, setGuardando] = useState(false);
  const metas = bloque.metas || [];

  const guardar = async () => {
    setGuardando(true);
    try {
      await marcarCheckManana(foco, fecha);
      onListo();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ paddingTop: '0.8rem' }}>
      <p style={{
        margin: '0 0 0.9rem', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        fontWeight: 600, borderLeft: '2px solid #30d158', paddingLeft: '0.7rem',
      }}>
        {bloque.declaracion?.texto}
      </p>

      {metas.length > 0 && (
        <div style={{ marginBottom: '0.9rem' }}>
          {metas.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem',
              padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.83rem',
            }}>
              <span style={{ minWidth: 0 }}>{m.titulo}</span>
              <span style={{ color: '#30d158', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                {m.valorActual ?? m.valorInicial ?? 0} / {m.valorObjetivo} {m.unidad || ''}
              </span>
            </div>
          ))}
          <button onClick={() => onIrA('identidad')} style={{
            background: 'none', border: 'none', color: '#22d3ee', cursor: 'pointer', font: 'inherit',
            fontSize: '0.78rem', padding: '0.5rem 0 0', textDecoration: 'underline',
          }}>
            Ver el panel completo
          </button>
        </div>
      )}

      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Una cosa en la que ponés el foco hoy (opcional)</span>
        <input value={foco} onChange={(e) => setFoco(e.target.value)} placeholder="ej: no adornar el precio"
          style={{ display: 'block', marginTop: '0.3rem', width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.85rem' }} />
      </label>

      <button className="btn btn-primary" disabled={guardando} onClick={guardar} style={{ marginTop: '0.8rem', fontSize: '0.85rem' }}>
        {guardando ? 'Guardando…' : 'Listo'}
      </button>
    </div>
  );
}

// Leer un principio. Si el bloque fue ajustado por un patrón, es el principio
// que venís violando — el texto de arriba ya lo dice.
function ContenidoLectura({ bloque, onCompletar }) {
  const p = bloque.principio;
  if (!p) {
    return (
      <div style={{ paddingTop: '0.8rem' }}>
        <p style={{ margin: '0 0 0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No hay principios cargados. Importá el contenido inicial o creá uno en la Base de conocimiento.
        </p>
        <button className="btn btn-outline" onClick={onCompletar} style={{ fontSize: '0.8rem' }}>Saltear</button>
      </div>
    );
  }
  return (
    <div style={{ paddingTop: '0.8rem' }}>
      {p.resumen && <p style={{ margin: '0 0 0.7rem', fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.5 }}>{p.resumen}</p>}
      <p style={{ margin: '0 0 0.8rem', fontSize: '0.86rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{p.explicacionReferencia}</p>
      {(p.puntosClave || []).length > 0 && (
        <ul style={{ margin: '0 0 0.8rem', paddingLeft: '1.1rem', fontSize: '0.84rem', lineHeight: 1.6 }}>
          {p.puntosClave.map((pt, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{pt}</li>)}
        </ul>
      )}
      {p.errorTipico && (
        <p style={{ margin: '0 0 0.9rem', fontSize: '0.82rem', color: '#ff9f0a', lineHeight: 1.55 }}>
          <strong>Error típico:</strong> {p.errorTipico}
        </p>
      )}
      <button className="btn btn-primary" onClick={async () => {
        await logActivity({ minutos: bloque.minutos, tipo: 'lectura', detalle: `Leí: ${p.nombre}` });
        onCompletar();
      }} style={{ fontSize: '0.85rem' }}>
        Lo leí
      </button>
    </div>
  );
}

function ContenidoRevision({ bloque, onCompletar, onIrA }) {
  const patrones = bloque.patrones || [];
  return (
    <div style={{ paddingTop: '0.8rem' }}>
      {patrones.length === 0 ? (
        <p style={{ margin: '0 0 0.9rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Todavía no hay errores registrados. Nada que revisar esta semana — eso también es información.
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Lo que más repetiste. Leelo antes de la próxima llamada.
          </p>
          {patrones.map(g => (
            <div key={g.principioId} style={{ padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.86rem' }}>
              <strong>{g.cantidad}×</strong> {g.nombre}
            </div>
          ))}
          <button onClick={() => onIrA('patrones')} style={{
            background: 'none', border: 'none', color: '#22d3ee', cursor: 'pointer', font: 'inherit',
            fontSize: '0.82rem', padding: '0.7rem 0 0', textDecoration: 'underline',
          }}>
            Ver el detalle en Patrones
          </button>
        </>
      )}
      <div style={{ marginTop: '0.9rem' }}>
        <button className="btn btn-primary" onClick={onCompletar} style={{ fontSize: '0.85rem' }}>Listo</button>
      </div>
    </div>
  );
}

// El cierre del día: autoevaluación + qué ajustás mañana. Es el bloque más corto
// y el que más sostiene el hábito, porque es el que registra el día.
//
// También es el check de la NOCHE del Módulo 0: si a la mañana te pusiste un
// foco, acá se te devuelve. Un sexto bloque en la lista habría empeorado justo
// lo que el Plan Guiado vino a arreglar.
function ContenidoCierre({ bloque, fecha, identidad, onCompletar }) {
  const [auto, setAuto] = useState('');
  const [notas, setNotas] = useState('');
  const [cumplioFoco, setCumplioFoco] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const foco = bloque.focoDelDia;

  const guardar = async () => {
    setGuardando(true);
    try {
      const key = fecha || todayKey();
      const prev = (await getNode(`log/${key}`)) || {};
      await setNode(`log/${key}`, {
        ...prev,
        minutos: prev.minutos || 1,
        autoevaluacion: auto ? Number(auto) : (prev.autoevaluacion || null),
        notas: notas ? `${prev.notas ? prev.notas + '\n' : ''}${notas}` : (prev.notas || ''),
        ts: Date.now(),
      });
      if (identidad?.declaracion?.texto) await marcarCheckNoche({ cumplioFoco, fecha: key });
      onCompletar();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ paddingTop: '0.8rem' }}>
      {foco && (
        <div style={{ marginBottom: '0.9rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tu foco de hoy era:</span>
          <p style={{ margin: '0.2rem 0 0.5rem', fontSize: '0.88rem', fontWeight: 600 }}>“{foco}”</p>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[['sí', true], ['no', false]].map(([label, val]) => (
              <button key={label} onClick={() => setCumplioFoco(val)} style={{
                padding: '0.35rem 0.9rem', borderRadius: '2rem', cursor: 'pointer', font: 'inherit', fontSize: '0.8rem',
                border: `1px solid ${cumplioFoco === val ? 'rgba(48,209,88,0.6)' : 'rgba(255,255,255,0.12)'}`,
                background: cumplioFoco === val ? 'rgba(48,209,88,0.15)' : 'transparent',
                color: 'inherit', fontWeight: cumplioFoco === val ? 700 : 400,
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      <label style={{ display: 'block', marginBottom: '0.7rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Del 1 al 10: ¿contratarías hoy a este closer?</span>
        <input type="number" min={1} max={10} value={auto} onChange={(e) => setAuto(e.target.value)}
          style={{ display: 'block', marginTop: '0.3rem', width: '90px', padding: '0.45rem 0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit' }} />
      </label>
      <label style={{ display: 'block' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Una cosa que ajustás mañana</span>
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)}
          style={{ display: 'block', marginTop: '0.3rem', width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.85rem', resize: 'vertical' }} />
      </label>
      <button className="btn btn-primary" disabled={guardando} onClick={guardar} style={{ marginTop: '0.8rem', fontSize: '0.85rem' }}>
        {guardando ? 'Guardando…' : 'Cerrar el día'}
      </button>
    </div>
  );
}

// ── Vistas auxiliares ───────────────────────────────────────

function BloqueCompleto({ estado, bloque }) {
  return (
    <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {bloque.dias.length} sesiones. Es secuencial: si faltás unos días, retomás donde quedaste.
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {bloque.dias.map(d => {
          const pasado = d.n < (estado.dia || 1);
          const actual = d.n === (estado.dia || 1);
          return (
            <span key={d.n} style={{
              fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '0.4rem',
              background: actual ? 'rgba(48,209,88,0.18)' : 'rgba(255,255,255,0.06)',
              color: actual ? '#30d158' : 'var(--text-muted)',
              opacity: pasado ? 0.45 : 1,
              fontWeight: actual ? 700 : 400,
            }}>{d.etiqueta}</span>
          );
        })}
      </div>
    </div>
  );
}

// Un plan v1 (las 4 semanas fijas) que llegó al final. No muere ahí: se continúa
// como bloque 2 conservando todo el progreso.
function PlanV1Terminado({ plan, onIrA }) {
  const [yendo, setYendo] = useState(false);
  return (
    <div style={{ ...panel, textAlign: 'center' }}>
      <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🏁</div>
      <p style={{ fontWeight: 700, margin: '0 0 0.4rem', fontSize: '1.05rem' }}>Terminaste las cuatro semanas</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.2rem', lineHeight: 1.55 }}>
        Eso vale un nivel. A partir de acá el entrenamiento sigue por bloques: cada uno más
        exigente que el anterior, y se cierra cuando tus métricas dicen que estás listo, no
        cuando pasan los días. Tu progreso y tus cartas quedan como están.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={yendo} onClick={async () => {
          setYendo(true);
          try { await continuarConBloques(plan); } finally { setYendo(false); }
        }}>
          {yendo ? 'Armando…' : 'Seguir con bloques'}
        </button>
        <button className="btn btn-outline" onClick={() => onIrA('patrones')}>Ver mi evolución</button>
      </div>
    </div>
  );
}

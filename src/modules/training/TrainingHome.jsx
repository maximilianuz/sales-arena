import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Flame, BookOpen, Layers, ClipboardList, Loader, Download, GraduationCap, MessageSquare, TrendingUp, Target, RotateCcw, Compass, X } from 'lucide-react';
import { subscribeList, subscribeNode, setNode, getNode, computeStreak, todayKey } from './db';
import { deckStats } from './srs/fsrs';
import { cartasBloqueadas } from './plan/consolidacion';
import { importSeed, isSeeded, DECKS } from './seedImport';
import KnowledgeBase from './kb/KnowledgeBase';
import StudySession from './flashcards/StudySession';
import RoleplaySession from './roleplay/RoleplaySession';
import { agruparErrores, UMBRAL_PATRON } from './audit/patterns';
import Onboarding from './plan/Onboarding';
import PlanHoy from './plan/PlanHoy';
import { marcarBloqueHecho, borrarPlan, marcarPendienteVoz } from './plan/store';
import { subscribeIdentidad, checkDelDia, tieneIdentidad } from './identidad/store';
import IdentidadOnboarding from './identidad/IdentidadOnboarding';
import PanelVisionario from './identidad/PanelVisionario';
import AcquisicionSession from './adquisicion/AcquisicionSession';
import { NODO as NODO_ADQUISICION } from './adquisicion/store';

// Hub del módulo de entrenamiento de closing high ticket. Accesible desde
// Trabajo Individual y desde Practicar Solo. Todo el contenido vive en
// users/{uid}/training — acá solo hay estructura y navegación.

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

const NAV = [
  { id: 'hoy', label: 'Hoy', icon: <Target size={15} /> },
  { id: 'identidad', label: 'Identidad', icon: <Compass size={15} /> },
  { id: 'practicar', label: 'Practicar', icon: <Layers size={15} /> },
  { id: 'patrones', label: 'Patrones', icon: <TrendingUp size={15} /> },
  { id: 'kb', label: 'Base de conocimiento', icon: <BookOpen size={15} /> },
  { id: 'registro', label: 'Registro', icon: <ClipboardList size={15} /> },
];

// `onPracticaVoz` lleva a Práctica individual (la llamada con micrófono, que ya
// existía fuera del módulo). El plan la usa para los bloques de voz: el que
// navega es el lobby, acá solo se deja la marca de qué bloque la pidió.
export default function TrainingHome({ onBack, onPracticaVoz }) {
  const [seeded, setSeeded] = useState(null); // null = verificando
  const [importing, setImporting] = useState(false);
  const [view, setView] = useState('hoy');
  const [studyDeck, setStudyDeck] = useState(undefined); // undefined = no estudiando; '' = todos; id = mazo
  const [roleplay, setRoleplay] = useState(false);
  const [cards, setCards] = useState([]);
  const [srsMap, setSrsMap] = useState({});
  const [logMap, setLogMap] = useState(null);
  const [errores, setErrores] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [principios, setPrincipios] = useState([]);
  const [perfilesProspecto, setPerfilesProspecto] = useState([]);
  // Plan: `undefined` = todavía no llegó el snapshot, `null` = no hay plan.
  const [plan, setPlan] = useState(undefined);
  const [planEstado, setPlanEstado] = useState(undefined);
  const [onboarding, setOnboarding] = useState(false);
  // Módulo 0. `undefined` = todavía no llegó el snapshot, `null` = no escribió
  // su declaración. La distinción importa: sin ella, quien SÍ tiene identidad
  // vería el gate parpadear en cada carga.
  const [identidad, setIdentidad] = useState(undefined);
  const [identidadWizard, setIdentidadWizard] = useState(false);
  const [ocultarAvisoIdentidad, setOcultarAvisoIdentidad] = useState(false);
  // Bloque del plan que se está ejecutando en pantalla completa.
  const [bloqueActivo, setBloqueActivo] = useState(null);
  // Estado del currículum y el lote de adquisición abierto (si hay).
  const [progresoUnidad, setProgresoUnidad] = useState({});
  const [cursoAdquisicion, setCursoAdquisicion] = useState(null);

  useEffect(() => { isSeeded().then(setSeeded).catch(() => setSeeded(false)); }, []);
  useEffect(() => subscribeList('cards', setCards), []);
  useEffect(() => subscribeNode('srs', (v) => setSrsMap(v || {})), []);
  useEffect(() => subscribeNode('log', setLogMap), []);
  useEffect(() => subscribeList('errores', setErrores), []);
  useEffect(() => subscribeList('sesiones', setSesiones), []);
  useEffect(() => subscribeList('kb/principios', setPrincipios), []);
  useEffect(() => subscribeList('kb/perfiles', setPerfilesProspecto), []);
  useEffect(() => subscribeNode('plan', (v) => setPlan(v || null)), []);
  useEffect(() => subscribeNode('planEstado', (v) => setPlanEstado(v || null)), []);
  useEffect(() => subscribeIdentidad(setIdentidad), []);
  useEffect(() => subscribeNode('progresoUnidad', (v) => setProgresoUnidad(v || {})), []);
  useEffect(() => subscribeNode(NODO_ADQUISICION, (v) => setCursoAdquisicion(v || null)), []);

  const streak = useMemo(() => computeStreak(logMap), [logMap]);
  // Las cartas en pausa por consolidación. El panel tiene que contar lo MISMO
  // que abre la sesión: sin esto el mazo diría "18 para repasar" y la sesión
  // abriría 4, que es peor que no mostrar el número.
  const bloqueadas = useMemo(() => cartasBloqueadas(progresoUnidad), [progresoUnidad]);
  const hoy = logMap?.[todayKey()];

  // Contexto con el que se hidratan los bloques del día. Memoizado porque
  // PlanHoy lo usa como dependencia para recalcular la lista.
  //
  // `sesiones` no está solo para mostrar: es de donde salen las métricas que
  // deciden si el bloque cierra y sube de nivel. Sin ellas, el cierre evaluaría
  // contra un historial vacío y prorrogaría siempre.
  const fechaHoy = todayKey();
  const planCtx = useMemo(
    () => ({
      cards, srsMap, errores, principios, perfiles: perfilesProspecto, sesiones,
      identidad, checkHoy: checkDelDia(identidad, fechaHoy), fecha: fechaHoy,
      // `logMap` lo usa el recordatorio de continuidad para saber hace cuántos
      // días que no entrenás — es el mismo log del que sale la racha.
      logMap,
      // Para la franja de adquisición: qué unidades ya pasaron y cuál es el lote
      // abierto. Un lote a medio recorrer manda sobre el currículum — si no, al
      // día siguiente el bloque propondría material nuevo y el anterior quedaría
      // colgado sin cerrar nunca.
      progresoUnidad, cursoAdquisicion,
    }),
    [cards, srsMap, errores, principios, perfilesProspecto, sesiones, identidad, fechaHoy, logMap, progresoUnidad, cursoAdquisicion]
  );

  const handleImport = async () => {
    setImporting(true);
    try {
      await importSeed();
      setSeeded(true);
    } finally {
      setImporting(false);
    }
  };

  // Un bloque del plan corriendo a pantalla completa. Quién decide que el
  // bloque quedó cumplido es la propia sesión (onDone), no el hecho de haberla
  // abierto: entrar y salir no tacha nada.
  if (bloqueActivo) {
    const cerrar = () => setBloqueActivo(null);
    const hecho = () => { marcarBloqueHecho(bloqueActivo.id).catch(() => {}); };
    return (
      <FullScreen>
        {bloqueActivo.tipo === 'roleplay'
          ? <RoleplaySession perfilInicial={bloqueActivo.perfil} onBack={cerrar} onDone={hecho} />
          : bloqueActivo.tipo === 'adquisicion'
            ? <AcquisicionSession bloque={bloqueActivo} onBack={cerrar} onDone={hecho} />
            : <StudySession deckId={bloqueActivo.mazo || null} limite={bloqueActivo.limite} onBack={cerrar} onDone={hecho} />}
      </FullScreen>
    );
  }

  if (roleplay) {
    return <FullScreen><RoleplaySession onBack={() => setRoleplay(false)} /></FullScreen>;
  }

  if (studyDeck !== undefined) {
    // StudySession trae su propia barra superior con botón de volver.
    return <FullScreen><StudySession deckId={studyDeck || null} onBack={() => setStudyDeck(undefined)} /></FullScreen>;
  }

  return (
    <Page onBack={onBack} header={
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <GraduationCap size={20} color="#30d158" />
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Entrenamiento Closer</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: streak > 0 ? '#ff9f0a' : 'var(--text-muted)' }}>
          <Flame size={16} /> {streak} {streak === 1 ? 'día' : 'días'}
        </div>
      </div>
    }>
      {seeded === null && <p style={{ color: 'var(--text-muted)' }}><Loader size={14} className="spin" /> Cargando…</p>}

      {seeded === false && (
        <div style={{ ...panel, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>📦</div>
          <p style={{ fontWeight: 700, margin: '0 0 0.4rem' }}>Importar contenido inicial</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            70 flashcards en 4 mazos, 15 principios, la oferta "Método Reinicio" con su guion
            por fases y 7 perfiles de prospecto. Después podés editar o borrar todo desde
            la Base de conocimiento.
          </p>
          <button className="btn btn-primary" disabled={importing} onClick={handleImport} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {importing ? <><Loader size={14} className="spin" /> Importando…</> : <><Download size={15} /> Importar y empezar</>}
          </button>
        </div>
      )}

      {seeded === true && (
        <>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.45rem 0.9rem', borderRadius: '2rem', cursor: 'pointer', font: 'inherit',
                fontSize: '0.82rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)',
                background: view === n.id ? 'linear-gradient(135deg,#30d158,#06b6d4)' : 'rgba(255,255,255,0.04)',
                color: view === n.id ? '#04241a' : 'var(--text-muted)',
              }}>{n.icon}{n.label}</button>
            ))}
          </div>

          {view === 'practicar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {hoy?.minutos ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Hoy: {hoy.minutos} min de práctica registrados.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Todavía no practicaste hoy. Una sesión corta sostiene la racha.
                </p>
              )}

              {DECKS.map(d => {
                const deckCards = cards.filter(c => c.mazo === d.id);
                const st = deckStats(deckCards, srsMap, undefined, { bloqueadas });
                const pendientes = st.vencidas + st.nuevas;
                return (
                  <div key={d.id} style={{ ...panel, display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.85rem 1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: `rgb(${d.color})` }}>{d.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {st.total} cartas · {st.vencidas} vencidas · {st.nuevas} nuevas · {st.aprendidas} al día
                        {st.enPausa > 0 && <> · <span style={{ color: '#ff9f0a' }}>{st.enPausa} en pausa</span></>}
                      </div>
                    </div>
                    <button className="btn btn-outline" disabled={pendientes === 0} onClick={() => setStudyDeck(d.id)} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {pendientes === 0 ? 'Al día ✓' : `Practicar (${pendientes})`}
                    </button>
                  </div>
                );
              })}

              <button className="btn btn-primary" onClick={() => setStudyDeck('')} style={{ marginTop: '0.3rem' }}>
                ▶ Sesión mixta (todos los mazos)
              </button>

              <div style={{ ...panel, marginTop: '0.6rem', borderColor: 'rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.35rem' }}>
                  <MessageSquare size={16} color="#a78bfa" /> Simulador de roleplay
                </div>
                <p style={{ margin: '0 0 0.8rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Llamada completa contra un perfil de prospecto. Con <strong>rapid-cycle</strong>: si cometés
                  un error grave te corta y te hace rehacer ese turno. Al terminar, auditoría con las 5 métricas.
                </p>
                <button className="btn btn-primary" onClick={() => setRoleplay(true)} style={{ fontSize: '0.85rem' }}>
                  Empezar una llamada
                </button>
              </div>
            </div>
          )}

          {view === 'hoy' && (
            identidadWizard ? (
              <IdentidadOnboarding
                identidad={identidad}
                onListo={() => { setIdentidadWizard(false); if (!plan) setOnboarding(true); }}
                onCancel={() => setIdentidadWizard(false)}
              />
            ) : onboarding ? (
              <Onboarding onListo={() => setOnboarding(false)} onCancel={() => setOnboarding(false)} />
            ) : plan === undefined || planEstado === undefined || identidad === undefined ? (
              <p style={{ color: 'var(--text-muted)' }}><Loader size={14} className="spin" /> Cargando tu plan…</p>
            ) : !plan && !tieneIdentidad(identidad) ? (
              // Usuario nuevo: primero para qué entrena, después cómo. El gate es
              // duro SOLO acá — quien ya tiene un plan andando no se despierta
              // con la app trabada pidiéndole que escriba una declaración.
              <SinIdentidad onEmpezar={() => setIdentidadWizard(true)} onSaltear={() => setOnboarding(true)} />
            ) : !plan || !planEstado ? (
              <SinPlan onEmpezar={() => setOnboarding(true)} />
            ) : (
              <>
                {!tieneIdentidad(identidad) && !ocultarAvisoIdentidad && (
                  <AvisoIdentidad
                    onEmpezar={() => setIdentidadWizard(true)}
                    onCerrar={() => setOcultarAvisoIdentidad(true)}
                  />
                )}
                <PlanHoy
                  plan={plan}
                  estado={planEstado}
                  ctx={planCtx}
                  onLanzar={setBloqueActivo}
                  onLanzarVoz={async (b) => {
                    await marcarPendienteVoz(b.id);
                    onPracticaVoz?.();
                  }}
                  onIrA={setView}
                />
                <button
                  onClick={async () => { await borrarPlan(); setOnboarding(true); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    font: 'inherit', fontSize: '0.76rem', padding: '1rem 0 0', display: 'flex',
                    alignItems: 'center', gap: '0.3rem', margin: '0 auto',
                  }}
                >
                  <RotateCcw size={12} /> Rehacer el cuestionario
                </button>
              </>
            )
          )}

          {view === 'identidad' && (
            identidadWizard
              ? <IdentidadOnboarding identidad={identidad} onListo={() => setIdentidadWizard(false)} onCancel={() => setIdentidadWizard(false)} />
              : <PanelVisionario identidad={identidad} onEmpezar={() => setIdentidadWizard(true)} />
          )}

          {view === 'patrones' && <PatronesView errores={errores} sesiones={sesiones} principios={principios} />}
          {view === 'kb' && (
            <>
              <ActualizarContenido importing={importing} onImport={handleImport} />
              <KnowledgeBase />
            </>
          )}
          {view === 'registro' && <RegistroView logMap={logMap} />}
        </>
      )}
    </Page>
  );
}

// Patrones: qué principios violás una y otra vez, y cómo evolucionan las
// métricas entre sesiones. Acá es donde se ve si estás mejorando o repitiendo
// el mismo error con otra ropa.
function PatronesView({ errores, sesiones, principios }) {
  const principiosMap = useMemo(() => Object.fromEntries(principios.map(p => [p.id, p])), [principios]);
  const grupos = useMemo(() => agruparErrores(errores), [errores]);
  const roleplays = useMemo(
    () => sesiones.filter(s => s.tipo === 'roleplay' && s.metricas).sort((a, b) => (a.ts || 0) - (b.ts || 0)),
    [sesiones]
  );

  if (roleplays.length === 0 && grupos.length === 0) {
    return (
      <div style={panel}>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55 }}>
          Todavía no hay datos. Hacé una llamada en el <strong>simulador</strong> y acá vas a ver
          tus métricas sesión a sesión y los principios que más te cuestan.
        </p>
      </div>
    );
  }

  const ultimas = roleplays.slice(-8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {grupos.length > 0 && (
        <div style={panel}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.7rem' }}>
            Errores recurrentes
          </div>
          {grupos.map(g => {
            const p = principiosMap[g.principioId];
            const esPatron = g.cantidad >= UMBRAL_PATRON;
            return (
              <div key={g.principioId} style={{ padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600 }}>{p?.nombre || g.principioId}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: esPatron ? '#ff453a' : '#ff9f0a' }}>
                    {g.cantidad}×{esPatron ? ' · patrón' : ''}
                  </span>
                </div>
                {p?.resumen && <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.resumen}</p>}
                {esPatron && (
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: '#a78bfa' }}>
                    Ya tenés una carta automática de esto en el mazo de Principios.
                  </p>
                )}
              </div>
            );
          })}
          <p style={{ margin: '0.7rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            A las {UMBRAL_PATRON} repeticiones el sistema genera una flashcard automática y la mete en el ciclo de repaso.
          </p>
        </div>
      )}

      {ultimas.length > 0 && (
        <div style={panel}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.7rem' }}>
            Evolución (últimas {ultimas.length} llamadas)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '420px' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.3rem 0.4rem 0.5rem 0', fontWeight: 600 }}>Fecha</th>
                  <th style={{ padding: '0.3rem 0.4rem 0.5rem', fontWeight: 600 }}>Perfil</th>
                  <th style={{ padding: '0.3rem 0.4rem 0.5rem', fontWeight: 600 }}>Habla</th>
                  <th style={{ padding: '0.3rem 0.4rem 0.5rem', fontWeight: 600 }}>Abiertas</th>
                  <th style={{ padding: '0.3rem 0.4rem 0.5rem', fontWeight: 600 }}>Precio</th>
                  <th style={{ padding: '0.3rem 0 0.5rem 0.4rem', fontWeight: 600 }}>Nota</th>
                </tr>
              </thead>
              <tbody>
                {ultimas.map(s => {
                  const m = s.metricas || {};
                  return (
                    <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.4rem 0.4rem 0.4rem 0', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {s.ts ? new Date(s.ts).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px', whiteSpace: 'nowrap' }}>{s.perfilNombre || '—'}</td>
                      <td style={{ padding: '0.4rem', color: m.ratioHabla?.ok ? '#30d158' : '#ff9f0a', fontWeight: 700 }}>{m.ratioHabla?.porcentajeCloser ?? '—'}%</td>
                      <td style={{ padding: '0.4rem', color: m.preguntas?.ok ? '#30d158' : '#ff9f0a', fontWeight: 700 }}>{m.preguntas?.porcentajeAbiertas ?? '—'}%</td>
                      <td style={{ padding: '0.4rem', color: m.precioAntesDeDolor?.ok ? '#30d158' : '#ff453a', fontWeight: 700 }}>{m.precioAntesDeDolor?.ok ? '✓' : '✗'}</td>
                      <td style={{ padding: '0.4rem 0 0.4rem 0.4rem', fontWeight: 700 }}>{s.feedback?.puntaje ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '0.7rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Objetivo: habla ≤45%, abiertas ≥70%, precio siempre ✓. Las métricas se calculan con reglas, no las estima la IA.
          </p>
        </div>
      )}
    </div>
  );
}

// Registro de práctica: historial diario, autoevaluación y notas del día.
function RegistroView({ logMap }) {
  const key = todayKey();
  const hoy = logMap?.[key] || {};
  const [auto, setAuto] = useState(hoy.autoevaluacion || '');
  const [notas, setNotas] = useState(hoy.notas || '');
  const [saved, setSaved] = useState(false);

  const guardar = async () => {
    const prev = (await getNode(`log/${key}`)) || {};
    await setNode(`log/${key}`, {
      ...prev,
      minutos: prev.minutos || 0,
      autoevaluacion: auto ? Number(auto) : null,
      notas,
      ts: Date.now(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const dias = Object.entries(logMap || {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={panel}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Hoy — {key}</div>
        <label style={{ display: 'block', marginBottom: '0.7rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Autoevaluación (1-10): ¿contratarías hoy a este closer?</span>
          <input type="number" min={1} max={10} value={auto} onChange={(e) => setAuto(e.target.value)}
            style={{ display: 'block', marginTop: '0.3rem', width: '90px', padding: '0.45rem 0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit' }} />
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Notas del día (qué practiqué, qué me costó, qué ajusto mañana)</span>
          <textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)}
            style={{ display: 'block', marginTop: '0.3rem', width: '100%', boxSizing: 'border-box', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.85rem', resize: 'vertical' }} />
        </label>
        <button className="btn btn-outline" onClick={guardar} style={{ marginTop: '0.7rem', fontSize: '0.82rem' }}>
          {saved ? '✓ Guardado' : 'Guardar'}
        </button>
      </div>

      <div style={panel}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Últimos 30 días</div>
        {dias.length === 0 && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin registros todavía.</p>}
        {dias.map(([d, v]) => (
          <div key={d} style={{ display: 'flex', gap: '0.7rem', alignItems: 'baseline', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.83rem' }}>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{d}</span>
            <span style={{ fontWeight: 700 }}>{v.minutos || 0} min</span>
            {v.autoevaluacion && <span style={{ color: '#22d3ee' }}>auto: {v.autoevaluacion}/10</span>}
            {v.notas && <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.notas}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Lo PRIMERO que ve alguien que recién importó el contenido: el Módulo 0.
// Primero para qué entrena, después cómo. Se puede saltear —bloquear la puerta
// de entrada con cuatro pantallas de escritura es la forma más rápida de que no
// vuelvan— pero el default es escribirla.
function SinIdentidad({ onEmpezar, onSaltear }) {
  return (
    <div style={{ ...panel, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🧭</div>
      <p style={{ fontWeight: 700, margin: '0 0 0.4rem', fontSize: '1.02rem' }}>Antes del plan: para qué entrenás</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.1rem', lineHeight: 1.55 }}>
        Cinco pantallas, cuatro minutos. Escribís tu declaración —quién sos vendiendo, qué
        sostenés, cómo trabajás, con qué te comprometés— y a dónde vas, con números y fecha.
        Después aparece cada mañana arriba de tu día. El que entrena sin saber para qué,
        abandona en la tercera semana.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onEmpezar}>Escribir mi declaración</button>
        <button className="btn btn-outline" onClick={onSaltear} style={{ fontSize: '0.85rem' }}>
          Ir directo al plan
        </button>
      </div>
    </div>
  );
}

// Para quien ya venía usando el módulo antes de que existiera el Módulo 0: se
// avisa una vez y se puede cerrar. No se le traba el plan que ya está andando.
function AvisoIdentidad({ onEmpezar, onCerrar }) {
  return (
    <div style={{
      ...panel, padding: '0.85rem 1rem', marginBottom: '0.8rem',
      borderColor: 'rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.06)',
      display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
    }}>
      <Compass size={16} color="#22d3ee" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.2rem' }}>Te falta tu declaración</div>
        <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Cuatro minutos. Después aparece cada mañana arriba de tu día, con tus metas.
        </p>
        <button className="btn btn-outline" onClick={onEmpezar} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
          Escribirla
        </button>
      </div>
      <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        <X size={15} />
      </button>
    </div>
  );
}

// Estado vacío de "Hoy": lo primero que ve alguien que recién importó el
// contenido. La promesa tiene que ser concreta —seis preguntas, un plan— o el
// botón se lee como otro menú más.
function SinPlan({ onEmpezar }) {
  return (
    <div style={{ ...panel, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🎯</div>
      <p style={{ fontWeight: 700, margin: '0 0 0.4rem', fontSize: '1.02rem' }}>Armá tu plan de entrenamiento</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.2rem', lineHeight: 1.6 }}>
        Seis preguntas y listo. Después, cada vez que entres vas a ver <strong>qué te toca hoy</strong> y
        un solo botón para arrancar — sin elegir mazo, sin elegir prospecto, sin decidir nada.
        Cuatro semanas, ajustadas a los días y minutos que tengas de verdad.
      </p>
      <button className="btn btn-primary" onClick={onEmpezar}>Responder las 6 preguntas</button>
    </div>
  );
}

// Re-importar el seed. Hace falta porque el botón de importar solo aparece la
// primera vez, y cuando el contenido de los mazos crece —cartas nuevas, mazos
// nuevos— quien ya había importado se quedaba sin forma de recibirlo.
//
// Es seguro: `importSeed` pisa el CONTENIDO con la versión del seed pero nunca
// toca srs/ ni log/, así que el progreso de repaso y la racha se conservan.
function ActualizarContenido({ importing, onImport }) {
  const [hecho, setHecho] = useState(false);
  const correr = async () => {
    await onImport();
    setHecho(true);
    setTimeout(() => setHecho(false), 4000);
  };
  return (
    <div style={{ ...panel, marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '220px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Actualizar contenido</div>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Trae las cartas y mazos nuevos del contenido base. Reemplaza lo que hayas
          editado de las cartas del seed, pero <strong>no toca tu progreso de repaso ni la racha</strong>.
        </p>
      </div>
      <button className="btn btn-outline" disabled={importing} onClick={correr}
        style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
        {importing ? <><Loader size={13} className="spin" /> Importando…</> : hecho ? '✓ Actualizado' : <><Download size={14} /> Actualizar</>}
      </button>
    </div>
  );
}

function FullScreen({ children }) {
  return (
    <div className="app-container" style={{ alignItems: 'stretch', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '1.2rem 1rem 3rem', boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  );
}

function Page({ onBack, header, children }) {
  return (
    <div className="app-container" style={{ alignItems: 'stretch', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '1.2rem 1rem 3rem', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.1rem' }}>
          <button className="btn btn-outline" onClick={onBack} style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}><ArrowLeft size={15} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>{header || null}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader, Send, AlertTriangle, RotateCcw, Flag, Zap, ZapOff } from 'lucide-react';
import { auth } from '../../../utils/db';
import { subscribeList, subscribeNode, pushItem, logActivity } from '../db';
import { buildProspectPrompt, buildRapidCyclePrompt } from './prompt';
import { computeMetrics } from '../audit/metrics';
import { registrarErroresYDetectarPatrones } from '../audit/patterns';
import SessionReport from '../audit/SessionReport';

// Simulador de roleplay. El prospecto lo actúa la IA a partir de un perfil de la
// Base de conocimiento — ningún personaje está en el código.
//
// Rapid-cycle: si el auditor detecta un error grave en tu turno, la llamada se
// CORTA ahí, te muestra qué hiciste mal y te hace rehacer ESE turno. Es práctica
// deliberada: repetir el momento exacto que fallaste, no toda la llamada.

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

const EMOTION_LABEL = {
  neutral: 'neutral', interesado: 'interesado', esceptico: 'escéptico',
  molesto: 'molesto', entusiasmado: 'entusiasmado', dudoso: 'dudoso', apurado: '⏱️ apurado',
};

// `perfilInicial` lo manda el plan: salta el selector y arranca la llamada con
// el prospecto que le toca a este bloque. `onDone` avisa que el bloque quedó
// cumplido, y se dispara cuando la llamada termina y hay reporte.
export default function RoleplaySession({ onBack, perfilInicial = null, onDone = null }) {
  const [perfiles, setPerfiles] = useState([]);
  const [principios, setPrincipios] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [fasesMap, setFasesMap] = useState({});
  const [elegido, setElegido] = useState(perfilInicial);

  useEffect(() => subscribeList('kb/perfiles', setPerfiles), []);
  useEffect(() => subscribeList('kb/principios', setPrincipios), []);
  useEffect(() => subscribeList('kb/ofertas', setOfertas), []);
  useEffect(() => subscribeNode('kb/fases', (v) => setFasesMap(v || {})), []);

  const oferta = ofertas[0] || null;
  const fases = useMemo(() => {
    if (!oferta) return [];
    const raw = fasesMap[oferta.id] || {};
    return Object.entries(raw).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [fasesMap, oferta]);

  if (elegido) {
    return (
      <LiveCall
        perfil={elegido}
        oferta={oferta}
        fases={fases}
        principios={principios}
        onBack={() => setElegido(null)}
        onExit={onBack}
        onDone={onDone}
      />
    );
  }

  const ordenados = [...perfiles].sort((a, b) => (a.dificultad || 3) - (b.dificultad || 3));

  return (
    <Shell onBack={onBack} title="Simulador de roleplay">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
        Elegí con quién practicar. Cada perfil tiene una <strong>objeción real oculta</strong> que solo
        aparece si te la ganás. Están ordenados de menor a mayor dificultad.
      </p>
      {perfiles.length === 0 && (
        <div style={panel}><p style={{ margin: 0, fontSize: '0.88rem' }}>No hay perfiles cargados. Importá el contenido inicial o creá uno en la Base de conocimiento.</p></div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {ordenados.map(p => (
          <button key={p.id} onClick={() => setElegido(p)} style={{
            ...panel, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit',
            display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.85rem 1rem',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.nombre}{p.edad ? `, ${p.edad}` : ''}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {p.arquetipo}{p.ocupacion ? ` · ${p.ocupacion}` : ''}
              </div>
            </div>
            <div style={{ flexShrink: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              <div>{'●'.repeat(p.dificultad || 3)}{'○'.repeat(5 - (p.dificultad || 3))}</div>
              <div style={{ marginTop: '0.2rem' }}>dificultad</div>
            </div>
          </button>
        ))}
      </div>
    </Shell>
  );
}

function LiveCall({ perfil, oferta, fases, principios, onBack, onExit, onDone }) {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState({ temperature: 35, trust: 25, patience: 70 });
  const [faseId, setFaseId] = useState(fases[0]?.id || null);
  const [rapidCycleOn, setRapidCycleOn] = useState(true);
  const [corte, setCorte] = useState(null);        // error que cortó la llamada
  const [erroresEnVivo, setErroresEnVivo] = useState([]);
  const [error, setError] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const [reporte, setReporte] = useState(null);
  const inicioRef = useRef(null);
  const scrollRef = useRef(null);

  // El reloj arranca al montar, no durante el render (que puede repetirse).
  useEffect(() => { inicioRef.current = Date.now(); }, []);

  const principiosMap = useMemo(() => Object.fromEntries(principios.map(p => [p.id, p])), [principios]);
  const faseActual = fases.find(f => f.id === faseId) || null;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes, corte]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || enviando) return;
    setError('');
    setEnviando(true);

    const nuevoTurno = { role: 'closer', content: texto, ts: Date.now() };
    const historial = [...mensajes, nuevoTurno];
    setMensajes(historial);
    setInput('');

    try {
      const resp = await fetch('/api/training-roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid,
          system: buildProspectPrompt({ perfil, oferta, fases, faseActualId: faseId }),
          messages: historial.map(m => ({ role: m.role === 'closer' ? 'user' : 'assistant', content: m.content })),
          rapidCycle: rapidCycleOn && principios.length
            ? { system: buildRapidCyclePrompt({ principios, fase: faseActual }), turnoCloser: texto }
            : null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Error del simulador');

      if (data.error) {
        // Rapid-cycle: cortamos ANTES de mostrar la respuesta del prospecto.
        // El turno malo queda visible para que veas qué escribiste.
        setCorte({ ...data.error, respuestaDescartada: data.reply });
        setErroresEnVivo(prev => [...prev, data.error]);
      } else {
        setMensajes([...historial, { role: 'prospecto', content: data.reply, ts: Date.now(), emotion: data.emotion, thought: data.thought }]);
        setEstado(data.state);
        if (data.outcome !== 'ongoing') setCorte({ finDeLlamada: data.outcome });
      }
    } catch (e) {
      setError(e.message);
      // Devolvemos el texto al input para que no se pierda lo que escribiste.
      setMensajes(mensajes);
      setInput(texto);
    } finally {
      setEnviando(false);
    }
  };

  // Rehacer el turno: sacamos tu último mensaje y volvés a escribirlo.
  const rehacer = () => {
    const ultimo = mensajes[mensajes.length - 1];
    setMensajes(mensajes.slice(0, -1));
    setInput(ultimo?.role === 'closer' ? ultimo.content : '');
    setCorte(null);
  };

  const continuarIgual = () => {
    // Seguís sin rehacer: el error queda registrado igual (cuenta para el patrón).
    setCorte(null);
  };

  const terminar = async () => {
    if (cerrando) return;
    setCerrando(true);
    setError('');
    const minutos = Math.max(1, Math.round((Date.now() - (inicioRef.current || Date.now())) / 60000));
    const metricas = computeMetrics(mensajes);

    let feedback = null;
    try {
      const resp = await fetch('/api/training-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid,
          transcript: mensajes.map(m => ({ role: m.role, content: m.content })),
          principios: principios.map(p => ({ id: p.id, nombre: p.nombre, resumen: p.resumen, errorTipico: p.errorTipico })),
          metricas,
          perfil: { nombre: perfil.nombre, arquetipo: perfil.arquetipo, objecionOculta: perfil.objecionOculta },
          erroresEnVivo,
        }),
      });
      const data = await resp.json();
      if (resp.ok) feedback = data;
      else setError(`${data?.error || 'El auditor no respondió'}. Las métricas de abajo se calcularon igual.`);
    } catch (e) {
      // Sin auditor: las métricas son deterministas, así que el reporte sirve igual.
      setError(`${e.message}. Las métricas de abajo se calcularon igual.`);
    }

    // Los errores del auditor final + los del rapid-cycle alimentan el detector
    // de patrones. 3 veces el mismo principio → carta automática.
    let nuevasCartas = [];
    try {
      const sesionId = await pushItem('sesiones', {
        tipo: 'roleplay',
        ts: Date.now(),
        perfilId: perfil.id,
        perfilNombre: perfil.nombre,
        minutos,
        mensajes: mensajes.map(m => ({ role: m.role, content: m.content, ts: m.ts || null })),
        metricas,
        feedback,
        erroresEnVivo,
      });
      nuevasCartas = await registrarErroresYDetectarPatrones(
        [...erroresEnVivo, ...(feedback?.errores || [])],
        { sesionId, principiosMap }
      );
      await logActivity({ minutos, tipo: 'roleplay', detalle: `Roleplay con ${perfil.nombre}` });
    } catch { /* el reporte se muestra igual aunque falle el guardado */ }

    setReporte({ metricas, feedback, nuevasCartas });
    onDone?.(); // la llamada terminó: el bloque del plan queda cumplido
    setCerrando(false);
  };

  if (reporte) {
    return (
      <SessionReport
        {...reporte}
        principiosMap={principiosMap}
        perfil={perfil}
        avisoError={error}
        onVolver={onExit}
        onRepetir={onBack}
      />
    );
  }

  return (
    <Shell onBack={onBack} title={`${perfil.nombre} · ${perfil.arquetipo}`}>
      {/* Estado del prospecto */}
      <div style={{ ...panel, padding: '0.7rem 1rem', marginBottom: '0.8rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Barra label="Interés" valor={estado.temperature} color="255,159,10" />
        <Barra label="Confianza" valor={estado.trust} color="48,209,88" />
        <Barra label="Paciencia" valor={estado.patience} color="34,211,238" />
      </div>

      {/* Controles de sesión */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.8rem' }}>
        {fases.length > 0 && (
          <select value={faseId || ''} onChange={(e) => setFaseId(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.8rem' }}>
            {fases.map(f => <option key={f.id} value={f.id}>{f.orden}. {f.nombre}</option>)}
          </select>
        )}
        <button onClick={() => setRapidCycleOn(v => !v)} title="Corta la llamada cuando cometés un error grave y te hace rehacer el turno"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.7rem',
            borderRadius: '2rem', cursor: 'pointer', font: 'inherit', fontSize: '0.78rem', fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.12)',
            background: rapidCycleOn ? 'rgba(255,159,10,0.15)' : 'rgba(255,255,255,0.04)',
            color: rapidCycleOn ? '#ff9f0a' : 'var(--text-muted)',
          }}>
          {rapidCycleOn ? <Zap size={13} /> : <ZapOff size={13} />} Rapid-cycle
        </button>
        <button className="btn btn-outline" onClick={terminar} disabled={cerrando || mensajes.length === 0}
          style={{ marginLeft: 'auto', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {cerrando ? <><Loader size={13} className="spin" /> Auditando…</> : <><Flag size={13} /> Terminar y auditar</>}
        </button>
      </div>

      {/* Conversación */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.9rem' }}>
        {mensajes.length === 0 && (
          <div style={{ ...panel, borderStyle: 'dashed' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Arrancá vos, como en una llamada real. Fase actual: <strong>{faseActual?.nombre || '—'}</strong>
              {faseActual?.objetivo ? ` — ${faseActual.objetivo}` : ''}
            </p>
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} style={{
            ...panel, padding: '0.7rem 0.9rem',
            alignSelf: m.role === 'closer' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            background: m.role === 'closer' ? 'rgba(48,209,88,0.10)' : 'rgba(255,255,255,0.04)',
            borderColor: m.role === 'closer' ? 'rgba(48,209,88,0.25)' : 'rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              {m.role === 'closer' ? 'Vos' : perfil.nombre}{m.emotion ? ` · ${EMOTION_LABEL[m.emotion] || m.emotion}` : ''}
            </div>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Corte por rapid-cycle */}
      {corte && !corte.finDeLlamada && (
        <div style={{ ...panel, borderColor: 'rgba(255,159,10,0.45)', background: 'rgba(255,159,10,0.06)', marginBottom: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#ff9f0a', marginBottom: '0.5rem' }}>
            <AlertTriangle size={15} /> Corte — rehacé este turno
          </div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', lineHeight: 1.5 }}>{corte.que}</p>
          {corte.comoRehacerlo && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', lineHeight: 1.5, color: '#22d3ee' }}>
              <strong>Probá con:</strong> {corte.comoRehacerlo}
            </p>
          )}
          {corte.principioId && principiosMap[corte.principioId] && (
            <p style={{ margin: '0 0 0.8rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Principio: <strong>{principiosMap[corte.principioId].nombre}</strong> — {principiosMap[corte.principioId].resumen}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={rehacer} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <RotateCcw size={14} /> Rehacer el turno
            </button>
            <button className="btn btn-outline" onClick={continuarIgual} style={{ fontSize: '0.82rem' }}>
              Seguir igual
            </button>
          </div>
        </div>
      )}

      {corte?.finDeLlamada && (
        <div style={{ ...panel, marginBottom: '0.9rem', borderColor: corte.finDeLlamada === 'closed' ? 'rgba(48,209,88,0.45)' : 'rgba(255,69,58,0.45)' }}>
          <p style={{ margin: '0 0 0.7rem', fontWeight: 700 }}>
            {corte.finDeLlamada === 'closed' ? 'El prospecto decidió avanzar.' : 'El prospecto se cayó.'}
          </p>
          <button className="btn btn-primary" onClick={terminar} disabled={cerrando} style={{ fontSize: '0.82rem' }}>
            {cerrando ? 'Auditando…' : 'Ver auditoría'}
          </button>
        </div>
      )}

      {error && (
        <p style={{ color: '#ff9f0a', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
          <AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> {error}
        </p>
      )}

      {/* Input */}
      {!corte?.finDeLlamada && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            rows={2}
            disabled={enviando || !!corte}
            placeholder={corte ? 'Rehacé el turno o seguí igual…' : 'Lo que le decís… (Enter para enviar)'}
            style={{ flex: 1, boxSizing: 'border-box', padding: '0.7rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.9rem', resize: 'vertical', opacity: corte ? 0.5 : 1 }}
          />
          <button className="btn btn-primary" onClick={enviar} disabled={enviando || !input.trim() || !!corte} style={{ padding: '0.7rem 0.9rem' }}>
            {enviando ? <Loader size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>
      )}
    </Shell>
  );
}

function Barra({ label, valor, color }) {
  return (
    <div style={{ flex: '1 1 100px', minWidth: '90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
        <span>{label}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
      </div>
      <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${valor}%`, height: '100%', background: `rgb(${color})`, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function Shell({ onBack, title, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
        <button aria-label="Volver" className="btn btn-outline" onClick={onBack} style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}><ArrowLeft size={15} /></button>
        <div style={{ fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader, Check } from 'lucide-react';
import { setNode } from '../db';
import { PREGUNTAS } from './questions';
import { generarPlan, estadoInicial } from './generator';

// Wizard del onboarding: una pregunta por pantalla. Nada de un formulario largo
// con seis campos — la idea es que responder se sienta como avanzar, no como
// completar un trámite.
//
// Al terminar escribe tres nodos: perfil (las respuestas), plan (la estructura
// generada) y planEstado (dónde estás parado). El plan se genera acá, en el
// cliente, sin llamada a red.

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

export default function Onboarding({ onListo, onCancel }) {
  const [paso, setPaso] = useState(0);
  const [resp, setResp] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const pregunta = PREGUNTAS[paso];
  const valor = resp[pregunta.key];
  const respondida = pregunta.multiple ? true : valor !== undefined;
  const esUltima = paso === PREGUNTAS.length - 1;

  const elegir = (v) => {
    if (pregunta.multiple) {
      const actual = resp[pregunta.key] || [];
      const ya = actual.includes(v);
      let siguiente = ya ? actual.filter(x => x !== v) : [...actual, v];
      // Al pasarse del máximo, se descarta la más vieja en vez de bloquear el
      // click: bloquear sin explicar se siente roto.
      if (pregunta.max && siguiente.length > pregunta.max) siguiente = siguiente.slice(-pregunta.max);
      setResp({ ...resp, [pregunta.key]: siguiente });
    } else {
      setResp({ ...resp, [pregunta.key]: v });
      if (!esUltima) setPaso(paso + 1); // en las de opción única, elegir ya avanza
    }
  };

  const terminar = async () => {
    setGuardando(true);
    setError('');
    try {
      const perfil = { ...resp, areas: resp.areas || [], creadoAt: Date.now() };
      const plan = generarPlan(perfil);
      await setNode('perfil', perfil);
      await setNode('plan', plan);
      await setNode('planEstado', estadoInicial());
      onListo?.();
    } catch (e) {
      setError(e.message || 'No se pudo guardar el plan');
      setGuardando(false);
    }
  };

  const atras = () => (paso === 0 ? onCancel?.() : setPaso(paso - 1));

  return (
    <div>
      {/* Progreso */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.2rem' }}>
        {PREGUNTAS.map((p, i) => (
          <div key={p.key} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: i <= paso ? 'linear-gradient(90deg,#30d158,#06b6d4)' : 'rgba(255,255,255,0.1)',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={atras} disabled={guardando} style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}>
          <ArrowLeft size={15} />
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
          {paso + 1} DE {PREGUNTAS.length}
        </span>
      </div>

      <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem', lineHeight: 1.35 }}>{pregunta.titulo}</h3>
      <p style={{ margin: '0 0 1.1rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{pregunta.ayuda}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {pregunta.opciones.map(o => {
          const activo = pregunta.multiple
            ? (resp[pregunta.key] || []).includes(o.value)
            : valor === o.value;
          return (
            <button key={String(o.value)} onClick={() => elegir(o.value)} style={{
              ...panel, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit',
              display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.85rem 1rem',
              borderColor: activo ? 'rgba(48,209,88,0.5)' : 'rgba(255,255,255,0.08)',
              background: activo ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.04)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{o.label}</div>
                {o.detalle && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{o.detalle}</div>}
              </div>
              {activo && <Check size={17} color="#30d158" style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {pregunta.multiple && (
        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.7rem 0 0' }}>
          Podés elegir hasta {pregunta.max}, o ninguna si todavía no sabés.
        </p>
      )}

      {error && <p style={{ color: '#ff453a', fontSize: '0.82rem', marginTop: '0.8rem' }}>{error}</p>}

      {(esUltima || pregunta.multiple) && (
        <button
          className="btn btn-primary"
          disabled={!respondida || guardando}
          onClick={esUltima ? terminar : () => setPaso(paso + 1)}
          style={{ width: '100%', marginTop: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          {guardando
            ? <><Loader size={15} className="spin" /> Armando tu plan…</>
            : esUltima ? <>Armar mi plan</> : <>Seguir <ArrowRight size={15} /></>}
        </button>
      )}
    </div>
  );
}

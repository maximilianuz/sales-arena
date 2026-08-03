import { useState } from 'react';
import { Anchor, Check, Loader } from 'lucide-react';
import { RESPUESTAS } from './continuidad';
import { registrarRecordatorio, reescribirParte } from './store';

// El recordatorio en la vista Hoy. Es la pieza de continuidad: lo que hace que
// alguien que se frenó cuatro días vuelva a abrir la app y siga.
//
// Nunca es solo texto para leer. Pide confirmarlo, y si ya no lo representa se
// puede reescribir ahí mismo — arrastrar una declaración muerta es peor que no
// tener ninguna. Las confirmaciones se cuentan y se muestran: esa cuenta es la
// huella, y es lo único que crece por repetir.

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

// El de regreso tiene otro color: no es la rutina semanal, es "pasaron días".
const COLOR = { regreso: '#ff9f0a', semanal: '#a78bfa', nivel: '#30d158' };

export default function Recordatorio({ recordatorio, declaracion, onListo }) {
  const [reescribiendo, setReescribiendo] = useState(false);
  const [texto, setTexto] = useState(recordatorio.texto || '');
  const [guardando, setGuardando] = useState(false);

  const color = COLOR[recordatorio.motivo] || '#a78bfa';

  const responder = async (respuesta) => {
    if (respuesta === 'reescribo') { setReescribiendo(true); return; }
    setGuardando(true);
    try {
      await registrarRecordatorio(recordatorio.clave, { parte: recordatorio.parte.key, respuesta });
      onListo?.();
    } finally {
      setGuardando(false);
    }
  };

  const guardarReescrito = async () => {
    setGuardando(true);
    try {
      await reescribirParte(recordatorio.parte.key, texto.trim(), declaracion);
      await registrarRecordatorio(recordatorio.clave, { parte: recordatorio.parte.key, respuesta: 'reescribo' });
      onListo?.();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ ...panel, borderColor: `${color}66`, background: `${color}11` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
        <Anchor size={16} color={color} />
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{recordatorio.titulo}</span>
        {recordatorio.confirmaciones > 2 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            lo confirmaste {recordatorio.confirmaciones} veces
          </span>
        )}
      </div>

      <p style={{ margin: '0 0 0.7rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {recordatorio.entrada}
      </p>

      {reescribiendo ? (
        <>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 600 }}>{recordatorio.parte.titulo}</p>
          <textarea
            rows={4} value={texto} autoFocus onChange={(e) => setTexto(e.target.value)}
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.7rem',
              borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.88rem',
              resize: 'vertical', lineHeight: 1.6,
            }}
          />
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem' }}>
            <button className="btn btn-primary" disabled={guardando || texto.trim().length < 20} onClick={guardarReescrito} style={{ fontSize: '0.83rem' }}>
              {guardando ? <><Loader size={14} className="spin" /> Guardando…</> : <><Check size={14} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} /> Guardar</>}
            </button>
            <button className="btn btn-outline" disabled={guardando} onClick={() => setReescribiendo(false)} style={{ fontSize: '0.83rem' }}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{
            margin: '0 0 0.9rem', fontSize: '0.95rem', lineHeight: 1.65, whiteSpace: 'pre-wrap',
            fontWeight: 600, borderLeft: `2px solid ${color}`, paddingLeft: '0.9rem',
          }}>
            {recordatorio.texto}
          </p>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {recordatorio.pregunta}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {RESPUESTAS.map(r => (
              <button key={r.value} disabled={guardando} onClick={() => responder(r.value)} style={{
                padding: '0.4rem 0.9rem', borderRadius: '2rem', cursor: 'pointer', font: 'inherit',
                fontSize: '0.82rem', border: '1px solid rgba(255,255,255,0.14)',
                background: 'transparent', color: 'inherit',
              }}>{r.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Versión de solo lectura para la pantalla de subida de nivel: ahí el momento es
// de recompensa, no de introspección, así que no pregunta nada.
export function RecordatorioDeNivel({ recordatorio }) {
  if (!recordatorio) return null;
  return (
    <div style={{
      textAlign: 'left', margin: '0 0 1.1rem', padding: '0.8rem 0.9rem',
      borderRadius: '0.7rem', background: 'rgba(0,0,0,0.2)',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
        {recordatorio.entrada}
      </div>
      <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, fontWeight: 600, whiteSpace: 'pre-wrap' }}>
        {recordatorio.texto}
      </p>
    </div>
  );
}

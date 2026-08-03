import { Check, X, AlertTriangle, Target, Sparkles, RotateCcw } from 'lucide-react';
import { METRIC_LABELS } from './metrics';

// Reporte post-sesión. Dos capas bien separadas a propósito:
//   · MÉTRICAS — deterministas, calculadas de tu transcript. Son las que podés
//     comparar entre sesiones para ver si mejorás de verdad.
//   · LECTURA DEL AUDITOR — cualitativa, de la IA. Puede faltar (si el evaluador
//     no responde) y el reporte sigue siendo útil.

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

const titulo = {
  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.7rem',
};

export default function SessionReport({ metricas, feedback, nuevasCartas = [], principiosMap = {}, perfil, avisoError, onVolver, onRepetir }) {
  return (
    <div>
      <div style={{ ...panel, textAlign: 'center', marginBottom: '0.8rem' }}>
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Auditoría · {perfil?.nombre}
        </div>
        {feedback?.puntaje != null && (
          <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.1, margin: '0.3rem 0', color: feedback.puntaje >= 7 ? '#30d158' : feedback.puntaje >= 5 ? '#ff9f0a' : '#ff453a' }}>
            {feedback.puntaje}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/10</span>
          </div>
        )}
        {feedback?.resumen && <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', lineHeight: 1.55 }}>{feedback.resumen}</p>}
      </div>

      {avisoError && (
        <div style={{ ...panel, marginBottom: '0.8rem', borderColor: 'rgba(255,159,10,0.4)' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#ff9f0a' }}>
            <AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> {avisoError}
          </p>
        </div>
      )}

      {/* Las 5 métricas */}
      <div style={{ ...panel, marginBottom: '0.8rem' }}>
        <div style={titulo}>Métricas de la llamada</div>
        {Object.entries(METRIC_LABELS).map(([key, def]) => {
          const m = metricas?.[key];
          if (!m) return null;
          const estado = m.ok === true ? 'ok' : m.ok === false ? 'mal' : 'sin-dato';
          const color = estado === 'ok' ? '48,209,88' : estado === 'mal' ? '255,159,10' : '150,150,150';
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ flexShrink: 0, color: `rgb(${color})` }}>
                {estado === 'ok' ? <Check size={14} /> : estado === 'mal' ? <X size={14} /> : '—'}
              </span>
              <span style={{ flex: 1, fontSize: '0.85rem' }}>{def.nombre}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: `rgb(${color})`, textAlign: 'right' }}>{def.formato(m)}</span>
              {m.objetivo && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: '70px', textAlign: 'right' }}>obj: {m.objetivo}</span>}
            </div>
          );
        })}
        {metricas?.precioAntesDeDolor && !metricas.precioAntesDeDolor.ok && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: '#ff9f0a' }}>{metricas.precioAntesDeDolor.detalle}</p>
        )}
        {metricas?.palabrasReusadas?.ejemplos?.length > 0 && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Sus palabras que devolviste: {metricas.palabrasReusadas.ejemplos.map(e => `"${e}"`).join(', ')}
          </p>
        )}
        {metricas?.silencios?.fuente === 'auto-reporte' && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            El silencio no se puede medir en texto. En roleplay hablado se calcula solo.
          </p>
        )}
      </div>

      {feedback?.loQueHizoBien?.length > 0 && (
        <div style={{ ...panel, marginBottom: '0.8rem' }}>
          <div style={titulo}>Lo que hiciste bien</div>
          {feedback.loQueHizoBien.map((s, i) => (
            <p key={i} style={{ margin: '0.25rem 0', fontSize: '0.86rem' }}>
              <Check size={13} color="#30d158" style={{ verticalAlign: '-2px' }} /> {s}
            </p>
          ))}
        </div>
      )}

      {feedback?.errores?.length > 0 && (
        <div style={{ ...panel, marginBottom: '0.8rem' }}>
          <div style={titulo}>Errores por gravedad</div>
          {feedback.errores.map((e, i) => {
            const p = principiosMap[e.principioId];
            return (
              <div key={i} style={{ padding: '0.6rem 0', borderBottom: i < feedback.errores.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  <span style={{ color: '#ff453a', fontWeight: 700 }}>{'!'.repeat(e.gravedad || 1)}</span> {e.que}
                </p>
                {e.comoRehacerlo && (
                  <p style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', lineHeight: 1.5, color: '#22d3ee' }}>
                    <strong>En su lugar:</strong> {e.comoRehacerlo}
                  </p>
                )}
                {p && (
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Principio violado: <strong>{p.nombre}</strong> — {p.resumen}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {feedback?.focoProximo && (
        <div style={{ ...panel, marginBottom: '0.8rem', borderColor: 'rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.05)' }}>
          <div style={{ ...titulo, color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
            <Target size={13} /> Foco de la próxima llamada
          </div>
          <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, fontWeight: 600 }}>{feedback.focoProximo}</p>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Una sola cosa. Practicá esa hasta que salga sin pensar.</p>
        </div>
      )}

      {nuevasCartas.length > 0 && (
        <div style={{ ...panel, marginBottom: '0.8rem', borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.06)' }}>
          <div style={{ ...titulo, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
            <Sparkles size={13} /> Patrón detectado
          </div>
          {nuevasCartas.map(c => (
            <p key={c.cardId} style={{ margin: '0.25rem 0', fontSize: '0.86rem', lineHeight: 1.5 }}>
              Fallaste <strong>{c.nombre}</strong> {c.cantidad} veces. Se agregó una carta nueva a tu mazo de Principios.
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onRepetir} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <RotateCcw size={14} /> Otra llamada
        </button>
        <button className="btn btn-outline" onClick={onVolver}>Volver al entrenamiento</button>
      </div>
    </div>
  );
}

import React from 'react';
import { ArrowRight, CheckCircle2, Target } from 'lucide-react';

export default function PipelinePanel({ activeStageIndex, setActiveStageIndex, pipelineQuestions, stages }) {
  
  const handleNext = () => {
    if (activeStageIndex < stages.length - 1) {
      setActiveStageIndex(activeStageIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeStageIndex > 0) {
      setActiveStageIndex(activeStageIndex - 1);
    }
  };

  const activeStage = stages[activeStageIndex];
  const currentQuestions = pipelineQuestions ? pipelineQuestions[activeStage.id] : [];

  return (
    <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
      {/* Barra de Progreso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        {stages.map((stage, index) => {
          const isActive = index === activeStageIndex;
          const isPast = index < activeStageIndex;
          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content' }}>
              <div 
                onClick={() => setActiveStageIndex && setActiveStageIndex(index)}
                style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '1rem',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  background: isActive ? 'var(--primary)' : (isPast ? 'rgba(16, 185, 129, 0.2)' : 'transparent'),
                  color: isActive ? 'white' : (isPast ? 'var(--success)' : 'var(--text-muted)'),
                  border: isActive ? 'none' : `1px solid ${isPast ? 'var(--success)' : 'var(--glass-border)'}`
                }}>
                {stage.label} <span style={{ opacity: 0.7, fontSize: '0.85em', marginLeft: '4px' }}>({stage.estimatedTime || 5}m)</span>
              </div>
              {index < stages.length - 1 && (
                <div style={{ width: '20px', height: '2px', background: isPast ? 'var(--success)' : 'var(--glass-border)', margin: '0 5px' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Detalles de la Etapa Activa */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {activeStageIndex + 1}. {activeStage.label}
          </h3>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent)', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem', display: 'inline-block', marginBottom: '1rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            ⏱️ Tiempo sugerido: <strong>{activeStage.estimatedTime || 5} minutos</strong>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem', flex: 1 }}>
              <strong style={{ color: 'var(--primary)' }}><Target size={14} style={{display:'inline'}}/> Objetivo:</strong> {activeStage.objective}
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem', flex: 1 }}>
              <strong style={{ color: 'var(--success)' }}><CheckCircle2 size={14} style={{display:'inline'}}/> Éxito:</strong> {activeStage.indicator}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, borderLeft: '1px solid var(--glass-border)', paddingLeft: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Preguntas Sugeridas (High Ticket Closer)</div>
          {currentQuestions && currentQuestions.length > 0 ? (
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.95rem' }}>
              {currentQuestions.map((q, i) => (
                <li key={i} style={{ marginBottom: '0.25rem' }}>{q}</li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Genera un escenario IA para ver las preguntas dinámicas.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
          <button className="btn btn-outline" onClick={handlePrev} disabled={activeStageIndex === 0} style={{ padding: '0.5rem' }}>Anterior</button>
          <button className="btn btn-primary" onClick={handleNext} disabled={activeStageIndex === stages.length - 1} style={{ padding: '0.5rem' }}>
            Siguiente <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}


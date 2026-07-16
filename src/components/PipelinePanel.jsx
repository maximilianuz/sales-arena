import React from 'react';
import { ArrowRight, CheckCircle2, Target, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FREE_LOCKED_STAGES = ['cualificacion_diagnostico', 'cierre_transicion'];

export default function PipelinePanel({ activeStageIndex, setActiveStageIndex, pipelineQuestions, stages, isFree, onUpgradeStage }) {
  const { t } = useTranslation();

  const isLocked = (stage) => isFree && FREE_LOCKED_STAGES.includes(stage?.id);

  const handleNext = () => {
    if (activeStageIndex >= stages.length - 1) return;
    const next = stages[activeStageIndex + 1];
    if (isLocked(next)) { onUpgradeStage?.(); return; }
    setActiveStageIndex(activeStageIndex + 1);
  };

  const handlePrev = () => {
    if (activeStageIndex > 0) {
      setActiveStageIndex(activeStageIndex - 1);
    }
  };

  const activeStage = stages && stages.length > 0 ? stages[Math.min(activeStageIndex || 0, stages.length - 1)] : null;
  const currentQuestions = pipelineQuestions && activeStage ? pipelineQuestions[activeStage.id] : [];

  if (!activeStage) return null;

  return (
    <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
      {/* Barra de Progreso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem', position: 'relative' }}>
        {/* Línea conectora de fondo */}
        <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: 'var(--glass-border)', zIndex: 0, transform: 'translateY(-50%)' }} />
        
        {stages.map((stage, index) => {
          const isActive = index === activeStageIndex;
          const isPast = index < activeStageIndex;
          const locked = isLocked(stage);
          const interactive = !!setActiveStageIndex;
          const chipStyle = {
            padding: '0.4rem 1rem',
            borderRadius: '2rem',
            fontSize: '0.85rem',
            fontWeight: isActive ? '700' : '600',
            cursor: interactive ? 'pointer' : 'default',
            background: locked ? 'rgba(0,0,0,0.3)' : isActive ? 'linear-gradient(135deg, var(--primary), #818cf8)' : (isPast ? 'rgba(48, 209, 88, 0.15)' : 'var(--bg-dark)'),
            color: locked ? 'var(--text-muted)' : isActive ? 'white' : (isPast ? 'var(--success)' : 'var(--text-muted)'),
            border: locked ? '1px dashed var(--glass-border)' : isActive ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${isPast ? 'var(--success)' : 'var(--glass-border)'}`,
            boxShadow: isActive ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
            opacity: locked ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            font: 'inherit',
          };
          const chipInner = (<>
            {locked && <Lock size={12} />}
            {stage.label}
            <span style={{ opacity: isActive ? 0.9 : 0.6, fontSize: '0.85em' }}>({stage.estimatedTime || 5}m)</span>
          </>);
          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              {interactive ? (
                <button
                  type="button"
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={locked ? `${stage.label} — ${t('pipeline.locked', 'bloqueado')}` : stage.label}
                  onClick={() => {
                    if (locked) { onUpgradeStage?.(); return; }
                    setActiveStageIndex(index);
                  }}
                  style={chipStyle}
                >
                  {chipInner}
                </button>
              ) : (
                <div aria-current={isActive ? 'step' : undefined} style={chipStyle}>
                  {chipInner}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detalles de la Etapa Activa */}
      <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.4rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
            {activeStage.label}
          </h3>
          <div style={{ background: 'rgba(255, 159, 10, 0.1)', color: 'var(--accent)', padding: '0.35rem 0.85rem', borderRadius: '2rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', border: '1px solid rgba(255, 159, 10, 0.3)', fontWeight: '600' }}>
            ⏱️ {t('pipeline.suggestedTime')}: {activeStage.estimatedTime || 5} {t('pipeline.minutes')}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', flex: 1, border: '1px solid var(--glass-border)', borderTop: '1px solid var(--glass-border-highlight)' }}>
              <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}><Target size={14} /> {t('pipeline.objective')}</strong> 
              <span style={{ color: 'var(--text-muted)' }}>{activeStage.objective}</span>
            </div>
            <div style={{ background: 'rgba(48, 209, 88, 0.05)', padding: '1rem', borderRadius: '0.75rem', flex: 1, border: '1px solid rgba(48, 209, 88, 0.2)', borderTop: '1px solid rgba(48, 209, 88, 0.3)' }}>
              <strong style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}><CheckCircle2 size={14} /> {t('pipeline.success')}</strong> 
              <span style={{ color: 'var(--text-muted)' }}>{activeStage.indicator}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, borderLeft: '1px solid var(--glass-border)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: '700', letterSpacing: '0.05em' }}>{t('pipeline.suggestedQuestions')}</div>
          {currentQuestions && currentQuestions.length > 0 ? (
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px dashed var(--glass-border)' }}>
              {t('pipeline.generatePrompt')}
            </div>
          )}
        </div>

        {setActiveStageIndex && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={handlePrev} disabled={activeStageIndex === 0} style={{ padding: '0.5rem' }}>{t('pipeline.prev')}</button>
            <button className="btn btn-primary" onClick={handleNext} disabled={activeStageIndex === stages.length - 1} style={{ padding: '0.5rem' }}>
              {t('pipeline.next')} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

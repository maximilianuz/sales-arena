import React, { useState } from 'react';
import { Target, MessageSquare, ChevronDown, ChevronUp, Package, Zap, Ear, Brain, Volume2, AlertTriangle, Fingerprint } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getStageCoaching } from '../utils/coachingKnowledge';
import { getPersonality, personalityView } from '../utils/leadPersonalities';

// Fila compacta del coach de etapa: icono + etiqueta + consejo.
function CoachRow({ Icon, color, label, text }) {
  return (
    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
      <Icon size={15} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', color, display: 'block', marginBottom: '2px' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>{text}</span>
      </div>
    </div>
  );
}

export default function CloserCommandPanel({ currentScenario, activeStage, pipelineQuestions, productPresentation }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [showProduct, setShowProduct] = useState(false);

  const questions = pipelineQuestions && activeStage ? pipelineQuestions[activeStage.id] : [];
  // Guía curada por etapa (qué escuchar, tono, mente, evitar + socráticas).
  const coaching = getStageCoaching(activeStage?.id, i18n.language);
  // Perfil de personalidad del lead (DISC) → cómo abordarlo.
  const persona = currentScenario ? personalityView(getPersonality(currentScenario.personality), i18n.language) : null;

  if (!currentScenario || !activeStage) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem', opacity: 0.6 }}>
        <Zap size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          {isEn ? 'Waiting for the Trainer to generate the scenario...' : 'Esperando que el Trainer genere el escenario...'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>

      {/* Stage mission card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '1rem', padding: '1.25rem',
        boxShadow: '0 0 24px rgba(99,102,241,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '0.5rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={14} color="white" />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a5b4fc' }}>
            {isEn ? `Stage ${activeStage.label}` : `Etapa ${activeStage.label}`}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(165,180,252,0.5)', fontFamily: 'monospace' }}>
            {activeStage.estimatedTime || 5}min
          </span>
        </div>
        <p style={{ margin: '0 0 0.5rem', fontWeight: '700', fontSize: '1rem', color: 'white', lineHeight: '1.4' }}>
          {activeStage.objective}
        </p>
        {activeStage.indicator && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.08)', borderRadius: '0.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '1px' }}>✓</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
              <strong style={{ color: 'var(--success)' }}>{isEn ? 'Win signal:' : 'Señal de éxito:'}</strong> {activeStage.indicator}
            </span>
          </div>
        )}
      </div>

      {/* Perfil de personalidad del lead + cómo venderle (extraído del método) */}
      {persona && (
        <div style={{ background: `${persona.color}12`, border: `1px solid ${persona.color}40`, borderRadius: '1rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Fingerprint size={15} color={persona.color} />
            <span style={{ fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', color: persona.color }}>
              {isEn ? 'Lead profile' : 'Perfil del lead'}: {persona.name}
            </span>
          </div>
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{persona.essence}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
            <div><strong style={{ color: 'var(--success)' }}>{isEn ? 'Connect: ' : 'Conectá: '}</strong><span style={{ color: 'rgba(255,255,255,0.72)' }}>{persona.connect}</span></div>
            <div><strong style={{ color: '#a5b4fc' }}>{isEn ? 'Close: ' : 'Cerrá: '}</strong><span style={{ color: 'rgba(255,255,255,0.72)' }}>{persona.close}</span></div>
            <div><strong style={{ color: 'var(--danger)' }}>{isEn ? 'Avoid: ' : 'Evitá: '}</strong><span style={{ color: 'rgba(255,255,255,0.72)' }}>{persona.avoid}</span></div>
            <div><strong style={{ color: 'var(--accent)' }}>{isEn ? 'Tone: ' : 'Tono: '}</strong><span style={{ color: 'rgba(255,255,255,0.72)' }}>{persona.tone}</span></div>
          </div>
        </div>
      )}

      {/* Coach de etapa: guía curada para closers novatos (no depende de la IA) */}
      {coaching && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <CoachRow Icon={Ear} color="#a5b4fc" label={isEn ? 'What to listen for' : 'Qué escuchar'} text={coaching.lookFor} />
          <CoachRow Icon={Volume2} color="var(--accent)" label={isEn ? 'Voice tone' : 'Tono de voz'} text={coaching.tonality} />
          <CoachRow Icon={Brain} color="var(--success)" label={isEn ? 'Mindset · NLP' : 'Mente · PNL'} text={coaching.mindset} />
          <CoachRow Icon={AlertTriangle} color="var(--danger)" label={isEn ? 'Avoid' : 'Evitá'} text={coaching.avoid} />
        </div>
      )}

      {/* Questions / script card: dinámicas del lead (IA) + consultivas curadas */}
      {((questions && questions.length > 0) || coaching?.socratic?.length > 0) && (
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '1rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <MessageSquare size={15} color="var(--success)" />
            <span style={{ fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--success)' }}>
              {isEn ? 'Your questions for this stage' : 'Tus preguntas para esta etapa'}
            </span>
          </div>
          {questions && questions.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {questions.map((q, i) => (
                <li key={i} style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: '1.5' }}>{q}</li>
              ))}
            </ul>
          )}
          {coaching?.socratic?.length > 0 && (
            <>
              <div style={{ fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0.9rem 0 0.5rem' }}>
                {isEn ? 'Consultative — always work' : 'Consultivas — siempre funcionan'}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {coaching.socratic.map((q, i) => (
                  <li key={i} style={{ fontSize: '0.87rem', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Quick lead intel — 4 fichas: objeción, miedo, cuándo se abre, qué le da confianza */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
        <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.75rem', padding: '0.875rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>
            {isEn ? 'Main objection' : 'Objeción principal'}
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: '1.4' }}>
            "{currentScenario.visibleObjection}"
          </p>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', padding: '0.875rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--danger)', marginBottom: '0.4rem' }}>
            {isEn ? 'Core fear' : 'Miedo central'}
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
            {currentScenario.psychology?.primaryFear}
          </p>
        </div>
        {currentScenario.behavioralCues?.opensUpWhen && (
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.75rem', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: '0.4rem' }}>
              {isEn ? 'Opens up when' : 'Se abre cuando'}
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
              {currentScenario.behavioralCues.opensUpWhen}
            </p>
          </div>
        )}
        {currentScenario.psychology?.trustTrigger && (
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.75rem', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a5b4fc', marginBottom: '0.4rem' }}>
              {isEn ? 'Builds trust' : 'Genera confianza'}
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
              {currentScenario.psychology.trustTrigger}
            </p>
          </div>
        )}
      </div>

      {/* Product — collapsible */}
      {productPresentation && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <button
            onClick={() => setShowProduct(!showProduct)}
            style={{ width: '100%', padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.5)' }}
          >
            <Package size={14} />
            <span style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {isEn ? 'Product reference' : 'Referencia del producto'}
            </span>
            <span style={{ marginLeft: 'auto' }}>{showProduct ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </button>
          {showProduct && (
            <div style={{ padding: '0 1rem 1rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.65)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {productPresentation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

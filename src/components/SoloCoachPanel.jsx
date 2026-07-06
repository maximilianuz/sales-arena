import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Package, UserCheck, ListChecks, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { getDefaultStages } from '../utils/defaultStages';
import { getStageCoaching } from '../utils/coachingKnowledge';
import { LEAD_PERSONALITIES, personalityView } from '../utils/leadPersonalities';

// Guía del closer para el modo práctica solo: qué producto vende, la chuleta de
// los 4 perfiles DISC (SIN revelar cuál es este lead — eso lo descubre
// conversando) y la estructura de la venta con sugerencias por etapa. Todo del
// KB curado (sin tokens de IA). Se abre como panel lateral para no tapar el chat.

function StageRow({ stage, isEn }) {
  const [open, setOpen] = useState(false);
  const coach = getStageCoaching(stage.id, isEn ? 'en' : 'es');
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.6rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontWeight: '700', fontSize: '0.88rem', flex: 1 }}>{stage.label}</span>
        {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{stage.objective}</div>
      {open && coach && (
        <div style={{ marginTop: '0.6rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(139,92,246,0.4)' }}>
          {coach.lookFor && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem' }}>
              <strong style={{ color: '#a78bfa' }}>{isEn ? 'Watch for: ' : 'Qué escuchar: '}</strong>
              <span style={{ color: 'var(--text-muted)' }}>{coach.lookFor}</span>
            </p>
          )}
          {Array.isArray(coach.socratic) && coach.socratic.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                <Lightbulb size={12} /> {isEn ? 'Ask something like:' : 'Preguntá algo como:'}
              </div>
              {coach.socratic.map((q, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.15rem 0' }}>“{q}”</div>
              ))}
            </div>
          )}
          {coach.tonality && (
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-main)' }}>{isEn ? 'Tone: ' : 'Tono: '}</strong>{coach.tonality}
            </p>
          )}
          {coach.avoid && (
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--danger)' }}>
              <strong>{isEn ? 'Avoid: ' : 'Evitá: '}</strong>{coach.avoid}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

export default function SoloCoachPanel({ scenario, onClose }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const stages = getDefaultStages(i18n.language);
  const product = scenario?.productToSell || (isEn ? 'Your high-ticket offer' : 'Tu oferta high ticket');
  const price = scenario?.productPrice;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div
        className="glass-panel"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '420px', height: '100%', overflowY: 'auto', borderRadius: 0, padding: '1.5rem 1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', flex: 1 }}>{isEn ? '📋 Closer guide' : '📋 Guía del closer'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Qué vendés */}
        <Section icon={<Package size={15} />} title={isEn ? 'What you sell' : 'Qué vendés'}>
          <div style={{ padding: '0.75rem', background: 'rgba(48,209,88,0.07)', borderRadius: '0.6rem', border: '1px solid rgba(48,209,88,0.2)' }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.45 }}>{product}</div>
            {price > 0 && <div style={{ marginTop: '0.4rem', fontWeight: '600', color: 'var(--success)' }}>USD {Number(price).toLocaleString('en-US')}</div>}
          </div>
        </Section>

        {/* Chuleta de los 4 perfiles DISC — NO revela cuál es este lead:
            el closer lo diagnostica escuchando cómo habla y adapta su técnica. */}
        <Section icon={<UserCheck size={15} />} title={isEn ? 'Identify their profile (and adapt)' : 'Identificá su perfil (y adaptate)'}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
            {isEn
              ? 'Every lead is one of these 4. Listen to HOW they talk, spot which one you got, and sell their way:'
              : 'Todo lead es uno de estos 4. Escuchá CÓMO habla, detectá cuál te tocó y vendele a su manera:'}
          </p>
          {LEAD_PERSONALITIES.map(p => {
            const v = personalityView(p, i18n.language);
            if (!v) return null;
            return (
              <div key={p.id} style={{ marginBottom: '0.6rem', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.82rem', color: v.color, marginBottom: '0.25rem' }}>{v.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div><strong style={{ color: 'var(--text-main)' }}>{isEn ? 'Sounds like: ' : 'Suena así: '}</strong>{v.essence}</div>
                  <div><strong style={{ color: 'var(--success)' }}>{isEn ? 'Connect: ' : 'Conectá: '}</strong>{v.connect}</div>
                  <div><strong style={{ color: 'var(--accent)' }}>{isEn ? 'Close: ' : 'Cerrá: '}</strong>{v.close}</div>
                  <div><strong style={{ color: 'var(--danger)' }}>{isEn ? 'Avoid: ' : 'Evitá: '}</strong>{v.avoid}</div>
                </div>
              </div>
            );
          })}
        </Section>

        {/* Estructura de la venta */}
        <Section icon={<ListChecks size={15} />} title={isEn ? 'Structure to follow' : 'Estructura a seguir'}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.25rem' }}>
            {isEn ? 'Tap a stage for suggestions.' : 'Tocá una etapa para ver sugerencias.'}
          </p>
          {stages.map(s => <StageRow key={s.id} stage={s} isEn={isEn} />)}
        </Section>
      </div>
    </div>
  );
}

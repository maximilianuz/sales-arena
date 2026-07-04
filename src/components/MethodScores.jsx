import { useTranslation } from 'react-i18next';
import { Stethoscope } from 'lucide-react';

// Muestra las métricas de la metodología del coach (0-10) que devuelve el
// análisis: control del marco, profundidad del dolor, aislamiento de objeción,
// desapego, micro-compromisos. Barras compactas.

const LABELS = {
  frameControl: { es: 'Control del marco', en: 'Frame control' },
  painDepth: { es: 'Profundidad del dolor', en: 'Pain depth' },
  objectionIsolation: { es: 'Aislamiento de objeción', en: 'Objection isolation' },
  detachment: { es: 'Desapego', en: 'Detachment' },
  microCommitments: { es: 'Micro-compromisos', en: 'Micro-commitments' },
};
const ORDER = ['frameControl', 'painDepth', 'objectionIsolation', 'detachment', 'microCommitments'];

function barColor(v) {
  return v >= 8 ? 'var(--success)' : v >= 5 ? 'var(--accent)' : 'var(--danger)';
}

export default function MethodScores({ scores }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  if (!scores || typeof scores !== 'object') return null;
  const entries = ORDER.filter(k => typeof scores[k] === 'number');
  if (!entries.length) return null;

  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(139,92,246,0.06)', borderRadius: '0.75rem', border: '1px solid rgba(139,92,246,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#a78bfa', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Stethoscope size={16} /> {isEn ? 'Methodology radar' : 'Radar de metodología'}
      </div>
      {entries.map(k => {
        const v = Math.max(0, Math.min(10, scores[k]));
        const c = barColor(v);
        return (
          <div key={k} style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{isEn ? LABELS[k].en : LABELS[k].es}</span>
              <span style={{ color: c, fontWeight: '700' }}>{v}/10</span>
            </div>
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
              <div style={{ height: '100%', width: `${v * 10}%`, background: c, borderRadius: '3px', transition: 'width 0.8s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

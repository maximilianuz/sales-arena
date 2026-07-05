import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck } from 'lucide-react';
import { RUBRIC_CRITERIA, getRubricLabel, rubricAverage } from '../utils/rubricCriteria';

// Rúbrica 1-5 que puntúa el Observador (o el Trainer). Se sincroniza en vivo y
// alimenta el análisis del coach con datos comparables y certeros.
export default function RubricPanel({ rubric, updateRubric, canScore }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const scores = rubric || {};
  const avg = rubricAverage(scores);
  const avgColor = avg == null ? 'var(--text-muted)' : avg >= 4 ? 'var(--success)' : avg >= 2.5 ? 'var(--accent)' : 'var(--danger)';

  const setScore = (id, value) => {
    if (!canScore || !updateRubric) return;
    updateRubric({ ...scores, [id]: value });
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardCheck size={18} color="var(--primary)" />
          <span style={{ fontWeight: '700', fontSize: '1rem' }}>{isEn ? 'Evaluation rubric' : 'Rúbrica de evaluación'}</span>
        </div>
        {avg != null && <span style={{ fontWeight: '600', color: avgColor, fontSize: '1.1rem' }}>{avg}/5</span>}
      </div>

      {!canScore && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
          {isEn ? 'Scored by the observer.' : 'La puntúa el observador.'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {RUBRIC_CRITERIA.map((c) => {
          const { label, hint } = getRubricLabel(c, i18n.language);
          const val = scores[c.id] || 0;
          return (
            <div key={c.id}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>{label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{hint}</div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setScore(c.id, n)}
                    disabled={!canScore}
                    style={{
                      flex: 1, padding: '0.45rem 0', borderRadius: '0.5rem',
                      border: `1px solid ${n <= val ? 'var(--primary)' : 'var(--glass-border)'}`,
                      background: n <= val ? 'linear-gradient(135deg, var(--primary), #818cf8)' : 'rgba(255,255,255,0.03)',
                      color: n <= val ? 'white' : 'var(--text-muted)',
                      cursor: canScore ? 'pointer' : 'default', fontWeight: '700', fontSize: '0.85rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

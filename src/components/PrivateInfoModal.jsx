import { EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PrivateInfoModal({ info, rootCauses, onClose }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  // Causas profundas en capas (si el escenario las trae): la más honda al final.
  const roots = Array.isArray(rootCauses) ? rootCauses.filter(r => typeof r === 'string' && r.trim()) : [];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '0.65rem', background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EyeOff size={18} color="var(--danger)" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>{t('privateInfo.title')}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: '0.875rem', padding: '1.25rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
          {info ? info : <span style={{ color: 'var(--text-muted)' }}>{t('privateInfo.empty')}</span>}
        </div>

        {roots.length > 0 && (
          <div style={{ marginTop: '0.875rem', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: '0.875rem', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '0.5rem' }}>
              🧅 {isEn ? 'Root causes (deepest last)' : 'Causas profundas (la más honda al final)'}
            </div>
            {roots.map((r, i) => (
              <div key={i} style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.92)', lineHeight: '1.5', marginBottom: '0.35rem' }}>
                {i + 1}. {r}
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-outline" style={{ marginTop: '1.5rem', width: '100%' }} onClick={onClose}>
          {t('privateInfo.close')}
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PrivateInfoModal({ info, onClose }) {
  const { t } = useTranslation();
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

        <button className="btn btn-outline" style={{ marginTop: '1.5rem', width: '100%' }} onClick={onClose}>
          {t('privateInfo.close')}
        </button>
      </div>
    </div>
  );
}

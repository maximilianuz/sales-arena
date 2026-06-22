import React from 'react';
import { EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PrivateInfoModal({ info, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderColor: 'var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--danger)', fontSize: '1.5rem' }}>
            <EyeOff size={24} />
            {t('privateInfo.title')}
          </h2>
          <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ fontSize: '1.2rem', lineHeight: '1.6' }}>
          {info ? (
            <p>{info}</p>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>{t('privateInfo.empty')}</p>
          )}
        </div>

        <button className="btn btn-secondary" style={{ marginTop: '2rem', width: '100%' }} onClick={onClose}>
          {t('privateInfo.close')}
        </button>
      </div>
    </div>
  );
}

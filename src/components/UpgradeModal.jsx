import React from 'react';
import { X, Lock, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function UpgradeModal({ feature, requiredPlan = 'closer', onClose }) {
  const { t } = useTranslation();

  const planLabel = requiredPlan === 'trainer' ? 'Trainer' : 'Closer';
  const planPrice = requiredPlan === 'trainer' ? '$97/mes' : '$19/mes';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(79,70,229,0.15)', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Lock size={28} color="var(--primary)" />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: '700' }}>
            {t('upgrade.title')}
          </h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            <strong style={{ color: 'white' }}>{feature}</strong> {t('upgrade.availableIn')}{' '}
            <strong style={{ color: 'var(--primary)' }}>Plan {planLabel}</strong>
          </p>
        </div>

        <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(79,70,229,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Zap size={16} color="var(--primary)" />
            <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Plan {planLabel} — {planPrice}</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('upgrade.planDescription')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>
            {t('upgrade.later')}
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={() => { window.location.href = '/'; }}
          >
            {t('upgrade.cta')}
          </button>
        </div>
      </div>
    </div>
  );
}

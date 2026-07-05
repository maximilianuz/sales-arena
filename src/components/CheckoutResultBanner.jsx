import React from 'react';
import { useTranslation } from 'react-i18next';

export default function CheckoutResultBanner({ checkout }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  if (!checkout?.result) return null;

  const closed = checkout.result === 'closed';

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, padding: '1rem 2rem', borderRadius: '2rem',
      background: closed ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
      border: `1px solid ${closed ? 'var(--success)' : 'var(--danger)'}`,
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      boxShadow: `0 8px 32px ${closed ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}`,
      animation: 'modalIn 0.4s ease-out'
    }}>
      <span style={{ fontSize: '1.5rem' }}>{closed ? '🎉' : '😔'}</span>
      <div>
        <div style={{ fontWeight: '600', color: closed ? 'var(--success)' : 'var(--danger)', fontSize: '1rem' }}>
          {closed ? (isEn ? 'DEAL CLOSED' : 'TRATO CERRADO') : (isEn ? 'DEAL LOST' : 'TRATO PERDIDO')}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {isEn ? 'Checkout result — debrief now' : 'Resultado del checkout — hacé el debrief ahora'}
        </div>
      </div>
    </div>
  );
}

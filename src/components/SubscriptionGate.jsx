import React, { useState } from 'react';
import { ChessKnight, Zap, Users, Check, Bitcoin, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { signOutUser } from '../utils/auth';

const PLAN_META = [
  {
    id: 'closer',
    icon: <Zap size={28} />,
    color: 'var(--success)',
    monthlyId: 'closer_monthly',
    yearlyId: 'closer_yearly',
    monthlyPrice: 19,
    yearlyPrice: 149,
  },
  {
    id: 'trainer',
    icon: <Users size={28} />,
    color: 'var(--primary)',
    monthlyId: 'trainer_monthly',
    yearlyId: 'trainer_yearly',
    monthlyPrice: 97,
    yearlyPrice: 797,
  }
];

export default function SubscriptionGate({ user, children, isActive, isLoading }) {
  const { t, i18n } = useTranslation();
  const [billing, setBilling] = useState('yearly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');

  if (isLoading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{t('subscription.loading')}</p>
      </div>
    );
  }

  if (isActive) return children;

  const handleCheckout = async (planId, provider) => {
    setError('');
    setLoadingPlan(`${planId}_${provider}`);
    const endpointMap = {
      mercadopago: '/api/create-mp-preference',
      stripe: '/api/create-stripe-session',
      crypto: '/api/create-crypto-charge'
    };
    try {
      const res = await fetch(endpointMap[provider], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, uid: user.uid, email: user.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment error');
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e.message);
      setLoadingPlan(null);
    }
  };

  const changeLanguage = (e) => i18n.changeLanguage(e.target.value);

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', padding: '2rem 1rem', position: 'relative' }}>

      {/* Selector de idioma */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <select
          onChange={changeLanguage}
          value={(i18n.language || 'es').split('-')[0]}
          style={{
            background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
            border: '1px solid var(--glass-border)', padding: '0.4rem 0.8rem',
            borderRadius: '2rem', cursor: 'pointer', fontSize: '0.85rem'
          }}
        >
          <option value="es" style={{ background: '#1e1e2f' }}>🇪🇸 Español</option>
          <option value="en" style={{ background: '#1e1e2f' }}>🇺🇸 English</option>
        </select>
      </div>

      <div style={{ maxWidth: '860px', width: '100%', margin: 'auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div className="logo-container">
              <ChessKnight size={40} color="white" strokeWidth={1.5} />
            </div>
          </div>
          <h1 style={{
            fontSize: '2.5rem', fontWeight: '800', margin: 0,
            background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            {t('subscription.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {t('subscription.subtitle')}
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          {['monthly', 'yearly'].map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: '0.5rem 1.5rem',
                border: '1px solid var(--glass-border)',
                background: billing === b ? 'var(--primary)' : 'transparent',
                color: 'white', cursor: 'pointer', fontWeight: '600',
                borderRadius: b === 'monthly' ? '2rem 0 0 2rem' : '0 2rem 2rem 0'
              }}
            >
              {b === 'monthly' ? t('subscription.monthly') : t('subscription.annual')}
              {b === 'yearly' && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'var(--success)', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>
                  {t('subscription.saveLabel')}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {PLAN_META.map(plan => {
            const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const planId = billing === 'monthly' ? plan.monthlyId : plan.yearlyId;
            const isTrainer = plan.id === 'trainer';
            const features = t(`subscription.plans.${plan.id}.features`, { returnObjects: true });
            const planName = t(`subscription.plans.${plan.id}.name`);

            return (
              <div
                key={plan.id}
                className="glass-panel"
                style={{
                  border: `1px solid ${isTrainer ? plan.color : 'var(--glass-border)'}`,
                  boxShadow: isTrainer ? `0 0 30px color-mix(in srgb, ${plan.color} 20%, transparent)` : 'none',
                  position: 'relative'
                }}
              >
                {isTrainer && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: plan.color, padding: '0.2rem 1rem', borderRadius: '1rem',
                    fontSize: '0.75rem', fontWeight: '700', color: 'white', whiteSpace: 'nowrap'
                  }}>
                    {t('subscription.mostPopular')}
                  </div>
                )}

                <div style={{ color: plan.color, marginBottom: '0.75rem' }}>{plan.icon}</div>
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700' }}>{planName}</h2>
                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '800' }}>${price}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                    {billing === 'monthly' ? t('subscription.perMonth') : t('subscription.perYear')}
                  </span>
                  {billing === 'yearly' && (
                    <div style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {t('subscription.billedAnnually', { price: Math.round(price / 12) })}
                    </div>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {Array.isArray(features) && features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <Check size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Botones de pago */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleCheckout(planId, 'stripe')}
                    disabled={!!loadingPlan}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <CreditCard size={16} />
                    {loadingPlan === `${planId}_stripe` ? t('subscription.redirecting') : t('subscription.payCard')}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleCheckout(planId, 'mercadopago')}
                    disabled={!!loadingPlan}
                    style={{ width: '100%' }}
                  >
                    {loadingPlan === `${planId}_mercadopago` ? t('subscription.redirecting') : t('subscription.payMP')}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleCheckout(planId, 'crypto')}
                    disabled={!!loadingPlan}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Bitcoin size={16} />
                    {loadingPlan === `${planId}_crypto` ? t('subscription.redirecting') : t('subscription.payCrypto')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ textAlign: 'center', color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>
        )}

        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {t('subscription.loggedAs', { email: user.email })} ·{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); signOutUser(); }}>{t('subscription.signOut')}</a>
        </div>
      </div>
    </div>
  );
}

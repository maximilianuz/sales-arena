import React, { useState, useEffect } from 'react';
import { ChessKnight, Zap, Users, Check, Bitcoin, CreditCard, Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { signOutUser, activateFreeplan } from '../utils/auth';
import { GROUP_ONLY_MODE } from '../config/appMode';

// Métodos de pago habilitados. Por ahora SOLO cripto (NOWPayments) está
// configurado; tarjeta y MercadoPago quedan "Próximamente" hasta cargar sus
// credenciales. Flipear a true cuando estén las env vars correspondientes.
const PROVIDERS_ENABLED = { crypto: true, stripe: false, mercadopago: false };
// Mail al que llegan los pedidos de acceso Closer/Pro. Mientras no haya cobro
// automático (o como alternativa a cripto), el admin los otorga a mano.
const ACCESS_REQUEST_EMAIL = 'contacto.maximilianoc@gmail.com';

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

export default function SubscriptionGate({ user, children, isActive, isLoading, onClose }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [billing, setBilling] = useState('yearly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');

  // Modo solo-grupal: la pantalla de planes/pagos NUNCA se muestra. Al primer
  // ingreso (usuario sin plan) se activa el plan gratis automáticamente y entra
  // directo a la app. Así "registrarse gratis → sección grupal" es un solo paso.
  useEffect(() => {
    if (GROUP_ONLY_MODE && !isLoading && !isActive && user?.uid) {
      activateFreeplan(user.uid).catch(() => {});
    }
  }, [isLoading, isActive, user?.uid]);

  if (isLoading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{t('subscription.loading')}</p>
      </div>
    );
  }

  if (isActive) return children;

  // En modo solo-grupal, mientras se activa el plan gratis, mostramos el loader
  // (nunca la pantalla de pagos).
  if (GROUP_ONLY_MODE) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{t('subscription.loading')}</p>
      </div>
    );
  }

  const handleFree = async () => {
    setLoadingPlan('free');
    try {
      await activateFreeplan(user.uid);
    } catch (e) {
      setError(e.message);
      setLoadingPlan(null);
    }
  };

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
    } catch {
      // Pasarelas todavía no configuradas (o caídas): mensaje amable en vez del
      // error técnico — que el usuario arranque gratis y pague cuando estén.
      setError(i18n.language?.startsWith('en')
        ? 'Payments are almost ready. Start with the Free plan — you can upgrade any time.'
        : 'Los pagos están casi listos. Empezá con el plan Gratis — podés mejorar tu plan en cualquier momento.');
      setLoadingPlan(null);
    }
  };

  const changeLanguage = (e) => i18n.changeLanguage(e.target.value);

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', padding: '2rem 1rem', position: 'relative' }}>

      {/* Botón volver (solo cuando el usuario ya tiene acceso y abrió planes manualmente) */}
      {onClose && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            ← {t('subscription.back')}
          </button>
        </div>
      )}

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

      <div style={{ maxWidth: '1100px', width: '100%', margin: 'auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div className="logo-container">
              <ChessKnight size={40} color="white" strokeWidth={1.5} />
            </div>
          </div>
          <h1 style={{
            fontSize: '2.5rem', fontWeight: '600', margin: 0,
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

        {/* Plan cards — 3 columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>

          {/* Card Gratis */}
          <div className="glass-panel" style={{ border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}><Lock size={28} /></div>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700' }}>{t('subscription.freePlan.name')}</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: '600' }}>$0</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              {t('subscription.freePlan.features', { returnObjects: true }).map(f => (
                <li key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Check size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className="btn btn-outline"
              onClick={handleFree}
              disabled={!!loadingPlan}
              style={{ width: '100%', marginTop: 'auto' }}
            >
              {loadingPlan === 'free' ? t('subscription.loading') : t('subscription.freePlan.cta')}
            </button>
          </div>

        {/* Plan cards pagos */}
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
                  <span style={{ fontSize: '2.5rem', fontWeight: '600' }}>${price}</span>
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

                {/* Pago: por ahora solo CRIPTO está activo (NOWPayments). Tarjeta
                    y MercadoPago quedan "Próximamente". Además, "Pedir acceso por
                    mail" para el otorgamiento manual del admin (aceptando mail). */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {PROVIDERS_ENABLED.crypto && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleCheckout(planId, 'crypto')}
                      disabled={!!loadingPlan}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <Bitcoin size={16} />
                      {loadingPlan === `${planId}_crypto` ? t('subscription.redirecting') : (isEn ? 'Pay with crypto' : 'Pagar con cripto')}
                    </button>
                  )}
                  {!PROVIDERS_ENABLED.stripe && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.55rem', borderRadius: '0.75rem', border: '1px dashed rgba(255,255,255,0.14)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <CreditCard size={15} /> {isEn ? 'Card & more — coming soon' : 'Tarjeta y más — próximamente'}
                    </div>
                  )}
                  {/* Pedir acceso: ícono de sobre (sin exponer el correo). Abre el
                      mail al admin con el plan + el mail de la cuenta pre-cargados. */}
                  <a
                    href={`mailto:${ACCESS_REQUEST_EMAIL}?subject=${encodeURIComponent(`${isEn ? 'Access request' : 'Pedido de acceso'} — ${planName}`)}&body=${encodeURIComponent(`${isEn ? 'My account email' : 'Mail de mi cuenta'}: ${user.email}`)}`}
                    title={isEn ? 'Request access by email' : 'Pedir acceso por mail'}
                    aria-label={isEn ? 'Request access by email' : 'Pedir acceso por mail'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.1rem', padding: '0.45rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    <Mail size={15} /> {isEn ? 'Request access' : 'Pedir acceso'}
                  </a>
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

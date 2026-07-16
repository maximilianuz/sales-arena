import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, X, AlertCircle, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Flujo: CONVENCIDO ───────────────────────────────────────────────────────
function FlowConvinced({ scenario, onClose, onResult }) {
  const [done, setDone] = useState(false);
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const handleBuy = () => {
    setDone(true);
    setTimeout(() => onResult('closed'), 1200);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {!done ? (
        <>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
          <h3 style={{ marginBottom: '0.5rem' }}>{isEn ? 'Ready to move forward!' : '¡Listo para avanzar!'}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {isEn ? `Investment: $X — Shall we move forward?` : `Inversión: $X — ¿Avanzamos?`}
          </p>
          <button className="btn btn-primary btn-large" onClick={handleBuy} style={{ width: '100%' }}>
            {isEn ? '✅ Yes, let\'s do it!' : '✅ ¡Sí, lo hacemos!'}
          </button>
          <button className="btn btn-outline" onClick={onClose} style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {isEn ? 'Not now' : 'Ahora no'}
          </button>
        </>
      ) : (
        <div>
          <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--success)' }}>{isEn ? '🎉 Deal closed!' : '🎉 ¡Trato cerrado!'}</h3>
        </div>
      )}
    </div>
  );
}

// ─── Flujo: DUDANDO ──────────────────────────────────────────────────────────
function FlowHesitant({ scenario, onClose, onResult }) {
  const [step, setStep] = useState(0);
  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const termsRef = useRef(null);
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const handleCoupon = () => {
    setCouponError(isEn ? '❌ Invalid code. Code expired or already used.' : '❌ Código inválido. El cupón venció o ya fue usado.');
  };

  const handleTermsScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 10) setTermsScrolled(true);
  };

  const handleFinish = () => {
    setProcessing(true);
    setTimeout(() => { setProcessing(false); setDone(true); setTimeout(() => onResult('closed'), 1200); }, 2500);
  };

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
      <h3 style={{ color: 'var(--success)' }}>{isEn ? '🎉 Deal closed!' : '🎉 ¡Trato cerrado!'}</h3>
    </div>
  );

  if (processing) return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse 1s infinite' }}>⏳</div>
      <p style={{ color: 'var(--text-muted)' }}>{isEn ? 'Processing payment...' : 'Procesando pago...'}</p>
    </div>
  );

  return (
    <div>
      {/* Progress steps */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= step ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>

      {step === 0 && (
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--accent)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>{isEn ? 'Are you sure?' : '¿Estás seguro?'}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {isEn ? 'This is a significant investment. Take a moment to review the details before confirming.' : 'Esta es una inversión importante. Tomá un momento para revisar los detalles antes de confirmar.'}
          </p>
          <button className="btn btn-primary" onClick={() => setStep(1)} style={{ width: '100%', marginBottom: '0.5rem' }}>
            {isEn ? 'Yes, continue' : 'Sí, continuar'}
          </button>
          <button className="btn btn-outline" onClick={onClose} style={{ width: '100%', fontSize: '0.85rem' }}>
            {isEn ? 'I need to think more' : 'Necesito pensarlo más'}
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h3 style={{ marginBottom: '1rem' }}>{isEn ? 'Do you have a discount code?' : '¿Tenés un código de descuento?'}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              className="form-input"
              value={coupon}
              onChange={e => { setCoupon(e.target.value); setCouponError(''); }}
              placeholder={isEn ? 'PROMO2024' : 'PROMO2024'}
              style={{ flex: 1 }}
            />
            <button className="btn btn-outline" onClick={handleCoupon}>{isEn ? 'Apply' : 'Aplicar'}</button>
          </div>
          {couponError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{couponError}</p>}
          <button className="btn btn-primary" onClick={() => setStep(2)} style={{ width: '100%', marginTop: '1rem' }}>
            {isEn ? 'Continue without code' : 'Continuar sin código'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 style={{ marginBottom: '0.75rem' }}>{isEn ? 'Read terms and conditions' : 'Leé los términos y condiciones'}</h3>
          <div
            ref={termsRef}
            onScroll={handleTermsScroll}
            style={{ height: '160px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', border: '1px solid var(--glass-border)' }}
          >
            <p><strong>{isEn ? 'Terms and Conditions' : 'Términos y Condiciones'}</strong></p>
            <p>{isEn ? 'By proceeding with this purchase you agree to the following terms: The service begins immediately upon payment confirmation. No refunds after 7 days of service activation. The client accepts to use the platform exclusively for training purposes.' : 'Al proceder con esta compra aceptás los siguientes términos: El servicio comienza inmediatamente tras la confirmación del pago. No se realizarán reembolsos luego de 7 días de activado el servicio. El cliente acepta utilizar la plataforma exclusivamente con fines de entrenamiento.'}</p>
            <p>{isEn ? 'The provider reserves the right to modify the service features with 30 days notice. Session data is stored securely and is not shared with third parties without express consent.' : 'El proveedor se reserva el derecho de modificar las características del servicio con 30 días de aviso previo. Los datos de las sesiones se almacenan de forma segura y no se comparten con terceros sin consentimiento expreso.'}</p>
            <p style={{ color: 'var(--success)', fontWeight: 'bold', marginTop: '1rem' }}>
              {isEn ? '✓ You have reached the end of the terms.' : '✓ Llegaste al final de los términos.'}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleFinish}
            disabled={!termsScrolled}
            style={{ width: '100%', opacity: termsScrolled ? 1 : 0.5 }}
          >
            {termsScrolled ? (isEn ? '✅ I accept and confirm' : '✅ Acepto y confirmo') : (isEn ? 'Scroll to continue...' : 'Desplazate para continuar...')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Flujo: RETICENTE ────────────────────────────────────────────────────────
function FlowReluctant({ scenario, onClose, onResult }) {
  const [step, setStep] = useState(0);
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  if (step === 0) return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>{isEn ? 'Payment details' : 'Datos de pago'}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input className="form-input" placeholder={isEn ? 'Card number' : 'Número de tarjeta'} defaultValue="4242 4242 4242 4242" readOnly />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <input className="form-input" placeholder="MM/YY" defaultValue="12/27" readOnly />
          <input className="form-input" placeholder="CVV" defaultValue="***" readOnly />
        </div>
      </div>
      <button className="btn btn-primary" onClick={() => setStep(1)} style={{ width: '100%' }}>
        <CreditCard size={16} /> {isEn ? 'Pay now' : 'Pagar ahora'}
      </button>
    </div>
  );

  if (step === 1) return (
    <div style={{ textAlign: 'center' }}>
      <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
      <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>
        {isEn ? '❌ Card declined' : '❌ Tarjeta rechazada'}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {isEn ? 'There was a problem processing your payment. Please check your card details or try with another card.' : 'Hubo un problema al procesar tu pago. Revisá los datos de tu tarjeta o intentá con otra.'}
      </p>
      <button className="btn btn-outline" onClick={() => setStep(2)} style={{ width: '100%', marginBottom: '0.5rem' }}>
        {isEn ? 'Try with another card' : 'Intentar con otra tarjeta'}
      </button>
      <button className="btn btn-outline" onClick={() => setStep(3)} style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {isEn ? 'I need to consult with my partner' : 'Lo tengo que consultar con mi socio/pareja'}
      </button>
    </div>
  );

  if (step === 2) return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>{isEn ? 'Try with another card' : 'Intentar con otra tarjeta'}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input className="form-input" placeholder={isEn ? 'Card number' : 'Número de tarjeta'} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <input className="form-input" placeholder="MM/YY" />
          <input className="form-input" placeholder="CVV" />
        </div>
      </div>
      <button className="btn btn-primary" onClick={() => setStep(3)} style={{ width: '100%' }}>
        {isEn ? 'Try again' : 'Intentar de nuevo'}
      </button>
    </div>
  );

  // step === 3: cierra el modal (lead abandona)
  return (
    <div style={{ textAlign: 'center' }}>
      <Clock size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
      <h3 style={{ marginBottom: '0.5rem' }}>{isEn ? 'I\'ll think about it...' : 'Lo voy a pensar...'}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {isEn ? '"I need to check with my partner before deciding. I\'ll get back to you."' : '"Necesito consultarlo con mi socio antes de decidir. Te aviso."'}
      </p>
      <button
        className="btn btn-outline"
        onClick={() => { onResult('abandoned'); onClose(); }}
        style={{ width: '100%' }}
      >
        {isEn ? 'Close' : 'Cerrar'}
      </button>
    </div>
  );
}

// ─── Modal de Checkout ────────────────────────────────────────────────────────
function CheckoutModal({ frictionLevel, scenario, onClose, onResult }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const titles = {
    convinced: isEn ? '✅ Ready to buy' : '✅ Listo para comprar',
    hesitant:  isEn ? '🤔 Thinking about it...' : '🤔 Lo estoy pensando...',
    reluctant: isEn ? '😬 Not so sure...' : '😬 No estoy tan seguro...'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
      <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {isEn ? 'Simulated checkout' : 'Checkout simulado'}
        </p>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem' }}>{titles[frictionLevel]}</h2>

        {frictionLevel === 'convinced' && <FlowConvinced scenario={scenario} onClose={onClose} onResult={onResult} />}
        {frictionLevel === 'hesitant'  && <FlowHesitant  scenario={scenario} onClose={onClose} onResult={onResult} />}
        {frictionLevel === 'reluctant' && <FlowReluctant scenario={scenario} onClose={onClose} onResult={onResult} />}
      </div>
    </div>
  );
}

// ─── Panel del Lead (dial de fricción + trigger checkout) ────────────────────
export default function LeadCheckoutPanel({ checkout, scenario, updateCheckoutPhase }) {
  const [frictionLevel, setFrictionLevel] = useState('hesitant');
  const [showCheckout, setShowCheckout] = useState(false);
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const levels = [
    { id: 'convinced', emoji: '😄', label: isEn ? 'Convinced' : 'Convencido', color: 'var(--success)', desc: isEn ? 'Ready to buy, one click' : 'Listo para comprar, un clic' },
    { id: 'hesitant',  emoji: '🤔', label: isEn ? 'Hesitant' : 'Dudando',     color: 'var(--accent)',  desc: isEn ? 'Needs more push, micro-frictions' : 'Necesita más empuje, micro-fricciones' },
    { id: 'reluctant', emoji: '😬', label: isEn ? 'Reluctant' : 'Reticente',  color: 'var(--danger)', desc: isEn ? 'Complicated flow, abandons' : 'Flujo complicado, abandona' }
  ];

  const active = levels.find(l => l.id === frictionLevel);
  const phase = checkout?.phase || 'idle';
  const result = checkout?.result;

  const handleOpenCheckout = () => {
    updateCheckoutPhase('active');
    setShowCheckout(true);
  };

  const handleResult = (res) => {
    updateCheckoutPhase('completed', res);
    setShowCheckout(false);
  };

  const handleClose = () => {
    if (phase === 'active') updateCheckoutPhase('idle');
    setShowCheckout(false);
  };

  // Navegación con teclado del dial de fricción (patrón radiogroup).
  const handleDialKey = (e, idx) => {
    if (phase !== 'idle') return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (idx + step + levels.length) % levels.length;
    setFrictionLevel(levels[next].id);
    document.getElementById(`friction-opt-${levels[next].id}`)?.focus();
  };

  if (result) {
    const closed = result === 'closed';
    return (
      <div className="glass-panel" style={{ border: `1px solid ${closed ? 'var(--success)' : 'var(--danger)'}`, textAlign: 'center', padding: '1.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{closed ? '🎉' : '😔'}</div>
        <h3 style={{ color: closed ? 'var(--success)' : 'var(--danger)', margin: '0 0 0.25rem' }}>
          {closed ? (isEn ? 'Deal closed!' : '¡Trato cerrado!') : (isEn ? 'Deal lost' : 'Trato perdido')}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          {isEn ? `Friction level: ${active?.label}` : `Nivel de fricción: ${active?.label}`}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel" style={{ border: '1px solid rgba(79,70,229,0.4)', background: 'rgba(79,70,229,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ShoppingCart size={18} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>
            {isEn ? '🎭 Your Friction Level (private)' : '🎭 Tu Nivel de Fricción (privado)'}
          </h3>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          {isEn ? 'Only you can see this. Choose how you\'ll react when the Closer tries to close.' : 'Solo vos ves esto. Elegí cómo vas a reaccionar cuando el Closer intente cerrar.'}
        </p>

        {/* Dial de fricción */}
        <div role="radiogroup" aria-label={isEn ? 'Friction level' : 'Nivel de fricción'} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {levels.map((l, idx) => {
            const selected = frictionLevel === l.id;
            const disabled = phase !== 'idle';
            return (
              <button
                type="button"
                key={l.id}
                id={`friction-opt-${l.id}`}
                role="radio"
                aria-checked={selected}
                aria-label={`${l.label}: ${l.desc}`}
                tabIndex={selected ? 0 : -1}
                disabled={disabled}
                onClick={() => phase === 'idle' && setFrictionLevel(l.id)}
                onKeyDown={(e) => handleDialKey(e, idx)}
                style={{
                  textAlign: 'left', font: 'inherit', width: '100%',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: disabled ? 'default' : 'pointer',
                  border: `1px solid ${selected ? l.color : 'var(--glass-border)'}`,
                  background: selected ? `color-mix(in srgb, ${l.color} 12%, transparent)` : 'rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{l.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', color: selected ? l.color : 'var(--text-main)', fontSize: '0.9rem' }}>{l.label}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{l.desc}</div>
                </div>
                {selected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, boxShadow: `0 0 8px ${l.color}` }} />}
              </button>
            );
          })}
        </div>

        {phase === 'idle' && checkout?.enabled && (
          <button className="btn btn-primary btn-large" onClick={handleOpenCheckout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={18} />
            {isEn ? 'Start simulated checkout' : 'Iniciar checkout simulado'}
          </button>
        )}

        {!checkout?.enabled && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
            {isEn ? '⏳ Waiting for Facilitator to enable the closing phase...' : '⏳ Esperando que el Facilitador habilite la fase de Cierre...'}
          </div>
        )}

        {phase === 'active' && (
          <div style={{ textAlign: 'center', color: 'var(--accent)', fontSize: '0.85rem' }}>
            {isEn ? '⚡ Checkout in progress...' : '⚡ Checkout en progreso...'}
          </div>
        )}
      </div>

      {showCheckout && (
        <CheckoutModal
          frictionLevel={frictionLevel}
          scenario={scenario}
          onClose={handleClose}
          onResult={handleResult}
        />
      )}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { ChessKnight, Mail, Lock, ArrowRight, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { signInWithGoogle, registerWithEmail, signInWithEmail, resetPassword, getGoogleRedirectResult, isInAppBrowser } from '../utils/auth';

// Traduce los códigos de error de Firebase a mensajes claros y accionables,
// en vez de mostrar el crudo "Firebase: Error (auth/...)" en inglés.
function friendlyAuthError(code, isEn) {
  const map = {
    'auth/invalid-email': [isEn ? 'That email address is not valid.' : 'Ese email no es válido.'],
    'auth/user-not-found': [isEn ? 'No account with that email. Try signing up.' : 'No hay cuenta con ese email. Probá registrándote.'],
    'auth/wrong-password': [isEn ? 'Incorrect password.' : 'Contraseña incorrecta.'],
    'auth/invalid-credential': [isEn ? 'Email or password is incorrect.' : 'El email o la contraseña son incorrectos.'],
    'auth/email-already-in-use': [isEn ? 'That email is already registered. Sign in instead.' : 'Ese email ya está registrado. Iniciá sesión.'],
    'auth/weak-password': [isEn ? 'Password must be at least 6 characters.' : 'La contraseña debe tener al menos 6 caracteres.'],
    'auth/popup-blocked': [isEn ? 'Your browser blocked the sign-in window. Redirecting…' : 'El navegador bloqueó la ventana. Redirigiendo…'],
    'auth/popup-closed-by-user': [isEn ? 'The sign-in window was closed before finishing.' : 'Se cerró la ventana antes de terminar.'],
    'auth/network-request-failed': [isEn ? 'Network error. Check your connection and try again.' : 'Error de red. Revisá tu conexión e intentá de nuevo.'],
    'auth/too-many-requests': [isEn ? 'Too many attempts. Please wait a moment and retry.' : 'Demasiados intentos. Esperá un momento y reintentá.'],
    'auth/unauthorized-domain': [isEn ? 'This domain is not authorized for sign-in. Contact the administrator.' : 'Este dominio no está autorizado para iniciar sesión. Avisá al administrador.'],
    'auth/operation-not-allowed': [isEn ? 'This sign-in method is disabled. Contact the administrator.' : 'Este método de acceso está deshabilitado. Avisá al administrador.'],
    'auth/account-exists-with-different-credential': [isEn ? 'This email is registered with a different method. Try email/password.' : 'Ese email está registrado con otro método. Probá con email y contraseña.'],
  };
  const fallback = isEn ? "Couldn't authenticate. Please try again." : 'No se pudo autenticar. Intentá de nuevo.';
  return (map[code] && map[code][0]) || fallback;
}

export default function Login() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Aviso de navegador in-app: Google bloquea OAuth en webviews embebidos.
  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

  // Al volver de un login con redirect (móvil), recogemos el posible error.
  // El éxito lo maneja onAuthStateChanged en App, que avanza solo.
  useEffect(() => {
    getGoogleRedirectResult().catch((e) => {
      setError(friendlyAuthError(e?.code, isEn));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch { /* sin portapapeles */ }
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try { await signInWithGoogle(); }
    catch (e) { setError(friendlyAuthError(e?.code, isEn)); }
    finally { setLoading(false); }
  };

  const [resetMessage, setResetMessage] = useState('');

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    if (!email.trim()) {
      setError(isEn ? 'Please enter your email address first.' : 'Por favor ingresá tu email primero.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetMessage(isEn ? 'Password reset email sent. Check your inbox.' : 'Te enviamos un email para restablecer tu contraseña.');
    } catch (e) {
      setError(friendlyAuthError(e?.code, isEn));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResetMessage(''); setLoading(true);
    try {
      if (mode === 'signup') await registerWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (e) {
      setError(friendlyAuthError(e?.code, isEn));
    } finally { setLoading(false); }
  };

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', position: 'relative' }}>
      {/* Language toggle */}
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
        <select onChange={e => i18n.changeLanguage(e.target.value)} value={(i18n.language || 'es').split('-')[0]}
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '0.35rem 0.6rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.82rem', width: 'auto' }}>
          <option value="es" style={{ background: '#1e1e2f' }}>🇪🇸 ES</option>
          <option value="en" style={{ background: '#1e1e2f' }}>🇺🇸 EN</option>
        </select>
      </div>

      <div style={{ margin: 'auto', maxWidth: '420px', width: '100%' }}>
      <div style={{
        background: 'rgba(15,15,30,0.75)', backdropFilter: 'blur(24px)',
        borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(94,92,230,0.08)',
        padding: '2.5rem 2.25rem', animation: 'modalIn 0.4s ease-out'
      }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', gap: '0.75rem' }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '1.25rem',
            background: 'linear-gradient(135deg,#0a84ff 0%,#5e5ce6 55%,#4d4ad9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(94,92,230,0.45), 0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <ChessKnight size={38} color="white" strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '700', margin: 0, letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#fff 40%,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Sales Arena
            </h1>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(196,181,253,0.55)' }}>
              AI · Multiplayer · Roleplay
            </p>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            {mode === 'signup' ? (isEn ? 'Create your account' : 'Creá tu cuenta') : (isEn ? 'Sign in to continue' : 'Iniciá sesión para continuar')}
          </p>
        </div>

        {/* Aviso: navegador in-app (LinkedIn/Instagram/etc.) — Google bloquea
            el login OAuth aquí. Guiamos a abrir en Chrome/Safari o usar email. */}
        {inApp && (
          <div role="alert" style={{
            display: 'flex', flexDirection: 'column', gap: '0.6rem',
            background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.35)',
            borderRadius: '0.875rem', padding: '0.9rem 1rem', marginBottom: '1.1rem'
          }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <ExternalLink size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--accent)' }}>{isEn ? 'Open in your browser' : 'Abrí en tu navegador'}</strong>
                <div style={{ marginTop: '0.2rem', color: 'rgba(255,255,255,0.9)' }}>
                  {isEn
                    ? "You're inside an app's browser, where Google sign-in is blocked. Open this page in Chrome or Safari — or just use email below."
                    : 'Estás en el navegador de una app, donde Google bloquea el acceso. Abrí esta página en Chrome o Safari — o usá tu email acá abajo.'}
                </div>
              </div>
            </div>
            <button type="button" onClick={copyLink} style={{
              alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.4)',
              color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem',
              padding: '0.4rem 0.75rem', borderRadius: '2rem', cursor: 'pointer'
            }}>
              {linkCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {linkCopied ? (isEn ? 'Link copied' : 'Enlace copiado') : (isEn ? 'Copy link' : 'Copiar enlace')}
            </button>
          </div>
        )}

        {/* Google */}
        <button type="button" onClick={handleGoogle} disabled={loading}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: '0.875rem', cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'white', fontWeight: '600', fontSize: '0.92rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            transition: 'all 0.2s', opacity: loading ? 0.6 : 1
          }}>
          <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          {isEn ? 'Continue with Google' : 'Continuar con Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.78rem' }}>{isEn ? 'or with email' : 'o con tu email'}</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.58)' }} />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={{ paddingLeft: '2.5rem' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.58)' }} />
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder={isEn ? 'Password (min. 6)' : 'Contraseña (mín. 6)'} style={{ paddingLeft: '2.5rem' }} />
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>{error}</div>}
          {resetMessage && <div style={{ color: 'var(--success)', fontSize: '0.82rem' }}>{resetMessage}</div>}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '0.8rem', marginTop: '0.25rem', borderRadius: '0.875rem', cursor: 'pointer',
              background: 'linear-gradient(135deg,#0a84ff,#5e5ce6 55%,#4d4ad9)', color: 'white', border: 'none',
              fontWeight: '700', fontSize: '0.95rem', boxShadow: '0 8px 24px rgba(94,92,230,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.6 : 1
            }}>
            {mode === 'signup' ? (isEn ? 'Create account' : 'Crear cuenta') : (isEn ? 'Sign in' : 'Entrar')}
            <ArrowRight size={17} />
          </button>
          {mode === 'signin' && (
            <div style={{ textAlign: 'right', marginTop: '0.2rem' }}>
              <a href="#" onClick={handleForgot} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.74)', textDecoration: 'underline' }}>
                {isEn ? 'Forgot password?' : '¿Olvidaste tu contraseña?'}
              </a>
            </div>
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {mode === 'signup' ? (
            <span>{isEn ? 'Already have an account?' : '¿Ya tenés cuenta?'}{' '}
              <a href="#" onClick={e => { e.preventDefault(); setMode('signin'); }} style={{ color: '#c4b5fd', fontWeight: '600' }}>{isEn ? 'Sign in' : 'Iniciá sesión'}</a>
            </span>
          ) : (
            <span>{isEn ? "Don't have an account?" : '¿No tenés cuenta?'}{' '}
              <a href="#" onClick={e => { e.preventDefault(); setMode('signup'); }} style={{ color: '#c4b5fd', fontWeight: '600' }}>{isEn ? 'Sign up' : 'Registrate'}</a>
            </span>
          )}
        </div>
      </div>

      </div>
    </div>
  );
}

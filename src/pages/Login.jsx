import React, { useState } from 'react';
import { ChessKnight, Mail, Lock, ArrowRight, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { signInWithGoogle, registerWithEmail, signInWithEmail } from '../utils/auth';

export default function Login() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  // URL absoluta de descarga del APK (para el QR): origin + /descargar-app, que
  // el redirect de netlify.toml resuelve al APK más nuevo de GitHub Releases.
  const appDownloadUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://sales-arena.netlify.app') + '/descargar-app';
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try { await signInWithGoogle(); }
    catch (e) { setError(e.message || (isEn ? "Couldn't sign in with Google." : 'No se pudo iniciar sesión con Google.')); }
    finally { setLoading(false); }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'signup') await registerWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (e) {
      setError(e.message || (isEn ? "Couldn't authenticate." : 'No se pudo autenticar.'));
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
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>{isEn ? 'or with email' : 'o con tu email'}</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={{ paddingLeft: '2.5rem' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder={isEn ? 'Password (min. 6)' : 'Contraseña (mín. 6)'} style={{ paddingLeft: '2.5rem' }} />
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>{error}</div>}
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

      {/* App Android: el QR vive SOLO acá (pantalla inicial). Apunta a
          /descargar-app → redirect (netlify.toml) al APK más nuevo publicado en
          GitHub Releases del repo móvil. Absoluto (window.location.origin) para
          que se pueda escanear con la cámara del celular. */}
      <div style={{
        marginTop: '1.25rem', background: 'rgba(15,15,30,0.75)', backdropFilter: 'blur(24px)',
        borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.07)',
        padding: '1.1rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxSizing: 'border-box'
      }}>
        <a href="/descargar-app" target="_blank" rel="noopener noreferrer"
          style={{ background: 'white', padding: '0.45rem', borderRadius: '0.65rem', display: 'inline-block', flexShrink: 0 }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&ecc=H&data=${encodeURIComponent(appDownloadUrl)}`}
            alt={isEn ? 'QR to download the Android app' : 'QR para descargar la app Android'}
            style={{ display: 'block', width: '96px', height: '96px' }}
          />
        </a>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.3rem' }}>
            <Smartphone size={16} color="#a5b4fc" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{isEn ? 'Android App' : 'App Android'}</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.45 }}>
            {isEn
              ? 'Scan the QR with your phone to download and install the app, and train from anywhere.'
              : 'Escaneá el QR con tu celular para descargar e instalar la app y entrenar desde donde estés.'}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

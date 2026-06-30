import React, { useState } from 'react';
import { ChessKnight } from 'lucide-react';
import { signInWithGoogle, registerWithEmail, signInWithEmail } from '../utils/auth';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e.message || 'No se pudo iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await registerWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (e) {
      setError(e.message || 'No se pudo autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="glass-panel" style={{ margin: 'auto', maxWidth: '420px', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="logo-container">
            <ChessKnight size={48} color="white" strokeWidth={1.5} />
          </div>
          <h2 style={{
            textAlign: 'center',
            fontSize: '2.2rem',
            fontWeight: '800',
            background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            Sales Arena
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {mode === 'signup' ? 'Crea tu cuenta' : 'Inicia sesión para continuar'}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline"
          style={{ width: '100%', marginBottom: '1.5rem' }}
          onClick={handleGoogle}
          disabled={loading}
        >
          Continuar con Google
        </button>

        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 1.5rem' }}>
          o con tu email
        </div>

        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="tu@email.com"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="Contraseña (mín. 6 caracteres)"
          />
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>
          )}
          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          {mode === 'signup' ? (
            <span style={{ color: 'var(--text-muted)' }}>
              ¿Ya tenés cuenta?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); }}>Inicia sesión</a>
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              ¿No tenés cuenta?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); }}>Registrate</a>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { logError } from '../utils/telemetry';

/**
 * Red de seguridad global. Sin esto, cualquier error de render en un
 * componente hijo desmonta TODO el árbol de React y el usuario queda ante
 * una pantalla blanca (la app "se tilda"). Con el boundary, aislamos el
 * fallo, mostramos un fallback premium y ofrecemos recuperación sin perder
 * la sesión de Firebase.
 *
 * Es un class component a propósito: los error boundaries todavía no existen
 * como hook en React 19. Se mantiene deliberadamente autosuficiente (estilos
 * inline con variables del tema, sin i18n ni librerías) para que NUNCA
 * dependa de algo que pueda estar roto en el momento del crash.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Se capturó un error de render:', error, info?.componentStack);
    // Observador Kaizen: reportar a telemetría (best-effort; logError nunca lanza).
    logError(error, { source: 'error_boundary', componentStack: info?.componentStack?.slice(0, 1000) });
    if (typeof this.props.onError === 'function') {
      try { this.props.onError(error, info); } catch { /* no romper el fallback */ }
    }
  }

  handleRetry = () => {
    // Reintenta re-montar el árbol. Útil para errores transitorios
    // (un dato que llegó a medias y ya se corrigió en el siguiente render).
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isEn = (typeof navigator !== 'undefined' && navigator.language || '')
      .toLowerCase()
      .startsWith('en');

    const t = isEn
      ? {
          title: 'Something broke on our side',
          body: 'Your session is safe. You can retry, and if it keeps happening, reload the app.',
          retry: 'Retry',
          reload: 'Reload app',
          details: 'Technical details',
        }
      : {
          title: 'Algo se rompió de nuestro lado',
          body: 'Tu sesión está a salvo. Podés reintentar y, si sigue pasando, recargar la app.',
          retry: 'Reintentar',
          reload: 'Recargar app',
          details: 'Detalles técnicos',
        };

    const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.badge}>⚠</div>
          <h1 style={styles.title}>{t.title}</h1>
          <p style={styles.body}>{t.body}</p>
          <div style={styles.actions}>
            <button style={styles.primaryBtn} onClick={this.handleRetry}>{t.retry}</button>
            <button style={styles.ghostBtn} onClick={this.handleReload}>{t.reload}</button>
          </div>
          {isDev && this.state.error && (
            <details style={styles.details}>
              <summary style={styles.summary}>{t.details}</summary>
              <pre style={styles.pre}>{String(this.state.error?.stack || this.state.error)}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'var(--bg-dark, #09090b)',
    color: 'var(--text-main, #f8fafc)',
    fontFamily: 'inherit',
  },
  card: {
    maxWidth: '460px',
    width: '100%',
    textAlign: 'center',
    background: 'var(--bg-card, rgba(24,24,27,0.65))',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: '18px',
    padding: '2.5rem 2rem',
    boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(12px)',
  },
  badge: {
    width: '56px',
    height: '56px',
    lineHeight: '56px',
    margin: '0 auto 1.25rem',
    borderRadius: '50%',
    fontSize: '1.6rem',
    background: 'rgba(255, 69, 58, 0.12)',
    color: 'var(--danger, #ff453a)',
  },
  title: { fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.6rem' },
  body: { color: 'var(--text-muted, #94a3b8)', lineHeight: 1.55, margin: '0 0 1.75rem' },
  actions: { display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn: {
    cursor: 'pointer',
    border: 'none',
    borderRadius: '10px',
    padding: '0.7rem 1.4rem',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, var(--primary, #5e5ce6), var(--primary-hover, #4d4ad9))',
    boxShadow: '0 4px 15px -3px var(--primary-glow, rgba(94,92,230,0.4))',
  },
  ghostBtn: {
    cursor: 'pointer',
    borderRadius: '10px',
    padding: '0.7rem 1.4rem',
    fontWeight: 600,
    color: 'var(--text-main, #f8fafc)',
    background: 'transparent',
    border: '1px solid rgba(148, 163, 184, 0.3)',
  },
  details: { marginTop: '1.75rem', textAlign: 'left' },
  summary: { cursor: 'pointer', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem' },
  pre: {
    marginTop: '0.75rem',
    maxHeight: '220px',
    overflow: 'auto',
    fontSize: '0.72rem',
    lineHeight: 1.5,
    color: '#fca5a5',
    background: 'rgba(0,0,0,0.35)',
    borderRadius: '8px',
    padding: '0.75rem',
    whiteSpace: 'pre-wrap',
  },
};

export default ErrorBoundary;

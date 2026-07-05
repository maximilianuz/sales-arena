import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCcw, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Timer({ stages, activeStageIndex, timerState, updateTimer, maxMinutes, sessionStartedAt, onTimeLimitReached }) {
  const { t } = useTranslation();
  const [localTimeLeft, setLocalTimeLeft] = useState(0);
  const [sessionElapsed, setSessionElapsed] = useState(0); // segundos totales de sesión
  const limitReachedRef = useRef(false);

  // Timer por etapa
  useEffect(() => {
    let interval;
    if (timerState?.isRunning && timerState?.endTimestamp) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((timerState.endTimestamp - now) / 1000));
        setLocalTimeLeft(remaining);
        if (remaining === 0) clearInterval(interval);
      }, 1000);
    } else {
      setLocalTimeLeft(timerState?.timeLeft || 0);
    }
    return () => clearInterval(interval);
  }, [timerState]);

  // Timer acumulativo de sesión (solo para free con maxMinutes)
  useEffect(() => {
    if (!maxMinutes || !sessionStartedAt) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - sessionStartedAt) / 1000);
      setSessionElapsed(elapsed);

      const limitSeconds = maxMinutes * 60;
      if (elapsed >= limitSeconds && !limitReachedRef.current) {
        limitReachedRef.current = true;
        onTimeLimitReached?.();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [maxMinutes, sessionStartedAt, onTimeLimitReached]);

  const handleStart = () => {
    if (!updateTimer) return;
    const now = Date.now();
    updateTimer({ isRunning: true, endTimestamp: now + localTimeLeft * 1000, timeLeft: localTimeLeft });
  };

  const handlePause = () => {
    if (!updateTimer) return;
    updateTimer({ isRunning: false, endTimestamp: null, timeLeft: localTimeLeft });
  };

  const handleReset = () => {
    if (!updateTimer) return;
    const initialTime = (stages[activeStageIndex || 0]?.estimatedTime || 5) * 60;
    updateTimer({ isRunning: false, endTimestamp: null, timeLeft: initialTime });
  };

  const minutes = Math.floor(localTimeLeft / 60);
  const seconds = localTimeLeft % 60;
  const isDanger = localTimeLeft < 60 && localTimeLeft > 0;

  // Session cap info
  const sessionLimitSeconds = maxMinutes ? maxMinutes * 60 : null;
  const sessionRemaining = sessionLimitSeconds ? Math.max(0, sessionLimitSeconds - sessionElapsed) : null;
  const sessionMinLeft = sessionRemaining !== null ? Math.floor(sessionRemaining / 60) : null;
  const sessionSecLeft = sessionRemaining !== null ? sessionRemaining % 60 : null;
  const isSessionWarning = sessionRemaining !== null && sessionRemaining <= 300 && sessionRemaining > 0; // últimos 5min
  const isSessionDanger = sessionRemaining !== null && sessionRemaining <= 60 && sessionRemaining > 0;

  return (
    <div className="glass-panel" style={{
      textAlign: 'center', marginBottom: '1.5rem',
      border: isDanger ? '1px solid rgba(255, 69, 58, 0.4)' : '1px solid var(--glass-border)',
      boxShadow: isDanger ? '0 0 30px rgba(255, 69, 58, 0.2)' : 'var(--glass-shadow)',
      transition: 'all 0.5s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: isDanger ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.1em', fontWeight: '700' }}>
        <Clock size={16} /> {t('timer.title')}
      </div>

      <div style={{ fontSize: '4.5rem', fontWeight: '800', fontFamily: 'monospace', color: isDanger ? 'var(--danger)' : 'white', textShadow: isDanger ? '0 0 20px rgba(255, 69, 58, 0.6)' : '0 0 20px rgba(255,255,255,0.2)', lineHeight: '1', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.05em' }}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {updateTimer && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
          {!timerState?.isRunning ? (
            <button className="btn btn-primary" onClick={handleStart}><Play size={18} /> {t('timer.start')}</button>
          ) : (
            <button className="btn btn-secondary" onClick={handlePause}><Square size={18} /> {t('timer.pause')}</button>
          )}
          <button className="btn btn-outline" onClick={handleReset}><RefreshCcw size={18} /> {t('timer.reset')}</button>
        </div>
      )}

      {localTimeLeft === 0 && (
        <div style={{ color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
          {t('timer.warning')}
        </div>
      )}

      {/* Barra de sesión acumulativa (solo free) */}
      {sessionLimitSeconds && sessionStartedAt && (
        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
            <span style={{ color: isSessionWarning ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
              {isSessionWarning && <AlertTriangle size={12} />}
              Sesión libre
            </span>
            <span style={{ color: isSessionDanger ? 'var(--danger)' : isSessionWarning ? 'var(--accent)' : 'var(--text-muted)', fontWeight: '700', fontFamily: 'monospace' }}>
              {String(sessionMinLeft).padStart(2, '0')}:{String(sessionSecLeft).padStart(2, '0')} restantes
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, (sessionRemaining / sessionLimitSeconds) * 100)}%`,
              background: isSessionDanger ? 'var(--danger)' : isSessionWarning ? 'var(--accent)' : 'var(--success)',
              borderRadius: '2px',
              transition: 'width 1s linear, background 0.5s ease'
            }} />
          </div>
          {isSessionWarning && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: isSessionDanger ? 'var(--danger)' : 'var(--accent)' }}>
              {isSessionDanger ? '⚠️ ¡Último minuto! Upgradeá para continuar.' : '⚡ Menos de 5 min en el plan gratuito.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

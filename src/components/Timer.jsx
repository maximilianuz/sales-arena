import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCcw, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Timer({ stages, timerState, updateTimer }) {
  const { t } = useTranslation();
  const [localTimeLeft, setLocalTimeLeft] = useState(0);

  useEffect(() => {
    let interval;
    if (timerState?.isRunning && timerState?.endTimestamp) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((timerState.endTimestamp - now) / 1000));
        setLocalTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
    } else {
      setLocalTimeLeft(timerState?.timeLeft || 0);
    }
    return () => clearInterval(interval);
  }, [timerState]);

  const handleStart = () => {
    if (!updateTimer) return;
    const now = Date.now();
    const endTimestamp = now + (localTimeLeft * 1000);
    updateTimer({ isRunning: true, endTimestamp, timeLeft: localTimeLeft });
  };

  const handlePause = () => {
    if (!updateTimer) return;
    updateTimer({ isRunning: false, endTimestamp: null, timeLeft: localTimeLeft });
  };

  const handleReset = () => {
    if (!updateTimer) return;
    const initialTime = (stages[0]?.estimatedTime || 5) * 60;
    updateTimer({ isRunning: false, endTimestamp: null, timeLeft: initialTime });
  };

  const minutes = Math.floor(localTimeLeft / 60);
  const seconds = localTimeLeft % 60;
  const isDanger = localTimeLeft < 60 && localTimeLeft > 0;

  return (
    <div className="glass-panel" style={{ textAlign: 'center', marginBottom: '1.5rem', border: isDanger ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--glass-border)', boxShadow: isDanger ? '0 0 30px rgba(239, 68, 68, 0.2)' : 'var(--glass-shadow)', transition: 'all 0.5s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: isDanger ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.1em', fontWeight: '700' }}>
        <Clock size={16} /> {t('timer.title')}
      </div>
      <div style={{ fontSize: '4.5rem', fontWeight: '800', fontFamily: 'monospace', color: isDanger ? 'var(--danger)' : 'white', textShadow: isDanger ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 0 20px rgba(255,255,255,0.2)', lineHeight: '1', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.05em' }}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      
      {updateTimer && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
          {!timerState?.isRunning ? (
            <button className="btn btn-primary" onClick={handleStart}>
              <Play size={18} /> {t('timer.start')}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handlePause}>
              <Square size={18} /> {t('timer.pause')}
            </button>
          )}
          <button className="btn btn-outline" onClick={handleReset}>
            <RefreshCcw size={18} /> {t('timer.reset')}
          </button>
        </div>
      )}
      
      {localTimeLeft === 0 && (
        <div style={{ color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 'bold', animation: 'pulse 1s infinite' }}>
          {t('timer.warning')}
        </div>
      )}
    </div>
  );
}

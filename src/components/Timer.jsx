import React, { useState, useEffect } from 'react';
import { Timer as TimerIcon, Play, Pause, RotateCcw, Hand } from 'lucide-react';

export default function Timer({ stages = [], timerState, updateTimer }) {
  const [localTimeLeft, setLocalTimeLeft] = useState(300);

  const defaultTimerState = {
    isRunning: false,
    startTimestamp: 0,
    accumulatedTime: 0,
    initialTime: 300
  };

  const currentTimer = timerState || defaultTimerState;

  useEffect(() => {
    let interval = null;
    
    const calculateTimeLeft = () => {
      let elapsed = currentTimer.accumulatedTime;
      if (currentTimer.isRunning && currentTimer.startTimestamp) {
        elapsed += (Date.now() - currentTimer.startTimestamp) / 1000;
      }
      const remaining = Math.max(0, currentTimer.initialTime - elapsed);
      return Math.floor(remaining);
    };

    setLocalTimeLeft(calculateTimeLeft());

    if (currentTimer.isRunning) {
      interval = setInterval(() => {
        const remaining = calculateTimeLeft();
        setLocalTimeLeft(remaining);
        
        // Auto-stop if reached 0
        if (remaining <= 0 && updateTimer) {
          updateTimer({
            ...currentTimer,
            isRunning: false,
            accumulatedTime: currentTimer.initialTime
          });
        }
      }, 500); // 500ms for responsiveness
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTimer, updateTimer]);

  const toggle = () => {
    if (!updateTimer) return; // Only Facilitator can trigger this
    
    if (currentTimer.isRunning) {
      // Pause
      const elapsedSinceStart = (Date.now() - currentTimer.startTimestamp) / 1000;
      updateTimer({
        ...currentTimer,
        isRunning: false,
        accumulatedTime: currentTimer.accumulatedTime + elapsedSinceStart
      });
    } else {
      // Play
      if (localTimeLeft <= 0) return; // Can't play if 0
      updateTimer({
        ...currentTimer,
        isRunning: true,
        startTimestamp: Date.now()
      });
    }
  };
  
  const reset = () => {
    if (!updateTimer) return;
    updateTimer({
      isRunning: false,
      startTimestamp: 0,
      accumulatedTime: 0,
      initialTime: currentTimer.initialTime
    });
  };

  const setTime = (minutes) => {
    if (!updateTimer) return;
    updateTimer({
      isRunning: false,
      startTimestamp: 0,
      accumulatedTime: 0,
      initialTime: minutes * 60
    });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = localTimeLeft > 0 && localTimeLeft <= 60; // Less than 1 minute red
  const isTimeUp = localTimeLeft <= 0;

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
      <div className="panel-title" style={{ justifyContent: 'center' }}>
        <TimerIcon size={20} />
        Cronómetro
      </div>
      
      <div style={{ 
        fontSize: '6rem', 
        fontWeight: '800', 
        lineHeight: '1',
        margin: '1rem 0',
        color: isTimeUp ? 'var(--danger)' : (isLowTime ? 'var(--accent)' : 'var(--text-main)'),
        textShadow: isTimeUp ? '0 0 20px var(--danger)' : 'none',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {formatTime(localTimeLeft)}
      </div>

      {updateTimer && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button className={`btn ${currentTimer.isRunning ? 'btn-secondary' : 'btn-primary'}`} onClick={toggle} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
              {currentTimer.isRunning ? <><Hand size={18} /> Parada Técnica (Feedback)</> : <><Play size={18} /> Iniciar Roleplay</>}
            </button>
            <button className="btn btn-outline" onClick={reset}>
              <RotateCcw size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {[5, 10].map(min => (
              <button 
                key={min} 
                className="btn btn-outline" 
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem', borderColor: currentTimer.initialTime === min*60 ? 'var(--primary)' : '' }}
                onClick={() => setTime(min)}
              >
                {min}m
              </button>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', padding: '2px' }}>
              <input 
                type="number" 
                min="1" max="120"
                defaultValue="45"
                id="customTimeInput"
                style={{ width: '50px', background: 'transparent', border: 'none', color: 'white', textAlign: 'center', padding: '0.25rem', outline: 'none' }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: '0.5rem' }}>m</span>
              <button 
                className="btn btn-outline"
                style={{ padding: '0.15rem 0.5rem', fontSize: '0.8rem', border: 'none', borderLeft: '1px solid var(--glass-border)', borderRadius: 0 }}
                onClick={() => {
                  const val = parseInt(document.getElementById('customTimeInput').value);
                  if (val > 0) setTime(val);
                }}
              >
                Fijar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Timer as TimerIcon, Play, Pause, RotateCcw, Hand } from 'lucide-react';

export default function Timer({ stages = [] }) {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes by default
  const [isActive, setIsActive] = useState(false);
  const [initialTime, setInitialTime] = useState(300);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggle = () => setIsActive(!isActive);
  
  const reset = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
  };

  const setTime = (minutes) => {
    const seconds = minutes * 60;
    setInitialTime(seconds);
    setTimeLeft(seconds);
    setIsActive(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeft > 0 && timeLeft <= 60; // Less than 1 minute red
  const isTimeUp = timeLeft === 0;

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
        {formatTime(timeLeft)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`} onClick={toggle} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          {isActive ? <><Hand size={18} /> Parada Técnica (Feedback)</> : <><Play size={18} /> Iniciar Roleplay</>}
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
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem', borderColor: initialTime === min*60 ? 'var(--primary)' : '' }}
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
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Target, Shield, Eye, Play } from 'lucide-react';

export default function Lobby() {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('Observador');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim() || !userName.trim()) return;
    
    let userId = localStorage.getItem('sales_arena_userId');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sales_arena_userId', userId);
    }

    localStorage.setItem('sales_arena_userName', userName);
    localStorage.setItem('sales_arena_role', role);

    navigate(`/room/${roomId.toUpperCase()}`);
  };

  const generateRoomId = () => {
    setRoomId(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const roles = [
    { id: 'Facilitador', icon: <Shield size={20} />, color: 'var(--danger)', desc: 'Controla el reloj y genera escenarios.' },
    { id: 'Closer', icon: <Target size={20} />, color: 'var(--primary)', desc: 'Vende. No puede ver el perfil del Lead.' },
    { id: 'Lead', icon: <Users size={20} />, color: 'var(--secondary)', desc: 'Actúa como el cliente. Ve todo su perfil.' },
    { id: 'Observador', icon: <Eye size={20} />, color: 'var(--success)', desc: 'Observa y puntúa al Closer en vivo.' }
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '2rem', animation: 'modalIn 0.3s' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary)' }}>Sales Arena</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>Multijugador en Tiempo Real</p>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tu Nombre</label>
            <input 
              type="text" 
              required
              value={userName} 
              onChange={e => setUserName(e.target.value)} 
              placeholder="Ej. Juan Pérez"
              style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>ID de la Sala</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                required
                value={roomId} 
                onChange={e => setRoomId(e.target.value.toUpperCase())} 
                placeholder="Ej. ABCD12"
                style={{ flex: 1, padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', textTransform: 'uppercase' }}
              />
              <button type="button" className="btn btn-outline" onClick={generateRoomId}>
                Generar
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Elige tu Rol</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
              {roles.map(r => (
                <div 
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: role === r.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: role === r.id ? `1px solid ${r.color}` : '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ color: r.color }}>{r.icon}</div>
                  <div>
                    <strong style={{ display: 'block', color: 'white' }}>{r.id}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }}>
            <Play size={20} /> Unirse a la Sala
          </button>
        </form>
      </div>
    </div>
  );
}

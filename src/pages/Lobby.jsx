import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

export default function Lobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [roomId, setRoomId] = useState('');

  const roles = [
    { id: 'Facilitador', label: t('lobby.roles.Facilitador'), desc: t('lobby.roles.FacilitadorDesc') },
    { id: 'Closer', label: t('lobby.roles.Closer'), desc: t('lobby.roles.CloserDesc') },
    { id: 'Lead', label: t('lobby.roles.Lead'), desc: t('lobby.roles.LeadDesc') },
    { id: 'Observador', label: t('lobby.roles.Observador'), desc: t('lobby.roles.ObservadorDesc') }
  ];

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name || !role || !roomId) return;
    
    localStorage.setItem('sales_arena_userName', name);
    localStorage.setItem('sales_arena_role', role);
    localStorage.setItem('sales_arena_roomId', roomId);

    navigate(`/room/${roomId}`);
  };

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Header title={t('lobby.title')} />
      
      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', marginTop: '2rem', animation: 'modalIn 0.3s ease-out' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary)', marginBottom: '2rem', fontSize: '2rem' }}>
          {t('lobby.whoWillYouPlay')}
        </h2>
        
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tu Nombre</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>ID de Sala</label>
            <input 
              type="text" 
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="form-input"
              placeholder="Ej. sala-secreta-123"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-muted)' }}>{t('lobby.chooseRole')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {roles.map(r => (
                <div 
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: `2px solid ${role === r.id ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: role === r.id ? 'rgba(79, 70, 229, 0.1)' : 'rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  <strong style={{ display: 'block', color: role === r.id ? 'white' : 'var(--text-main)', marginBottom: '0.25rem' }}>
                    {r.label}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {r.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-large" 
            style={{ marginTop: '1rem' }}
            disabled={!name || !role || !roomId}
          >
            {t('lobby.continue')}
          </button>
        </form>
      </div>
    </div>
  );
}

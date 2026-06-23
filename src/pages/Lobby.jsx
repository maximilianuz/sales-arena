import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, Copy, ChessKnight } from 'lucide-react';
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

  const generateRoomId = () => {
    const newId = `sala-${Math.floor(Math.random() * 90000) + 10000}`;
    setRoomId(newId);
  };

  const copyRoomId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    alert(t('lobby.idCopied') || 'ID copiado al portapapeles');
  };

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Header title={t('lobby.title')} />
      
      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', marginTop: '2rem', animation: 'modalIn 0.3s ease-out' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '1rem', borderRadius: '1rem', marginBottom: '1rem', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)' }}>
            <ChessKnight size={48} color="white" strokeWidth={1.5} />
          </div>
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '3rem', 
            fontWeight: '800',
            background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}>
            Sales Arena
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: '600' }}>
            AI-Powered Simulator
          </p>
        </div>
        
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="form-input"
                placeholder="Ej. sala-secreta-123"
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={generateRoomId} 
                title="Generar ID al azar"
                style={{ padding: '0.5rem' }}
              >
                <Shuffle size={20} />
              </button>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={copyRoomId} 
                title="Copiar ID"
                style={{ padding: '0.5rem' }}
                disabled={!roomId}
              >
                <Copy size={20} />
              </button>
            </div>
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

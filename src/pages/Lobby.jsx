import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, Copy, ChessKnight, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Lobby() {
  const { t, i18n } = useTranslation();
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

  const getRoleColor = (roleId) => {
    switch(roleId) {
      case 'Facilitador': return 'var(--primary)';
      case 'Closer': return 'var(--success)';
      case 'Lead': return 'var(--accent)';
      case 'Observador': return 'var(--secondary)';
      default: return 'var(--primary)';
    }
  };

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

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
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', position: 'relative', padding: '2rem 1rem' }}>
      
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10, display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <a 
          href={i18n.language?.startsWith('en') ? "/presentacion_en.html" : "/presentacion.html"}
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.1)', color: 'white',
            border: '1px solid rgba(16, 185, 129, 0.5)', padding: '0.4rem 0.8rem',
            borderRadius: '2rem', cursor: 'pointer', textDecoration: 'none',
            fontSize: '0.85rem', backdropFilter: 'blur(10px)'
          }}
        >
          <BookOpen size={16} /> {i18n.language?.startsWith('en') ? 'Instructions' : 'Instrucciones'}
        </a>
        <select 
          onChange={changeLanguage} 
          value={(i18n.language || 'es').split('-')[0]} 
          style={{ 
            background: 'rgba(255,255,255,0.05)', 
            color: 'var(--text-main)', 
            border: '1px solid var(--glass-border)', 
            padding: '0.4rem 0.8rem', 
            borderRadius: '2rem',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            fontSize: '0.85rem'
          }}
        >
          <option value="es" style={{ background: '#1e1e2f', color: 'white' }}>🇪🇸 Español</option>
          <option value="en" style={{ background: '#1e1e2f', color: 'white' }}>🇺🇸 English</option>
        </select>
      </div>

      <div className="glass-panel" style={{ margin: 'auto', maxWidth: '500px', width: '100%', animation: 'modalIn 0.3s ease-out' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div className="logo-container">
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
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('lobby.yourName')}</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder={t('lobby.namePlaceholder')}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('lobby.roomId')}</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                required
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="form-input"
                placeholder={t('lobby.roomIdPlaceholder')}
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
              {roles.map(r => {
                const roleColor = getRoleColor(r.id);
                const isActive = role === r.id;
                return (
                  <div 
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    style={{
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      cursor: 'pointer',
                      border: `1px solid ${isActive ? roleColor : 'var(--glass-border)'}`,
                      background: isActive ? `color-mix(in srgb, ${roleColor} 15%, transparent)` : 'rgba(0,0,0,0.25)',
                      boxShadow: isActive ? `0 0 15px color-mix(in srgb, ${roleColor} 30%, transparent)` : 'none',
                      transform: isActive ? 'translateY(-2px)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <strong style={{ display: 'block', color: isActive ? 'white' : 'var(--text-main)', marginBottom: '0.25rem' }}>
                      {r.label}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {r.desc}
                    </span>
                  </div>
                );
              })}
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

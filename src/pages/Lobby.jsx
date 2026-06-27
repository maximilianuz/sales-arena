import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, Copy, ChessKnight, BookOpen, Smartphone } from 'lucide-react';
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

  useEffect(() => {
    if (window.particlesJS) {
      window.particlesJS("lobby-particles", {
        "particles": {
            "number": { "value": 60, "density": { "enable": true, "value_area": 800 } },
            "color": { "value": ["#4CAF50", "#3b82f6", "#10b981"] },
            "shape": { "type": "circle" },
            "opacity": { "value": 0.4 },
            "size": { "value": 3, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#4CAF50", "opacity": 0.2, "width": 1.5 },
            "move": { "enable": true, "speed": 1.2, "direction": "top", "random": true, "straight": false, "out_mode": "out", "bounce": false }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": { "enable": true, "mode": "grab" },
                "onclick": { "enable": true, "mode": "push" },
                "resize": true
            },
            "modes": {
                "grab": { "distance": 180, "line_linked": { "opacity": 0.6 } },
                "push": { "particles_nb": 3 }
            }
        },
        "retina_detect": true
      });
    }
  }, []);

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', position: 'relative', padding: '2rem 1rem' }}>
      
      <div id="lobby-particles" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}></div>
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

      <div className="glass-panel" style={{ margin: 'auto', maxWidth: '500px', width: '100%', animation: 'modalIn 0.3s ease-out', position: 'relative', zIndex: 1 }}>
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
            <div className="roles-grid">
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

      <div style={{ 
        marginTop: '2rem', 
        textAlign: 'center', 
        background: 'rgba(255,255,255,0.05)', 
        padding: '1.5rem', 
        borderRadius: '1rem', 
        border: '1px solid var(--glass-border)',
        position: 'relative',
        zIndex: 1,
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '0.4rem', borderRadius: '0.5rem', display: 'flex', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)' }}>
            <Smartphone size={20} color="white" strokeWidth={2} />
          </div>
          <p style={{ color: 'var(--text-main)', margin: 0, fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '0.02em' }}>
            {i18n.language?.startsWith('en') ? 'Download the Mobile App' : 'Descarga la App Móvil'}
          </p>
        </div>
        <a 
          href="https://sales-arena-mobile.netlify.app/"
          style={{ background: 'white', padding: '0.5rem', borderRadius: '0.5rem', display: 'inline-block', position: 'relative', cursor: 'pointer' }}
          target="_blank"
          rel="noopener noreferrer"
          title="Haz clic para visitar la página de descarga"
        >
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://sales-arena-mobile.netlify.app/" 
            alt="QR Code Mobile App" 
            style={{ display: 'block' }}
          />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '2px', borderRadius: '4px', display: 'flex' }}>
            <ChessKnight size={24} color="black" strokeWidth={2} />
          </div>
        </a>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
          {i18n.language?.startsWith('en') ? 'Scan to play from your smartphone' : 'Escanea el código para participar desde tu celular'}
        </p>
      </div>
    </div>
  );
}

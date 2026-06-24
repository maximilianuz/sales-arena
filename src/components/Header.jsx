import React, { useState } from 'react';
import { Settings, Cpu, ChessKnight, Copy, CheckCircle2, User, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Header({ title, roomId, role, onTitleChange, onOpenSettings }) {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <header className="header-container" style={{ position: 'sticky', top: '1rem', zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '0.5rem', borderRadius: '0.75rem', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
          <ChessKnight size={24} color="white" strokeWidth={1.5} />
        </div>
        {onTitleChange ? (
          <input 
            type="text" 
            value={title} 
            onChange={(e) => onTitleChange(e.target.value)}
            className="header-title-input"
            style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', background: 'transparent', maxWidth: '300px' }}
          />
        ) : (
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'white', letterSpacing: '-0.02em' }}>{title}</h1>
        )}

        {role && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>
            <User size={14} />
            <span>{role}</span>
          </div>
        )}

        {roomId && (
          <button 
            onClick={handleCopyId}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '2rem', border: `1px solid ${copied ? 'var(--success)' : 'var(--glass-border)'}`, fontSize: '0.85rem', color: copied ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', marginLeft: '0.5rem' }}
            title="Copiar ID de la sala"
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{roomId}</span>
          </button>
        )}
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a 
          href={i18n.language?.startsWith('en') ? "/presentacion_en.html" : "/presentacion.html"}
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-outline" 
          style={{ border: '1px solid rgba(16, 185, 129, 0.5)', color: 'white', background: 'rgba(16, 185, 129, 0.1)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          title={i18n.language?.startsWith('en') ? "View Presentation" : "Ver Presentación"}
        >
          <BookOpen size={18} /> Dossier
        </a>

        <select 
          onChange={changeLanguage} 
          value={(i18n.language || 'es').split('-')[0]} 
          style={{ 
            background: 'rgba(0,0,0,0.5)', 
            color: 'white', 
            border: '1px solid var(--glass-border)', 
            padding: '0.4rem', 
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <option value="es" style={{ background: '#1e1e2f', color: 'white' }}>🇪🇸 Español</option>
          <option value="en" style={{ background: '#1e1e2f', color: 'white' }}>🇺🇸 English</option>
        </select>

        {onOpenSettings && (
          <button className="btn btn-outline" onClick={onOpenSettings} style={{ border: '1px solid rgba(236, 72, 153, 0.5)', color: 'white', background: 'rgba(236, 72, 153, 0.1)' }}>
            <Cpu size={18} /> {t('header.aiSettings')}
          </button>
        )}
      </div>
    </header>
  );
}

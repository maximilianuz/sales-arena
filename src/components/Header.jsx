import React from 'react';
import { Settings, Cpu, ChessKnight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Header({ title, onTitleChange, onOpenSettings }) {
  const { t, i18n } = useTranslation();

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
            style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', background: 'transparent' }}
          />
        ) : (
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'white', letterSpacing: '-0.02em' }}>{title}</h1>
        )}
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

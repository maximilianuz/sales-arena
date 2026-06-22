import React from 'react';
import { Settings, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Header({ title, onTitleChange, onOpenSettings }) {
  const { t, i18n } = useTranslation();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <header className="glass-panel header-container" style={{ margin: '0', borderRadius: '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <img src="/vite.svg" alt="Logo" style={{ width: '40px', height: '40px' }} />
        {onTitleChange ? (
          <input 
            type="text" 
            value={title} 
            onChange={(e) => onTitleChange(e.target.value)}
            className="header-title-input"
          />
        ) : (
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: 'white' }}>{title}</h1>
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
          <button className="btn btn-secondary" onClick={onOpenSettings}>
            <Cpu size={18} /> {t('header.aiSettings')}
          </button>
        )}
      </div>
    </header>
  );
}

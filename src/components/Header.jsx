import React from 'react';
import { Settings, LayoutDashboard } from 'lucide-react';

export default function Header({ title, onTitleChange, onOpenSettings }) {
  return (
    <header className="header-container glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <LayoutDashboard size={32} color="var(--primary)" />
        <input 
          type="text" 
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="header-title-input"
          placeholder="Nombre de la Sesión..."
        />
      </div>
      <div className="header-actions">
        <button className="btn btn-outline" onClick={onOpenSettings} title="Configuración">
          <Settings size={20} />
          Ajustes
        </button>
      </div>
    </header>
  );
}

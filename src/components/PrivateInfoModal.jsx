import React from 'react';
import { EyeOff, X } from 'lucide-react';

export default function PrivateInfoModal({ info, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderColor: 'var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <EyeOff size={24} />
            Información Privada del Cliente
          </h2>
          <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ 
          background: 'rgba(79, 70, 229, 0.1)', 
          border: '1px solid rgba(79, 70, 229, 0.3)',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          fontSize: '1.25rem',
          lineHeight: '1.5'
        }}>
          {info || "No hay información privada disponible para este escenario."}
        </div>



        <button className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

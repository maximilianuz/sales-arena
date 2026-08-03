import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AdminAuthorizedEmails from '../components/AdminAuthorizedEmails';

export default function AdminPanel({ user, onBack }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className="app-container" style={{ padding: '1.5rem', overflowY: 'auto' }}>
      <button
        onClick={handleBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'none',
          border: 'none',
          color: 'var(--primary)',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: '600',
          marginBottom: '2rem'
        }}
      >
        <ChevronLeft size={18} /> {isEn ? 'Back' : 'Volver'}
      </button>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '0.5rem',
          background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {isEn ? 'Admin Panel' : 'Panel de Administrador'}
        </h1>
        <p style={{
          color: 'var(--text-muted)',
          marginBottom: '2rem',
          fontSize: '0.95rem'
        }}>
          {isEn
            ? 'Manage authorized emails for Pro plan access'
            : 'Gestiona correos autorizados para acceso al plan Pro'}
        </p>

        <AdminAuthorizedEmails adminUid={user.uid} />

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '0.75rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          lineHeight: '1.5'
        }}>
          <p style={{ margin: '0 0 0.5rem' }}>
            <strong>{isEn ? 'How it works:' : 'Cómo funciona:'}</strong>
          </p>
          <ul style={{ margin: '0', paddingLeft: '1.25rem' }}>
            <li>{isEn ? 'Add an email to the authorized list' : 'Agregá un correo a la lista de autorizados'}</li>
            <li>
              {isEn
                ? 'When that email logs in or registers, they automatically get Pro access'
                : 'Cuando ese correo inicie sesión o se registre, obtendrá acceso Pro automáticamente'}
            </li>
            <li>{isEn ? 'Access is permanent with no expiration date' : 'El acceso es permanente sin fecha de vencimiento'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

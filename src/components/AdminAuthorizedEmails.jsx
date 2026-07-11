import React, { useState, useEffect } from 'react';
import { ref, onValue, push, remove } from 'firebase/database';
import { db } from '../utils/db';
import { Trash2, Plus, Mail, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AdminAuthorizedEmails({ adminUid }) {
  const { t, i18n } = useTranslation();
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const isEn = i18n.language?.startsWith('en');

  useEffect(() => {
    const emailsRef = ref(db, 'admin/authorizedEmails');
    const unsub = onValue(emailsRef, (snap) => {
      const data = snap.val() || {};
      const emailList = Object.entries(data).map(([id, item]) => ({
        id,
        ...item
      }));
      setEmails(emailList.sort((a, b) =>
        new Date(b.addedAt) - new Date(a.addedAt)
      ));
    });
    return () => unsub();
  }, []);

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setMessage(isEn ? 'Please enter a valid email' : 'Ingresá un email válido');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const emailsRef = ref(db, 'admin/authorizedEmails');
      await push(emailsRef, {
        email: newEmail.toLowerCase().trim(),
        addedAt: new Date().toISOString(),
        addedBy: adminUid
      });
      setNewEmail('');
      setMessage(isEn ? 'Email added successfully' : 'Email agregado correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(isEn ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (emailId) => {
    if (!window.confirm(isEn ? 'Remove this email?' : '¿Remover este correo?')) return;

    try {
      const emailRef = ref(db, `admin/authorizedEmails/${emailId}`);
      await remove(emailRef);
      setMessage(isEn ? 'Email removed' : 'Email removido');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(isEn ? `Error: ${error.message}` : `Error: ${error.message}`);
    }
  };

  const copyEmail = (email) => {
    navigator.clipboard.writeText(email);
    setCopiedId(email);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid var(--glass-border)',
      borderRadius: '1rem',
      padding: '1.5rem',
      marginTop: '2rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Mail size={20} style={{ color: 'var(--primary)' }} />
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
          {isEn ? 'Authorized Emails' : 'Correos Autorizados'}
        </h2>
      </div>

      <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder={isEn ? 'Add email address...' : 'Agregar correo...'}
          style={{
            flex: 1,
            padding: '0.6rem 0.8rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: '0.5rem',
            color: 'var(--text-main)',
            fontSize: '0.9rem'
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.6rem 1rem',
            background: 'var(--primary)',
            border: 'none',
            borderRadius: '0.5rem',
            color: 'white',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Plus size={16} /> {isEn ? 'Add' : 'Agregar'}
        </button>
      </form>

      {message && (
        <div style={{
          padding: '0.6rem 0.8rem',
          background: message.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${message.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          borderRadius: '0.5rem',
          color: message.includes('Error') ? 'var(--danger)' : 'var(--success)',
          fontSize: '0.9rem',
          marginBottom: '1rem'
        }}>
          {message}
        </div>
      )}

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {emails.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
            {isEn ? 'No emails added yet' : 'Sin correos agregados aún'}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {emails.map(item => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.8rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.2rem' }}>{item.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(item.addedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => copyEmail(item.email)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: copiedId === item.email ? 'var(--success)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    marginRight: '0.4rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={isEn ? 'Copy email' : 'Copiar correo'}
                >
                  {copiedId === item.email ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  onClick={() => handleRemoveEmail(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={isEn ? 'Remove' : 'Remover'}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.8rem',
        background: 'rgba(59,130,246,0.1)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '0.5rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        lineHeight: '1.4'
      }}>
        {isEn
          ? '💡 Emails added here will automatically receive access to the Trainer plan when they log in or register.'
          : '💡 Los correos agregados aquí obtendrán acceso automático al plan Trainer al iniciar sesión o registrarse.'}
      </div>
    </div>
  );
}

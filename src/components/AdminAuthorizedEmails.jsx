import React, { useState, useEffect } from 'react';
import { ref, onValue, push, remove } from 'firebase/database';
import { db } from '../utils/db';
import { Trash2, Plus, Mail, Copy, Check, ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Estado real de acceso de un email: 'active' (ya inició sesión y tiene
// acceso), 'revoked' (se le quitó explícitamente), o pendiente (agregado a
// la whitelist pero todavía no inició sesión, así que no se le otorgó nada).
function StatusBadge({ status, isEn }) {
  if (!status || !status.uid) {
    return (
      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
        {isEn ? 'Pending login' : 'Pendiente de ingreso'}
      </span>
    );
  }
  if (status.subscriptionStatus === 'active') {
    return (
      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '1rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', color: 'var(--success)' }}>
        {isEn ? 'Active' : 'Activo'}
      </span>
    );
  }
  if (status.subscriptionStatus === 'revoked') {
    return (
      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '1rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)' }}>
        {isEn ? 'Revoked' : 'Revocado'}
      </span>
    );
  }
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
      {isEn ? 'No access yet' : 'Sin acceso aún'}
    </span>
  );
}

export default function AdminAuthorizedEmails({ adminUid }) {
  const { t, i18n } = useTranslation();
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  // Estado REAL de acceso por email (no alcanza con estar en la lista: el
  // acceso recién se otorga cuando esa persona inicia sesión). Se resuelve
  // en el servidor porque requiere buscar el uid del email vía Identity
  // Toolkit y leer users/{uid} — datos que el cliente no puede ver directo.
  const [accessStatus, setAccessStatus] = useState({});
  const [revokingId, setRevokingId] = useState(null);

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

  // Refresca el estado de acceso cada vez que cambia la lista de emails.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (emails.length === 0) { if (alive) setAccessStatus({}); return; }
      try {
        const res = await fetch('/api/admin-manage-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callerUid: adminUid, action: 'status', emails: emails.map(e => e.email) })
        });
        const data = await res.json().catch(() => ({}));
        if (alive && Array.isArray(data.results)) {
          const map = {};
          data.results.forEach(r => { map[r.email] = r; });
          setAccessStatus(map);
        }
      } catch { /* si falla, simplemente no mostramos el estado */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails.map(e => e.email).join(','), adminUid]);

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

  const handleRemoveEmail = async (emailId, email) => {
    if (!window.confirm(isEn
      ? 'Remove this email and revoke any access already granted?'
      : '¿Remover este correo y revocar el acceso ya otorgado?')) return;

    setRevokingId(emailId);
    try {
      // 1) Revocar en el servidor el acceso YA otorgado (si esa persona ya
      // inició sesión y tiene subscriptionStatus:active). Sacarla solo de la
      // whitelist no le quita el acceso que ya tiene.
      await fetch('/api/admin-manage-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerUid: adminUid, action: 'revoke', email })
      }).catch(() => {});

      // 2) Sacarla de la whitelist para que no se le vuelva a otorgar a futuro.
      const emailRef = ref(db, `admin/authorizedEmails/${emailId}`);
      await remove(emailRef);

      setMessage(isEn ? 'Email removed and access revoked' : 'Correo removido y acceso revocado');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      setMessage(isEn ? `Error: ${error.message}` : `Error: ${error.message}`);
    } finally {
      setRevokingId(null);
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: '500' }}>{item.email}</span>
                    <StatusBadge status={accessStatus[item.email]} isEn={isEn} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {isEn ? 'Added: ' : 'Agregado: '}{new Date(item.addedAt).toLocaleString()}
                    {accessStatus[item.email]?.authorizedAt && (
                      <> · {isEn ? 'access since: ' : 'acceso desde: '}{new Date(accessStatus[item.email].authorizedAt).toLocaleString()}</>
                    )}
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
                  onClick={() => handleRemoveEmail(item.id, item.email)}
                  disabled={revokingId === item.id}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: revokingId === item.id ? 'wait' : 'pointer',
                    opacity: revokingId === item.id ? 0.5 : 1,
                    padding: '0.4rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={isEn ? 'Revoke access and remove' : 'Revocar acceso y quitar'}
                >
                  {revokingId === item.id ? <ShieldOff size={16} /> : <Trash2 size={16} />}
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

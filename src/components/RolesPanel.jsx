import React, { useState } from 'react';
import { Users, UserPlus, Trash2, Shuffle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function RolesPanel({ participants, setParticipants }) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [roles, setRoles] = useState({ seller: null, client: null, observers: [] });

  const addParticipant = (e) => {
    e.preventDefault();
    if (newName.trim() && !participants.includes(newName.trim())) {
      setParticipants([...participants, newName.trim()]);
      setNewName('');
    }
  };

  const removeParticipant = (name) => {
    setParticipants(participants.filter(p => p !== name));
  };

  const assignRoles = () => {
    if (participants.length < 2) {
      alert(t('roles.min_participants'));
      return;
    }

    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    setRoles({
      seller: shuffled[0],
      client: shuffled[1],
      observers: shuffled.slice(2)
    });
  };

  return (
    <div className="glass-panel" style={{ flex: 1 }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} />
          {t('roles.title')}
        </div>
        {participants.length > 0 && (
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={() => { setParticipants([]); setRoles({ seller: null, client: null, observers: [] }); }}
          >
            <Trash2 size={14} /> {t('roles.clear')}
          </button>
        )}
      </div>

      <form onSubmit={addParticipant} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input 
          type="text" 
          placeholder={t('roles.placeholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.75rem' }}>
          <UserPlus size={16} />
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem', minHeight: '30px' }}>
        {participants.map(p => (
          <div key={p} style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            {p}
            <button 
              onClick={() => removeParticipant(p)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {participants.length === 0 && <span style={{ color: 'var(--text-muted)' }}>{t('roles.empty')}</span>}
      </div>

      <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '0.75rem', padding: '0.5rem', fontSize: '0.85rem' }} onClick={assignRoles}>
        <Shuffle size={14} />
        {t('roles.random')}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ background: 'rgba(79, 70, 229, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', borderLeft: '3px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('roles.seller')}</span>
          <strong style={{ fontSize: '0.95rem' }}>{roles.seller || '-'}</strong>
        </div>
        <div style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', borderLeft: '3px solid var(--secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('roles.client')}</span>
          <strong style={{ fontSize: '0.95rem' }}>{roles.client || '-'}</strong>
        </div>
        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', borderLeft: '3px solid var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('roles.observers')}</span>
          <strong style={{ fontSize: '0.95rem', textAlign: 'right', flex: 1, marginLeft: '1rem' }}>
            {roles.observers && roles.observers.length > 0 ? roles.observers.join(', ') : '-'}
          </strong>
        </div>
      </div>
    </div>
  );
}

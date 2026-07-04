import { useState } from 'react';
import { ref, set } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { X, Search } from 'lucide-react';
import { db, auth } from '../utils/db';
import { COUNTRIES, flagEmoji } from '../utils/countries';

// Selector de país del closer (bandera identificatoria). Escribe el código ISO-2
// en users/{uid}/country (regla: cada uno escribe solo el suyo). La bandera se
// propaga al leaderboard cuando el servidor analiza la próxima sesión.
export default function CountryPicker({ current, onClose, onSaved }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const list = COUNTRIES
    .map(c => ({ ...c, label: isEn ? c.en : c.es }))
    .filter(c => c.label.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));

  const pick = async (code) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(code);
    setError('');
    try {
      await set(ref(db, `users/${uid}/country`), code);
      onSaved?.(code);
      onClose();
    } catch {
      setError(isEn ? 'Could not save (rules may need publishing).' : 'No se pudo guardar (quizás falta publicar las reglas).');
      setSaving('');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', flex: 1 }}>{isEn ? 'Your country' : 'Tu país'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.12)', marginBottom: '0.75rem' }}>
          <Search size={15} color="var(--text-muted)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={isEn ? 'Search…' : 'Buscar…'} autoFocus
            style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: '0.9rem' }} />
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{error}</p>}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {list.map(c => (
            <button key={c.code} onClick={() => pick(c.code)} disabled={!!saving} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.6rem', borderRadius: '0.5rem',
              background: current === c.code ? 'rgba(99,102,241,0.15)' : 'transparent',
              border: current === c.code ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
              color: 'white', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left',
            }}>
              <span style={{ fontSize: '1.2rem' }}>{flagEmoji(c.code)}</span>
              <span style={{ flex: 1 }}>{c.label}</span>
              {saving === c.code && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>…</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { X, Briefcase, CheckCircle2, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../utils/db';
import { setScoutingProfile } from '../utils/scouting';

// Opt-in del Closer a la cantera: "Abierto a ofertas". Nada se publica sin
// su consentimiento; el contacto es el que él decide compartir. Requiere
// trayectoria mínima (el servidor la valida) para que la cantera tenga nivel.
export default function ScoutingModal({ onClose }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const user = auth.currentUser;

  const [openToWork, setOpenToWork] = useState(false);
  const [headline, setHeadline] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [country, setCountry] = useState('');
  const [name, setName] = useState(user?.displayName || user?.email?.split('@')[0] || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Cargar el perfil existente (regla RTDB: cada uno puede leer SOLO el suyo).
  useEffect(() => {
    if (!user) return;
    get(ref(db, `scouting/profiles/${user.uid}`)).then(snap => {
      const p = snap.val();
      if (p) {
        setOpenToWork(true);
        setHeadline(p.headline || '');
        setContactEmail(p.contactEmail || user.email || '');
        setCountry(p.country || '');
        setName(p.name || '');
      }
    }).catch(() => { /* sin regla publicada aún: arranca vacío */ });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await setScoutingProfile({ openToWork, name, headline, contactEmail, country });
      setMsg(openToWork
        ? (isEn ? '✅ You are visible to recruiters.' : '✅ Ya estás visible para reclutadores.')
        : (isEn ? 'Profile removed from scouting.' : 'Perfil retirado de la cantera.'));
      setTimeout(onClose, 1400);
    } catch (e) {
      if (e.message === 'need_track_record') {
        setMsg(isEn
          ? 'You need at least 3 analyzed sessions to publish your profile. Keep practicing!'
          : 'Necesitás al menos 3 sesiones analizadas para publicarte. ¡Seguí practicando!');
      } else if (e.message === 'contact_email_required') {
        setMsg(isEn ? 'A valid contact email is required.' : 'Hace falta un email de contacto válido.');
      } else {
        setMsg(e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.65rem',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'white', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <Briefcase size={20} color="var(--accent)" />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
            {isEn ? 'Open to offers' : 'Abierto a ofertas'}
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>
          {isEn
            ? 'Publish your track record so trainers and companies can scout you for real closing jobs. Your stats are verified by the platform — only your contact info is up to you.'
            : 'Publicá tu historial para que trainers y empresas te descubran para trabajos reales de closing. Tus stats las verifica la plataforma — solo el contacto lo elegís vos.'}
        </p>

        {/* Toggle */}
        <button
          onClick={() => setOpenToWork(!openToWork)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.85rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', marginBottom: '1rem',
            background: openToWork ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${openToWork ? 'var(--success)' : 'rgba(255,255,255,0.1)'}`,
            color: 'white', fontWeight: '700', fontSize: '0.9rem'
          }}
        >
          <span>{isEn ? '💼 Visible in the talent pool' : '💼 Visible en la cantera'}</span>
          <span style={{
            width: '42px', height: '24px', borderRadius: '12px', position: 'relative', flexShrink: 0,
            background: openToWork ? 'var(--success)' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s'
          }}>
            <span style={{
              position: 'absolute', top: '3px', left: openToWork ? '21px' : '3px',
              width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s'
            }} />
          </span>
        </button>

        {openToWork && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} maxLength={60}
              placeholder={isEn ? 'Your name' : 'Tu nombre'} />
            <input style={inputStyle} value={headline} onChange={e => setHeadline(e.target.value)} maxLength={140}
              placeholder={isEn ? 'Headline (e.g. "High-ticket closer, ES/EN, B2B SaaS")' : 'Titular (ej. "Closer high ticket, ES/EN, SaaS B2B")'} />
            <input style={inputStyle} value={contactEmail} onChange={e => setContactEmail(e.target.value)} maxLength={120} type="email"
              placeholder={isEn ? 'Contact email (shown to recruiters)' : 'Email de contacto (visible para reclutadores)'} />
            <input style={inputStyle} value={country} onChange={e => setCountry(e.target.value)} maxLength={40}
              placeholder={isEn ? 'Country / timezone' : 'País / zona horaria'} />
          </div>
        )}

        {msg && <p style={{ fontSize: '0.85rem', color: msg.startsWith('✅') ? 'var(--success)' : 'var(--accent)', margin: '0 0 0.75rem' }}>{msg}</p>}

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {saving ? <Loader size={16} className="spin" /> : <CheckCircle2 size={16} />}
          {isEn ? 'Save' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

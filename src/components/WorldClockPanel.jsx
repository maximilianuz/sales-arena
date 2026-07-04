import { useState, useEffect } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { X, Globe } from 'lucide-react';
import { db, auth } from '../utils/db';
import { flagEmoji, countryName } from '../utils/countries';

// Mini-reloj mundial NATIVO: cada participante escribe su huso horario (el real
// del dispositivo, vía Intl) + su bandera a rooms/{id}/clocks/{uid}, y todos ven
// la hora local del resto y la diferencia horaria. Sin depender de apps externas.

function localTime(tz, base) {
  try {
    return new Intl.DateTimeFormat('es', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(base);
  } catch {
    return '--:--';
  }
}

// Diferencia horaria (en horas) entre el tz de otro y el mío, para "mismo momento".
function hourDiff(tz, myTz, base) {
  try {
    const fmt = (zone) => {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'shortOffset' }).formatToParts(base);
      const off = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
      const m = /GMT([+-]?\d{1,2})(?::(\d{2}))?/.exec(off);
      if (!m) return 0;
      return parseInt(m[1], 10) + (m[2] ? Math.sign(parseInt(m[1], 10) || 1) * parseInt(m[2], 10) / 60 : 0);
    };
    return Math.round((fmt(tz) - fmt(myTz)) * 10) / 10;
  } catch {
    return 0;
  }
}

export default function WorldClockPanel({ roomId, userName, onClose }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [clocks, setClocks] = useState({});
  const [now, setNow] = useState(() => new Date());
  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const myUid = auth.currentUser?.uid;

  // Registrar mi reloj (tz real del dispositivo + bandera) al abrir.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !roomId) return;
    (async () => {
      let country = null;
      try { country = (await get(ref(db, `users/${uid}/country`))).val(); } catch { /* opcional */ }
      set(ref(db, `rooms/${roomId}/clocks/${uid}`), {
        name: userName || 'Closer',
        tz: myTz,
        country: country || null,
        updatedAt: Date.now(),
      }).catch(() => { /* best effort */ });
    })();
  }, [roomId, userName, myTz]);

  // Leer todos los relojes de la sala.
  useEffect(() => {
    if (!roomId) return;
    const unsub = onValue(ref(db, `rooms/${roomId}/clocks`), (s) => setClocks(s.val() || {}));
    return () => unsub();
  }, [roomId]);

  // Refrescar la hora cada 20s.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, []);

  const rows = Object.entries(clocks)
    .map(([uid, c]) => ({ uid, ...c }))
    .sort((a, b) => (a.uid === myUid ? -1 : b.uid === myUid ? 1 : 0));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Globe size={18} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', flex: 1 }}>{isEn ? 'Time zones' : 'Husos horarios'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {rows.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
            {isEn ? 'Waiting for participants…' : 'Esperando participantes…'}
          </p>
        )}

        {rows.map(r => {
          const isMe = r.uid === myUid;
          const diff = isMe ? 0 : hourDiff(r.tz, myTz, now);
          return (
            <div key={r.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.55rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '1.3rem', width: '26px', textAlign: 'center' }}>{r.country ? flagEmoji(r.country) : '🌐'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}{isMe && <span style={{ color: 'var(--primary)', fontSize: '0.72rem', fontWeight: '800' }}> {isEn ? '(you)' : '(vos)'}</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {r.country ? countryName(r.country, i18n.language) + ' · ' : ''}{r.tz}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '800', fontVariantNumeric: 'tabular-nums' }}>{localTime(r.tz, now)}</div>
                {!isMe && diff !== 0 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {diff > 0 ? '+' : ''}{diff}h {isEn ? 'vs you' : 'vs vos'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

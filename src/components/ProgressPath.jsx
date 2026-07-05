import { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { Map, ChevronDown, ChevronUp } from 'lucide-react';
import { db, auth } from '../utils/db';
import { progressionState, levelLabel } from '../utils/progression';

// "Camino del Closer": guía paso a paso Novato → Intermedio → Pro debajo de
// la tarjeta de nivel. Obliga a rotar por todos los roles y se adapta a si
// el usuario está en un equipo (cohorte con Trainer) o entrena solo.
export default function ProgressPath() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [stats, setStats] = useState(null);
  const [inCohort, setInCohort] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onValue(ref(db, `users/${uid}/stats`), (s) => setStats(s.val() || {}));
    get(ref(db, `users/${uid}/joinedCohort`)).then(s => setInCohort(!!s.val())).catch(() => {});
    return () => unsub();
  }, []);

  if (stats === null) return null;

  const { level, steps, doneCount, total, pending } = progressionState(stats, { inCohort });
  const allDone = pending.length === 0;
  const shown = expanded ? steps : pending.slice(0, 3);

  return (
    <div style={{
      margin: '0.75rem auto 0', maxWidth: '580px', width: '100%', position: 'relative', zIndex: 1,
      background: 'rgba(15,15,30,0.6)', backdropFilter: 'blur(16px)',
      borderRadius: '1.25rem', border: `1px solid ${level.color}33`,
      padding: '1rem 1.5rem',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Map size={16} color={level.color} />
        <span style={{ fontWeight: '600', fontSize: '0.9rem', flex: 1 }}>
          {isEn ? 'Closer path' : 'Camino del Closer'}
          <span style={{
            marginLeft: '0.6rem', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase',
            letterSpacing: '0.06em', color: level.color, background: `${level.color}1f`,
            border: `1px solid ${level.color}55`, padding: '0.12rem 0.5rem', borderRadius: '2rem',
          }}>
            {level.icon} {levelLabel(level, i18n.language)}
          </span>
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>{doneCount}/{total}</span>
        {expanded ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </div>

      {/* Barra de progreso del nivel */}
      <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', margin: '0.7rem 0 0.6rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${total ? Math.round(doneCount / total * 100) : 0}%`, background: level.color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>

      {allDone ? (
        <div style={{ fontSize: '0.82rem', color: level.color, fontWeight: '700' }}>
          {isEn ? '🏁 Level complete — keep grinding, the next rank is earned in the arena.' : '🏁 Nivel completo — seguí entrenando, el próximo rango se gana en la arena.'}
        </div>
      ) : (
        shown.map(st => (
          <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0', fontSize: '0.83rem' }}>
            <span style={{
              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${st.done ? 'var(--success)' : 'rgba(255,255,255,0.2)'}`,
              background: st.done ? 'var(--success)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6rem', color: 'white', fontWeight: '700',
            }}>
              {st.done ? '✓' : ''}
            </span>
            <span style={{ color: st.done ? 'var(--text-muted)' : 'white', textDecoration: st.done ? 'line-through' : 'none' }}>
              {st.icon} {isEn ? st.en : st.es}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

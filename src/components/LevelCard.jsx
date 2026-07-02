import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { Flame, Target, Wallet } from 'lucide-react';
import { db, auth } from '../utils/db';
import { tierFromEarnings, tierLabel, formatMoney } from '../utils/gamification';

// "Cuenta bancaria del Closer": comisión simulada acumulada + rango + progreso.
// Lee users/{uid}/stats (lo escribe analyze-session).
export default function LevelCard() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onValue(ref(db, `users/${uid}/stats`), (s) => setStats(s.val()));
    return () => unsub();
  }, []);

  const total = stats?.totalEarnings || 0;
  const { tier, next, progress, toNext } = tierFromEarnings(total);
  const label = tierLabel(tier, i18n.language);
  const streak = stats?.streak || 0;
  const sessions = stats?.sessionsCompleted || 0;

  return (
    <div style={{
      margin: '1.5rem auto 0', maxWidth: '580px', width: '100%', position: 'relative', zIndex: 1,
      background: 'rgba(15,15,30,0.6)', backdropFilter: 'blur(16px)',
      borderRadius: '1.25rem', border: `1px solid ${tier.color}44`,
      padding: '1.25rem 1.5rem', boxShadow: `0 0 24px ${tier.color}18`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '0.9rem', flexShrink: 0,
          background: `linear-gradient(135deg, ${tier.color}, ${tier.color}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 16px ${tier.color}55`,
        }}>
          <Wallet size={24} color="white" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
            {isEn ? 'Commission account' : 'Cuenta de comisiones'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '900', fontSize: '1.9rem', color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {formatMoney(total)}
            </span>
            <span style={{
              fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
              color: tier.color, background: `${tier.color}1f`, border: `1px solid ${tier.color}55`,
              padding: '0.15rem 0.6rem', borderRadius: '2rem',
            }}>
              {label}
            </span>
          </div>
        </div>
      </div>

      {/* Progreso al siguiente rango */}
      <div style={{ height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', margin: '0.85rem 0 0.5rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: `linear-gradient(90deg, ${tier.color}, ${next ? next.color : tier.color})`, borderRadius: '4px', transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {next
          ? <span>{isEn ? `${formatMoney(toNext)} to ${tierLabel(next, i18n.language)}` : `${formatMoney(toNext)} para ${tierLabel(next, i18n.language)}`}</span>
          : <span style={{ color: tier.color, fontWeight: '700' }}>{isEn ? 'Top rank 🏆' : 'Rango máximo 🏆'}</span>}
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Flame size={12} color="var(--accent)" /> {streak}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Target size={12} /> {sessions}</span>
      </div>
    </div>
  );
}

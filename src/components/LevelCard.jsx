import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { useTranslation } from 'react-i18next';
import { Flame, Target, Wallet, HandHeart } from 'lucide-react';
import { db, auth } from '../utils/db';
import { tierFromEarnings, tierLabel, formatMoney, TIERS } from '../utils/gamification';
import { earnedBadges, badgeLabel } from '../utils/badges';
import { flagEmoji } from '../utils/countries';
import CountryPicker from './CountryPicker';

const LAST_TIER_KEY = 'sales_arena_last_tier';

// "Cuenta bancaria del Closer": comisión simulada acumulada + rango + progreso.
// Lee users/{uid}/stats (lo escribe analyze-session).
export default function LevelCard() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [stats, setStats] = useState(null);
  const [country, setCountry] = useState(null);
  const [showCountry, setShowCountry] = useState(false);
  const [levelUp, setLevelUp] = useState(null); // tier al que acaba de ascender
  // Timestamp estable por montaje (precisión de días → alcanza y el linter
  // del compiler no permite Date.now() en render).
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onValue(ref(db, `users/${uid}/stats`), (s) => {
      const val = s.val();
      setStats(val);
      if (!val) return;
      // Celebrar la subida de rango: comparamos con el último tier visto en
      // este dispositivo; si subió, overlay festivo una sola vez.
      const { tier: curTier } = tierFromEarnings(val.totalEarnings || 0);
      const lastId = localStorage.getItem(LAST_TIER_KEY);
      const lastIdx = TIERS.findIndex(t => t.id === lastId);
      const curIdx = TIERS.findIndex(t => t.id === curTier.id);
      if (lastId && curIdx > lastIdx) {
        setLevelUp(curTier);
        setTimeout(() => setLevelUp(null), 3500);
      }
      localStorage.setItem(LAST_TIER_KEY, curTier.id);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onValue(ref(db, `users/${uid}/country`), (s) => setCountry(s.val()));
    return () => unsub();
  }, []);

  const total = stats?.totalEarnings || 0;
  const { tier, next, progress, toNext } = tierFromEarnings(total);
  const badges = earnedBadges(stats || {});

  // Espíritu de equipo (espejo de la regla del servidor): tras 3 sesiones,
  // ayudar como Lead/Observador en los últimos 7 días da +10%; si no, -15%.
  const sinceSupport = stats?.lastSupportDate
    ? Math.round((now - new Date(stats.lastSupportDate).getTime()) / 86400000)
    : null;
  const showSpirit = (stats?.sessionsCompleted || 0) >= 3;
  const spiritActive = sinceSupport !== null && sinceSupport <= 7;
  const label = tierLabel(tier, i18n.language);
  const streak = stats?.streak || 0;
  const sessions = stats?.sessionsCompleted || 0;
  const supportPoints = stats?.supportPoints || 0;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
              {isEn ? 'Commission account' : 'Cuenta de comisiones'}
            </div>
            <button onClick={() => setShowCountry(true)} title={isEn ? 'Set your country' : 'Poné tu país'}
              style={{ background: 'none', border: country ? 'none' : '1px dashed rgba(255,255,255,0.2)', borderRadius: '0.4rem', cursor: 'pointer', padding: country ? 0 : '0.05rem 0.35rem', fontSize: country ? '1rem' : '0.62rem', color: 'var(--text-muted)', lineHeight: 1 }}>
              {country ? flagEmoji(country) : (isEn ? '+ flag' : '+ bandera')}
            </button>
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
        {supportPoints > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title={isEn ? 'Support points (Lead/Observer)' : 'Puntos de soporte (Lead/Observador)'}>
            <HandHeart size={12} color="#8b5cf6" /> {supportPoints.toLocaleString('en-US')} pts
          </span>
        )}
      </div>

      {/* Espíritu de equipo: recordatorio de ayudar como Lead/Observador */}
      {showSpirit && (
        <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', fontWeight: '600', color: spiritActive ? 'var(--success)' : 'var(--accent)' }}>
          {spiritActive
            ? (isEn ? '🤝 Team spirit active: +10% on commissions' : '🤝 Espíritu de equipo activo: +10% en comisiones')
            : (isEn ? '⚠️ Play Lead or Observer this week to avoid -15%' : '⚠️ Hacé de Lead u Observador esta semana para evitar el -15%')}
        </div>
      )}

      {/* Insignias ganadas (derivadas de stats, sin escritura extra) */}
      {badges.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          {badges.map(b => (
            <span key={b.id} title={badgeLabel(b, i18n.language)} style={{
              fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.85)',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              padding: '0.2rem 0.55rem', borderRadius: '2rem', cursor: 'default',
            }}>
              {b.icon} {badgeLabel(b, i18n.language)}
            </span>
          ))}
        </div>
      )}

      {/* Overlay de subida de rango */}
      {levelUp && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '1.25rem', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${levelUp.color}ee, ${levelUp.color}99)`,
          animation: 'levelUpPop 0.5s ease',
        }}>
          <div style={{ fontSize: '2rem', lineHeight: 1 }}>🎉</div>
          <div style={{ fontWeight: '900', fontSize: '1.15rem', color: 'white', marginTop: '0.35rem' }}>
            {isEn ? 'Rank up!' : '¡Subiste de rango!'}
          </div>
          <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {tierLabel(levelUp, i18n.language)}
          </div>
          <style>{`@keyframes levelUpPop { 0% { opacity: 0; transform: scale(0.85); } 60% { transform: scale(1.03); } 100% { opacity: 1; transform: scale(1); } }`}</style>
        </div>
      )}

      {showCountry && <CountryPicker current={country} onClose={() => setShowCountry(false)} onSaved={setCountry} />}
    </div>
  );
}

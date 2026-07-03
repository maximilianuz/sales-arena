import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../utils/db';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import { tierFromEarnings, tierLabel, formatMoney } from '../utils/gamification';

// Tabla de posiciones mundial de Closers + torneo mensual. Lee los nodos
// `leaderboard/global` y `leaderboard/seasons/{YYYY-MM}` que escribe el
// servidor (analyze-session). Solo lectura para el cliente.

const MEDALS = ['🥇', '🥈', '🥉'];
const TOP_N = 50;

function currentSeason() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function daysLeftInMonth() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

function seasonLabel(lng) {
  const en = typeof lng === 'string' && lng.startsWith('en');
  return new Date().toLocaleDateString(en ? 'en-US' : 'es-AR', { month: 'long', year: 'numeric' });
}

function LeaderRow({ rank, entry, isMe, isEn, lng, seasonMode }) {
  const earnings = seasonMode ? (entry.earnings || 0) : (entry.totalEarnings || 0);
  // El tier siempre sale de la comisión acumulada global si la trae; en modo
  // temporada mostramos solo lo ganado en el mes.
  const { tier } = tierFromEarnings(entry.totalEarnings ?? earnings);
  const medal = MEDALS[rank - 1];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.65rem 0.75rem',
      borderRadius: '0.75rem', marginBottom: '0.25rem',
      background: isMe ? 'rgba(99,102,241,0.12)' : 'transparent',
      border: isMe ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
    }}>
      <div style={{ width: '32px', textAlign: 'center', fontSize: medal ? '1.25rem' : '0.9rem', fontWeight: '800', color: medal ? 'inherit' : 'var(--text-muted)' }}>
        {medal || rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.name || 'Closer'} {isMe && <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '800' }}>{isEn ? '(you)' : '(vos)'}</span>}
        </div>
        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: tier.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {tierLabel(tier, lng)}
        </div>
      </div>
      {(entry.closes || 0) > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--success)', fontWeight: '700' }}>
          <CheckCircle2 size={13} /> {entry.closes}
        </div>
      )}
      <div style={{ fontWeight: '900', fontSize: '1.05rem', color: 'white', fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(earnings)}
      </div>
    </div>
  );
}

export default function Leaderboard({ onBack }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [tab, setTab] = useState('season'); // 'season' | 'global'
  // Guardamos {tab, list} juntos: si board.tab !== tab actual, está cargando.
  const [board, setBoard] = useState(null);
  const myUid = auth.currentUser?.uid;

  useEffect(() => {
    const path = tab === 'season' ? `leaderboard/seasons/${currentSeason()}` : 'leaderboard/global';
    const unsub = onValue(ref(db, path), snap => {
      const data = snap.val() || {};
      const key = tab === 'season' ? 'earnings' : 'totalEarnings';
      const list = Object.entries(data)
        .map(([uid, e]) => ({ uid, ...e }))
        .filter(e => (e[key] || 0) > 0)
        .sort((a, b) => (b[key] || 0) - (a[key] || 0))
        .slice(0, TOP_N);
      setBoard({ tab, list });
    }, () => setBoard({ tab, list: [] }));
    return () => unsub();
  }, [tab]);

  const entries = board && board.tab === tab ? board.list : null; // null = cargando

  const myRank = entries && myUid ? entries.findIndex(e => e.uid === myUid) + 1 : 0;
  const days = daysLeftInMonth();

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '640px', width: '100%', margin: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className="btn btn-outline" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> {isEn ? 'Back' : 'Volver'}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', flex: 1 }}>
            {isEn ? '🏆 Leaderboard' : '🏆 Tabla de posiciones'}
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[
            { id: 'season', icon: <Trophy size={15} />, label: isEn ? `Tournament · ${seasonLabel(i18n.language)}` : `Torneo · ${seasonLabel(i18n.language)}` },
            { id: 'global', icon: <Globe size={15} />, label: isEn ? 'World ranking' : 'Ranking mundial' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.65rem', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
              background: tab === t.id ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))' : 'rgba(255,255,255,0.04)',
              border: tab === t.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: tab === t.id ? 'white' : 'var(--text-muted)',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Countdown del torneo */}
        {tab === 'season' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: '600' }}>
            <Clock size={14} />
            {isEn
              ? `${days} day${days === 1 ? '' : 's'} left — season resets monthly`
              : `${days} día${days === 1 ? '' : 's'} restante${days === 1 ? '' : 's'} — el torneo se reinicia cada mes`}
          </div>
        )}

        {/* Mi posición */}
        {myRank > 0 && (
          <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isEn ? `Your position: #${myRank}` : `Tu posición: #${myRank}`}
          </div>
        )}

        {/* Lista */}
        <div className="glass-panel" style={{ padding: '1rem' }}>
          {entries === null && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>{isEn ? 'Loading...' : 'Cargando...'}</p>
          )}
          {entries && entries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🏟️</p>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                {tab === 'season'
                  ? (isEn ? 'No commissions this month yet. Close a deal and open the tournament!' : 'Todavía no hay comisiones este mes. ¡Cerrá un trato y abrí el torneo!')
                  : (isEn ? 'The world ranking is empty. Be the first.' : 'El ranking mundial está vacío. Sé el primero.')}
              </p>
            </div>
          )}
          {entries && entries.map((e, i) => (
            <LeaderRow key={e.uid} rank={i + 1} entry={e} isMe={e.uid === myUid} isEn={isEn} lng={i18n.language} seasonMode={tab === 'season'} />
          ))}
        </div>

        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '1rem' }}>
          {isEn
            ? 'Commissions are simulated practice earnings. Rankings update after each analyzed session.'
            : 'Las comisiones son ganancias simuladas de práctica. El ranking se actualiza con cada sesión analizada.'}
        </p>
      </div>
    </div>
  );
}

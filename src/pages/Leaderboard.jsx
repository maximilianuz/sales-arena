import { useState, useEffect } from 'react';
import { ref, onValue, query, orderByKey, startAt } from 'firebase/database';
import { db, auth } from '../utils/db';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, Trophy, Zap, CheckCircle2 } from 'lucide-react';
import { tierFromEarnings, tierLabel, formatMoney } from '../utils/gamification';
import { flagEmoji } from '../utils/countries';

// Tabla de posiciones estilo Skool: 7 días / 30 días / histórico. Las ventanas
// rodantes se agregan client-side desde los buckets diarios `leaderboard/daily`
// que escribe el servidor (analyze-session); el histórico usa `leaderboard/global`.

const MEDALS = ['🥇', '🥈', '🥉'];
const TOP_N = 50;

// Suma los buckets diarios por usuario → una fila por closer.
function aggregateDaily(daysData) {
  const agg = {};
  Object.values(daysData || {}).forEach(dayNode => {
    Object.entries(dayNode || {}).forEach(([uid, e]) => {
      const a = agg[uid] || (agg[uid] = { uid, name: '', country: null, earnings: 0, closes: 0, totalEarnings: 0 });
      a.earnings += e.earnings || 0;
      a.closes += e.closes || 0;
      a.totalEarnings = Math.max(a.totalEarnings, e.totalEarnings || 0);
      a.name = e.name || a.name;
      a.country = e.country || a.country;
    });
  });
  return Object.values(agg);
}

function LeaderRow({ rank, entry, isMe, isEn, lng }) {
  const { tier } = tierFromEarnings(entry.totalEarnings || entry.earnings || 0);
  const medal = MEDALS[rank - 1];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.65rem 0.75rem',
      borderRadius: '0.75rem', marginBottom: '0.25rem',
      background: isMe ? 'rgba(100,210,255,0.12)' : 'transparent',
      border: isMe ? '1px solid rgba(100,210,255,0.4)' : '1px solid transparent',
    }}>
      <div style={{ width: '32px', textAlign: 'center', fontSize: medal ? '1.25rem' : '0.9rem', fontWeight: '800', color: medal ? 'inherit' : 'var(--text-muted)' }}>
        {medal || rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.country && <span style={{ marginRight: '0.35rem' }}>{flagEmoji(entry.country)}</span>}
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
        {formatMoney(entry.earnings)}
      </div>
    </div>
  );
}

export default function Leaderboard({ onBack }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [tab, setTab] = useState('week'); // 'week' | 'month' | 'all'
  // Guardamos {tab, list} juntos: si board.tab !== tab actual, está cargando.
  const [board, setBoard] = useState(null);
  const myUid = auth.currentUser?.uid;

  useEffect(() => {
    let unsub;
    if (tab === 'all') {
      unsub = onValue(ref(db, 'leaderboard/global'), snap => {
        const data = snap.val() || {};
        const list = Object.entries(data)
          .map(([uid, e]) => ({ uid, ...e, earnings: e.totalEarnings || 0 }))
          .filter(e => e.earnings > 0)
          .sort((a, b) => b.earnings - a.earnings)
          .slice(0, TOP_N);
        setBoard({ tab, list });
      }, () => setBoard({ tab, list: [] }));
    } else {
      const days = tab === 'week' ? 7 : 30;
      const startKey = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
      unsub = onValue(query(ref(db, 'leaderboard/daily'), orderByKey(), startAt(startKey)), snap => {
        const list = aggregateDaily(snap.val())
          .filter(e => e.earnings > 0)
          .sort((a, b) => b.earnings - a.earnings)
          .slice(0, TOP_N);
        setBoard({ tab, list });
      }, () => setBoard({ tab, list: [] }));
    }
    return () => unsub && unsub();
  }, [tab]);

  const entries = board && board.tab === tab ? board.list : null; // null = cargando
  const myRank = entries && myUid ? entries.findIndex(e => e.uid === myUid) + 1 : 0;

  const TABS = [
    { id: 'week', icon: <Zap size={15} />, label: isEn ? '7 days' : '7 días' },
    { id: 'month', icon: <Trophy size={15} />, label: isEn ? '30 days' : '30 días' },
    { id: 'all', icon: <Globe size={15} />, label: isEn ? 'All-time' : 'Histórico' },
  ];

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

        {/* Tabs estilo Skool */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.65rem', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
              background: tab === t.id ? 'linear-gradient(135deg, rgba(100,210,255,0.25), rgba(139,92,246,0.15))' : 'rgba(255,255,255,0.04)',
              border: tab === t.id ? '1px solid rgba(100,210,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: tab === t.id ? 'white' : 'var(--text-muted)',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

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
                {tab === 'all'
                  ? (isEn ? 'The ranking is empty. Be the first.' : 'El ranking está vacío. Sé el primero.')
                  : (isEn ? 'No commissions in this period yet. Close a deal and open the board!' : 'Todavía no hay comisiones en este período. ¡Cerrá un trato y abrí la tabla!')}
              </p>
            </div>
          )}
          {entries && entries.map((e, i) => (
            <LeaderRow key={e.uid} rank={i + 1} entry={e} isMe={e.uid === myUid} isEn={isEn} lng={i18n.language} />
          ))}
        </div>

        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '1rem' }}>
          {isEn
            ? 'Commissions are simulated practice earnings. Helping as Lead or Observer earns a +10% team-spirit bonus; not helping for a week costs -15%.'
            : 'Las comisiones son ganancias simuladas de práctica. Ayudar como Lead u Observador da +10% de bonus; una semana sin ayudar descuenta 15%.'}
        </p>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../utils/db';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Star, TrendingUp, TrendingDown, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

function ScoreBar({ label, value }) {
  const color = value >= 8 ? 'var(--success)' : value >= 6 ? 'var(--accent)' : 'var(--danger)';
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color, fontWeight: '700' }}>{value}/10</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${value * 10}%`, background: color, borderRadius: '2px' }} />
      </div>
    </div>
  );
}

function SessionCard({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const { analysis, scenario, savedAt, sessionDurationMinutes } = entry;
  const score = analysis?.overallScore || 0;
  const color = score >= 8 ? 'var(--success)' : score >= 6 ? 'var(--accent)' : 'var(--danger)';
  const date = new Date(savedAt).toLocaleDateString(isEn ? 'en-US' : 'es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

  const scoreLabels = isEn
    ? { rapport: 'Rapport', objectionHandling: 'Objections', closing: 'Closing', activeListening: 'Listening' }
    : { rapport: 'Rapport', objectionHandling: 'Objeciones', closing: 'Cierre', activeListening: 'Escucha' };

  return (
    <div className="glass-panel" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color }}>{score}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', marginBottom: '0.15rem' }}>{scenario?.name || 'Lead'} — {scenario?.industry || ''}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {date} · {sessionDurationMinutes ? `${sessionDurationMinutes} min` : ''}
            {scenario?.objection ? ` · ${scenario.objection}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={12} fill={i <= Math.round(score/2) ? 'var(--accent)' : 'transparent'} color={i <= Math.round(score/2) ? 'var(--accent)' : 'var(--glass-border)'} />
          ))}
        </div>
        {expanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
      </div>

      {expanded && analysis && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {Object.entries(analysis.scores || {}).map(([key, val]) => (
              <ScoreBar key={key} label={scoreLabels[key] || key} value={val} />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.07)', borderRadius: '0.5rem', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div style={{ color: 'var(--success)', fontWeight: '700', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <TrendingUp size={13} /> {isEn ? 'Went well' : 'Salió bien'}
              </div>
              {(analysis.wentWell || []).map((item, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>✓ {item}</div>
              ))}
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.07)', borderRadius: '0.5rem', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div style={{ color: 'var(--danger)', fontWeight: '700', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <TrendingDown size={13} /> {isEn ? 'To improve' : 'A mejorar'}
              </div>
              {(analysis.toImprove || []).map((item, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>→ {item}</div>
              ))}
            </div>
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.07)', borderRadius: '0.5rem', border: '1px solid rgba(245,158,11,0.15)', display: 'flex', gap: '0.5rem' }}>
            <Lightbulb size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{analysis.nextSessionTip}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function History({ onBack }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const historyRef = ref(db, `users/${uid}/history`);
    const unsub = onValue(historyRef, snap => {
      const data = snap.val() || {};
      const list = Object.values(data).sort((a, b) => b.savedAt - a.savedAt);
      setSessions(list);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((sum, s) => sum + (s.analysis?.overallScore || 0), 0) / sessions.length * 10) / 10
    : null;

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '680px', width: '100%', margin: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-outline" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> {isEn ? 'Back' : 'Volver'}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>
            {isEn ? '📈 My History' : '📈 Mi Historial'}
          </h1>
        </div>

        {/* Resumen */}
        {sessions.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: isEn ? 'Sessions' : 'Sesiones', value: sessions.length },
              { label: isEn ? 'Avg Score' : 'Score Promedio', value: avgScore ? `${avgScore}/10` : '-' },
              { label: isEn ? 'Best Score' : 'Mejor Score', value: `${Math.max(...sessions.map(s => s.analysis?.overallScore || 0))}/10` }
            ].map(stat => (
              <div key={stat.label} className="glass-panel" style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{isEn ? 'Loading...' : 'Cargando...'}</p>}

        {!loading && sessions.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</p>
            <p style={{ color: 'var(--text-muted)' }}>
              {isEn ? 'No sessions saved yet. Complete a session and use "Analyze & Save" to start tracking your progress.' : 'Todavía no guardaste ninguna sesión. Completá una sesión y usá "Analizar y Guardar" para empezar a trackear tu progreso.'}
            </p>
          </div>
        )}

        {sessions.map(s => <SessionCard key={s.sessionId} entry={s} />)}
      </div>
    </div>
  );
}

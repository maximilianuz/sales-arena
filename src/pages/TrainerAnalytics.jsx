import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../utils/db';
import { getCohortCode } from '../utils/cohort';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Copy, CheckCircle2, Users, TrendingUp, Award, Target, ChevronDown, ChevronUp, FileText, FileSpreadsheet, Wallet } from 'lucide-react';
import { exportCohortCSV, exportCohortPDF } from '../utils/export';
import { tierFromEarnings, tierLabel, formatMoney, commissionForSession } from '../utils/gamification';

const SCORE_KEYS = ['rapport', 'objectionHandling', 'closing', 'activeListening'];

function scoreColor(v) {
  return v >= 8 ? 'var(--success)' : v >= 6 ? 'var(--accent)' : 'var(--danger)';
}

// Comisión acumulada del alumno. Preferimos el valor autoritativo propagado por
// analyze-session (student.totalEarnings). Para cohortes previos a esa propagación
// (aún sin totalEarnings), estimamos sumando la comisión de cada sesión conocida.
function studentEarnings(student) {
  if (typeof student.totalEarnings === 'number') return student.totalEarnings;
  const sessions = Object.values(student.sessions || {});
  if (!sessions.length) return 0;
  return sessions.reduce((sum, s) => {
    if (typeof s.earned === 'number') return sum + s.earned;
    const rubricVals = s.rubric ? Object.values(s.rubric).filter(v => typeof v === 'number' && v > 0) : [];
    const rubricAvg = rubricVals.length ? rubricVals.reduce((a, b) => a + b, 0) / rubricVals.length : 0;
    return sum + commissionForSession({ overallScore: s.overallScore || 0, rubricAvg });
  }, 0);
}

const MEDALS = ['🥇', '🥈', '🥉'];

function CohortLeaderboard({ students, isEn, lng }) {
  const ranked = students
    .map(s => ({ id: s.id, name: (s.profile || {}).name || 'Alumno', earnings: studentEarnings(s) }))
    .filter(s => s.earnings > 0)
    .sort((a, b) => b.earnings - a.earnings);

  if (ranked.length < 2) return null; // un leaderboard de 1 no motiva a nadie

  return (
    <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Wallet size={17} color="var(--primary)" />
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
          {isEn ? 'Commission leaderboard' : 'Ranking de comisiones'}
        </h2>
      </div>
      {ranked.map((s, i) => {
        const { tier } = tierFromEarnings(s.earnings);
        const medal = MEDALS[i];
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.55rem 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: '28px', textAlign: 'center', fontSize: medal ? '1.15rem' : '0.9rem', fontWeight: '600', color: medal ? 'inherit' : 'var(--text-muted)' }}>
              {medal || `${i + 1}`}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: tier.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {tierLabel(tier, lng)}
              </div>
            </div>
            <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'white', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(s.earnings)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentRow({ student, uid, isEn }) {
  const [expanded, setExpanded] = useState(false);
  const sessions = Object.values(student.sessions || {}).sort((a, b) => b.savedAt - a.savedAt);
  const profile = student.profile || {};

  const avg = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + (x.overallScore || 0), 0) / sessions.length * 10) / 10
    : 0;

  // Tendencia: comparar promedio de la primera mitad vs segunda mitad
  let trend = 0;
  if (sessions.length >= 2) {
    const chron = [...sessions].reverse();
    const half = Math.floor(chron.length / 2);
    const firstAvg = chron.slice(0, half).reduce((s, x) => s + (x.overallScore || 0), 0) / half;
    const lastAvg = chron.slice(half).reduce((s, x) => s + (x.overallScore || 0), 0) / (chron.length - half);
    trend = Math.round((lastAvg - firstAvg) * 10) / 10;
  }

  return (
    <div className="glass-panel" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: sessions.length ? 'pointer' : 'default' }} onClick={() => sessions.length && setExpanded(!expanded)}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `color-mix(in srgb, ${scoreColor(avg)} 15%, transparent)`, border: `2px solid ${scoreColor(avg)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: '600', color: scoreColor(avg) }}>{avg || '—'}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700' }}>{profile.name || 'Alumno'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {sessions.length} {isEn ? 'sessions' : 'sesiones'}
            {profile.email ? ` · ${profile.email}` : ''}
          </div>
        </div>
        {trend !== 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem', fontWeight: '700', color: trend > 0 ? 'var(--success)' : 'var(--danger)' }}>
            <TrendingUp size={14} style={{ transform: trend < 0 ? 'scaleY(-1)' : 'none' }} />
            {trend > 0 ? '+' : ''}{trend}
          </div>
        )}
        {sessions.length > 0 && (expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />)}
      </div>

      {expanded && sessions.length > 0 && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {sessions.slice(0, 10).map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', fontSize: '0.82rem' }}>
              <span style={{ fontWeight: '600', color: scoreColor(s.overallScore || 0), width: '28px' }}>{s.overallScore || 0}</span>
              <span style={{ color: 'var(--text-muted)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.scenario?.name || 'Lead'} · {s.scenario?.industry || ''}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.75rem' }}>
                {new Date(s.savedAt).toLocaleDateString(isEn ? 'en-US' : 'es-AR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrainerAnalytics({ onBack }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    getCohortCode().then(d => setCode(d.code)).catch(e => setCodeError(e.message));
  }, []);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const cohortRef = ref(db, `cohorts/${uid}/students`);
    const unsub = onValue(cohortRef, snap => {
      const data = snap.val() || {};
      setStudents(Object.entries(data).map(([id, s]) => ({ id, ...s })));
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Aggregate stats
  const allSessions = students.flatMap(s => Object.values(s.sessions || {}));
  const totalSessions = allSessions.length;
  const cohortAvg = totalSessions
    ? Math.round(allSessions.reduce((sum, x) => sum + (x.overallScore || 0), 0) / totalSessions * 10) / 10
    : null;

  // Área más débil (promedio más bajo entre categorías)
  let weakestArea = null;
  if (totalSessions > 0) {
    const sums = {}; const counts = {};
    allSessions.forEach(s => {
      Object.entries(s.scores || {}).forEach(([k, v]) => {
        sums[k] = (sums[k] || 0) + v; counts[k] = (counts[k] || 0) + 1;
      });
    });
    let lowest = 11;
    Object.keys(sums).forEach(k => {
      const avg = sums[k] / counts[k];
      if (avg < lowest) { lowest = avg; weakestArea = k; }
    });
  }

  const cohortEarnings = students.reduce((sum, s) => sum + studentEarnings(s), 0);

  const areaLabels = isEn
    ? { rapport: 'Rapport', objectionHandling: 'Objection Handling', closing: 'Closing', activeListening: 'Active Listening' }
    : { rapport: 'Rapport', objectionHandling: 'Manejo de Objeciones', closing: 'Cierre', activeListening: 'Escucha Activa' };

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '760px', width: '100%', margin: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-outline" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> {isEn ? 'Back' : 'Volver'}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600', flex: 1 }}>
            {isEn ? '📊 Trainer Analytics' : '📊 Analytics del Trainer'}
          </h1>
          {students.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => exportCohortCSV(students, isEn)} title="CSV" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                <FileSpreadsheet size={15} /> CSV
              </button>
              <button className="btn btn-outline" onClick={() => exportCohortPDF(students, auth.currentUser?.email, isEn)} title="PDF" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                <FileText size={15} /> PDF
              </button>
            </div>
          )}
        </div>

        {/* Cohort code card */}
        <div className="glass-panel" style={{ marginBottom: '1.5rem', border: '1px solid rgba(100,210,255,0.3)', background: 'linear-gradient(135deg, rgba(100,210,255,0.08), rgba(139,92,246,0.05))' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: '0.5rem' }}>
            {isEn ? 'Your cohort code' : 'Tu código de cohorte'}
          </div>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isEn ? 'Share this code with your students. Their sessions will appear here automatically.' : 'Compartí este código con tus alumnos. Sus sesiones aparecerán acá automáticamente.'}
          </p>
          {codeError ? (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{codeError === 'trainer_plan_required' ? (isEn ? 'Requires Trainer plan.' : 'Requiere plan Trainer.') : codeError}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: '600', letterSpacing: '0.1em', color: 'white', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                {code || '···'}
              </div>
              <button onClick={copyCode} disabled={!code} style={{ padding: '0.6rem 0.9rem', borderRadius: '0.75rem', background: copied ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'var(--success)' : 'rgba(255,255,255,0.1)'}`, color: copied ? 'var(--success)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? (isEn ? 'Copied' : 'Copiado') : (isEn ? 'Copy' : 'Copiar')}
              </button>
            </div>
          )}
        </div>

        {/* Aggregate stats */}
        {totalSessions > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { icon: <Users size={16} />, label: isEn ? 'Students' : 'Alumnos', value: students.length },
              { icon: <Target size={16} />, label: isEn ? 'Sessions' : 'Sesiones', value: totalSessions },
              { icon: <Award size={16} />, label: isEn ? 'Cohort avg' : 'Prom. cohorte', value: cohortAvg ? `${cohortAvg}` : '—' },
              { icon: <Wallet size={16} />, label: isEn ? 'Cohort commissions' : 'Comisiones cohorte', value: cohortEarnings > 0 ? formatMoney(cohortEarnings) : '—', small: cohortEarnings >= 100000 },
              { icon: <TrendingUp size={16} />, label: isEn ? 'Weakest area' : 'Área débil', value: weakestArea ? areaLabels[weakestArea] : '—', small: true }
            ].map((stat, i) => (
              <div key={i} className="glass-panel" style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                <div style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>{stat.icon}</div>
                <div style={{ fontSize: stat.small ? '0.85rem' : '1.6rem', fontWeight: '600', lineHeight: 1.1 }}>{stat.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Commission leaderboard */}
        <CohortLeaderboard students={students} isEn={isEn} lng={i18n.language} />

        {/* Students list */}
        <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'rgba(255,255,255,0.86)', marginBottom: '0.75rem' }}>
          {isEn ? 'Students' : 'Alumnos'}
        </h2>

        {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{isEn ? 'Loading...' : 'Cargando...'}</p>}

        {!loading && students.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>👥</p>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {isEn ? 'No students yet. Share your cohort code to get started.' : 'Todavía no hay alumnos. Compartí tu código de cohorte para empezar.'}
            </p>
          </div>
        )}

        {students.map(s => <StudentRow key={s.id} student={s} uid={s.id} isEn={isEn} />)}
      </div>
    </div>
  );
}

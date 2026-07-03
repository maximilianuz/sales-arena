import React, { useState } from 'react';
import { Save, Star, TrendingUp, TrendingDown, Lightbulb, X, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth } from '../utils/db';

function ScoreBar({ label, value }) {
  const color = value >= 8 ? 'var(--success)' : value >= 6 ? 'var(--accent)' : 'var(--danger)';
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color, fontWeight: '700' }}>{value}/10</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
        <div style={{ height: '100%', width: `${value * 10}%`, background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function SessionAnalysis({ roomData, stages, onClose }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const isEn = i18n.language?.startsWith('en');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    const uid = auth.currentUser?.uid;
    if (!uid) { setError('No autenticado'); setLoading(false); return; }

    const sessionDurationMinutes = roomData.sessionStartedAt
      ? Math.round((Date.now() - roomData.sessionStartedAt) / 60000)
      : null;

    try {
      const res = await fetch('/api/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          scenario: roomData.currentScenario,
          debriefNotes: roomData.debriefNotes,
          votingResults: roomData.questions,
          rubric: roomData.rubric,
          listeningLog: roomData.listeningLog,
          productPrice: roomData.currentScenario?.productPrice,
          commissionPct: roomData.config?.commissionPct,
          closed: roomData.checkout?.result === 'closed',
          closerUid: roomData.closerUid || null,
          stages,
          sessionDurationMinutes,
          language: i18n.language || 'es'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setAnalysis(data.analysis);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreLabels = isEn
    ? { rapport: 'Rapport', objectionHandling: 'Objection Handling', closing: 'Closing', activeListening: 'Active Listening' }
    : { rapport: 'Rapport', objectionHandling: 'Manejo de Objeciones', closing: 'Cierre', activeListening: 'Escucha Activa' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel" style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: '800' }}>
          {isEn ? '📊 Session Analysis' : '📊 Análisis de Sesión'}
        </h2>

        {!analysis && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {isEn
                ? 'The AI will analyze the session and generate a personalized feedback report. The results will be saved to your history.'
                : 'La IA analizará la sesión y generará un reporte de feedback personalizado. Los resultados se guardarán en tu historial.'}
            </p>
            {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
            <button className="btn btn-primary btn-large" onClick={handleAnalyze} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {loading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> {isEn ? 'Analyzing...' : 'Analizando...'}</> : <><Save size={18} /> {isEn ? 'Analyze & Save' : 'Analizar y Guardar'}</>}
            </button>
          </div>
        )}

        {analysis && (
          <div>
            {/* Score general */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(79,70,229,0.1)', borderRadius: '1rem', border: '1px solid rgba(79,70,229,0.2)' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: '800', color: analysis.overallScore >= 8 ? 'var(--success)' : analysis.overallScore >= 6 ? 'var(--accent)' : 'var(--danger)' }}>
                {analysis.overallScore}/10
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(i => (
                  <Star key={i} size={14} fill={i <= analysis.overallScore ? 'var(--accent)' : 'transparent'} color={i <= analysis.overallScore ? 'var(--accent)' : 'var(--glass-border)'} />
                ))}
              </div>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Score General</p>
            </div>

            {/* Scores por categoría */}
            <div style={{ marginBottom: '1.5rem' }}>
              {Object.entries(analysis.scores || {}).map(([key, val]) => (
                <ScoreBar key={key} label={scoreLabels[key] || key} value={val} />
              ))}
            </div>

            {/* Qué salió bien */}
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(16,185,129,0.07)', borderRadius: '0.75rem', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--success)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                <TrendingUp size={16} /> {isEn ? 'What went well' : 'Qué salió bien'}
              </div>
              {(analysis.wentWell || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--success)', flexShrink: 0 }}>✓</span> {item}
                </div>
              ))}
            </div>

            {/* Qué mejorar */}
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.07)', borderRadius: '0.75rem', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--danger)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                <TrendingDown size={16} /> {isEn ? 'To improve' : 'A mejorar'}
              </div>
              {(analysis.toImprove || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--danger)', flexShrink: 0 }}>→</span> {item}
                </div>
              ))}
            </div>

            {/* Tip próxima sesión */}
            <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.07)', borderRadius: '0.75rem', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent)', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                <Lightbulb size={16} /> {isEn ? 'Tip for next session' : 'Tip para la próxima sesión'}
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{analysis.nextSessionTip}</p>
            </div>

            {saved && (
              <p style={{ textAlign: 'center', color: 'var(--success)', marginTop: '1rem', fontSize: '0.85rem' }}>
                ✓ {isEn ? 'Saved to your history' : 'Guardado en tu historial'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

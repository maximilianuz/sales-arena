import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckSquare, Target, RotateCcw, Activity, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MARKERS = [
  { type: 'good',        emoji: '🟢', color: '48,209,88',  label: { es: 'Brillante',   en: 'Brilliant' } },
  { type: 'opportunity', emoji: '🟡', color: '255,159,10',  label: { es: 'Oportunidad', en: 'Opportunity' } },
  { type: 'error',       emoji: '🔴', color: '255,69,58',   label: { es: 'Error',        en: 'Error' } }
];

export default function DebriefPanel({ activeStageIndex, stages, roomNotes, updateNotes, isFacilitator }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [markerNote, setMarkerNote] = useState('');
  const [debriefTab, setDebriefTab] = useState('live'); // 'live' | 'analysis' | 'retro'

  const addMoment = (type) => {
    if (!updateNotes) return;
    const activeStage = stages?.[activeStageIndex];
    const moment = { type, note: markerNote || '', stage: activeStage?.label || '', time: Date.now() };
    const moments = [...(roomNotes?.moments || []), moment];
    updateNotes({ ...roomNotes, moments });
    setMarkerNote('');
  };
  // Use local state for text areas to avoid losing focus/cursor jumping on remote updates
  const [localTone, setLocalTone] = useState('');
  const [localPain, setLocalPain] = useState('');
  const [localObjection, setLocalObjection] = useState('');

  // Lead evaluation states
  const [localLeadPain, setLocalLeadPain] = useState('');
  const [localLeadSignals, setLocalLeadSignals] = useState('');
  const [localLeadObjection, setLocalLeadObjection] = useState('');

  // Retrospective states
  const [localRetroPositivo, setLocalRetroPositivo] = useState('');
  const [localRetroDescartable, setLocalRetroDescartable] = useState('');
  const [localRetroMejorar, setLocalRetroMejorar] = useState('');
  const [localRetroHerramientas, setLocalRetroHerramientas] = useState('');

  // Sync from remote when roomNotes changes, but only if not currently typing
  useEffect(() => {
    if (roomNotes) {
      if (document.activeElement.id !== 'toneInput') setLocalTone(roomNotes.tone || '');
      if (document.activeElement.id !== 'painInput') setLocalPain(roomNotes.pain || '');
      if (document.activeElement.id !== 'objectionInput') setLocalObjection(roomNotes.objection || '');
      
      if (document.activeElement.id !== 'leadPainInput') setLocalLeadPain(roomNotes.leadPain || '');
      if (document.activeElement.id !== 'leadSignalsInput') setLocalLeadSignals(roomNotes.leadSignals || '');
      if (document.activeElement.id !== 'leadObjectionInput') setLocalLeadObjection(roomNotes.leadObjection || '');

      if (document.activeElement.id !== 'retroPositivoInput') setLocalRetroPositivo(roomNotes.retroPositivo || '');
      if (document.activeElement.id !== 'retroDescartableInput') setLocalRetroDescartable(roomNotes.retroDescartable || '');
      if (document.activeElement.id !== 'retroMejorarInput') setLocalRetroMejorar(roomNotes.retroMejorar || '');
      if (document.activeElement.id !== 'retroHerramientasInput') setLocalRetroHerramientas(roomNotes.retroHerramientas || '');
    } else {
      setLocalTone('');
      setLocalPain('');
      setLocalObjection('');
      setLocalLeadPain('');
      setLocalLeadSignals('');
      setLocalLeadObjection('');
      setLocalRetroPositivo('');
      setLocalRetroDescartable('');
      setLocalRetroMejorar('');
      setLocalRetroHerramientas('');
    }
  }, [roomNotes]);

  const toggleStage = (stageId) => {
    if (!updateNotes) return;
    const currentStages = roomNotes?.completedStages || [];
    const updated = currentStages.includes(stageId) 
      ? currentStages.filter(id => id !== stageId) 
      : [...currentStages, stageId];
    
    updateNotes({
      ...roomNotes,
      completedStages: updated
    });
  };

  const handleBlurTone = () => updateNotes && updateNotes({ ...roomNotes, tone: localTone });
  const handleBlurPain = () => updateNotes && updateNotes({ ...roomNotes, pain: localPain });
  const handleBlurObjection = () => updateNotes && updateNotes({ ...roomNotes, objection: localObjection });

  const handleBlurLeadPain = () => updateNotes && updateNotes({ ...roomNotes, leadPain: localLeadPain });
  const handleBlurLeadSignals = () => updateNotes && updateNotes({ ...roomNotes, leadSignals: localLeadSignals });
  const handleBlurLeadObjection = () => updateNotes && updateNotes({ ...roomNotes, leadObjection: localLeadObjection });

  const handleBlurRetroPositivo = () => updateNotes && updateNotes({ ...roomNotes, retroPositivo: localRetroPositivo });
  const handleBlurRetroDescartable = () => updateNotes && updateNotes({ ...roomNotes, retroDescartable: localRetroDescartable });
  const handleBlurRetroMejorar = () => updateNotes && updateNotes({ ...roomNotes, retroMejorar: localRetroMejorar });
  const handleBlurRetroHerramientas = () => updateNotes && updateNotes({ ...roomNotes, retroHerramientas: localRetroHerramientas });

  const clearDebrief = () => {
    if (!updateNotes) return;
    updateNotes({
      completedStages: [],
      moments: [],
      tone: '',
      pain: '',
      objection: '',
      leadPain: '',
      leadSignals: '',
      leadObjection: '',
      retroPositivo: '',
      retroDescartable: '',
      retroMejorar: '',
      retroHerramientas: ''
    });
  };

  const completedStages = roomNotes?.completedStages || [];

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MessageSquare size={14} color="rgba(139,92,246,0.8)" />
          <span style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
            {isEn ? 'Evaluation' : 'Evaluación'}
          </span>
        </div>
        {isFacilitator && (
          <button onClick={clearDebrief} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', color: 'rgba(255,69,58,0.7)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600' }}>
            <RotateCcw size={11} /> {t('debrief.clear')}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.625rem', padding: '0.2rem' }}>
        {[
          { id: 'live', label: isEn ? '⚡ Live' : '⚡ En Vivo' },
          { id: 'analysis', label: isEn ? 'Analysis' : 'Análisis' },
          { id: 'retro', label: isEn ? 'Retro' : 'Retro' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setDebriefTab(tab.id)}
            style={{ flex: 1, padding: '0.4rem 0.3rem', borderRadius: '0.45rem', border: 'none', cursor: 'pointer', background: debriefTab === tab.id ? 'rgba(139,92,246,0.28)' : 'transparent', color: debriefTab === tab.id ? 'white' : 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontWeight: debriefTab === tab.id ? '700' : '500', transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, paddingRight: '0.5rem' }}>

        {/* ── TAB: EN VIVO ── */}
        {debriefTab === 'live' && (<>
        {/* Live moment markers */}
        {updateNotes && (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '0.875rem', padding: '0.875rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.6rem' }}>
              ⚡ {isEn ? 'Live moment markers' : 'Marcadores en vivo'}
            </div>
            <input
              value={markerNote}
              onChange={e => setMarkerNote(e.target.value)}
              placeholder={isEn ? 'Optional note (then click a marker)...' : 'Nota opcional (luego click en el marcador)...'}
              style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '0.82rem', marginBottom: '0.5rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {MARKERS.map(m => (
                <button key={m.type} onClick={() => addMoment(m.type)} style={{ flex: 1, padding: '0.5rem 0.4rem', borderRadius: '0.625rem', border: `1px solid rgba(${m.color},0.3)`, background: `rgba(${m.color},0.08)`, color: `rgb(${m.color})`, cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', transition: 'all 0.15s' }}>
                  {m.emoji} {isEn ? m.label.en : m.label.es}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Moments timeline */}
        {(roomNotes?.moments || []).length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '0.75rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '140px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>
              {isEn ? 'Timeline' : 'Línea de tiempo'}
            </div>
            {(roomNotes.moments || []).slice().reverse().map((m, i) => {
              const marker = MARKERS.find(mk => mk.type === m.type) || MARKERS[0];
              const mins = Math.floor((Date.now() - m.time) / 60000);
              return (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.35rem', fontSize: '0.78rem' }}>
                  <span>{marker.emoji}</span>
                  <span style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{mins === 0 ? (isEn ? 'Just now' : 'Ahora') : `${mins}m`}{m.stage ? ` · ${m.stage}` : ''}</span>
                  {m.note && <span style={{ color: 'rgba(255,255,255,0.65)' }}>{m.note}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Etapas Completadas */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <CheckSquare size={16} color="var(--success)" /> Checklist de Etapas Superadas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {stages.map(stage => {
              const isChecked = completedStages.includes(stage.id);
              return (
                <div 
                  key={stage.id} 
                  onClick={() => toggleStage(stage.id)}
                  style={{ 
                    padding: '0.35rem 0.85rem', 
                    borderRadius: '2rem', 
                    fontSize: '0.85rem', 
                    cursor: updateNotes ? 'pointer' : 'default',
                    background: isChecked ? 'var(--success)' : 'rgba(0,0,0,0.2)',
                    color: isChecked ? 'white' : 'var(--text-muted)',
                    border: isChecked ? 'none' : '1px solid var(--glass-border)',
                    boxShadow: isChecked ? '0 0 10px rgba(48, 209, 88, 0.3)' : 'none',
                    transition: 'all 0.2s',
                    fontWeight: isChecked ? '600' : 'normal'
                  }}
                >
                  {stage.label}
                </div>
              );
            })}
          </div>
        </div>
        </>)}

        {/* ── TAB: ANÁLISIS ── */}
        {debriefTab === 'analysis' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', flex: 1 }}>
          {/* EVALUACIÓN DEL CLOSER */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', paddingBottom: '0.5rem' }}>
              <Activity size={18} /> Análisis del Closer
            </h3>
            
            {/* Métrica de Tono */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tono y Autoridad
              </div>
              <textarea 
                id="toneInput"
                value={localTone}
                onChange={(e) => setLocalTone(e.target.value)}
                onBlur={handleBlurTone}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Mantuvo autoridad? ¿Se mostró inseguro o reactivo cuando el Lead presionó?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
              />
            </div>

            {/* Diagnóstico de Dolor */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Extracción de Dolor
              </div>
              <textarea 
                id="painInput"
                value={localPain}
                onChange={(e) => setLocalPain(e.target.value)}
                onBlur={handleBlurPain}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Encontró el verdadero dolor emocional del Lead o se quedó resolviendo dudas técnicas en la superficie?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.2)' }}
              />
            </div>

            {/* Manejo de Objeción */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Manejo de Objeción
              </div>
              <textarea 
                id="objectionInput"
                value={localObjection}
                onChange={(e) => setLocalObjection(e.target.value)}
                onBlur={handleBlurObjection}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Logró aislar la excusa falsa y encontrar la verdadera razón por la que no querían comprar?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(255, 159, 10, 0.05)', border: '1px solid rgba(255, 159, 10, 0.2)' }}
              />
            </div>
          </div>

          {/* EVALUACIÓN DEL LEAD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(48, 209, 88, 0.3)', paddingBottom: '0.5rem' }}>
              <Target size={18} /> Análisis del Lead
            </h3>
            
            {/* Dolor Real */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Motivación Oculta
              </div>
              <textarea 
                id="leadPainInput"
                value={localLeadPain}
                onChange={(e) => setLocalLeadPain(e.target.value)}
                onBlur={handleBlurLeadPain}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Cuál fue el verdadero dolor o motivación del Lead que pudiste detectar como observador?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(48, 209, 88, 0.05)', border: '1px solid rgba(48, 209, 88, 0.2)' }}
              />
            </div>

            {/* Señales de Compra/Alerta */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Señales / Lenguaje
              </div>
              <textarea 
                id="leadSignalsInput"
                value={localLeadSignals}
                onChange={(e) => setLocalLeadSignals(e.target.value)}
                onBlur={handleBlurLeadSignals}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Qué señales de compra o de resistencia notaste en su voz/actitud?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(48, 209, 88, 0.05)', border: '1px solid rgba(48, 209, 88, 0.2)' }}
              />
            </div>

            {/* Objeción Raíz */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Motivo de Rechazo
              </div>
              <textarea 
                id="leadObjectionInput"
                value={localLeadObjection}
                onChange={(e) => setLocalLeadObjection(e.target.value)}
                onBlur={handleBlurLeadObjection}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Por qué realmente puso objeciones? (ej. falta de confianza, miedo al riesgo, etc.)" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(48, 209, 88, 0.05)', border: '1px solid rgba(48, 209, 88, 0.2)' }}
              />
            </div>
          </div>
        </div>
        )}

        {/* ── TAB: RETRO ── */}
        {debriefTab === 'retro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(14, 165, 233, 0.3)', paddingBottom: '0.5rem' }}>
            <Activity size={18} /> {isEn ? 'Retrospective & Continuous Improvement' : 'Retrospectiva y Mejora Continua'}
          </h3>
          <div className="retro-grid">
            
            {/* Nuestros aciertos */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lo positivo
              </div>
              <textarea 
                id="retroPositivoInput"
                value={localRetroPositivo}
                onChange={(e) => setLocalRetroPositivo(e.target.value)}
                onBlur={handleBlurRetroPositivo}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Qué funcionó bien en este proceso/ciclo y definitivamente debe mantenerse?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.2)' }}
              />
            </div>

            {/* Oportunidades de ajuste */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lo descartable
              </div>
              <textarea 
                id="retroDescartableInput"
                value={localRetroDescartable}
                onChange={(e) => setLocalRetroDescartable(e.target.value)}
                onBlur={handleBlurRetroDescartable}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Qué aspectos no sumaron valor y podríamos dejar fuera, o cuáles necesitan mejorarse?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.2)' }}
              />
            </div>

            {/* Nuestra evolución */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                El siguiente nivel
              </div>
              <textarea 
                id="retroMejorarInput"
                value={localRetroMejorar}
                onChange={(e) => setLocalRetroMejorar(e.target.value)}
                onBlur={handleBlurRetroMejorar}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "Pensando en la excelencia, ¿cómo podríamos hacer nuestro trabajo aún mejor la próxima vez?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.2)' }}
              />
            </div>

            {/* Nuevas herramientas */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Enfoque comercial
              </div>
              <textarea 
                id="retroHerramientasInput"
                value={localRetroHerramientas}
                onChange={(e) => setLocalRetroHerramientas(e.target.value)}
                onBlur={handleBlurRetroHerramientas}
                readOnly={!updateNotes}
                placeholder={updateNotes ? "¿Qué elementos, herramientas o argumentos podríamos agregar para fortalecer la venta?" : "Esperando notas del Observador..."}
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.2)' }}
              />
            </div>

          </div>
        </div>
        )}

      </div>
    </div>
  );
}

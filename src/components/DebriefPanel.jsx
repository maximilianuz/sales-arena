import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckSquare, Target, Save, RotateCcw, Activity, ShieldAlert, HeartPulse } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DebriefPanel({ activeStageIndex, stages, roomNotes, updateNotes, isFacilitator }) {
  const { t } = useTranslation();
  // Use local state for text areas to avoid losing focus/cursor jumping on remote updates
  const [localTone, setLocalTone] = useState('');
  const [localPain, setLocalPain] = useState('');
  const [localObjection, setLocalObjection] = useState('');

  // Lead evaluation states
  const [localLeadPain, setLocalLeadPain] = useState('');
  const [localLeadSignals, setLocalLeadSignals] = useState('');
  const [localLeadObjection, setLocalLeadObjection] = useState('');

  // Sync from remote when roomNotes changes, but only if not currently typing
  useEffect(() => {
    if (roomNotes) {
      if (document.activeElement.id !== 'toneInput') setLocalTone(roomNotes.tone || '');
      if (document.activeElement.id !== 'painInput') setLocalPain(roomNotes.pain || '');
      if (document.activeElement.id !== 'objectionInput') setLocalObjection(roomNotes.objection || '');
      
      if (document.activeElement.id !== 'leadPainInput') setLocalLeadPain(roomNotes.leadPain || '');
      if (document.activeElement.id !== 'leadSignalsInput') setLocalLeadSignals(roomNotes.leadSignals || '');
      if (document.activeElement.id !== 'leadObjectionInput') setLocalLeadObjection(roomNotes.leadObjection || '');
    } else {
      setLocalTone('');
      setLocalPain('');
      setLocalObjection('');
      setLocalLeadPain('');
      setLocalLeadSignals('');
      setLocalLeadObjection('');
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

  const clearDebrief = () => {
    if (!updateNotes) return;
    updateNotes({ 
      completedStages: [], 
      tone: '', 
      pain: '', 
      objection: '',
      leadPain: '',
      leadSignals: '',
      leadObjection: ''
    });
  };

  const completedStages = roomNotes?.completedStages || [];

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} />
          Panel de Análisis Clínico (Observers)
        </div>
        {isFacilitator && (
          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={clearDebrief}>
            <RotateCcw size={14} /> {t('debrief.clear')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, paddingRight: '0.5rem' }}>
        
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
                    boxShadow: isChecked ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none',
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1 }}>
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
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
              />
            </div>
          </div>

          {/* EVALUACIÓN DEL LEAD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(16, 185, 129, 0.3)', paddingBottom: '0.5rem' }}>
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
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
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
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
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
                style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckSquare, Target, Save, RotateCcw } from 'lucide-react';

export default function DebriefPanel({ activeStageIndex, stages }) {
  const [debriefData, setDebriefData] = useState({
    completedStages: [],
    infoDiscovered: '',
    unexploredObjections: ''
  });

  useEffect(() => {
    const savedDebrief = localStorage.getItem('debrief_data_v2');
    if (savedDebrief) {
      try {
        setDebriefData(JSON.parse(savedDebrief));
      } catch (e) {}
    }
  }, []);

  // Update completed stages based on max activeStageIndex reached if desired, or manually.
  // We'll let them click to toggle.

  const handleChange = (key, value) => {
    const newData = { ...debriefData, [key]: value };
    setDebriefData(newData);
    localStorage.setItem('debrief_data_v2', JSON.stringify(newData));
  };

  const toggleStage = (stageId) => {
    const current = debriefData.completedStages || [];
    const updated = current.includes(stageId) 
      ? current.filter(id => id !== stageId) 
      : [...current, stageId];
    handleChange('completedStages', updated);
  };

  const clearDebrief = () => {
    const emptyData = { completedStages: [], infoDiscovered: '', unexploredObjections: '' };
    setDebriefData(emptyData);
    localStorage.removeItem('debrief_data_v2');
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} />
          Debriefing / Análisis
        </div>
        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={clearDebrief}>
          <RotateCcw size={14} /> Limpiar
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        
        {/* Etapas Completadas */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            <CheckSquare size={16} /> Etapas Completadas Exitosamente
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {stages.map(stage => {
              const isChecked = debriefData.completedStages.includes(stage.id);
              return (
                <div 
                  key={stage.id} 
                  onClick={() => toggleStage(stage.id)}
                  style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    background: isChecked ? 'var(--success)' : 'rgba(255,255,255,0.1)',
                    color: isChecked ? 'white' : 'var(--text-muted)'
                  }}
                >
                  {stage.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Información Descubierta */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            <Target size={16} /> ¿Qué información clave se descubrió?
          </div>
          <textarea 
            value={debriefData.infoDiscovered}
            onChange={(e) => handleChange('infoDiscovered', e.target.value)}
            placeholder="Ej. El cliente confesó que pierden $10k al mes..."
            style={{ flex: 1, minHeight: '60px', resize: 'none' }}
          />
        </div>

        {/* Objeciones sin explorar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            <Save size={16} /> ¿Qué objeciones quedaron sin explorar?
          </div>
          <textarea 
            value={debriefData.unexploredObjections}
            onChange={(e) => handleChange('unexploredObjections', e.target.value)}
            placeholder="Ej. No se profundizó en la falta de presupuesto..."
            style={{ flex: 1, minHeight: '60px', resize: 'none' }}
          />
        </div>

      </div>
    </div>
  );
}

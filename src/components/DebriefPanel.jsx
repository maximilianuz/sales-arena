import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckSquare, Target, Save, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DebriefPanel({ activeStageIndex, stages, roomNotes, updateNotes, isFacilitator }) {
  const { t } = useTranslation();
  // Use local state for text areas to avoid losing focus/cursor jumping on remote updates
  const [localInfo, setLocalInfo] = useState('');
  const [localUnexplored, setLocalUnexplored] = useState('');

  // Sync from remote when roomNotes changes, but only if not currently typing
  useEffect(() => {
    if (roomNotes) {
      if (document.activeElement.id !== 'infoDiscoveredInput') {
        setLocalInfo(roomNotes.infoDiscovered || '');
      }
      if (document.activeElement.id !== 'unexploredObjectionsInput') {
        setLocalUnexplored(roomNotes.unexploredObjections || '');
      }
    } else {
      setLocalInfo('');
      setLocalUnexplored('');
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

  const handleBlurInfo = () => {
    if (!updateNotes) return;
    updateNotes({
      ...roomNotes,
      infoDiscovered: localInfo
    });
  };

  const handleBlurUnexplored = () => {
    if (!updateNotes) return;
    updateNotes({
      ...roomNotes,
      unexploredObjections: localUnexplored
    });
  };

  const clearDebrief = () => {
    if (!updateNotes) return;
    updateNotes({ 
      completedStages: [], 
      infoDiscovered: '', 
      unexploredObjections: '' 
    });
  };

  const completedStages = roomNotes?.completedStages || [];

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} />
          {t('debrief.title')}
        </div>
        {isFacilitator && (
          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={clearDebrief}>
            <RotateCcw size={14} /> {t('debrief.clear')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        
        {/* Etapas Completadas */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            <CheckSquare size={16} /> {t('debrief.completedStages')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {stages.map(stage => {
              const isChecked = completedStages.includes(stage.id);
              return (
                <div 
                  key={stage.id} 
                  onClick={() => toggleStage(stage.id)}
                  style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.8rem', 
                    cursor: updateNotes ? 'pointer' : 'default',
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
            <Target size={16} /> {t('debrief.infoDiscovered')}
          </div>
          <textarea 
            id="infoDiscoveredInput"
            value={localInfo}
            onChange={(e) => setLocalInfo(e.target.value)}
            onBlur={handleBlurInfo}
            readOnly={!updateNotes}
            placeholder={updateNotes ? t('debrief.infoPlaceholder') : t('debrief.waitingNotes')}
            style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : undefined }}
          />
        </div>

        {/* Objeciones sin explorar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            <Save size={16} /> {t('debrief.unexploredObjections')}
          </div>
          <textarea 
            id="unexploredObjectionsInput"
            value={localUnexplored}
            onChange={(e) => setLocalUnexplored(e.target.value)}
            onBlur={handleBlurUnexplored}
            readOnly={!updateNotes}
            placeholder={updateNotes ? t('debrief.unexploredPlaceholder') : t('debrief.waitingNotes')}
            style={{ flex: 1, minHeight: '60px', resize: 'none', background: !updateNotes ? 'rgba(0,0,0,0.1)' : undefined }}
          />
        </div>

      </div>
    </div>
  );
}

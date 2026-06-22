import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRoomSync } from '../hooks/useRoomSync';
import Header from '../components/Header';
import PipelinePanel from '../components/PipelinePanel';
import BuyerPersonaPanel from '../components/ScenarioPanel';
import RolesPanel from '../components/RolesPanel';
import Timer from '../components/Timer';
import PrivateInfoModal from '../components/PrivateInfoModal';
import SurpriseEventButton from '../components/SurpriseEventButton';
import VotingPanel from '../components/VotingPanel';
import DebriefPanel from '../components/DebriefPanel';
import SettingsModal from '../components/SettingsModal';
import { Dices, X } from 'lucide-react';
import { getDefaultStages } from '../utils/defaultStages';
import '../App.css';

export default function Room() {
  const { t, i18n } = useTranslation();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { roomData, loading, updateScenario, updateTimer, updateActiveStage, updateQuestions, updateDebriefNotes, triggerSurpriseEvent } = useRoomSync(roomId);

  const [sessionTitle, setSessionTitle] = useState(t('lobby.title'));
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('/api/nvidia/v1/chat/completions');
  const [apiModel, setApiModel] = useState('meta/llama-3.1-70b-instruct');
  const [participants, setParticipants] = useState([]);
  const [stages, setStages] = useState(() => getDefaultStages(i18n.language));
  
  const [showPrivateInfo, setShowPrivateInfo] = useState(false);
  
  // Surprise event sync
  const [showSurpriseEvent, setShowSurpriseEvent] = useState(false);
  const [seenSurpriseEventId, setSeenSurpriseEventId] = useState(null);

  // User Role
  const role = localStorage.getItem('sales_arena_role') || 'Observador';
  const userName = localStorage.getItem('sales_arena_userName') || 'Anónimo';

  useEffect(() => {
    if (!localStorage.getItem('sales_arena_userName')) {
      navigate('/');
      return;
    }

    const savedApiKey = localStorage.getItem('nvidia_api_key');
    if (savedApiKey) setApiKey(savedApiKey);
    const savedApiUrl = localStorage.getItem('api_url');
    if (savedApiUrl) setApiUrl(savedApiUrl);
    const savedApiModel = localStorage.getItem('api_model');
    if (savedApiModel) setApiModel(savedApiModel);
    const savedTitle = localStorage.getItem('session_title');
    if (savedTitle) setSessionTitle(savedTitle);
    
    const savedStages = localStorage.getItem('pipeline_stages');
    if (savedStages) {
      try {
        const parsed = JSON.parse(savedStages);
        if (Array.isArray(parsed)) {
          setStages(parsed);
        } else {
          setStages(getDefaultStages(i18n.language));
        }
      } catch (e) {
        setStages(getDefaultStages(i18n.language));
      }
    } else {
      setStages(getDefaultStages(i18n.language));
    }
  }, [i18n.language, navigate]);

  useEffect(() => {
    if (roomData?.surpriseEvent && roomData.surpriseEvent.id !== seenSurpriseEventId) {
      setShowSurpriseEvent(true);
    }
  }, [roomData?.surpriseEvent, seenSurpriseEventId]);

  const handleSaveSettings = (newKey, newUrl, newModel, newStages) => {
    setApiKey(newKey);
    localStorage.setItem('nvidia_api_key', newKey);
    setApiUrl(newUrl);
    localStorage.setItem('api_url', newUrl);
    setApiModel(newModel);
    localStorage.setItem('api_model', newModel);
    
    if (newStages) {
      setStages(newStages);
      localStorage.setItem('pipeline_stages', JSON.stringify(newStages));
    }
    setShowSettings(false);
  };

  const handleSetScenario = async (scenario) => {
    await updateScenario(scenario);
    await updateActiveStage(0);
  };

  if (loading || !roomData) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{t('room.syncing', {roomId})}</div>;
  }

  const { currentScenario, activeStageIndex, timerState } = roomData;
  const isFacilitator = role === 'Facilitador';
  const isCloser = role === 'Closer';
  const isLead = role === 'Lead';
  const isObserver = role === 'Observador';

  const showColumn1 = !isCloser;
  const showColumn3 = isFacilitator || isObserver;

  let gridColumns = '1fr 1fr 1fr';
  if (isCloser) gridColumns = '1fr';
  else if (isLead) gridColumns = '1fr 1fr';
  else if (isObserver) gridColumns = '1fr 2fr'; // Wide center/right column

  return (
    <div className="app-container">
      <Header 
        title={`${sessionTitle} | Sala: ${roomId} | Rol: ${role}`} 
        onTitleChange={isFacilitator ? (newTitle) => {
          setSessionTitle(newTitle);
          localStorage.setItem('session_title', newTitle);
        } : undefined} 
        onOpenSettings={isFacilitator ? () => setShowSettings(true) : undefined} 
      />
      
      <main className="dashboard-wrapper">
        <PipelinePanel 
          activeStageIndex={activeStageIndex || 0} 
          setActiveStageIndex={isFacilitator ? updateActiveStage : undefined} 
          pipelineQuestions={currentScenario?.pipelineQuestions} 
          stages={stages}
        />

        <div className="dashboard-grid" style={{ 
          gridTemplateColumns: gridColumns, 
          display: 'grid', 
          gridAutoRows: 'min-content 1fr',
          alignItems: 'start'
        }}>
          {showColumn1 && (
            <div className="grid-column" style={{ gridColumn: '1', gridRow: '1 / span 2' }}>
              <BuyerPersonaPanel 
                currentScenario={currentScenario} 
                setCurrentScenario={isFacilitator ? handleSetScenario : undefined}
                apiKey={apiKey}
                apiUrl={apiUrl}
                apiModel={apiModel}
                stages={stages}
                isReadOnly={!isFacilitator}
              />
              <RolesPanel 
                participants={participants}
                setParticipants={(p) => setParticipants(p)}
              />
            </div>
          )}

          <div className="grid-column center-column" style={{ gridColumn: showColumn1 ? '2' : '1', gridRow: '1' }}>
            <Timer 
              stages={stages} 
              timerState={timerState} 
              updateTimer={isFacilitator ? updateTimer : undefined} 
            />
            
            <div className="center-actions">
              {isFacilitator && (
                <button 
                  className="btn btn-secondary btn-large" 
                  onClick={() => setShowPrivateInfo(true)}
                  disabled={!currentScenario}
                >
                  {t('room.showHiddenInfo')}
                </button>
              )}
              {isFacilitator && <SurpriseEventButton triggerEvent={triggerSurpriseEvent} />}
              
              {/* For Closer, show RolesPanel in center since Col 1 is hidden */}
              {isCloser && (
                <RolesPanel 
                  participants={participants}
                  setParticipants={(p) => setParticipants(p)}
                />
              )}
            </div>
          </div>

          {showColumn3 && (
            <div className="grid-column" style={{ gridColumn: '3', gridRow: '1' }}>
              <VotingPanel 
                isObserver={isObserver} 
                isFacilitator={isFacilitator}
                questions={roomData.questions}
                updateQuestions={isObserver || isFacilitator ? updateQuestions : undefined}
                activeStage={stages[activeStageIndex || 0]}
              />
            </div>
          )}

          {showColumn3 && (
            <div style={{ gridColumn: '2 / span 2', gridRow: '2', display: 'flex', minHeight: '300px' }}>
              <DebriefPanel 
                activeStageIndex={activeStageIndex || 0} 
                stages={stages}
                roomNotes={roomData.debriefNotes}
                updateNotes={isObserver || isFacilitator ? updateDebriefNotes : undefined}
                isFacilitator={isFacilitator}
              />
            </div>
          )}
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', marginTop: 'auto', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        {t('room.madeWith')} <span className="heart-beat">❤️</span> {t('room.by')} <a href="https://maximilianoc.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Maximiliano C.</a>
      </footer>

      {showPrivateInfo && currentScenario && (
        <PrivateInfoModal 
          info={currentScenario.hiddenObjection} 
          onClose={() => setShowPrivateInfo(false)} 
        />
      )}

      {showSurpriseEvent && roomData?.surpriseEvent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', borderColor: 'var(--secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => {
                setSeenSurpriseEventId(roomData.surpriseEvent.id);
                setShowSurpriseEvent(false);
              }}>
                <X size={20} />
              </button>
            </div>
            
            <Dices size={64} color="var(--secondary)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h2 style={{ color: 'var(--secondary)', marginBottom: '1rem', fontSize: '2rem' }}>{t('surprise.title')}</h2>
            <p style={{ fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.4' }}>
              {roomData.surpriseEvent.text}
            </p>
            
            <button className="btn btn-secondary" style={{ marginTop: '2rem', width: '100%' }} onClick={() => {
              setSeenSurpriseEventId(roomData.surpriseEvent.id);
              setShowSurpriseEvent(false);
            }}>
              {t('surprise.understood')}
            </button>
          </div>
        </div>
      )}

      {showSettings && isFacilitator && (
        <SettingsModal 
          apiKey={apiKey} 
          apiUrl={apiUrl}
          apiModel={apiModel}
          stages={stages}
          onSave={handleSaveSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
}

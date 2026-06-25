import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRoomSync } from '../hooks/useRoomSync';
import Header from '../components/Header';
import PipelinePanel from '../components/PipelinePanel';
import BuyerPersonaPanel from '../components/ScenarioPanel';
import RolesPanel from '../components/RolesPanel';
import ProductPanel from '../components/ProductPanel';
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
  const { roomData, loading, updateScenario, updateTimer, updateActiveStage, updateQuestions, updateDebriefNotes, triggerSurpriseEvent, updateProductPresentation } = useRoomSync(roomId);

  const [sessionTitle, setSessionTitle] = useState(t('lobby.title'));
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('/api/nvidia/v1/chat/completions');
  const [apiModel, setApiModel] = useState('meta/llama-3.1-8b-instruct');
  const [participants, setParticipants] = useState([]);
  const [stages, setStages] = useState(() => getDefaultStages(i18n.language));
  
  const [showPrivateInfo, setShowPrivateInfo] = useState(false);
  
  // Surprise event sync
  const [showSurpriseEvent, setShowSurpriseEvent] = useState(false);
  const [seenSurpriseEventId, setSeenSurpriseEventId] = useState(null);

  // User Role (read once on mount to avoid cross-tab pollution)
  const [role] = useState(() => localStorage.getItem('sales_arena_role') || 'Observador');
  const [userName] = useState(() => localStorage.getItem('sales_arena_userName') || 'Anónimo');

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
    if (scenario.productToSell) {
      await updateProductPresentation(scenario.productToSell);
    }
    await updateActiveStage(0);
    const initialTime = (stages[0]?.estimatedTime || 5) * 60;
    await updateTimer({ isRunning: false, endTimestamp: null, timeLeft: initialTime });
  };

  const handleStageChange = async (newIndex) => {
    await updateActiveStage(newIndex);
    const estTime = stages[newIndex]?.estimatedTime;
    const newTime = parseInt(estTime !== undefined ? estTime : 5, 10) * 60;
    await updateTimer({ isRunning: false, endTimestamp: null, timeLeft: newTime });
  };

  if (loading || !roomData) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{t('room.syncing', {roomId})}</div>;
  }

  const { currentScenario, activeStageIndex, timerState } = roomData;
  
  // --- LAYOUT LOGIC ---
  const isFacilitator = role === 'Facilitador';
  const isCloser = role === 'Closer';
  const isLead = role === 'Lead';
  const isObserver = role === 'Observador';

  let gridColumns = '1fr';
  let showPersona = false;
  let showRoles = false;
  let showTimer = !isLead;
  let showDebrief = false;
  let showVoting = false;
  let showHiddenInfoBtn = false;
  let showSurpriseBtn = false;
  let showProductPresentation = false;

  if (isCloser) {
    gridColumns = 'minmax(300px, 600px)'; // Center focus
    showRoles = false;
    showProductPresentation = true;
  } else if (isLead) {
    gridColumns = '1fr 300px';
    showPersona = true;
    showRoles = false;
    showHiddenInfoBtn = true;
  } else if (isObserver) {
    gridColumns = '1fr 1.5fr'; // Wide center for debrief
    showPersona = true;
    showDebrief = true;
    showHiddenInfoBtn = true;
  } else if (isFacilitator) {
    gridColumns = '1fr 1.2fr 1fr'; // 3 Columns
    showPersona = true;
    showRoles = true;
    showVoting = true;
    showDebrief = true;
    showHiddenInfoBtn = true;
    showSurpriseBtn = true;
    showProductPresentation = true;
  }

  return (
    <div className="app-container">
      <Header 
        title={sessionTitle}
        roomId={roomId}
        role={role}
        onTitleChange={isFacilitator ? (newTitle) => {
          setSessionTitle(newTitle);
          localStorage.setItem('session_title', newTitle);
        } : undefined} 
        onOpenSettings={isFacilitator ? () => setShowSettings(true) : undefined} 
      />
      
      <main className="dashboard-wrapper">
        {!isLead && (
          <PipelinePanel 
            activeStageIndex={activeStageIndex || 0} 
            setActiveStageIndex={isFacilitator ? handleStageChange : undefined} 
            pipelineQuestions={currentScenario?.pipelineQuestions} 
            stages={stages}
          />
        )}

        <div className="dashboard-grid" style={{ 
          gridTemplateColumns: gridColumns, 
          display: 'grid', 
          alignItems: 'stretch',
          gap: '1.5rem',
          justifyContent: isCloser ? 'center' : 'stretch'
        }}>
          
          {/* COLUMNA 1: Persona & Roles */}
          {(showPersona || (showRoles && !isCloser)) && (
            <div className="grid-column" style={{ gridColumn: '1', gridRow: '1 / span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {showPersona && (
                <BuyerPersonaPanel 
                  currentScenario={currentScenario} 
                  setCurrentScenario={isFacilitator ? handleSetScenario : undefined}
                  apiKey={apiKey}
                  apiUrl={apiUrl}
                  apiModel={apiModel}
                  stages={stages}
                  isReadOnly={!isFacilitator}
                  isLeadRole={isLead}
                />
              )}
              {showRoles && !isCloser && (
                <RolesPanel 
                  participants={participants}
                  setParticipants={(p) => setParticipants(p)}
                />
              )}
            </div>
          )}

          {/* COLUMNA 2: Timer, Center Actions & Debrief */}
          <div className="grid-column center-column" style={{ gridColumn: isCloser ? '1' : '2', gridRow: '1 / span 2', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {showTimer && (
              <Timer 
                stages={stages} 
                activeStageIndex={activeStageIndex || 0}
                timerState={timerState} 
                updateTimer={isFacilitator ? updateTimer : undefined} 
              />
            )}
            
            {(showHiddenInfoBtn || showSurpriseBtn) && (
              <div className="center-actions">
                {showHiddenInfoBtn && (
                  <button 
                    className="btn btn-secondary btn-large" 
                    onClick={() => setShowPrivateInfo(true)}
                    disabled={!currentScenario}
                  >
                    {t('room.showHiddenInfo')}
                  </button>
                )}
                {showSurpriseBtn && (
                  <SurpriseEventButton 
                    triggerEvent={triggerSurpriseEvent} 
                    apiKey={apiKey}
                    apiUrl={apiUrl}
                    apiModel={apiModel}
                    currentScenario={currentScenario}
                  />
                )}
              </div>
            )}

            {/* Para el Closer, la presentación va en el centro porque es de una columna */}
            {isCloser && showProductPresentation && (
              <ProductPanel 
                productPresentation={roomData.productPresentation}
                isReadOnly={true}
              />
            )}

            {/* Debrief Panel (Evaluación) */}
            {showDebrief && (
               <div style={{ flex: 1, display: 'flex', minHeight: '300px', width: '100%' }}>
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

          {/* COLUMNA 3: Voting Panel & Product Presentation (Exclusivo Facilitador) */}
          {(showVoting || (isFacilitator && showProductPresentation)) && (
            <div className="grid-column" style={{ gridColumn: '3', gridRow: '1 / span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {showVoting && (
                <VotingPanel 
                  isObserver={false} 
                  isFacilitator={isFacilitator}
                  questions={roomData.questions}
                  updateQuestions={updateQuestions}
                  activeStage={stages[activeStageIndex || 0]}
                />
              )}
              {showProductPresentation && isFacilitator && (
                <ProductPanel
                  productPresentation={roomData.productPresentation}
                  updateProductPresentation={updateProductPresentation}
                  isReadOnly={false}
                />
              )}
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

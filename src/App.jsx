import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PipelinePanel from './components/PipelinePanel';
import BuyerPersonaPanel from './components/ScenarioPanel';
import RolesPanel from './components/RolesPanel';
import Timer from './components/Timer';
import PrivateInfoModal from './components/PrivateInfoModal';
import SurpriseEventButton from './components/SurpriseEventButton';
import VotingPanel from './components/VotingPanel';
import DebriefPanel from './components/DebriefPanel';
import SettingsModal from './components/SettingsModal';
import { DEFAULT_STAGES } from './utils/defaultStages';
import './App.css';

function App() {
  const [sessionTitle, setSessionTitle] = useState('Simulador High Ticket Closer');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('/api/nvidia/v1/chat/completions');
  const [apiModel, setApiModel] = useState('meta/llama-3.1-70b-instruct');
  const [participants, setParticipants] = useState([]);
  const [stages, setStages] = useState(DEFAULT_STAGES);
  
  const [currentScenario, setCurrentScenario] = useState(null);
  const [showPrivateInfo, setShowPrivateInfo] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('nvidia_api_key');
    if (savedApiKey) setApiKey(savedApiKey);
    
    const savedApiUrl = localStorage.getItem('api_url');
    if (savedApiUrl) setApiUrl(savedApiUrl);

    const savedApiModel = localStorage.getItem('api_model');
    if (savedApiModel) setApiModel(savedApiModel);
    
    const savedTitle = localStorage.getItem('session_title');
    if (savedTitle) setSessionTitle(savedTitle);
    
    const savedParticipants = localStorage.getItem('participants');
    if (savedParticipants) setParticipants(JSON.parse(savedParticipants));
    
    const savedStages = localStorage.getItem('pipeline_stages');
    if (savedStages) {
      setStages(JSON.parse(savedStages));
    } else {
      localStorage.setItem('pipeline_stages', JSON.stringify(DEFAULT_STAGES));
    }
  }, []);

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

  const handleTitleChange = (newTitle) => {
    setSessionTitle(newTitle);
    localStorage.setItem('session_title', newTitle);
  };

  const handleSetScenario = (scenario) => {
    setCurrentScenario(scenario);
    setActiveStageIndex(0);
  };

  return (
    <div className="app-container">
      <Header 
        title={sessionTitle} 
        onTitleChange={handleTitleChange} 
        onOpenSettings={() => setShowSettings(true)} 
      />
      
      <main className="dashboard-wrapper">
        <PipelinePanel 
          activeStageIndex={activeStageIndex} 
          setActiveStageIndex={setActiveStageIndex} 
          pipelineQuestions={currentScenario?.pipelineQuestions} 
          stages={stages}
        />

        <div className="dashboard-grid">
          <div className="grid-column">
            <BuyerPersonaPanel 
              currentScenario={currentScenario} 
              setCurrentScenario={handleSetScenario}
              apiKey={apiKey}
              apiUrl={apiUrl}
              apiModel={apiModel}
              stages={stages}
            />
            <RolesPanel 
              participants={participants}
              setParticipants={(p) => {
                setParticipants(p);
                localStorage.setItem('participants', JSON.stringify(p));
              }}
            />
          </div>

          <div className="grid-column center-column">
            <Timer stages={stages} />
            
            <div className="center-actions">
              <button 
                className="btn btn-secondary btn-large" 
                onClick={() => setShowPrivateInfo(true)}
                disabled={!currentScenario}
              >
                Mostrar Info Oculta del Cliente
              </button>
              <SurpriseEventButton />
            </div>
          </div>

          <div className="grid-column">
            <VotingPanel />
            <DebriefPanel 
              activeStageIndex={activeStageIndex} 
              stages={stages}
            />
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', marginTop: 'auto', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Hecho con <span className="heart-beat">❤️</span> por <a href="https://maximilianoc.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Maximiliano C.</a>
      </footer>

      {showPrivateInfo && currentScenario && (
        <PrivateInfoModal 
          info={currentScenario.hiddenObjection} 
          onClose={() => setShowPrivateInfo(false)} 
        />
      )}

      {showSettings && (
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

export default App;

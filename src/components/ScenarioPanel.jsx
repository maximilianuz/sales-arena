import React, { useState } from 'react';
import { UserCircle, HeartPulse, Target, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateAIScenario } from '../utils/ai';

export default function ScenarioPanel({ currentScenario, setCurrentScenario, apiKey, apiUrl, apiModel, stages, isReadOnly }) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('situacion');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!setCurrentScenario) return;
    setIsGenerating(true);
    try {
      const scenario = await generateAIScenario(
        apiKey, apiUrl, apiModel, 
        { level: "Intermedio", theme: "Ventas B2B", saleType: "Consultoría", targetObjection: "Precio", leadTemperature: "Templado" }, 
        stages, 
        i18n.language
      );
      await setCurrentScenario(scenario);
    } catch (error) {
      alert("Error: " + error.message);
    }
    setIsGenerating(false);
  };

  if (!currentScenario) {
    return (
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <UserCircle size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--text-muted)' }}>{t('scenario.waiting')}</h2>
        {!isReadOnly && (
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '2rem' }}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? t('scenario.generating') : t('header.generateAI')}
          </button>
        )}
      </div>
    );
  }

  const renderTabContent = () => {
    switch(activeTab) {
      case 'demografia':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
            <div><strong style={{ color: 'var(--primary)' }}>Nombre:</strong> {currentScenario.demographics.name}</div>
            <div><strong style={{ color: 'var(--primary)' }}>Edad:</strong> {currentScenario.demographics.age}</div>
            <div><strong style={{ color: 'var(--primary)' }}>Cargo:</strong> {currentScenario.demographics.role}</div>
            <div><strong style={{ color: 'var(--primary)' }}>Industria:</strong> {currentScenario.demographics.industry}</div>
            <div><strong style={{ color: 'var(--primary)' }}>Tamaño Empresa:</strong> {currentScenario.demographics.companySize}</div>
          </div>
        );
      case 'psicologia':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
            <div><strong style={{ color: 'var(--accent)' }}>Nivel de Urgencia:</strong> {currentScenario.psychology.urgency}</div>
            <div><strong style={{ color: 'var(--accent)' }}>Estilo de Comunicación:</strong> {currentScenario.psychology.communicationStyle}</div>
            <div><strong style={{ color: 'var(--accent)' }}>Miedo Principal:</strong> {currentScenario.psychology.primaryFear}</div>
            <div><strong style={{ color: 'var(--accent)' }}>Deseo Principal:</strong> {currentScenario.psychology.primaryDesire}</div>
          </div>
        );
      case 'situacion':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
            <div><strong style={{ color: 'var(--success)' }}>Problema Actual:</strong> <p>{currentScenario.currentSituation.problem}</p></div>
            <div><strong style={{ color: 'var(--success)' }}>Intentos Previos:</strong> <p>{currentScenario.currentSituation.previousAttempts}</p></div>
            <div><strong style={{ color: 'var(--success)' }}>Impacto Financiero/Emocional:</strong> <p>{currentScenario.currentSituation.impact}</p></div>
          </div>
        );
      case 'objeciones':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
            <div><strong style={{ color: 'var(--secondary)' }}>{t('scenario.visibleObjection')}:</strong> <p>{currentScenario.visibleObjection}</p></div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              {t('scenario.hiddenObjectionNote')}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCircle size={20} />
          {t('scenario.title')}
        </div>
        {!isReadOnly && (
          <button 
            className="btn btn-outline" 
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "..." : "Regenerar IA"}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${activeTab === 'situacion' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('situacion')}
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
        >
          <Target size={16} /> {t('scenario.tabs.situation')}
        </button>
        <button 
          className={`btn ${activeTab === 'demografia' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('demografia')}
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
        >
          <UserCircle size={16} /> {t('scenario.tabs.demographics')}
        </button>
        <button 
          className={`btn ${activeTab === 'psicologia' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('psicologia')}
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
        >
          <HeartPulse size={16} /> {t('scenario.tabs.psychology')}
        </button>
        <button 
          className={`btn ${activeTab === 'objeciones' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('objeciones')}
          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
        >
          <ShieldAlert size={16} /> {t('scenario.tabs.objections')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', lineHeight: '1.6' }}>
        {renderTabContent()}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Key, Settings, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StagesEditor from './StagesEditor';

export default function SettingsModal({ apiKey, apiUrl, apiModel, stages, onSave, onClose }) {
  const { t } = useTranslation();
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [urlInput, setUrlInput] = useState(apiUrl || '/api/nvidia/v1/chat/completions');
  const [modelInput, setModelInput] = useState(apiModel || 'meta/llama-3.1-70b-instruct');
  const [localStages, setLocalStages] = useState(stages || []);
  const [activeTab, setActiveTab] = useState('general');

  const handleProviderChange = (provider) => {
    switch (provider) {
      case 'nvidia':
        setUrlInput('https://integrate.api.nvidia.com/v1/chat/completions');
        setModelInput('meta/llama-3.1-70b-instruct');
        break;
      case 'openai':
        setUrlInput('https://api.openai.com/v1/chat/completions');
        setModelInput('gpt-4o-mini');
        break;
      case 'groq':
        setUrlInput('https://api.groq.com/openai/v1/chat/completions');
        setModelInput('llama-3.3-70b-versatile');
        break;
      case 'openrouter':
        setUrlInput('https://openrouter.ai/api/v1/chat/completions');
        setModelInput('anthropic/claude-3.5-sonnet');
        break;
      case 'ollama':
        setUrlInput('http://localhost:11434/v1/chat/completions');
        setModelInput('llama3');
        setKeyInput('ollama');
        break;
      default:
        break;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)', fontSize: '1.5rem' }}>
            <Settings size={24} color="var(--accent)" />
            {t('settings.title')}
          </h2>
          <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            className={`btn ${activeTab === 'general' ? '' : 'btn-outline'}`}
            style={{ borderRadius: '0', borderBottom: activeTab === 'general' ? '2px solid var(--primary)' : 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setActiveTab('general')}
          >
            <Key size={16} /> {t('settings.tabs.general')}
          </button>
          <button 
            className={`btn ${activeTab === 'stages' ? '' : 'btn-outline'}`}
            style={{ borderRadius: '0', borderBottom: activeTab === 'stages' ? '2px solid var(--primary)' : 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setActiveTab('stages')}
          >
            <Layers size={16} /> {t('settings.tabs.stages')}
          </button>
        </div>

        {activeTab === 'general' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent)' }}>
                {t('settings.presets')}
              </label>
              <select 
                onChange={(e) => handleProviderChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.5)', color: 'white', marginBottom: '1rem' }}
              >
                <option value="custom" style={{background: '#1e1e2f', color: 'white'}}>{t('settings.custom')}</option>
                <option value="nvidia" style={{background: '#1e1e2f', color: 'white'}}>NVIDIA NIM (Recomendado)</option>
                <option value="openai" style={{background: '#1e1e2f', color: 'white'}}>OpenAI (ChatGPT)</option>
                <option value="groq" style={{background: '#1e1e2f', color: 'white'}}>Groq (Ultra-Rápido)</option>
                <option value="openrouter" style={{background: '#1e1e2f', color: 'white'}}>OpenRouter (Múltiples Modelos)</option>
                <option value="ollama" style={{background: '#1e1e2f', color: 'white'}}>Ollama (100% Local y Privado)</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                {t('settings.apiKey')}
              </label>
              <input 
                type="password" 
                value={keyInput} 
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-..."
                className="form-input"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                {t('settings.apiUrl')}
              </label>
              <input 
                type="text" 
                value={urlInput} 
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://integrate.api.nvidia.com/v1/chat/completions"
                className="form-input"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                {t('settings.apiModel')}
              </label>
              <input 
                type="text" 
                value={modelInput} 
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="meta/llama-3.1-70b-instruct"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {t('settings.helpText')}
              </p>
            </div>
          </>
        )}

        {activeTab === 'stages' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {t('settings.stagesHelp')}
            </p>
            <StagesEditor stages={localStages} setStages={setLocalStages} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
            {t('settings.close')}
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
            <Save size={20} /> {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

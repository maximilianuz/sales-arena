import React, { useState } from 'react';
import { Key, Settings, X, Layers } from 'lucide-react';
import StagesEditor from './StagesEditor';

export default function SettingsModal({ apiKey, apiUrl, apiModel, stages, onSave, onClose }) {
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
        setModelInput('llama3'); // Default popular model for Ollama
        setKeyInput('ollama'); // Ollama ignores this but requires something
        break;
      default:
        break;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={24} color="var(--accent)" />
            Ajustes
          </h2>
          <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
          <button 
            style={{ background: 'none', border: 'none', padding: '0.5rem', color: activeTab === 'general' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'general' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setActiveTab('general')}
          >
            <Key size={16} /> API y General
          </button>
          <button 
            style={{ background: 'none', border: 'none', padding: '0.5rem', color: activeTab === 'stages' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'stages' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setActiveTab('stages')}
          >
            <Layers size={16} /> Etapas del Embudo
          </button>
        </div>

        {activeTab === 'general' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                Plantillas de Proveedores (Presets)
              </label>
              <select 
                onChange={(e) => handleProviderChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'white', marginBottom: '1rem' }}
              >
                <option value="custom">Personalizado...</option>
                <option value="nvidia">NVIDIA NIM (Recomendado)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="groq">Groq (Ultra-Rápido)</option>
                <option value="openrouter">OpenRouter (Múltiples Modelos)</option>
                <option value="ollama">Ollama (100% Local y Privado)</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                API Key
              </label>
              <input 
                type="password" 
                value={keyInput} 
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                API Base URL
              </label>
              <input 
                type="text" 
                value={urlInput} 
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://integrate.api.nvidia.com/v1/chat/completions"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                Modelo
              </label>
              <input 
                type="text" 
                value={modelInput} 
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="meta/llama-3.1-70b-instruct"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Los datos se guardan localmente en tu navegador. Puedes conectarte a cualquier API que soporte el formato de OpenAI. Para usar <strong>Ollama</strong>, asegúrate de que esté corriendo en tu PC (no necesitas API Key).
              </p>
            </div>
          </>
        )}

        {activeTab === 'stages' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Configura las etapas de tu proceso de ventas. La Inteligencia Artificial utilizará la "Información Base" que proporciones aquí para generar objeciones y patrones de preguntas realistas para tu escenario.
            </p>
            <StagesEditor stages={localStages} setStages={setLocalStages} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(keyInput, urlInput, modelInput, localStages)}>Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
}

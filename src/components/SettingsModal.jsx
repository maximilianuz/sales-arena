import React, { useState } from 'react';
import { X, Save, Key, Settings, Layers, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StagesEditor from './StagesEditor';

export default function SettingsModal({ apiKey, apiUrl, apiModel, stages, onSave, onClose, isFree, onUpgradeStages, roomConfig, onSaveConfig }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [urlInput, setUrlInput] = useState(apiUrl || '/api/nvidia/v1/chat/completions');
  const [modelInput, setModelInput] = useState(apiModel || 'meta/llama-3.1-8b-instruct');
  const [localStages, setLocalStages] = useState(Array.isArray(stages) ? stages : []);
  const [activeTab, setActiveTab] = useState('general');

  // Config de la sala (comisión % + producto real). Se guarda en la sala.
  const _rc = roomConfig || {};
  const _rp = _rc.realProduct || {};
  const [commissionPct, setCommissionPct] = useState(_rc.commissionPct ?? 10);
  const [prodName, setProdName] = useState(_rp.name || '');
  const [prodDesc, setProdDesc] = useState(_rp.description || '');
  const [prodPrice, setProdPrice] = useState(_rp.price || '');
  const [focusStageId, setFocusStageId] = useState(_rc.focusStageId || 'all');

  const handleProviderChange = (provider) => {
    switch (provider) {
      case 'nvidia':
        setUrlInput('https://integrate.api.nvidia.com/v1/chat/completions');
        setModelInput('meta/llama-3.1-8b-instruct');
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

  const handleSave = () => {
    onSave(keyInput, urlInput, modelInput, localStages);
    if (onSaveConfig) {
      const price = parseInt(prodPrice, 10);
      const realProduct = prodName.trim()
        ? { name: prodName.trim(), description: prodDesc.trim(), price: price > 0 ? price : 1500 }
        : null;
      onSaveConfig({ commissionPct: Number(commissionPct) || 0, realProduct, focusStageId });
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
          <button
            className={`btn ${activeTab === 'sale' ? '' : 'btn-outline'}`}
            style={{ borderRadius: '0', borderBottom: activeTab === 'sale' ? '2px solid var(--primary)' : 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setActiveTab('sale')}
          >
            <DollarSign size={16} /> {isEn ? 'Product & Commission' : 'Producto & Comisión'}
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
                placeholder="meta/llama-3.1-8b-instruct"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {t('settings.helpText')}
              </p>
            </div>
          </>
        )}

        {activeTab === 'stages' && (
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {t('settings.stagesHelp')}
            </p>
            <StagesEditor stages={localStages} setStages={isFree ? () => {} : setLocalStages} />
            {isFree && (
              <div
                onClick={onUpgradeStages}
                style={{
                  position: 'absolute', inset: 0, backdropFilter: 'blur(4px)',
                  background: 'rgba(0,0,0,0.5)', borderRadius: '0.75rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>🔒</span>
                <span style={{ color: 'white', fontWeight: '700' }}>Personalización de etapas</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Disponible en Plan Closer</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sale' && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent)' }}>
                {isEn ? 'Practice stage' : 'Etapa a practicar'}
              </label>
              <select value={focusStageId} onChange={(e) => setFocusStageId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                <option value="all" style={{ background: '#1e1e2f' }}>{isEn ? 'Full sale (all stages)' : 'Toda la venta (todas las etapas)'}</option>
                {(Array.isArray(stages) ? stages : []).map((s) => (
                  <option key={s.id} value={s.id} style={{ background: '#1e1e2f' }}>{s.label}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {isEn ? 'Focus the session on a single stage (e.g. only Closing) or the whole sale.' : 'Enfocá la sesión en una sola etapa (ej. solo Cierre) o en toda la venta.'}
              </p>
            </div>
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent)' }}>
                {isEn ? 'Commission (% of price)' : 'Comisión (% del precio)'}
              </label>
              <input type="number" min="0" max="100" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {isEn ? 'What the closer earns when a deal closes. Feeds their commission account.' : 'Lo que gana el closer cuando cierra un trato. Alimenta su cuenta de comisiones.'}
              </p>
            </div>
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent)' }}>
                {isEn ? 'Practice with your REAL product (optional)' : 'Practicá con tu producto REAL (opcional)'}
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                {isEn ? 'If you fill this, scenarios generate a lead who is a prospect for THIS product. Empty = random products.' : 'Si lo completás, los escenarios generan un lead que es prospecto de ESTE producto. Vacío = productos aleatorios.'}
              </p>
              <input value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder={isEn ? 'Product / service name' : 'Nombre del producto / servicio'}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', marginBottom: '0.5rem' }} />
              <textarea value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} rows={3} placeholder={isEn ? 'Short description (what it is, key benefits)' : 'Descripción corta (qué es, beneficios clave)'}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', marginBottom: '0.5rem', resize: 'vertical', fontFamily: 'inherit' }} />
              <input type="number" min="1500" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder={isEn ? 'Price in USD (min. 1500)' : 'Precio en USD (mín. 1500)'}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
            </div>
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

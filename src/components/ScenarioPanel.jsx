import React, { useState } from 'react';
import { UserCircle, HeartPulse, Target, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateAIScenario } from '../utils/ai';

export default function ScenarioPanel({ currentScenario, setCurrentScenario, apiKey, apiUrl, apiModel, stages, isReadOnly }) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('situacion');
  const [isGenerating, setIsGenerating] = useState(false);

  const [config, setConfig] = useState({
    level: "Intermedio",
    theme: "B2B Software",
    saleType: "Suscripción Anual / High Ticket",
    targetObjection: "Lo tengo que pensar",
    leadTemperature: "Templado"
  });

  const handleGenerate = async () => {
    if (!setCurrentScenario) return;
    setIsGenerating(true);
    try {
      const scenario = await generateAIScenario(
        apiKey, apiUrl, apiModel, 
        config, 
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
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', padding: '2rem' }}>
        <UserCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>{t('scenario.waiting')}</h2>
        
        {!isReadOnly && (
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Rubro / Industria</label>
              <select value={config.theme} onChange={e => setConfig({...config, theme: e.target.value})} className="header-title-input" style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}>
                <optgroup label="B2B (Venta a Empresas)">
                  <option value="B2B Software/SaaS">Software & SaaS</option>
                  <option value="B2B Consultoría">Consultoría de Negocios</option>
                  <option value="B2B Agencia Marketing">Agencias de Marketing</option>
                  <option value="B2B Equipamiento Industrial">Equipamiento Industrial / Médico</option>
                  <option value="B2B Logística">Logística y Transporte</option>
                  <option value="B2B Ciberseguridad">Ciberseguridad y Redes</option>
                  <option value="B2B Recursos Humanos">Recursos Humanos / Headhunting</option>
                </optgroup>
                <optgroup label="B2C (Venta a Particulares)">
                  <option value="B2C Inmobiliario">Inmobiliario / Real Estate</option>
                  <option value="B2C Fitness/Salud">Coaching Fitness y Salud</option>
                  <option value="B2C Seguros">Seguros Personales / Vida</option>
                  <option value="B2C Educación">Educación High Ticket / Cursos</option>
                  <option value="B2C Cripto/Trading">Criptomonedas y Trading</option>
                  <option value="B2C Estética/Dental">Cirugía Estética y Dental</option>
                  <option value="B2C Gestión Patrimonio">Gestión de Patrimonio / Inversiones</option>
                  <option value="B2C Energía Solar">Energía Solar Residencial</option>
                  <option value="B2C Turismo Lujo">Turismo de Lujo</option>
                </optgroup>
                <optgroup label="Mixtos / Otros">
                  <option value="E-commerce">E-commerce</option>
                  <option value="Automotriz">Automotriz (Agencias)</option>
                  <option value="Construcción">Construcción y Remodelaciones</option>
                  <option value="Legal">Servicios Legales / Abogacía</option>
                  <option value="Franquicias">Venta de Franquicias</option>
                  <option value="Eventos">Producción Audiovisual / Eventos</option>
                  <option value="Aleatorio (Sorpréndeme)">Aleatorio (Sorpréndeme)</option>
                </optgroup>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Dificultad</label>
              <select value={config.level} onChange={e => setConfig({...config, level: e.target.value})} className="header-title-input" style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}>
                <option value="Principiante">Principiante (Lead Amigable)</option>
                <option value="Intermedio">Intermedio (Lead Escéptico)</option>
                <option value="Avanzado">Avanzado (Lead Hostil/Desafiante)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Temperatura</label>
              <select value={config.leadTemperature} onChange={e => setConfig({...config, leadTemperature: e.target.value})} className="header-title-input" style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}>
                <option value="Frío">Frío (No te conoce)</option>
                <option value="Templado">Templado (Vio un anuncio/webinar)</option>
                <option value="Caliente">Caliente (Viene referido y con urgencia)</option>
              </select>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1rem', padding: '0.8rem', fontSize: '1rem' }}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Generando mente del Lead..." : t('header.generateAI')}
            </button>
          </div>
        )}
      </div>
    );
  }

    const renderTabContent = () => {
    switch(activeTab) {
      case 'demografia':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Nombre</div>
              <div style={{ fontSize: '1.1rem' }}>{currentScenario.demographics.name}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Edad</div>
              <div style={{ fontSize: '1.1rem' }}>{currentScenario.demographics.age}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Cargo / Industria</div>
              <div style={{ fontSize: '1.1rem' }}>{currentScenario.demographics.role} - {currentScenario.demographics.industry}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tamaño Empresa</div>
              <div style={{ fontSize: '1.1rem' }}>{currentScenario.demographics.companySize}</div>
            </div>
          </div>
        );
      case 'psicologia':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Nivel de Urgencia / Estilo de Comunicación</div>
              <div style={{ fontSize: '1.1rem' }}>{currentScenario.psychology.urgency} / {currentScenario.psychology.communicationStyle}</div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Miedo Principal</div>
              <div style={{ fontSize: '1.1rem' }}>{currentScenario.psychology.primaryFear}</div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Deseo Principal</div>
              <div style={{ fontSize: '1.1rem' }}>{currentScenario.psychology.primaryDesire}</div>
            </div>
          </div>
        );
      case 'situacion':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--success)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Problema Actual</div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{currentScenario.currentSituation.problem}</p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--success)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Intentos Previos</div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{currentScenario.currentSituation.previousAttempts}</p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--success)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Impacto Financiero/Emocional</div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{currentScenario.currentSituation.impact}</p>
            </div>
          </div>
        );
      case 'objeciones':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'rgba(236, 72, 153, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', borderLeft: '4px solid var(--secondary)' }}>
              <h4 style={{ color: 'var(--secondary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{t('scenario.visibleObjection')}</h4>
              <p style={{ margin: 0, fontSize: '1rem', fontStyle: 'italic' }}>"{currentScenario.visibleObjection}"</p>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem' }}>
              ℹ️ {t('scenario.hiddenObjectionNote')}
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

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border-highlight)' }}>
        <button 
          className={`btn ${activeTab === 'situacion' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('situacion')}
          style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '2rem', border: activeTab === 'situacion' ? 'none' : '1px solid transparent' }}
        >
          <Target size={16} /> {t('scenario.tabs.situation')}
        </button>
        <button 
          className={`btn ${activeTab === 'demografia' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('demografia')}
          style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '2rem', border: activeTab === 'demografia' ? 'none' : '1px solid transparent' }}
        >
          <UserCircle size={16} /> {t('scenario.tabs.demographics')}
        </button>
        <button 
          className={`btn ${activeTab === 'psicologia' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('psicologia')}
          style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '2rem', border: activeTab === 'psicologia' ? 'none' : '1px solid transparent' }}
        >
          <HeartPulse size={16} /> {t('scenario.tabs.psychology')}
        </button>
        <button 
          className={`btn ${activeTab === 'objeciones' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('objeciones')}
          style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '2rem', border: activeTab === 'objeciones' ? 'none' : '1px solid transparent' }}
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

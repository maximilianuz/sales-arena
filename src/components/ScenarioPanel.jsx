import React, { useState } from 'react';
import { UserCircle, HeartPulse, Target, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateAIScenario } from '../utils/ai';

export default function ScenarioPanel({ currentScenario, setCurrentScenario, apiKey, apiUrl, apiModel, stages, isReadOnly, isLeadRole }) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('situacion');
  const [isGenerating, setIsGenerating] = useState(false);

  const [config, setConfig] = useState({
    level: "Intermedio",
    theme: "B2B Software/SaaS",
    saleType: "Suscripción Anual / High Ticket",
    targetObjection: "Lo tengo que pensar",
    leadTemperature: "Templado"
  });

  const handleGenerate = async (customConfig = null) => {
    if (!setCurrentScenario) return;
    setIsGenerating(true);
    try {
      const scenario = await generateAIScenario(
        apiKey, apiUrl, apiModel, 
        customConfig || config, 
        stages, 
        i18n.language
      );
      await setCurrentScenario(scenario);
    } catch (error) {
      alert("Error: " + error.message);
    }
    setIsGenerating(false);
  };

  const handleRandomizeAndGenerate = () => {
    const themes = [
      "B2B Software/SaaS", "B2B Consultoría", "B2B Agencia Marketing", "B2B Logística",
      "B2C Inmobiliario", "B2C Fitness/Salud", "B2C Seguros", "B2C Educación", "B2C Cripto/Trading",
      "E-commerce", "Automotriz", "Servicios Legales / Abogacía"
    ];
    const levels = ["Principiante", "Intermedio", "Avanzado", "Avanzado"]; // More weight to advanced
    const temps = ["Frío", "Frío", "Templado", "Caliente"]; // More weight to cold
    
    const randomConfig = {
      ...config,
      theme: themes[Math.floor(Math.random() * themes.length)],
      level: levels[Math.floor(Math.random() * levels.length)],
      leadTemperature: temps[Math.floor(Math.random() * temps.length)],
    };
    
    setConfig(randomConfig);
    handleGenerate(randomConfig);
  };

  if (!currentScenario) {
    return (
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', padding: '2rem' }}>
        <UserCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
        <h3 style={{ color: 'white', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: '500' }}>{t('scenario.waiting')}</h3>
        
        {!isReadOnly && (
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Rubro / Industria</label>
              <select value={config.theme} onChange={e => setConfig({...config, theme: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', fontSize: '0.95rem', fontFamily: 'inherit' }}>
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
              <select value={config.level} onChange={e => setConfig({...config, level: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', fontSize: '0.95rem', fontFamily: 'inherit' }}>
                <option value="Principiante">Principiante (Lead Amigable)</option>
                <option value="Intermedio">Intermedio (Lead Escéptico)</option>
                <option value="Avanzado">Avanzado (Lead Hostil/Desafiante)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Temperatura</label>
              <select value={config.leadTemperature} onChange={e => setConfig({...config, leadTemperature: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', fontSize: '0.95rem', fontFamily: 'inherit' }}>
                <option value="Frío">Frío (No te conoce)</option>
                <option value="Templado">Templado (Vio un anuncio/webinar)</option>
                <option value="Caliente">Caliente (Viene referido y con urgencia)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 2, padding: '0.8rem', fontSize: '1rem' }}
                onClick={() => handleGenerate(null)}
                disabled={isGenerating}
              >
                {isGenerating ? "Generando..." : "Generar Personalizado"}
              </button>
              
              <button 
                className="btn btn-outline" 
                style={{ flex: 1, padding: '0.8rem', fontSize: '0.9rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                onClick={handleRandomizeAndGenerate}
                disabled={isGenerating}
                title="Elegir valores al azar y generar"
              >
                🎲 100% Sorpresa
              </button>
            </div>
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
      case 'guion':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Creencia sobre el Dinero</div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{currentScenario.roleplayGuide?.moneyBelief}</p>
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Conflicto Interno (Metas enfrentadas)</div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{currentScenario.roleplayGuide?.competingGoal}</p>
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Fatiga de Mercado / Escepticismo</div>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>{currentScenario.roleplayGuide?.vendorFatigue}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))', padding: '1.2rem', borderRadius: '0.75rem', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div style={{ color: '#8b5cf6', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🎭 Instrucciones de Actuación
              </div>
              <p style={{ margin: 0, fontSize: '1.05rem', fontStyle: 'italic', lineHeight: '1.5' }}>"{currentScenario.roleplayGuide?.actorAdvice}"</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderExpandedLeadScript = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s', paddingBottom: '2rem' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(139, 92, 246, 0.4)', boxShadow: '0 0 30px rgba(139, 92, 246, 0.1)' }}>
          <div style={{ color: '#a78bfa', fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.05em' }}>
            🎭 Actuación Principal
          </div>
          <p style={{ margin: 0, fontSize: '1.25rem', fontStyle: 'italic', lineHeight: '1.6', color: 'white' }}>"{currentScenario.roleplayGuide?.actorAdvice}"</p>
        </div>

        <section>
          <h3 style={{ color: 'var(--success)', borderBottom: '1px solid var(--glass-border-highlight)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={20} /> Situación y Problema</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.2rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--success)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Problema Actual</div>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>{currentScenario.currentSituation.problem}</p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.2rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--success)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Impacto Financiero/Emocional</div>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>{currentScenario.currentSituation.impact}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 style={{ color: 'var(--accent)', borderBottom: '1px solid var(--glass-border-highlight)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HeartPulse size={20} /> Psicología Oculta</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1.2rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Miedo y Deseo Principal</div>
              <p style={{ margin: 0, fontSize: '1.1rem' }}><strong>Miedo:</strong> {currentScenario.psychology.primaryFear}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem' }}><strong>Deseo:</strong> {currentScenario.psychology.primaryDesire}</p>
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '1.2rem', borderRadius: '0.75rem', borderLeft: '3px solid #8b5cf6' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Fatiga de Mercado</div>
              <p style={{ margin: 0, fontSize: '1.1rem' }}>{currentScenario.roleplayGuide?.vendorFatigue}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 style={{ color: 'var(--secondary)', borderBottom: '1px solid var(--glass-border-highlight)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldAlert size={20} /> Tus Objeciones</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(236, 72, 153, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', borderLeft: '4px solid var(--secondary)' }}>
              <h4 style={{ color: 'var(--secondary)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Lo que le dirás al Closer (Objeción de Cortina):</h4>
              <p style={{ margin: 0, fontSize: '1.15rem', fontStyle: 'italic', fontWeight: 'bold' }}>"{currentScenario.visibleObjection}"</p>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCircle size={20} />
          {isLeadRole ? "Tu Personaje" : t('scenario.title')}
        </div>
        {!isReadOnly && (
          <button 
            className="btn btn-outline" 
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            onClick={() => handleGenerate(null)}
            disabled={isGenerating}
          >
            {isGenerating ? "..." : "Regenerar IA"}
          </button>
        )}
      </div>

      {!isLeadRole ? (
        <>
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
            <button 
              className={`btn ${activeTab === 'guion' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('guion')}
              style={{ flex: 1, minWidth: 'max-content', padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '2rem', border: activeTab === 'guion' ? 'none' : '1px solid transparent' }}
            >
              🎭 Guion (Actor)
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', lineHeight: '1.6' }}>
            {renderTabContent()}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', lineHeight: '1.6' }}>
          {renderExpandedLeadScript()}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Target, Wand2, User, Activity, AlertTriangle, MessageCircle } from 'lucide-react';
import { generateAIScenario } from '../utils/ai';
import { OBJECTION_OPTIONS } from '../utils/objectionsKnowledgeBase';

export default function BuyerPersonaPanel({ currentScenario, setCurrentScenario, apiKey, apiUrl, apiModel, stages, isReadOnly }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiForm, setAiForm] = useState({ 
    level: 'Intermedio', 
    theme: '', 
    saleType: 'Llamada de Descubrimiento (Discovery)',
    targetObjection: 'Aleatoria (Sorpréndeme)',
    leadTemperature: 'Templado'
  });
  const [activeTab, setActiveTab] = useState('perfil');

  const executeAiGenerate = async (formData) => {
    if (!apiKey) {
      alert("Por favor, configura tu API Key en Ajustes primero.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const scenario = await generateAIScenario(apiKey, apiUrl, apiModel, formData, stages);
      setCurrentScenario(scenario);
      setShowAiModal(false);
    } catch (error) {
      alert("Error generando escenario: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiGenerate = () => {
    executeAiGenerate(aiForm);
  };

  const handleRandomGenerate = () => {
    const randomIndustries = [
      "SaaS B2B (Software as a Service)", "Consultoría Estratégica / Negocios B2B", "Ciberseguridad y TI Corporativa", 
      "Logística y Supply Chain", "Maquinaria Industrial y Manufactura", "High Ticket Coaching de Negocios / Ventas",
      "Coaching de Vida / Mindset / Desarrollo Personal", "Coaching de Relaciones / Terapia de Pareja",
      "Coaching de Salud / Biohacking / Fitness Premium", "Asesoría Financiera Personal / Wealth Management",
      "Real Estate Residencial / Inversiones", "Cirugía Plástica / Medicina Estética High Ticket"
    ];
    const randomIndustry = randomIndustries[Math.floor(Math.random() * randomIndustries.length)];
    
    const randomForm = {
      level: 'Intermedio',
      theme: randomIndustry,
      saleType: 'Llamada de Cierre (High Ticket Closer)',
      targetObjection: 'Aleatoria (Sorpréndeme)',
      leadTemperature: 'Aleatoria'
    };
    
    setAiForm(randomForm);
    executeAiGenerate(randomForm);
  };

  const renderTabContent = () => {
    if (!currentScenario || !currentScenario.demographics) {
      // Fallback for old predefined scenarios or empty state
      return (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
          {currentScenario ? "Escenario clásico cargado. Genera uno nuevo con IA para ver el Buyer Persona completo." : "Genera un Buyer Persona para comenzar."}
        </div>
      );
    }

    switch (activeTab) {
      case 'perfil':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
            <div><strong style={{ color: 'var(--primary)' }}>Demografía:</strong> {currentScenario.demographics}</div>
            <div><strong style={{ color: 'var(--accent)' }}>Estado Emocional:</strong> {currentScenario.emotions}</div>
            <div><strong style={{ color: 'var(--success)' }}>Probabilidad de Compra (Inicial):</strong> {currentScenario.buyingProbability}</div>
          </div>
        );
      case 'contexto':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
            <div><strong style={{ color: 'var(--text-main)' }}>Situación Actual:</strong> <p>{currentScenario.currentSituation}</p></div>
            <div><strong style={{ color: 'var(--text-main)' }}>Situación Soñada:</strong> <p>{currentScenario.dreamSituation}</p></div>
            <div><strong style={{ color: 'var(--danger)' }}>Barrera Principal:</strong> <p>{currentScenario.mainBarrier}</p></div>
          </div>
        );
      case 'motivaciones':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
            <div><strong style={{ color: 'var(--success)' }}>Deseos (Cielo):</strong> <p>{currentScenario.desires}</p></div>
            <div><strong style={{ color: 'var(--danger)' }}>Frustraciones (Infierno):</strong> <p>{currentScenario.frustrations}</p></div>
          </div>
        );
      case 'objeciones':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'modalIn 0.2s' }}>
            <div><strong style={{ color: 'var(--secondary)' }}>Objeción Visible (Lo que dirá):</strong> <p>{currentScenario.visibleObjection}</p></div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              * La objeción oculta está protegida en el panel central (Información del cliente).
            </div>
          </div>
        );
      default: return null;
    }
  };

  const handleCopyLead = () => {
    if (!currentScenario) return;
    const text = `
=== PERFIL DEL LEAD ===
Demografía: ${currentScenario.demographics}
Estado Emocional: ${currentScenario.emotions}
Probabilidad de Compra Inicial: ${currentScenario.buyingProbability}

=== CONTEXTO ===
Situación Actual: ${currentScenario.currentSituation}
Situación Soñada: ${currentScenario.dreamSituation}
Barrera Principal: ${currentScenario.mainBarrier}

=== MOTIVACIONES ===
Deseos (Cielo): ${currentScenario.desires}
Frustraciones (Infierno): ${currentScenario.frustrations}

=== OBJECIONES ===
Objeción Visible (Lo que debes decir primero): ${currentScenario.visibleObjection}

⚠️ INSTRUCCIÓN PARA EL LEAD:
No reveles tu "verdadera objeción" o tu dolor más profundo a menos que el Closer haga buenas preguntas. Guíate por tu contexto y emociones.
    `.trim();
    navigator.clipboard.writeText(text);
    alert('¡Información del Lead copiada al portapapeles!');
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} />
          Perfil del Lead
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {currentScenario && !isReadOnly && (
            <>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => setCurrentScenario(null)} title="Limpiar Escenario">
                Limpiar
              </button>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={handleCopyLead} title="Copiar Info para enviarla al que actúa de Lead">
                Copiar Info
              </button>
            </>
          )}
          {!isReadOnly && (
            <>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={handleRandomGenerate} disabled={isGenerating}>
                🎲 Aleatorio
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setShowAiModal(true)} disabled={isGenerating}>
                <Wand2 size={14} /> Nuevo
              </button>
            </>
          )}
        </div>
      </div>

      {currentScenario && currentScenario.demographics && (
        <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
          {[
            { id: 'perfil', icon: <User size={14}/>, label: 'Perfil' },
            { id: 'contexto', icon: <Target size={14}/>, label: 'Contexto' },
            { id: 'motivaciones', icon: <Activity size={14}/>, label: 'Motivaciones' },
            { id: 'objeciones', icon: <MessageCircle size={14}/>, label: 'Objeciones' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.85rem'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {renderTabContent()}
      </div>

      {showAiModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Wand2 size={24} color="var(--secondary)" /> Generar Buyer Persona IA
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nivel de Dificultad</label>
                <select value={aiForm.level} onChange={e => setAiForm({...aiForm, level: e.target.value})}>
                  <option>Principiante</option>
                  <option>Intermedio</option>
                  <option>Avanzado</option>
                  <option>Experto</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tema / Industria</label>
                <input type="text" value={aiForm.theme} onChange={e => setAiForm({...aiForm, theme: e.target.value})} placeholder="Ej. SaaS, Seguros, Real Estate" list="industries" />
                <datalist id="industries">
                  {/* B2B Niches */}
                  <option value="SaaS B2B (Software as a Service)" />
                  <option value="Consultoría Estratégica / Negocios B2B" />
                  <option value="Agencia de Marketing Digital / SEO B2B" />
                  <option value="Desarrollo de Software a Medida" />
                  <option value="Ciberseguridad y TI Corporativa" />
                  <option value="Servicios de Headhunting / Reclutamiento" />
                  <option value="Servicios Legales y Fiscales Corporativos" />
                  <option value="Logística y Supply Chain" />
                  <option value="Maquinaria Industrial y Manufactura" />
                  <option value="Real Estate Comercial / Oficinas" />
                  <option value="Automatización e IA para Empresas" />
                  <option value="Venta de Franquicias" />

                  {/* B2C High Ticket / Coaching */}
                  <option value="High Ticket Coaching de Negocios / Ventas" />
                  <option value="Coaching de Vida / Mindset / Desarrollo Personal" />
                  <option value="Coaching de Relaciones / Terapia de Pareja" />
                  <option value="Coaching de Salud / Biohacking / Fitness Premium" />
                  <option value="Asesoría Financiera Personal / Wealth Management" />
                  <option value="Mentoría en Inversiones (Crypto, Bolsa, Real Estate)" />
                  <option value="EdTech / Bootcamps / Cursos Premium" />
                  <option value="Real Estate Residencial / Inversiones" />
                  <option value="Cirugía Plástica / Medicina Estética High Ticket" />
                  <option value="Servicios de Inmigración / Visas" />
                  <option value="Programas de Empleabilidad / Transición de Carrera" />
                </datalist>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Temperatura del Lead</label>
                <select value={aiForm.leadTemperature} onChange={e => setAiForm({...aiForm, leadTemperature: e.target.value})}>
                  <option value="Aleatoria">Aleatoria (Sorpréndeme)</option>
                  <option value="Frío">Frío (No te conoce, escéptico, Outbound)</option>
                  <option value="Templado">Templado (Vio un anuncio/webinar, tiene algo de interés)</option>
                  <option value="Caliente">Caliente (Viene recomendado o con urgencia alta)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tipo de Venta</label>
                <input type="text" value={aiForm.saleType} onChange={e => setAiForm({...aiForm, saleType: e.target.value})} placeholder="Ej. B2B Inbound, Cold Call, Renovación" list="saleTypes" />
                <datalist id="saleTypes">
                  <option value="Llamada de Cierre (High Ticket Closer)" />
                  <option value="B2B Inbound" />
                  <option value="B2B Outbound (Cold Call)" />
                  <option value="Llamada de Descubrimiento (Discovery)" />
                  <option value="Presentación de Propuesta / Demo" />
                  <option value="Renovación / Upselling" />
                </datalist>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Objeción Principal Esperada (Ahorro de Tokens)</label>
                <select value={aiForm.targetObjection} onChange={e => setAiForm({...aiForm, targetObjection: e.target.value})}>
                  {OBJECTION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={() => setShowAiModal(false)} disabled={isGenerating}>Cancelar</button>
              <button className="btn btn-secondary" onClick={handleAiGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generando Simulador...' : 'Generar ✨'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

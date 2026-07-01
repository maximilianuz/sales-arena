import React, { useState } from 'react';
import { UserCircle, HeartPulse, Target, ShieldAlert, RefreshCw, Shuffle, BookMarked } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateAIScenario } from '../utils/ai';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import ScenarioLibrary from './ScenarioLibrary';

const GENERATION_STEPS = [
  { es: 'Construyendo identidad del Lead...', en: 'Building Lead identity...' },
  { es: 'Generando objeciones y psicología...', en: 'Generating objections & psychology...' },
  { es: 'Armando guía de pipeline...', en: 'Building pipeline guide...' }
];

// ─── Config form ─────────────────────────────────────────────────────────────
function ScenarioConfig({ config, setConfig, onGenerate, onRandom, isGenerating, generatingStep, genError }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const LEVELS = isEn
    ? [{ v: 'Principiante', l: '🟢 Beginner', d: 'Friendly' }, { v: 'Intermedio', l: '🟡 Intermediate', d: 'Skeptical' }, { v: 'Avanzado', l: '🔴 Advanced', d: 'Hostile' }]
    : [{ v: 'Principiante', l: '🟢 Principiante', d: 'Amigable' }, { v: 'Intermedio', l: '🟡 Intermedio', d: 'Escéptico' }, { v: 'Avanzado', l: '🔴 Avanzado', d: 'Hostil' }];

  const TEMPS = isEn
    ? [{ v: 'Frío', l: '🧊 Cold', d: "Doesn't know you" }, { v: 'Templado', l: '☀️ Warm', d: 'Saw your ad' }, { v: 'Caliente', l: '🔥 Hot', d: 'Referral' }]
    : [{ v: 'Frío', l: '🧊 Frío', d: 'No te conoce' }, { v: 'Templado', l: '☀️ Templado', d: 'Vio tu anuncio' }, { v: 'Caliente', l: '🔥 Caliente', d: 'Referido' }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Industry */}
      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
          {isEn ? 'Industry' : 'Rubro / Industria'}
        </label>
        <select value={config.theme} onChange={e => setConfig({ ...config, theme: e.target.value })}
          style={{ width: '100%', padding: '0.7rem 0.875rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', fontFamily: 'inherit', cursor: 'pointer' }}>
          <optgroup label="B2B">
            <option value="B2B Software/SaaS">Software & SaaS</option>
            <option value="B2B Consultoría">{isEn ? 'Business Consulting' : 'Consultoría'}</option>
            <option value="B2B Agencia Marketing">{isEn ? 'Marketing Agency' : 'Agencia Marketing'}</option>
            <option value="B2B Equipamiento Industrial">{isEn ? 'Industrial Equipment' : 'Equipamiento Industrial'}</option>
            <option value="B2B Logística">{isEn ? 'Logistics' : 'Logística'}</option>
            <option value="B2B Ciberseguridad">Cybersecurity</option>
            <option value="B2B Recursos Humanos">HR / Headhunting</option>
          </optgroup>
          <optgroup label="B2C">
            <option value="B2C Inmobiliario">{isEn ? 'Real Estate' : 'Inmobiliario'}</option>
            <option value="B2C Fitness/Salud">{isEn ? 'Fitness & Health' : 'Fitness y Salud'}</option>
            <option value="B2C Seguros">{isEn ? 'Insurance' : 'Seguros'}</option>
            <option value="B2C Educación">{isEn ? 'High Ticket Education' : 'Educación High Ticket'}</option>
            <option value="B2C Cripto/Trading">Crypto & Trading</option>
            <option value="B2C Estética/Dental">{isEn ? 'Aesthetic & Dental' : 'Estética y Dental'}</option>
            <option value="B2C Gestión Patrimonio">{isEn ? 'Wealth Management' : 'Gestión Patrimonio'}</option>
            <option value="B2C Energía Solar">{isEn ? 'Solar Energy' : 'Energía Solar'}</option>
            <option value="B2C Turismo Lujo">{isEn ? 'Luxury Travel' : 'Turismo de Lujo'}</option>
          </optgroup>
          <optgroup label={isEn ? 'Other' : 'Otros'}>
            <option value="Automotriz">{isEn ? 'Automotive' : 'Automotriz'}</option>
            <option value="Construcción">{isEn ? 'Construction' : 'Construcción'}</option>
            <option value="Legal">{isEn ? 'Legal Services' : 'Servicios Legales'}</option>
            <option value="Franquicias">Franchises</option>
            <option value="Aleatorio (Sorpréndeme)">{isEn ? '🎲 Surprise me' : '🎲 Sorpréndeme'}</option>
          </optgroup>
        </select>
      </div>

      {/* Level pills */}
      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
          {isEn ? 'Difficulty' : 'Dificultad'}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {LEVELS.map(l => (
            <div key={l.v} onClick={() => setConfig({ ...config, level: l.v })}
              style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'center', border: `1px solid ${config.level === l.v ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.07)'}`, background: config.level === l.v ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{l.l}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.1rem' }}>{l.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Temperature pills */}
      <div>
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>
          {isEn ? 'Lead Temperature' : 'Temperatura'}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {TEMPS.map(t => (
            <div key={t.v} onClick={() => setConfig({ ...config, leadTemperature: t.v })}
              style={{ flex: 1, padding: '0.6rem 0.4rem', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'center', border: `1px solid ${config.leadTemperature === t.v ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.07)'}`, background: config.leadTemperature === t.v ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{t.l}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.1rem' }}>{t.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {genError && !isGenerating && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '0.75rem 0.875rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <span style={{ color: 'var(--danger)', flexShrink: 0 }}>⚠️</span>
          <span>{genError}</span>
        </div>
      )}

      {/* CTA / progress */}
      {isGenerating ? (
        <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.875rem', padding: '1.25rem 1rem' }}>
          {GENERATION_STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < 2 ? '0.875rem' : 0 }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, background: i < generatingStep ? 'var(--success)' : i === generatingStep ? 'var(--primary)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: i === generatingStep ? 'pulse 1.2s infinite' : 'none' }}>
                {i < generatingStep && <span style={{ fontSize: '9px', color: 'white' }}>✓</span>}
              </div>
              <span style={{ fontSize: '0.85rem', color: i <= generatingStep ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: i === generatingStep ? '600' : '400' }}>
                {isEn ? step.en : step.es}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => onGenerate(null)} style={{ flex: 2, padding: '0.8rem', borderRadius: '0.875rem', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', boxShadow: '0 6px 20px rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Target size={15} /> {isEn ? 'Generate' : 'Generar'}
          </button>
          <button onClick={onRandom} title={isEn ? 'Random' : 'Aleatorio'} style={{ flex: 1, padding: '0.8rem', borderRadius: '0.875rem', cursor: 'pointer', background: 'rgba(245,158,11,0.1)', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.3)', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <Shuffle size={14} /> 🎲
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Lead Actor View ──────────────────────────────────────────────────────────
function LeadActorView({ scenario }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [showSecondary, setShowSecondary] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Identity */}
      <div style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(236,72,153,0.08))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '1rem', padding: '1.125rem' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '0.4rem' }}>🎭 {isEn ? 'You are playing' : 'Vos sos'}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'white', marginBottom: '0.15rem' }}>{scenario.demographics?.name}</div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{scenario.demographics?.role} · {scenario.demographics?.industry}{scenario.demographics?.age && ` · ${scenario.demographics.age} años`}</div>
      </div>

      {/* Acting instruction */}
      {scenario.roleplayGuide?.actorAdvice && (
        <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.22)', borderLeft: '3px solid #8b5cf6', borderRadius: '0.75rem', padding: '0.875rem 1rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '0.35rem' }}>{isEn ? 'Acting note' : 'Actuación'}</div>
          <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.78)', lineHeight: '1.5' }}>"{scenario.roleplayGuide.actorAdvice}"</p>
        </div>
      )}

      {/* Main objection */}
      <div style={{ background: 'rgba(236,72,153,0.08)', border: '2px solid rgba(236,72,153,0.4)', borderRadius: '1rem', padding: '1.125rem' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <ShieldAlert size={12} /> {isEn ? 'Your main objection' : 'Tu objeción principal'}
        </div>
        <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', fontStyle: 'italic', color: 'white', lineHeight: '1.4' }}>"{scenario.visibleObjection}"</p>
      </div>

      {/* Pain + fear */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '0.75rem', padding: '0.8rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: '0.35rem' }}>{isEn ? 'Your pain' : 'Tu dolor'}</div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: '1.4' }}>{scenario.currentSituation?.problem}</p>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '0.75rem', padding: '0.8rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.35rem' }}>{isEn ? 'Core fear' : 'Tu miedo'}</div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: '1.4' }}>{scenario.psychology?.primaryFear}</p>
        </div>
      </div>

      {/* Secondary objections */}
      {scenario.secondaryObjections?.length > 0 && (
        <div style={{ background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.13)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <button onClick={() => setShowSecondary(!showSecondary)} style={{ width: '100%', padding: '0.7rem 0.875rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <ShieldAlert size={12} />
            {isEn ? `Backup arsenal (${scenario.secondaryObjections.length})` : `Arsenal backup (${scenario.secondaryObjections.length} más)`}
            <span style={{ marginLeft: 'auto' }}>{showSecondary ? '▲' : '▼'}</span>
          </button>
          {showSecondary && (
            <div style={{ padding: '0 0.875rem 0.875rem' }}>
              {scenario.secondaryObjections.map((obj, i) => (
                <div key={i} style={{ padding: '0.45rem 0', borderTop: '1px solid rgba(236,72,153,0.08)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                  {i + 1}. "{obj}"
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Compact Observer ─────────────────────────────────────────────────────────
function CompactObserverView({ scenario }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.88rem', fontWeight: '700' }}>{scenario.demographics?.name}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>— {scenario.demographics?.role}, {scenario.demographics?.industry}</span>
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4', padding: '0.65rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
        {scenario.currentSituation?.problem}
      </div>
      <div style={{ background: 'rgba(236,72,153,0.07)', padding: '0.65rem 0.75rem', borderRadius: '0.5rem', borderLeft: '2px solid var(--secondary)' }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontWeight: '700', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Objeción</div>
        <div style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>"{scenario.visibleObjection}"</div>
      </div>
    </div>
  );
}

// ─── Trainer full view (tabs) ─────────────────────────────────────────────────
function TrainerView({ scenario, isReadOnly, onRegenerate, isGenerating }) {
  const [activeTab, setActiveTab] = useState('situacion');
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const TABS = [
    { id: 'situacion', icon: <Target size={12} />, label: isEn ? 'Situation' : 'Situación' },
    { id: 'demografia', icon: <UserCircle size={12} />, label: isEn ? 'Profile' : 'Perfil' },
    { id: 'psicologia', icon: <HeartPulse size={12} />, label: isEn ? 'Mind' : 'Mente' },
    { id: 'objeciones', icon: <ShieldAlert size={12} />, label: isEn ? 'Objections' : 'Objeciones' },
    { id: 'guion', icon: <span>🎭</span>, label: isEn ? 'Actor' : 'Guión' }
  ];

  const F = ({ label, value, accent = '255,255,255' }) => (
    <div style={{ marginBottom: '0.6rem', background: `rgba(${accent},0.03)`, borderLeft: `2px solid rgba(${accent},0.18)`, padding: '0.65rem 0.8rem', borderRadius: '0.5rem' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.09em', textTransform: 'uppercase', color: `rgba(${accent},0.45)`, marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.78)', lineHeight: '1.5' }}>{value}</div>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'demografia': return (<div>
        <F label={isEn ? 'Name' : 'Nombre'} value={scenario.demographics?.name} />
        <F label={isEn ? 'Age' : 'Edad'} value={scenario.demographics?.age} />
        <F label={isEn ? 'Role / Industry' : 'Cargo / Industria'} value={`${scenario.demographics?.role} · ${scenario.demographics?.industry}`} />
        <F label={isEn ? 'Company size' : 'Empresa'} value={scenario.demographics?.companySize} />
      </div>);
      case 'psicologia': return (<div>
        <F label={isEn ? 'Urgency / Style' : 'Urgencia / Estilo'} value={`${scenario.psychology?.urgency} / ${scenario.psychology?.communicationStyle}`} accent="245,158,11" />
        <F label={isEn ? 'Core fear' : 'Miedo'} value={scenario.psychology?.primaryFear} accent="239,68,68" />
        <F label={isEn ? 'Core desire' : 'Deseo'} value={scenario.psychology?.primaryDesire} accent="16,185,129" />
      </div>);
      case 'situacion': return (<div>
        <F label={isEn ? 'Problem' : 'Problema'} value={scenario.currentSituation?.problem} accent="16,185,129" />
        <F label={isEn ? 'Previous attempts' : 'Intentos previos'} value={scenario.currentSituation?.previousAttempts} accent="16,185,129" />
        <F label={isEn ? 'Impact' : 'Impacto'} value={scenario.currentSituation?.impact} accent="16,185,129" />
      </div>);
      case 'objeciones': return (<div>
        <div style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.28)', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '0.6rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>{isEn ? 'Main objection' : 'Objeción principal'}</div>
          <p style={{ margin: 0, fontStyle: 'italic', fontWeight: '600', fontSize: '0.95rem' }}>"{scenario.visibleObjection}"</p>
        </div>
        {scenario.secondaryObjections?.map((obj, i) => (
          <div key={i} style={{ background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.1)', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', marginBottom: '0.35rem', fontStyle: 'italic', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>"{obj}"</div>
        ))}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.4rem' }}>
          ℹ️ {isEn ? 'Hidden objection in Private Info' : 'Objeción oculta en Info Privada'}
        </div>
      </div>);
      case 'guion': return (<div>
        <F label={isEn ? 'Money belief' : 'Creencia dinero'} value={scenario.roleplayGuide?.moneyBelief} accent="139,92,246" />
        <F label={isEn ? 'Competing goal' : 'Conflicto interno'} value={scenario.roleplayGuide?.competingGoal} accent="139,92,246" />
        <F label={isEn ? 'Market fatigue' : 'Fatiga de mercado'} value={scenario.roleplayGuide?.vendorFatigue} accent="139,92,246" />
        <div style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.1),rgba(236,72,153,0.08))', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '0.75rem', padding: '0.875rem', marginTop: '0.25rem' }}>
          <div style={{ color: '#a78bfa', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>🎭 {isEn ? 'Acting tip' : 'Tip de actuación'}</div>
          <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.8)' }}>"{scenario.roleplayGuide?.actorAdvice}"</p>
        </div>
      </div>);
      default: return null;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.625rem', padding: '0.2rem' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: '0.38rem 0.2rem', borderRadius: '0.45rem', border: 'none', cursor: 'pointer', background: activeTab === tab.id ? 'rgba(99,102,241,0.28)' : 'transparent', color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.35)', fontSize: '0.72rem', fontWeight: activeTab === tab.id ? '700' : '400', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', transition: 'all 0.15s' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }}>{renderTab()}</div>
      {!isReadOnly && (
        <button onClick={() => onRegenerate(null)} disabled={isGenerating} style={{ marginTop: '0.875rem', width: '100%', padding: '0.55rem', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
          <RefreshCw size={12} /> {isEn ? 'Regenerate' : 'Regenerar escenario'}
        </button>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ScenarioPanel({ currentScenario, setCurrentScenario, apiKey, apiUrl, apiModel, stages, isReadOnly, isLeadRole, isCompactObserver }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const { isPaid } = useSubscriptionContext() || {};
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [genError, setGenError] = useState('');
  const [library, setLibrary] = useState(null); // null | 'load' | 'save'
  const [config, setConfig] = useState({ level: 'Intermedio', theme: 'B2B Software/SaaS', saleType: 'Suscripción Anual / High Ticket', targetObjection: 'Lo tengo que pensar', leadTemperature: 'Templado' });

  const handleGenerate = async (customConfig = null) => {
    if (!setCurrentScenario) return;
    setIsGenerating(true);
    setGeneratingStep(0);
    setGenError('');
    const t1 = setTimeout(() => setGeneratingStep(1), 2200);
    const t2 = setTimeout(() => setGeneratingStep(2), 5000);
    try {
      const scenario = await generateAIScenario(apiKey, apiUrl, apiModel, customConfig || config, stages, i18n.language);
      await setCurrentScenario(scenario);
    } catch (error) {
      setGenError(error.message || 'Error al generar el escenario.');
    } finally {
      clearTimeout(t1); clearTimeout(t2);
      setIsGenerating(false); setGeneratingStep(0);
    }
  };

  const handleRandom = () => {
    const themes = ['B2B Software/SaaS', 'B2B Consultoría', 'B2C Inmobiliario', 'B2C Fitness/Salud', 'B2C Educación', 'Automotriz', 'Legal'];
    const levels = ['Principiante', 'Intermedio', 'Avanzado', 'Avanzado'];
    const temps = ['Frío', 'Frío', 'Templado', 'Caliente'];
    const rc = { ...config, theme: themes[Math.floor(Math.random() * themes.length)], level: levels[Math.floor(Math.random() * levels.length)], leadTemperature: temps[Math.floor(Math.random() * temps.length)] };
    setConfig(rc);
    handleGenerate(rc);
  };

  if (isCompactObserver) {
    if (!currentScenario) return null;
    return <div className="glass-panel" style={{ padding: '1rem' }}><CompactObserverView scenario={currentScenario} /></div>;
  }

  if (isLeadRole) {
    if (!currentScenario) return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{isEn ? 'Waiting for Trainer to set up the scenario...' : 'Esperando que el Trainer configure el escenario...'}</p>
      </div>
    );
    return (
      <div className="glass-panel" style={{ flex: 1 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(139,92,246,0.65)', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          🎭 {isEn ? 'Your character' : 'Tu personaje'}
        </div>
        <LeadActorView scenario={currentScenario} />
      </div>
    );
  }

  const handleLoadFromLibrary = async (scenario) => {
    if (setCurrentScenario) await setCurrentScenario(scenario);
    setLibrary(null);
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.125rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <UserCircle size={14} color="rgba(99,102,241,0.7)" />
          <span style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
            {currentScenario ? 'Buyer Persona' : (isEn ? 'Configure Scenario' : 'Configurar Escenario')}
          </span>
        </div>
        {/* Botones de biblioteca (solo plan pago, no read-only) */}
        {isPaid && !isReadOnly && (
          <button
            onClick={() => setLibrary(currentScenario ? 'save' : 'load')}
            title={currentScenario ? (isEn ? 'Save to library' : 'Guardar en biblioteca') : (isEn ? 'Load from library' : 'Cargar de biblioteca')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem', borderRadius: '0.5rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: 'rgba(165,180,252,0.9)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600' }}
          >
            <BookMarked size={12} /> {currentScenario ? (isEn ? 'Save' : 'Guardar') : (isEn ? 'Library' : 'Biblioteca')}
          </button>
        )}
      </div>
      {!currentScenario
        ? <ScenarioConfig config={config} setConfig={setConfig} onGenerate={handleGenerate} onRandom={handleRandom} isGenerating={isGenerating} generatingStep={generatingStep} genError={genError} />
        : <TrainerView scenario={currentScenario} isReadOnly={isReadOnly} onRegenerate={handleGenerate} isGenerating={isGenerating} />
      }

      {library && (
        <ScenarioLibrary
          mode={library}
          currentScenario={library === 'save' ? currentScenario : null}
          currentConfig={config}
          onLoad={handleLoadFromLibrary}
          onClose={() => setLibrary(null)}
        />
      )}
    </div>
  );
}

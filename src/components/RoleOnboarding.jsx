import React, { useState, useEffect, useRef } from 'react';
import { Target, TrendingUp, Theater, Eye, X, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Guía contextual por rol. Aparece la primera vez que un rol entra a una sala
// (se recuerda por rol en localStorage). Objetivo: que cada humano entienda al
// instante qué tiene que hacer para que la práctica fluya.
const GUIDES = {
  Facilitador: {
    icon: <Target size={26} />, color: '#5e5ce6',
    title: { es: 'Sos el Trainer', en: 'You are the Trainer' },
    subtitle: { es: 'Dirigís la sesión de entrenamiento', en: 'You direct the training session' },
    steps: {
      es: [
        'Generá un escenario con IA (o cargá uno de tu biblioteca).',
        'Asigná quién hace de Closer y quién de Lead.',
        'Controlá el timer y avanzá las etapas de la venta.',
        'Habilitá el Evento Sorpresa y la fase de Cierre cuando quieras.',
        'Al final, guiá el debrief y revisá el análisis.'
      ],
      en: [
        'Generate an AI scenario (or load one from your library).',
        'Assign who plays Closer and who plays Lead.',
        'Control the timer and advance the sales stages.',
        'Trigger the Surprise Event and Closing phase when you want.',
        'At the end, guide the debrief and review the analysis.'
      ]
    }
  },
  Closer: {
    icon: <TrendingUp size={26} />, color: '#30d158',
    title: { es: 'Sos el Closer', en: 'You are the Closer' },
    subtitle: { es: 'El vendedor: tu misión es cerrar la venta', en: 'The salesperson: your mission is to close' },
    steps: {
      es: [
        'Leé el objetivo de la etapa actual en tu panel.',
        'Usá las preguntas sugeridas como salvavidas, no como guion rígido.',
        'Escuchá al Lead: detrás de su objeción hay un miedo real.',
        'Manejá las objeciones sin quebrarte ni ponerte a la defensiva.',
        'Guiá hacia el cierre cuando el Trainer habilite esa fase.'
      ],
      en: [
        'Read the current stage objective in your panel.',
        'Use the suggested questions as lifelines, not a rigid script.',
        'Listen to the Lead: behind their objection is a real fear.',
        'Handle objections without breaking or getting defensive.',
        'Guide toward the close when the Trainer enables that phase.'
      ]
    }
  },
  Lead: {
    icon: <Theater size={26} />, color: '#ff9f0a',
    title: { es: 'Sos el Lead', en: 'You are the Lead' },
    subtitle: { es: 'El cliente: tu trabajo es actuar el personaje', en: 'The client: your job is to act the character' },
    steps: {
      es: [
        'Leé tu personaje: nombre, dolor, miedo y objeción principal.',
        'Metete en la piel: seguí la nota de actuación (tono, actitud).',
        'Tirá tu objeción principal cuando el Closer intente avanzar.',
        'Abrite o cerrate según lo que hace el Closer (lo dice tu panel).',
        'Al final decidís la fricción del checkout: fácil, dudando o difícil.'
      ],
      en: [
        'Read your character: name, pain, fear and main objection.',
        'Get into character: follow the acting note (tone, attitude).',
        'Drop your main objection when the Closer tries to advance.',
        'Open up or shut down based on what the Closer does (see your panel).',
        'At the end you set the checkout friction: easy, hesitant or hard.'
      ]
    }
  },
  Observador: {
    icon: <Eye size={26} />, color: '#8b5cf6',
    title: { es: 'Sos el Observador', en: 'You are the Observer' },
    subtitle: { es: 'El juez: observás y evaluás para que todos mejoren', en: 'The judge: you observe and evaluate so everyone improves' },
    steps: {
      es: [
        'Mirá la llamada sin intervenir.',
        'Marcá momentos clave en vivo: 🟢 brillante, 🟡 oportunidad, 🔴 error.',
        'Completá el análisis del Closer y del Lead en el debrief.',
        'Votá en el panel de evaluación de la sesión.',
        'Compartí tu lectura en el debrief final: eso es lo que hace crecer.'
      ],
      en: [
        'Watch the call without intervening.',
        'Mark key moments live: 🟢 brilliant, 🟡 opportunity, 🔴 error.',
        'Fill in the Closer and Lead analysis in the debrief.',
        'Vote in the session evaluation panel.',
        'Share your read in the final debrief: that\'s what drives growth.'
      ]
    }
  }
};

export default function RoleOnboarding({ role }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [show, setShow] = useState(false);
  const confirmRef = useRef(null);

  const storageKey = `sa_onboarded_${role}`;

  useEffect(() => {
    if (role && GUIDES[role] && !localStorage.getItem(storageKey)) {
      setShow(true);
    }
  }, [role]);

  // Cerrar con Escape y llevar el foco al botón de confirmar al abrir
  // (buena práctica de diálogo: teclado + lectores de pantalla).
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        localStorage.setItem(storageKey, '1');
        setShow(false);
      }
    };
    window.addEventListener('keydown', onKey);
    const focusTimer = setTimeout(() => confirmRef.current?.focus(), 50);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(focusTimer); };
  }, [show, storageKey]);

  if (!show || !GUIDES[role]) return null;
  const g = GUIDES[role];

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setShow(false);
  };

  return (
    <div className="modal-overlay" onClick={dismiss}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-label={g.title[isEn ? 'en' : 'es']} style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <button onClick={dismiss} aria-label={isEn ? 'Close' : 'Cerrar'} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '0.9rem', flexShrink: 0, background: `linear-gradient(135deg, ${g.color}, ${g.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: `0 8px 20px ${g.color}55` }}>
            {g.icon}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600' }}>{g.title[isEn ? 'en' : 'es']}</h2>
            <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{g.subtitle[isEn ? 'en' : 'es']}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.75rem' }}>
          {g.steps[isEn ? 'en' : 'es'].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, background: `${g.color}22`, border: `1px solid ${g.color}55`, color: g.color, fontSize: '0.72rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>{i + 1}</span>
              <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.92)', lineHeight: '1.45' }}>{step}</span>
            </div>
          ))}
        </div>

        <button ref={confirmRef} onClick={dismiss} style={{ width: '100%', padding: '0.8rem', borderRadius: '0.875rem', cursor: 'pointer', background: `linear-gradient(135deg, ${g.color}, ${g.color}bb)`, color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={17} /> {isEn ? "Got it, let's go" : 'Entendido, a jugar'}
        </button>
      </div>
    </div>
  );
}

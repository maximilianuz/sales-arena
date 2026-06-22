import React, { useState } from 'react';
import { Dices, X } from 'lucide-react';

const EVENTS = [
  "El cliente se cruza de brazos: 'Acabo de recordar que mi socio debe estar en esta decisión.'",
  "El cliente menciona de pasada que está evaluando a [Competidor Directo] también.",
  "El presupuesto inicial del cliente acaba de ser congelado por la junta directiva.",
  "El cliente te interrumpe: 'Solo me quedan 2 minutos, dime cuánto cuesta y qué incluye.'",
  "Surge una objeción fantasma: 'La verdad es que tuvimos una mala experiencia con algo similar hace años y no quiero repetirlo.'"
];

export default function SurpriseEventButton() {
  const [showEvent, setShowEvent] = useState(false);
  const [currentEvent, setCurrentEvent] = useState('');

  const triggerEvent = () => {
    const randomEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    setCurrentEvent(randomEvent);
    setShowEvent(true);
  };

  return (
    <>
      <button 
        className="btn btn-secondary btn-large" 
        onClick={triggerEvent}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}
      >
        <Dices size={48} />
        <span>EVENTO SORPRESA</span>
      </button>

      {showEvent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', borderColor: 'var(--secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowEvent(false)}>
                <X size={20} />
              </button>
            </div>
            
            <Dices size={64} color="var(--secondary)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h2 style={{ color: 'var(--secondary)', marginBottom: '1rem', fontSize: '2rem' }}>¡EVENTO SORPRESA!</h2>
            <p style={{ fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.4' }}>
              {currentEvent}
            </p>
            
            <button className="btn btn-secondary" style={{ marginTop: '2rem', width: '100%' }} onClick={() => setShowEvent(false)}>
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

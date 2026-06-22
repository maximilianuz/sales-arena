import React from 'react';
import { Dices } from 'lucide-react';

const EVENTS = [
  "El cliente se cruza de brazos: 'Acabo de recordar que mi socio debe estar en esta decisión.'",
  "El cliente menciona de pasada que está evaluando a [Competidor Directo] también.",
  "El presupuesto inicial del cliente acaba de ser congelado por la junta directiva.",
  "El cliente te interrumpe: 'Solo me quedan 2 minutos, dime cuánto cuesta y qué incluye.'",
  "Surge una objeción fantasma: 'La verdad es que tuvimos una mala experiencia con algo similar hace años y no quiero repetirlo.'"
];

export default function SurpriseEventButton({ triggerEvent }) {
  const handleClick = () => {
    if (!triggerEvent) return;
    const randomEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    triggerEvent(randomEvent);
  };

  return (
    <button 
      className="btn btn-secondary btn-large" 
      onClick={handleClick}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}
    >
      <Dices size={48} />
      <span>EVENTO SORPRESA</span>
    </button>
  );
}

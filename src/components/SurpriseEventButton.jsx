import React from 'react';
import { Dices } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EVENTS = [
  "event.crossed_arms",
  "event.competitor",
  "event.budget_frozen",
  "event.two_minutes",
  "event.ghost_objection"
];

export default function SurpriseEventButton({ triggerEvent }) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (!triggerEvent) return;
    const randomEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    triggerEvent(t(randomEvent));
  };

  return (
    <button 
      className="btn btn-secondary btn-large" 
      onClick={handleClick}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}
    >
      <Dices size={48} />
      <span>{t('surprise.button')}</span>
    </button>
  );
}

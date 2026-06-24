import React, { useState } from 'react';
import { Dices, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateSurpriseEvent } from '../utils/ai';

export default function SurpriseEventButton({ triggerEvent, apiKey, apiUrl, apiModel, currentScenario }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!triggerEvent || !currentScenario) {
      alert("Genera un escenario primero para poder crear un evento sorpresa personalizado.");
      return;
    }
    
    setLoading(true);
    try {
      const eventText = await generateSurpriseEvent(apiKey, apiUrl, apiModel, currentScenario);
      triggerEvent(eventText);
    } catch (error) {
      alert("Error al generar evento sorpresa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      className="btn btn-secondary btn-large" 
      onClick={handleClick}
      disabled={loading || !currentScenario}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem', background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}
    >
      {loading ? (
        <Loader2 size={48} style={{ animation: 'spin 2s linear infinite' }} />
      ) : (
        <Dices size={48} />
      )}
      <span>{loading ? "Generando..." : t('surprise.button')}</span>
    </button>
  );
}

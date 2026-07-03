import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ear } from 'lucide-react';

// Campos guiados que FUERZAN al observador a escuchar activamente y capturar lo
// importante de la llamada (no solo "tomar notas"). Se sincronizan y alimentan
// el análisis del coach.
const FIELDS = [
  { id: 'quote', es: 'Cita textual clave', en: 'Key verbatim quote',
    hintEs: 'Palabra por palabra: ¿qué dijo el lead que revela lo que REALMENTE quiere?',
    hintEn: 'Word for word: what did the lead say that reveals what they REALLY want?' },
  { id: 'realPain', es: 'Dolor real', en: 'Real pain',
    hintEs: 'El dolor de fondo, más allá del síntoma que mencionó.',
    hintEn: 'The underlying pain, beyond the symptom they mentioned.' },
  { id: 'realObjection', es: 'Objeción real', en: 'Real objection',
    hintEs: 'La verdadera razón que lo frena (no la excusa que dijo).',
    hintEn: 'The true reason holding them back (not the excuse they gave).' },
  { id: 'keyMoment', es: 'Momento decisivo', en: 'Decisive moment',
    hintEs: '¿En qué momento el closer ganó o perdió al lead? ¿Por qué?',
    hintEn: 'When did the closer win or lose the lead? Why?' },
];

export default function ListeningLogPanel({ listeningLog, updateListeningLog, canEdit }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [local, setLocal] = useState(listeningLog || {});

  const commit = () => {
    if (canEdit && updateListeningLog) updateListeningLog(local);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Ear size={18} color="var(--primary)" />
        <span style={{ fontWeight: '700', fontSize: '1rem' }}>{isEn ? 'Active Listening Log' : 'Bitácora de Escucha Activa'}</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1rem' }}>
        {isEn ? 'Capture what you HEAR. This is your active-listening training.' : 'Anotá lo que ESCUCHÁS. Este es tu entrenamiento de escucha activa.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {FIELDS.map((f) => (
          <div key={f.id}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600' }}>{isEn ? f.en : f.es}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{isEn ? f.hintEn : f.hintEs}</div>
            <textarea
              value={local[f.id] || ''}
              onChange={(e) => setLocal({ ...local, [f.id]: e.target.value })}
              onBlur={commit}
              disabled={!canEdit}
              rows={2}
              placeholder={canEdit ? '...' : (isEn ? 'The observer fills this' : 'Lo completa el observador')}
              style={{
                width: '100%', padding: '0.6rem', borderRadius: '0.5rem', resize: 'vertical',
                border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white',
                fontFamily: 'inherit', fontSize: '0.9rem', opacity: canEdit ? 1 : 0.8,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

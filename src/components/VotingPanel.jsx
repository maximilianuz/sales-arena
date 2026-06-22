import React from 'react';
import { Users, RotateCcw, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function VotingPanel({ isObserver, isFacilitator, questions = [], updateQuestions, activeStage }) {
  const { t } = useTranslation();
  
  const INITIAL_QUESTIONS = [
    { id: 1, question: "¿Encontró la objeción real?", options: [{ text: "Sí", votes: 0, color: "var(--success)" }, { text: "No", votes: 0, color: "var(--danger)" }] },
    { id: 2, question: "¿Quién tuvo el control?", options: [{ text: "Cliente", votes: 0, color: "var(--secondary)" }, { text: "Vendedor", votes: 0, color: "var(--primary)" }] },
    { id: 3, question: "¿Qué faltó?", options: [{ text: "Más preguntas", votes: 0, color: "var(--accent)" }, { text: "Mejor escucha", votes: 0, color: "#8B5CF6" }, { text: "Mejor cierre", votes: 0, color: "#06B6D4" }] }
  ];

  const addVote = (qIndex, oIndex) => {
    if (!updateQuestions) return;
    const newQuestions = JSON.parse(JSON.stringify(questions)); // Deep copy
    newQuestions[qIndex].options[oIndex].votes += 1;
    updateQuestions(newQuestions);
  };

  const handleReset = () => {
    if (!updateQuestions) return;
    updateQuestions(INITIAL_QUESTIONS);
  };

  return (
    <div className="glass-panel" style={{ flex: 1 }}>
      <div className="panel-title" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} />
          {t('voting.title')}
        </div>
        {isFacilitator && (
          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={handleReset}>
            <RotateCcw size={14} /> {t('voting.reset')}
          </button>
        )}
      </div>

      {activeStage && (
        <div style={{ background: 'rgba(79, 70, 229, 0.1)', border: '1px solid rgba(79, 70, 229, 0.3)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--primary)' }}>
          <strong>{t('voting.focus', { stage: activeStage.label })}</strong><br />
          {activeStage.indicator}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {questions.map((q, qIndex) => {
          const totalVotes = q.options.reduce((acc, curr) => acc + curr.votes, 0);
          
          return (
            <div key={q.id}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600' }}>{q.question}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, oIndex) => {
                  const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                  
                  return (
                    <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {(isObserver || isFacilitator) && updateQuestions && (
                        <button 
                          onClick={() => addVote(qIndex, oIndex)}
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: 'white',
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          title="Sumar voto"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                      <div style={{ flex: 1, position: 'relative', height: '30px', background: 'rgba(0,0,0,0.2)', borderRadius: '0.25rem', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            height: '100%', 
                            width: `${percentage}%`, 
                            background: opt.color,
                            transition: 'width 0.3s ease'
                          }} 
                        />
                        <div style={{ position: 'absolute', top: 0, left: '10px', height: '100%', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                          {opt.text}
                        </div>
                        <div style={{ position: 'absolute', top: 0, right: '10px', height: '100%', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 1 }}>
                          {opt.votes} ({percentage}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

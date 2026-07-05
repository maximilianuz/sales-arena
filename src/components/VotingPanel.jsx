import React from 'react';
import { BarChart2, RotateCcw, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const INITIAL_QUESTIONS = [
  { id: 1, question: "¿Encontró la objeción real?", options: [{ text: "Sí", votes: 0, color: "48,209,88" }, { text: "No", votes: 0, color: "255,69,58" }] },
  { id: 2, question: "¿Quién tuvo el control?", options: [{ text: "Cliente", votes: 0, color: "255,55,95" }, { text: "Vendedor", votes: 0, color: "100,210,255" }] },
  { id: 3, question: "¿Qué faltó?", options: [{ text: "Más preguntas", votes: 0, color: "255,159,10" }, { text: "Mejor escucha", votes: 0, color: "139,92,246" }, { text: "Mejor cierre", votes: 0, color: "6,182,212" }] }
];

export default function VotingPanel({ isObserver, isFacilitator, questions = [], updateQuestions, activeStage }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const addVote = (qIndex, oIndex) => {
    if (!updateQuestions) return;
    const newQ = JSON.parse(JSON.stringify(questions));
    newQ[qIndex].options[oIndex].votes += 1;
    updateQuestions(newQ);
  };

  const handleReset = () => updateQuestions && updateQuestions(INITIAL_QUESTIONS);

  return (
    <div className="glass-panel" style={{ flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <BarChart2 size={14} color="rgba(100,210,255,0.7)" />
          <span style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
            {t('voting.title')}
          </span>
        </div>
        {isFacilitator && (
          <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', color: 'rgba(255,69,58,0.7)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '600' }}>
            <RotateCcw size={11} /> {t('voting.reset')}
          </button>
        )}
      </div>

      {/* Active stage focus */}
      {activeStage && (
        <div style={{ background: 'rgba(100,210,255,0.07)', border: '1px solid rgba(100,210,255,0.18)', padding: '0.65rem 0.875rem', borderRadius: '0.625rem', marginBottom: '1.125rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'rgba(165,180,252,0.7)', fontWeight: '600' }}>{isEn ? 'Evaluating:' : 'Evaluando:'}</span>
          <span style={{ color: 'rgba(165,180,252,0.5)', marginLeft: '0.4rem' }}>{activeStage.label}</span>
        </div>
      )}

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {questions.map((q, qIndex) => {
          const totalVotes = q.options.reduce((a, c) => a + c.votes, 0);
          return (
            <div key={q.id}>
              <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {q.question}
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontWeight: '400' }}>{totalVotes} {isEn ? 'votes' : 'votos'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {q.options.map((opt, oIndex) => {
                  const pct = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                  const isLeading = opt.votes > 0 && opt.votes === Math.max(...q.options.map(o => o.votes));
                  return (
                    <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {(isObserver || isFacilitator) && updateQuestions && (
                        <button onClick={() => addVote(qIndex, oIndex)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: `rgba(${opt.color},0.12)`, border: `1px solid rgba(${opt.color},0.3)`, color: `rgb(${opt.color})`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          <Plus size={13} />
                        </button>
                      )}
                      <div style={{ flex: 1, height: '28px', position: 'relative', background: 'rgba(0,0,0,0.25)', borderRadius: '0.4rem', overflow: 'hidden', border: isLeading ? `1px solid rgba(${opt.color},0.3)` : '1px solid transparent' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: `rgba(${opt.color},0.25)`, borderRadius: '0.35rem', transition: 'width 0.4s ease' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.6rem', zIndex: 1 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: isLeading ? '700' : '500', color: isLeading ? `rgb(${opt.color})` : 'rgba(255,255,255,0.55)' }}>{opt.text}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: pct > 0 ? `rgb(${opt.color})` : 'rgba(255,255,255,0.2)' }}>{opt.votes > 0 ? `${opt.votes} (${pct}%)` : '—'}</span>
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

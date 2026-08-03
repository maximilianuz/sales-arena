import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader, Check, X, AlertTriangle, Mic } from 'lucide-react';
import { auth } from '../../../utils/db';
import { subscribeList, subscribeNode, setItem, logActivity } from '../db';
import { review, dueCards } from '../srs/fsrs';
import { DECKS } from '../seedImport';
import { cartasBloqueadas } from '../plan/consolidacion';

// Sesión de repaso con FSRS. Cartas clásicas: frente → respondés EN VOZ ALTA →
// dorso + por qué + autocalificación. Cartas Feynman: escribís tu explicación,
// el evaluador (IA) la compara con la referencia del principio y marca qué
// faltó; el rating sugerido sale de eso pero lo confirmás vos.
//
// StudySession carga los datos; SessionRunner congela la cola al montarse
// (inicializador de useState) para que los updates de SRS durante la sesión
// no la re-armen a mitad de camino.

const RATINGS = [
  { value: 1, label: 'Otra vez', color: '255,69,58' },
  { value: 2, label: 'Difícil', color: '255,159,10' },
  { value: 3, label: 'Bien', color: '48,209,88' },
  { value: 4, label: 'Fácil', color: '34,211,238' },
];

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

// `limite` lo pone el plan: un bloque de 8 minutos no debería abrir 40 cartas.
// `onDone` avisa que el bloque quedó cumplido — se dispara al repasar al menos
// una carta o al no haber nada vencido, no con solo entrar y salir.
export default function StudySession({ deckId, onBack, limite = null, onDone = null }) {
  const [cards, setCards] = useState(null);
  const [srsMap, setSrsMap] = useState(null);
  const [principiosMap, setPrincipiosMap] = useState({});
  // La compuerta de consolidación. Practicar suelto no puede ser la puerta
  // trasera que la esquiva: si el material se introdujo hoy, no se recupera hoy,
  // se entre por el plan o por el botón de Practicar.
  const [progresoUnidad, setProgresoUnidad] = useState(null);

  useEffect(() => subscribeList('cards', (list) => { setCards(list); }), []);
  useEffect(() => subscribeNode('srs', (v) => { setSrsMap(v || {}); }), []);
  useEffect(() => subscribeNode('progresoUnidad', (v) => { setProgresoUnidad(v || {}); }), []);
  useEffect(() => subscribeList('kb/principios', (list) => {
    setPrincipiosMap(Object.fromEntries(list.map(p => [p.id, p])));
  }), []);
  // La sesión arranca cuando llegó el primer snapshot de cartas y de SRS.
  const ready = cards !== null && srsMap !== null && progresoUnidad !== null;

  const deckName = deckId ? (DECKS.find(d => d.id === deckId)?.nombre || deckId) : 'Todos los mazos';

  if (!ready) {
    return (
      <Shell onBack={onBack} title={deckName}>
        <p style={{ color: 'var(--text-muted)' }}><Loader size={14} className="spin" /> Cargando…</p>
      </Shell>
    );
  }

  const pool = deckId ? cards.filter(c => c.mazo === deckId) : cards;
  return (
    <SessionRunner
      deckName={deckName}
      pool={pool}
      srsMap={srsMap}
      bloqueadas={cartasBloqueadas(progresoUnidad)}
      principiosMap={principiosMap}
      onBack={onBack}
      limite={limite}
      onDone={onDone}
    />
  );
}

function SessionRunner({ deckName, pool, srsMap, bloqueadas, principiosMap, onBack, limite, onDone }) {
  // Cola congelada al montar: los props posteriores no la reconstruyen.
  const [queue, setQueue] = useState(() => {
    const q = dueCards(pool, srsMap, undefined, { bloqueadas });
    return limite ? q.slice(0, limite) : q;
  });
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [finished, setFinished] = useState(false);
  // Feynman
  const [explicacion, setExplicacion] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [evalError, setEvalError] = useState('');
  const startRef = useRef(null);
  const doneRef = useRef(0);

  useEffect(() => { startRef.current = Date.now(); }, []);
  // Sin cartas vencidas no hay nada que hacer, así que el bloque del plan se
  // cumple igual: dejarlo trabado obligaría a saltearlo a mano cada vez.
  useEffect(() => { if (queue.length === 0) onDone?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Si sale de la sesión con la X/volver a mitad de camino, igual se loguea lo hecho.
  useEffect(() => () => {
    if (doneRef.current > 0 && startRef.current) {
      const minutos = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
      logActivity({ minutos, tipo: 'flashcards', detalle: `${doneRef.current} cartas repasadas` }).catch(() => {});
      startRef.current = null; // evita doble log si el efecto corre dos veces
    }
  }, []);

  const current = queue[idx];
  const carta = current?.card;
  const principio = carta ? principiosMap[carta.principioId] : null;
  const isFeynman = carta?.tipo === 'feynman';

  const rate = async (rating) => {
    const next = review(current.srs, rating);
    const { requeue, ...toSave } = next;
    await setItem('srs', carta.id, toSave);
    const newQueue = requeue ? [...queue, { card: carta, srs: toSave }] : queue;
    const nextIdx = idx + 1;
    doneRef.current += 1;
    // El bloque del plan se da por cumplido con la primera carta: si abandonás
    // a la mitad igual practicaste, y volver a entrar te da las que faltan.
    if (doneRef.current === 1) onDone?.();
    setDone(d => d + 1);
    setRevealed(false);
    setExplicacion('');
    setEvalResult(null);
    setEvalError('');
    if (nextIdx >= newQueue.length) {
      setFinished(true);
    } else {
      setQueue(newQueue);
      setIdx(nextIdx);
    }
  };

  const evaluateFeynman = async () => {
    if (!explicacion.trim() || !principio) return;
    setEvaluating(true);
    setEvalError('');
    try {
      const resp = await fetch('/api/training-feynman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid,
          explicacion,
          principio: {
            nombre: principio.nombre,
            explicacionReferencia: principio.explicacionReferencia,
            puntosClave: principio.puntosClave || [],
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Error del evaluador');
      setEvalResult(data);
      setRevealed(true);
    } catch (e) {
      // Sin evaluador (offline / sin key): degradar a autoevaluación manual.
      setEvalError(`${e.message}. Compará vos contra la referencia y calificate.`);
      setRevealed(true);
    } finally {
      setEvaluating(false);
    }
  };

  if (queue.length === 0) {
    return (
      <Shell onBack={onBack} title={deckName}>
        <div style={panel}>
          <p style={{ margin: 0 }}>🎉 No hay cartas vencidas en este mazo. Volvé mañana — el algoritmo decide cuándo te toca cada una.</p>
        </div>
      </Shell>
    );
  }

  if (finished || !carta) {
    return (
      <Shell onBack={onBack} title={deckName}>
        <div style={{ ...panel, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
          <p style={{ fontWeight: 700, margin: '0 0 0.3rem' }}>Sesión terminada: {done} cartas</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
            Quedó registrado en tu log de práctica.
          </p>
          <button className="btn btn-primary" onClick={onBack}>Volver</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={onBack} title={deckName} progress={`${done} hechas · ${Math.max(0, queue.length - idx)} en cola`}>
      {/* FRENTE */}
      <div style={{ ...panel, marginBottom: '0.8rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {DECKS.find(d => d.id === carta.mazo)?.nombre || carta.mazo}{isFeynman ? ' · Modo Feynman' : ''}
        </div>
        <div style={{ fontSize: '1rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{carta.frente}</div>
        {!revealed && !isFeynman && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.8rem 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Mic size={13} /> Respondé EN VOZ ALTA antes de mirar el dorso — entrenás la boca, no el ojo.
          </p>
        )}
      </div>

      {/* FEYNMAN: entrada de explicación */}
      {isFeynman && !revealed && (
        <div style={{ ...panel, marginBottom: '0.8rem' }}>
          <textarea
            value={explicacion}
            onChange={(e) => setExplicacion(e.target.value)}
            rows={6}
            placeholder="Explicalo con TUS palabras, como si se lo contaras a alguien que nunca vendió…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
          />
          <button className="btn btn-primary" disabled={evaluating || !explicacion.trim()} onClick={evaluateFeynman} style={{ marginTop: '0.7rem' }}>
            {evaluating ? <><Loader size={14} className="spin" /> Evaluando…</> : 'Evaluar mi explicación'}
          </button>
          {!principio && <p style={{ color: '#ff9f0a', fontSize: '0.78rem', marginTop: '0.5rem' }}>Esta carta no tiene principio asociado — editala en la Base de conocimiento.</p>}
        </div>
      )}

      {/* DORSO */}
      {!revealed && !isFeynman && (
        <button className="btn btn-primary" onClick={() => setRevealed(true)} style={{ width: '100%' }}>Mostrar dorso</button>
      )}

      {revealed && (
        <>
          {evalError && (
            <div style={{ ...panel, marginBottom: '0.8rem', borderColor: 'rgba(255,159,10,0.4)' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#ff9f0a' }}><AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> {evalError}</p>
            </div>
          )}

          {evalResult && (
            <div style={{ ...panel, marginBottom: '0.8rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>Evaluación</div>
              {(evalResult.cubiertos || []).map((p, i) => (
                <p key={`c${i}`} style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}><Check size={13} color="#30d158" style={{ verticalAlign: '-2px' }} /> {p}</p>
              ))}
              {(evalResult.faltantes || []).map((p, i) => (
                <p key={`f${i}`} style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#ff9f0a' }}><X size={13} style={{ verticalAlign: '-2px' }} /> Te faltó: {p}</p>
              ))}
              {(evalResult.imprecisiones || []).map((p, i) => (
                <p key={`i${i}`} style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#ff453a' }}><AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> {p}</p>
              ))}
              {evalResult.comentario && <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{evalResult.comentario}</p>}
            </div>
          )}

          <div style={{ ...panel, marginBottom: '0.8rem' }}>
            {isFeynman ? (
              principio && (
                <>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Referencia: {principio.nombre}</div>
                  <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{principio.explicacionReferencia}</p>
                </>
              )
            ) : (
              <>
                {carta.dorso && <p style={{ margin: '0 0 0.7rem', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{carta.dorso}</p>}
                {carta.porQue && (
                  <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.55, color: '#22d3ee' }}>
                    <strong>Por qué funciona:</strong> {carta.porQue}
                  </p>
                )}
                {principio && (
                  <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Principio: <strong>{principio.nombre}</strong> — {principio.resumen}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Rating */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {RATINGS.map(r => {
              const suggested = evalResult?.ratingSugerido === r.value;
              return (
                <button key={r.value} onClick={() => rate(r.value)} style={{
                  padding: '0.65rem 0.3rem', borderRadius: '0.65rem', cursor: 'pointer', font: 'inherit',
                  fontSize: '0.8rem', fontWeight: 700,
                  border: `1px solid rgba(${r.color},${suggested ? 0.9 : 0.35})`,
                  background: suggested ? `rgba(${r.color},0.25)` : `rgba(${r.color},0.08)`,
                  color: `rgb(${r.color})`,
                }}>
                  {r.label}{suggested ? ' ★' : ''}
                </button>
              );
            })}
          </div>
          {evalResult && <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center', marginTop: '0.4rem' }}>★ = sugerido por la evaluación. La última palabra es tuya.</p>}
        </>
      )}
    </Shell>
  );
}

function Shell({ onBack, title, progress, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={onBack} style={{ padding: '0.4rem 0.7rem' }}><ArrowLeft size={15} /></button>
        <div style={{ fontWeight: 700 }}>{title}</div>
        {progress && <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{progress}</div>}
      </div>
      {children}
    </div>
  );
}

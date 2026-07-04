import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Loader, Phone, PhoneOff, Flame, Shield, Clock, Eye, Sparkles, Trophy, Mic, Square, Volume2, VolumeX } from 'lucide-react';
import { auth } from '../utils/db';
import { generateAIScenario } from '../utils/ai';
import { buyerTurn, initialBuyerState } from '../utils/roleplayClient';
import { getPersonality } from '../utils/leadPersonalities';
import BuyerAvatar from '../components/BuyerAvatar';
import { micSupported, speechSupported, startRecording, transcribe, speak, stopSpeaking, warmUpVoices } from '../utils/voice';

// Modo PRÁCTICA SOLO: el closer le vende a un comprador IA con estado real
// (temperatura/confianza/paciencia), capa oculta y consecuencias (puede cortar).
// Al terminar, el transcript se scorea con la misma rúbrica que las sesiones
// humanas → suma a la cuenta de comisiones y la gamificación.

const METERS = [
  { key: 'temperature', icon: Flame, es: 'Interés', en: 'Interest', color: '#f59e0b' },
  { key: 'trust', icon: Shield, es: 'Confianza', en: 'Trust', color: '#22d3ee' },
  { key: 'patience', icon: Clock, es: 'Paciencia', en: 'Patience', color: '#a78bfa' },
];

function Meter({ meter, value, isEn }) {
  const Icon = meter.icon;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
        <Icon size={11} color={meter.color} /> {isEn ? meter.en : meter.es}
      </div>
      <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: meter.color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function SoloPractice({ onBack }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const [phase, setPhase] = useState('intro'); // intro | loading | live | ended
  const [scenario, setScenario] = useState(null);
  const [state, setState] = useState(initialBuyerState());
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState(null); // closed | lost
  const [thoughts, setThoughts] = useState([]); // lo que el lead "pensaba" (revelado al final)
  const [analysis, setAnalysis] = useState(null);
  const [scoring, setScoring] = useState(false);
  // Voz
  const [voiceOn, setVoiceOn] = useState(speechSupported());
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => { warmUpVoices(); }, []);
  useEffect(() => () => stopSpeaking(), []); // cortar la voz al desmontar

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, phase]);

  // Reproduce la respuesta del lead con voz (si está activada) y anima el avatar.
  // (start/submitTurn se recrean cada render, así que capturan el voiceOn actual.)
  const playBuyerVoice = async (reply, sc) => {
    if (!voiceOn || !reply) return;
    setSpeaking(true);
    try {
      await speak(reply, { personalityId: (sc || scenario)?.personality, language: i18n.language });
    } finally {
      setSpeaking(false);
    }
  };

  const persona = scenario ? getPersonality(scenario.personality) : null;
  const leadName = scenario?.demographics?.name || (isEn ? 'Prospect' : 'Prospecto');

  const start = async () => {
    setPhase('loading');
    setError('');
    try {
      // Reusamos el generador de escenarios del room (personalidad DISC incluida).
      const sc = await generateAIScenario(null, null, null, { level: 'intermedio', theme: '', leadTemperature: 'tibio', targetObjection: 'Aleatoria (Sorpréndeme)' }, [], i18n.language);
      if (!sc || typeof sc !== 'object') throw new Error(isEn ? 'Could not generate the buyer.' : 'No se pudo generar el comprador.');
      setScenario(sc);

      // Turno de apertura: el lead "atiende el teléfono" en personaje.
      const opening = await buyerTurn({
        scenario: sc,
        state: initialBuyerState(),
        history: [{ role: 'user', content: isEn ? '[The call connects. Greet briefly in character.]' : '[La llamada conecta. Saludá breve en personaje.]' }],
        language: i18n.language,
      });
      setState(opening.state);
      setMessages([{ role: 'assistant', content: opening.reply }]);
      if (opening.thought) setThoughts([opening.thought]);
      setPhase('live');
      playBuyerVoice(opening.reply, sc);
    } catch (e) {
      setError(e.message);
      setPhase('intro');
    }
  };

  const submitTurn = async (text) => {
    if (!text || busy || phase !== 'live') return;
    stopSpeaking();
    setError('');
    const nextHistory = [...messages, { role: 'user', content: text }];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const turn = await buyerTurn({ scenario, state, history: nextHistory, language: i18n.language });
      setState(turn.state);
      setMessages([...nextHistory, { role: 'assistant', content: turn.reply }]);
      if (turn.thought) setThoughts(t => [...t, turn.thought]);
      if (turn.outcome === 'closed' || turn.outcome === 'lost') {
        setOutcome(turn.outcome);
        setPhase('ended');
        setBusy(false);
        return;
      }
      playBuyerVoice(turn.reply);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    submitTurn(text);
  };

  // Push-to-talk: grabar → transcribir con Whisper → mandar como turno del closer.
  const toggleMic = async () => {
    if (busy || transcribing) return;
    if (recording) {
      setRecording(false);
      try {
        const { base64, mimeType } = await recorderRef.current.stop();
        recorderRef.current = null;
        setTranscribing(true);
        const text = await transcribe(base64, mimeType, i18n.language);
        setTranscribing(false);
        if (text.trim()) submitTurn(text.trim());
        else setError(isEn ? 'I did not catch that. Try again.' : 'No se entendió. Probá de nuevo.');
      } catch (e) {
        setTranscribing(false);
        setError(e.message);
      }
    } else {
      stopSpeaking();
      try {
        recorderRef.current = await startRecording();
        setRecording(true);
      } catch {
        setError(isEn ? 'Microphone access denied.' : 'No se pudo acceder al micrófono.');
      }
    }
  };

  const hangUp = () => {
    stopSpeaking();
    setOutcome('lost');
    setPhase('ended');
  };

  // Scoring del transcript con la misma rúbrica (analyze-session extendido).
  const scoreSession = async () => {
    setScoring(true);
    setError('');
    try {
      const transcript = messages
        .map(m => `${m.role === 'user' ? (isEn ? 'CLOSER' : 'CLOSER') : leadName.toUpperCase()}: ${m.content}`)
        .join('\n');
      const res = await fetch('/api/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid,
          scenario,
          transcript,
          closed: outcome === 'closed',
          closerUid: auth.currentUser?.uid,
          closerName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Closer',
          productPrice: scenario?.productPrice,
          language: i18n.language || 'es',
          soloMode: true,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setAnalysis({ ...data.analysis, gamification: data.gamification });
    } catch (e) {
      setError(e.message);
    } finally {
      setScoring(false);
    }
  };

  // ── Intro ────────────────────────────────────────────────────────────────
  if (phase === 'intro' || phase === 'loading') {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '520px', width: '100%' }}>
          <button className="btn btn-outline" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <ArrowLeft size={16} /> {isEn ? 'Back' : 'Volver'}
          </button>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 0.75rem' }}>
              {isEn ? 'Solo practice — AI Buyer' : 'Práctica solo — Comprador IA'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              {isEn
                ? 'A real, skeptical prospect with hidden objections and a mood that shifts with your technique. Earn their trust — or lose the call. Scored on the same rubric as team sessions.'
                : 'Un prospecto real y escéptico, con objeciones ocultas y un ánimo que cambia según tu técnica. Ganate su confianza — o perdé la llamada. Se puntúa con la misma rúbrica que las sesiones en equipo.'}
            </p>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
            <button className="btn btn-primary btn-large" onClick={start} disabled={phase === 'loading'} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {phase === 'loading'
                ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> {isEn ? 'Generating buyer...' : 'Generando comprador...'}</>
                : <><Phone size={18} /> {isEn ? 'Start the call' : 'Iniciar la llamada'}</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Ended → score ──────────────────────────────────────────────────────────
  if (phase === 'ended') {
    return (
      <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '560px', width: '100%', margin: 'auto' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '2.5rem' }}>{outcome === 'closed' ? '🤝' : '📞'}</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0.5rem 0', color: outcome === 'closed' ? 'var(--success)' : 'var(--text-muted)' }}>
              {outcome === 'closed'
                ? (isEn ? 'Deal closed!' : '¡Trato cerrado!')
                : (isEn ? 'Call ended' : 'Llamada terminada')}
            </h2>

            {/* Lo que el comprador realmente pensaba — coaching que ChatGPT no da */}
            {thoughts.length > 0 && (
              <div style={{ textAlign: 'left', marginTop: '1rem', padding: '1rem', background: 'rgba(139,92,246,0.08)', borderRadius: '0.75rem', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <Eye size={14} /> {isEn ? 'What the buyer was really thinking' : 'Lo que el comprador pensaba de verdad'}
                </div>
                {thoughts.slice(-4).map((th, i) => (
                  <p key={i} style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>“{th}”</p>
                ))}
              </div>
            )}

            {!analysis && (
              <button className="btn btn-primary" onClick={scoreSession} disabled={scoring} style={{ width: '100%', marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {scoring
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> {isEn ? 'Scoring...' : 'Puntuando...'}</>
                  : <><Sparkles size={16} /> {isEn ? 'Score my call' : 'Puntuar mi llamada'}</>}
              </button>
            )}
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>}
          </div>

          {analysis && (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '3rem', fontWeight: '900', color: analysis.overallScore >= 8 ? 'var(--success)' : analysis.overallScore >= 6 ? 'var(--accent)' : 'var(--danger)' }}>
                  {analysis.overallScore}/10
                </div>
                {analysis.gamification?.earned > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontWeight: '800', marginTop: '0.25rem' }}>
                    <Trophy size={16} /> +${analysis.gamification.earned.toLocaleString('en-US')}
                  </div>
                )}
              </div>
              {(analysis.toImprove || []).length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{isEn ? 'To improve' : 'A mejorar'}</div>
                  {analysis.toImprove.map((it, i) => (
                    <div key={i} style={{ fontSize: '0.87rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>→ {it}</div>
                  ))}
                </div>
              )}
              {analysis.nextSessionTip && (
                <p style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: '0.6rem', fontSize: '0.87rem', color: 'var(--text-muted)' }}>
                  💡 {analysis.nextSessionTip}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={onBack} style={{ flex: 1 }}>{isEn ? 'Back to lobby' : 'Volver al lobby'}</button>
            <button className="btn btn-primary" onClick={() => { setPhase('intro'); setScenario(null); setMessages([]); setThoughts([]); setAnalysis(null); setOutcome(null); setState(initialBuyerState()); }} style={{ flex: 1 }}>
              {isEn ? 'New call' : 'Nueva llamada'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Live chat ──────────────────────────────────────────────────────────────
  return (
    <div className="app-container" style={{ alignItems: 'center', padding: '1rem', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '640px', width: '100%', margin: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header tipo videollamada: avatar reactivo + medidores */}
        <div className="glass-panel" style={{ padding: '0.85rem 1rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><ArrowLeft size={18} /></button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {speechSupported() && (
                <button onClick={() => { if (voiceOn) stopSpeaking(); setVoiceOn(v => !v); }} title={isEn ? 'Toggle voice' : 'Voz on/off'}
                  style={{ background: voiceOn ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${voiceOn ? 'var(--success)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '0.6rem', padding: '0.45rem', color: voiceOn ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}
              <button onClick={hangUp} title={isEn ? 'Hang up' : 'Colgar'} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.6rem', padding: '0.45rem', color: 'var(--danger)', cursor: 'pointer', display: 'flex' }}>
                <PhoneOff size={16} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
            <BuyerAvatar
              state={state}
              speaking={speaking}
              name={`${leadName}${persona ? ` · ${isEn ? persona.en : persona.es}` : ''}`}
              isEn={isEn}
              size={120}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.85rem' }}>
            {METERS.map(m => <Meter key={m.key} meter={m} value={state[m.key]} isEn={isEn} />)}
          </div>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="glass-panel" style={{ flex: 1, overflowY: 'auto', padding: '1rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{
                padding: '0.6rem 0.85rem', borderRadius: '0.9rem', fontSize: '0.9rem', lineHeight: 1.4,
                background: m.role === 'user' ? 'linear-gradient(135deg, var(--primary), #8b5cf6)' : 'rgba(255,255,255,0.06)',
                color: 'white', borderBottomRightRadius: m.role === 'user' ? '0.2rem' : '0.9rem',
                borderBottomLeftRadius: m.role === 'user' ? '0.9rem' : '0.2rem',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.4rem 0.85rem' }}>
              {leadName} {isEn ? 'is thinking…' : 'está pensando…'}
            </div>
          )}
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>{error}</p>}

        {/* Input: micrófono (push-to-talk) + texto */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {micSupported() && (
            <button
              onClick={toggleMic}
              disabled={busy || transcribing}
              title={isEn ? 'Push to talk' : 'Hablá'}
              style={{
                padding: '0 1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', cursor: 'pointer',
                background: recording ? 'var(--danger)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${recording ? 'var(--danger)' : 'rgba(255,255,255,0.12)'}`,
                color: 'white', animation: recording ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            >
              {transcribing ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : recording ? <Square size={18} /> : <Mic size={18} />}
            </button>
          )}
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={recording ? (isEn ? 'Listening…' : 'Escuchando…') : transcribing ? (isEn ? 'Transcribing…' : 'Transcribiendo…') : (isEn ? 'Type or tap the mic…' : 'Escribí o tocá el micrófono…')}
            disabled={busy || recording || transcribing}
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
          />
          <button className="btn btn-primary" onClick={send} disabled={busy || !input.trim()} style={{ padding: '0 1.1rem', display: 'flex', alignItems: 'center' }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

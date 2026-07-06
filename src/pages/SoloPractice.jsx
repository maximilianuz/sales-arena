import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Loader, Phone, PhoneOff, Flame, Shield, Clock, Eye, Sparkles, Trophy, Mic, Square, Volume2, VolumeX, BookOpen, Shuffle, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { auth } from '../utils/db';
import { generateAIScenario } from '../utils/ai';
import { buyerTurn, initialBuyerState } from '../utils/roleplayClient';
import { openingLine } from '../utils/buyerPrompt';
import { getDefaultStages } from '../utils/defaultStages';
import { INDUSTRY_CATEGORIES, randomIndustryValue } from '../utils/industries';
import BuyerAvatar from '../components/BuyerAvatar';
import SoloCoachPanel from '../components/SoloCoachPanel';
import MethodScores from '../components/MethodScores';

// Expresión emocional del lead por turno (la emite la IA en `emotion`).
// El emoji + etiqueta le dan al closer feedback inmediato de cómo cayó su técnica.
const EMOTION_META = {
  neutral:      { emoji: '😐', es: 'neutral', en: 'neutral' },
  interesado:   { emoji: '🙂', es: 'interesado', en: 'interested' },
  esceptico:    { emoji: '🤨', es: 'escéptico', en: 'skeptical' },
  molesto:      { emoji: '😠', es: 'molesto', en: 'annoyed' },
  entusiasmado: { emoji: '😄', es: 'entusiasmado', en: 'excited' },
  dudoso:       { emoji: '😕', es: 'dudoso', en: 'hesitant' },
  apurado:      { emoji: '⏱️', es: 'apurado', en: 'in a hurry' }
};
import { micSupported, speechSupported, startRecording, transcribe, speak, stopSpeaking, warmUpVoices, unlockAudio } from '../utils/voice';
import { inferGender } from '../utils/genderFromName';

// Modo PRÁCTICA SOLO: el closer le vende a un comprador IA con estado real
// (temperatura/confianza/paciencia), capa oculta y consecuencias (puede cortar).
// Al terminar, el transcript se scorea con la misma rúbrica que las sesiones
// humanas → suma a la cuenta de comisiones y la gamificación.

const METERS = [
  { key: 'temperature', icon: Flame, es: 'Interés', en: 'Interest', color: '#ff9f0a' },
  { key: 'trust', icon: Shield, es: 'Confianza', en: 'Trust', color: '#22d3ee' },
  { key: 'patience', icon: Clock, es: 'Paciencia', en: 'Patience', color: '#a78bfa' },
];

// Estilo base compartido de los botones de acción del header en vivo (Coach / voz /
// colgar): misma forma, tamaño y tipografía; cada botón solo cambia el color de acento.
const HEADER_BTN = {
  borderRadius: '0.6rem', padding: '0.45rem 0.65rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: '700',
};

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
  const [leadEmotion, setLeadEmotion] = useState('neutral'); // emoción del último turno → cara del avatar
  const [transcribing, setTranscribing] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  // Producto a vender: visible al arrancar (clima) y colapsable para no tapar el chat.
  const [showProduct, setShowProduct] = useState(true);
  // Foco: 'all' = llamada completa; o el id de una etapa para practicarla suelta.
  const [focusStageId, setFocusStageId] = useState('all');
  // Config del lead (las MISMAS opciones que tiene el Trainer en el room): el
  // closer arma su propio prospecto y el producto que le toca vender se genera
  // en base a esto. Mismo shape que ScenarioPanel → mismo escenario/estructura.
  // Se persiste en localStorage para no reconfigurar en cada llamada.
  const [genConfig, setGenConfig] = useState(() => {
    const defaults = { level: 'Intermedio', theme: 'Aleatorio (Sorpréndeme)', leadTemperature: 'Templado', targetObjection: 'Aleatoria (Sorpréndeme)' };
    try {
      const saved = JSON.parse(localStorage.getItem('soloLeadConfig'));
      if (saved && typeof saved === 'object') return { ...defaults, ...saved };
    } catch { /* sin config previa */ }
    return defaults;
  });
  useEffect(() => {
    try { localStorage.setItem('soloLeadConfig', JSON.stringify(genConfig)); } catch { /* storage no disponible */ }
  }, [genConfig]);
  const [elapsed, setElapsed] = useState(0); // segundos de llamada
  const recorderRef = useRef(null);
  const scrollRef = useRef(null);

  const MAX_SECONDS = 60 * 60; // tope duro de 60 minutos
  const stagesList = getDefaultStages(i18n.language);
  const focusStage = focusStageId === 'all' ? null : (stagesList.find(s => s.id === focusStageId) || null);

  useEffect(() => { warmUpVoices(); }, []);
  useEffect(() => () => stopSpeaking(), []); // cortar la voz al desmontar

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, phase]);

  // Cronómetro de la llamada + tope duro de 60 minutos.
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        if (next >= MAX_SECONDS) {
          stopSpeaking();
          setOutcome('timeout');
          setPhase('ended');
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reproduce la respuesta del lead con voz (si está activada) y anima el avatar.
  // (start/submitTurn se recrean cada render, así que capturan el voiceOn actual.)
  const playBuyerVoice = async (reply, sc, emotion = 'neutral') => {
    if (!voiceOn || !reply) return;
    setSpeaking(true);
    try {
      const s = sc || scenario;
      const uid = auth.currentUser?.uid;
      await speak(reply, {
        uid,
        personalityId: s?.personality,
        language: i18n.language,
        seed: s?.demographics?.name || '',
        emotion,
        gender: inferGender(s?.demographics?.name || '')
      });
    } finally {
      setSpeaking(false);
    }
  };

  const leadName = scenario?.demographics?.name || (isEn ? 'Prospect' : 'Prospecto');

  const start = async () => {
    setPhase('loading');
    setError('');
    try {
      // Reusamos el generador de escenarios del room (personalidad DISC incluida)
      // con la config que armó el closer → mismo escenario/producto que en la web.
      const sc = await generateAIScenario(null, null, null, {
        level: genConfig.level,
        theme: genConfig.theme,
        leadTemperature: genConfig.leadTemperature,
        targetObjection: genConfig.targetObjection,
      }, [], i18n.language);
      if (!sc || typeof sc !== 'object') throw new Error(isEn ? 'Could not generate the buyer.' : 'No se pudo generar el comprador.');
      setScenario(sc);

      // Saludo de apertura SIN IA (evita un 2º pedido grande en el mismo minuto
      // → esquiva el rate limit de Groq free). Se adapta a la etapa elegida.
      const greet = openingLine(sc, i18n.language, focusStageId);
      setState(initialBuyerState());
      setMessages([{ role: 'assistant', content: greet }]);
      setThoughts([]);
      setLeadEmotion('neutral');
      setShowProduct(true);
      setElapsed(0);
      setPhase('live');
      playBuyerVoice(greet, sc);
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
      const turn = await buyerTurn({ scenario, state, history: nextHistory, language: i18n.language, focusStage });
      setState(turn.state);
      setMessages([...nextHistory, { role: 'assistant', content: turn.reply, emotion: turn.emotion }]);
      setLeadEmotion(turn.emotion || 'neutral');
      if (turn.thought) setThoughts(t => [...t, turn.thought]);
      if (turn.outcome === 'closed' || turn.outcome === 'lost') {
        setOutcome(turn.outcome);
        setPhase('ended');
        setBusy(false);
        return;
      }
      playBuyerVoice(turn.reply, null, turn.emotion);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    unlockAudio(); // gesto del usuario → desbloquea audio en móvil
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
        unlockAudio(); // gesto del usuario → desbloquea audio en móvil
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

  // Salir al lobby abandonando la llamada. Si hay conversación en curso pedimos
  // confirmación: sin esto, un click accidental descartaba toda la sesión sin
  // puntuar (justo al lado del botón de colgar, que sí lleva al scoring).
  const leaveCall = () => {
    if (messages.length > 1 && !window.confirm(isEn
      ? 'Leave the call? It will be discarded without scoring. Use "Hang up" to end and score it.'
      : '¿Salir de la llamada? Se descarta sin puntuar. Usá "Colgar" para terminarla y puntuarla.')) return;
    stopSpeaking();
    onBack();
  };

  // Scoring del transcript con la misma rúbrica (analyze-session extendido).
  const scoreSession = async () => {
    setScoring(true);
    setError('');
    try {
      const header = focusStage
        ? (isEn ? `[Focused drill: only the "${focusStage.label}" phase]\n` : `[Práctica enfocada: solo la fase "${focusStage.label}"]\n`)
        : '';
      const transcript = header + messages
        .map(m => `${m.role === 'user' ? 'CLOSER' : leadName.toUpperCase()}: ${m.content}`)
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
          // Si practicó una fase suelta, el scoring puntúa solo lo relevante.
          focusStage: focusStage ? focusStage.label : null,
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
    // Mismas opciones que el Trainer (ScenarioPanel): dificultad y temperatura.
    // `m` = multiplicador de recompensa (debe coincidir con analyze-session): así
    // el closer ve el trade-off riesgo/recompensa ANTES de elegir.
    const LEVELS = isEn
      ? [{ v: 'Principiante', l: '🟢 Beginner', d: 'Friendly', m: 0.8 }, { v: 'Intermedio', l: '🟡 Intermediate', d: 'Skeptical', m: 1.0 }, { v: 'Avanzado', l: '🔴 Advanced', d: 'Hostile', m: 1.4 }]
      : [{ v: 'Principiante', l: '🟢 Principiante', d: 'Amigable', m: 0.8 }, { v: 'Intermedio', l: '🟡 Intermedio', d: 'Escéptico', m: 1.0 }, { v: 'Avanzado', l: '🔴 Avanzado', d: 'Hostil', m: 1.4 }];
    const TEMPS = isEn
      ? [{ v: 'Frío', l: '🧊 Cold', d: "Doesn't know you", m: 1.15 }, { v: 'Templado', l: '☀️ Warm', d: 'Saw your ad', m: 1.0 }, { v: 'Caliente', l: '🔥 Hot', d: 'Referral', m: 0.9 }]
      : [{ v: 'Frío', l: '🧊 Frío', d: 'No te conoce', m: 1.15 }, { v: 'Templado', l: '☀️ Templado', d: 'Vio tu anuncio', m: 1.0 }, { v: 'Caliente', l: '🔥 Caliente', d: 'Referido', m: 0.9 }];
    // Objeción principal que enfrentará el closer (misma idea que el Trainer).
    const OBJECTIONS = [
      { v: 'Aleatoria (Sorpréndeme)', l: isEn ? '🎲 Surprise me' : '🎲 Sorpréndeme' },
      { v: 'Lo tengo que pensar', l: isEn ? '“I need to think about it”' : '“Lo tengo que pensar”' },
      { v: 'Me parece caro', l: isEn ? '“It’s too expensive”' : '“Me parece caro”' },
      { v: 'No tengo el dinero', l: isEn ? '“I don’t have the money”' : '“No tengo el dinero”' },
      { v: 'No tengo tiempo', l: isEn ? '“I don’t have time”' : '“No tengo tiempo”' },
      { v: 'Socio / Pareja', l: isEn ? '“I have to ask my partner”' : '“Lo consulto con mi socio/pareja”' },
      { v: 'No confío en mí mismo', l: isEn ? '“I don’t trust myself”' : '“No confío en mí mismo”' },
      { v: 'No confío en ustedes', l: isEn ? '“I don’t trust you”' : '“No confío en ustedes”' },
      { v: 'Excusas Rápidas (One-Liners)', l: isEn ? 'Quick excuses (one-liners)' : 'Excusas rápidas (one-liners)' },
    ];
    const randomizeLead = () => {
      const levels = ['Principiante', 'Intermedio', 'Avanzado', 'Avanzado'];
      const temps = ['Frío', 'Frío', 'Templado', 'Caliente'];
      setGenConfig(c => ({
        ...c,
        theme: randomIndustryValue(),
        level: levels[Math.floor(Math.random() * levels.length)],
        leadTemperature: temps[Math.floor(Math.random() * temps.length)],
        targetObjection: 'Aleatoria (Sorpréndeme)',
      }));
    };
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '520px', width: '100%' }}>
          <button className="btn btn-outline" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <ArrowLeft size={16} /> {isEn ? 'Back' : 'Volver'}
          </button>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '600', margin: '0 0 0.75rem' }}>
              {isEn ? 'Solo practice — AI Buyer' : 'Práctica solo — Comprador IA'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              {isEn
                ? 'A real, skeptical prospect with hidden objections and a mood that shifts with your technique. Earn their trust — or lose the call. Scored on the same rubric as team sessions.'
                : 'Un prospecto real y escéptico, con objeciones ocultas y un ánimo que cambia según tu técnica. Ganate su confianza — o perdé la llamada. Se puntúa con la misma rúbrica que las sesiones en equipo.'}
            </p>
            {/* Config del lead: las mismas opciones que el Trainer. El closer
                arma su prospecto y el producto a vender se genera en base a esto. */}
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  {isEn ? 'Build your lead' : 'Armá tu lead'}
                </div>
                <button onClick={randomizeLead} disabled={phase === 'loading'} title={isEn ? 'Random' : 'Aleatorio'}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700', background: 'rgba(255,159,10,0.1)', color: 'var(--accent)', border: '1px solid rgba(255,159,10,0.3)' }}>
                  <Shuffle size={12} /> 🎲
                </button>
              </div>

              {/* Industria / rubro */}
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                {isEn ? 'Industry' : 'Rubro / Industria'}
              </label>
              <select value={genConfig.theme} onChange={e => setGenConfig(c => ({ ...c, theme: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.88rem', fontFamily: 'inherit', cursor: 'pointer', marginBottom: '0.85rem' }}>
                <optgroup label={isEn ? 'Random' : 'Aleatorio'}>
                  <option value="Aleatorio (Sorpréndeme)">{isEn ? '🎲 Surprise me' : '🎲 Sorpréndeme'}</option>
                </optgroup>
                {INDUSTRY_CATEGORIES.map((cat) => (
                  <optgroup key={cat.es} label={isEn ? cat.en : cat.es}>
                    {cat.items.map((it) => (
                      <option key={it.es} value={it.es}>{isEn ? it.en : it.es}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Dificultad */}
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                {isEn ? 'Difficulty' : 'Dificultad'}
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
                {LEVELS.map(l => {
                  const active = genConfig.level === l.v;
                  return (
                    <button type="button" key={l.v} onClick={() => setGenConfig(c => ({ ...c, level: l.v }))}
                      style={{ flex: 1, padding: '0.55rem 0.3rem', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'center', font: 'inherit', color: 'white', border: `1px solid ${active ? 'rgba(100,210,255,0.6)' : 'rgba(255,255,255,0.07)'}`, background: active ? 'rgba(100,210,255,0.15)' : 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>{l.l}</div>
                      <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.1rem' }}>{l.d}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: '700', marginTop: '0.15rem', color: l.m > 1 ? 'var(--accent)' : l.m < 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)' }}>×{l.m}</div>
                    </button>
                  );
                })}
              </div>

              {/* Temperatura */}
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                {isEn ? 'Lead Temperature' : 'Temperatura'}
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
                {TEMPS.map(t => {
                  const active = genConfig.leadTemperature === t.v;
                  return (
                    <button type="button" key={t.v} onClick={() => setGenConfig(c => ({ ...c, leadTemperature: t.v }))}
                      style={{ flex: 1, padding: '0.55rem 0.3rem', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'center', font: 'inherit', color: 'white', border: `1px solid ${active ? 'rgba(255,159,10,0.5)' : 'rgba(255,255,255,0.07)'}`, background: active ? 'rgba(255,159,10,0.1)' : 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>{t.l}</div>
                      <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.1rem' }}>{t.d}</div>
                      <div style={{ fontSize: '0.62rem', fontWeight: '700', marginTop: '0.15rem', color: t.m > 1 ? 'var(--accent)' : t.m < 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)' }}>×{t.m}</div>
                    </button>
                  );
                })}
              </div>

              {/* Objeción principal a enfrentar */}
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                {isEn ? 'Main objection' : 'Objeción principal'}
              </label>
              <select value={genConfig.targetObjection} onChange={e => setGenConfig(c => ({ ...c, targetObjection: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.88rem', fontFamily: 'inherit', cursor: 'pointer' }}>
                {OBJECTIONS.map(o => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </div>

            {/* Selector: llamada completa o una etapa suelta */}
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                {isEn ? 'What do you want to practice?' : '¿Qué querés practicar?'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {[{ id: 'all', label: isEn ? '📞 Full call (up to 60 min)' : '📞 Llamada completa (hasta 60 min)' },
                  ...stagesList.map(s => ({ id: s.id, label: s.label }))].map(opt => {
                  const active = focusStageId === opt.id;
                  return (
                    <button key={opt.id} onClick={() => setFocusStageId(opt.id)} style={{
                      padding: '0.45rem 0.75rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700',
                      background: active ? 'linear-gradient(135deg, var(--primary), #8b5cf6)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
                      color: active ? 'white' : 'var(--text-muted)',
                    }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

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
            <div style={{ fontSize: '2.5rem' }}>{outcome === 'closed' ? '🤝' : outcome === 'timeout' ? '⏰' : '📞'}</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '600', margin: '0.5rem 0', color: outcome === 'closed' ? 'var(--success)' : 'var(--text-muted)' }}>
              {outcome === 'closed'
                ? (isEn ? 'Deal closed!' : '¡Trato cerrado!')
                : outcome === 'timeout'
                  ? (isEn ? 'Time is up (60 min)' : 'Se acabó el tiempo (60 min)')
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
                <div style={{ fontSize: '3rem', fontWeight: '700', color: analysis.overallScore >= 8 ? 'var(--success)' : analysis.overallScore >= 6 ? 'var(--accent)' : 'var(--danger)' }}>
                  {analysis.overallScore}/10
                </div>
                {analysis.gamification?.earned > 0 && (
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontWeight: '600', marginTop: '0.25rem' }}>
                      <Trophy size={16} /> +${analysis.gamification.earned.toLocaleString('en-US')}
                      {analysis.gamification.difficultyMult && analysis.gamification.difficultyMult !== 1 && (
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: analysis.gamification.difficultyMult > 1 ? 'var(--accent)' : 'var(--text-muted)', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: '2rem', padding: '0.1rem 0.5rem' }}>
                          {genConfig.level} ×{analysis.gamification.difficultyMult}
                        </span>
                      )}
                      {analysis.gamification.tempMult && analysis.gamification.tempMult !== 1 && (
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: analysis.gamification.tempMult > 1 ? 'var(--accent)' : 'var(--text-muted)', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: '2rem', padding: '0.1rem 0.5rem' }}>
                          {genConfig.leadTemperature} ×{analysis.gamification.tempMult}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {isEn
                        ? 'Solo practice earns half — real sessions with people are worth more. Harder leads pay more.'
                        : 'La práctica solo acredita la mitad — las sesiones reales con gente valen más. Los leads más difíciles pagan más.'}
                    </div>
                  </div>
                )}
              </div>
              <MethodScores scores={analysis.methodScores} />
              {(analysis.toImprove || []).length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{isEn ? 'To improve' : 'A mejorar'}</div>
                  {analysis.toImprove.map((it, i) => (
                    <div key={i} style={{ fontSize: '0.87rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>→ {it}</div>
                  ))}
                </div>
              )}
              {analysis.nextSessionTip && (
                <p style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,159,10,0.08)', borderRadius: '0.6rem', fontSize: '0.87rem', color: 'var(--text-muted)' }}>
                  💡 {analysis.nextSessionTip}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={onBack} style={{ flex: 1 }}>{isEn ? 'Back to lobby' : 'Volver al lobby'}</button>
            <button className="btn btn-primary" onClick={() => { setPhase('intro'); setScenario(null); setMessages([]); setThoughts([]); setAnalysis(null); setOutcome(null); setElapsed(0); setState(initialBuyerState()); }} style={{ flex: 1 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button onClick={leaveCall} title={isEn ? 'Back to lobby' : 'Volver al lobby'} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={18} /></button>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '700', color: elapsed >= MAX_SECONDS - 300 ? 'var(--danger)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                <Clock size={13} /> {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </span>
              {focusStage && (
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--primary)', background: 'rgba(100,210,255,0.12)', border: '1px solid rgba(100,210,255,0.3)', padding: '0.15rem 0.5rem', borderRadius: '2rem' }}>
                  {focusStage.label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowCoach(true)} title={isEn ? 'Closer coach' : 'Coach del closer'}
                style={{ ...HEADER_BTN, background: 'rgba(100,210,255,0.12)', border: '1px solid rgba(100,210,255,0.35)', color: 'var(--primary)' }}>
                <BookOpen size={16} /> {isEn ? 'Coach' : 'Coach'}
              </button>
              {speechSupported() && (
                <button onClick={() => { unlockAudio(); if (voiceOn) stopSpeaking(); setVoiceOn(v => !v); }} title={isEn ? 'Toggle voice' : 'Voz on/off'}
                  style={{ ...HEADER_BTN, background: voiceOn ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${voiceOn ? 'var(--success)' : 'rgba(255,255,255,0.15)'}`, color: voiceOn ? 'var(--success)' : 'var(--text-muted)' }}>
                  {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}
              <button onClick={hangUp} title={isEn ? 'Hang up' : 'Colgar'}
                style={{ ...HEADER_BTN, background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', color: 'var(--danger)' }}>
                <PhoneOff size={16} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
            {/* Solo el nombre: la personalidad DISC y los rasgos NO se muestran
                al closer — los tiene que descubrir conversando (como en la
                vida real). El análisis final sí los evalúa. */}
            <BuyerAvatar
              state={state}
              speaking={speaking}
              emotion={leadEmotion}
              name={leadName}
              seed={leadName}
              isEn={isEn}
              size={120}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.85rem' }}>
            {METERS.map(m => <Meter key={m.key} meter={m} value={state[m.key]} isEn={isEn} />)}
          </div>
        </div>

        {/* Producto a vender: le da clima al closer (qué ofrece). Empieza abierto y
            se puede colapsar. El "cómo" (perfil del lead, etapas) sigue en la Guía. */}
        {scenario?.productToSell && (
          <div className="glass-panel" style={{ padding: showProduct ? '0.75rem 0.9rem' : '0.5rem 0.9rem', marginBottom: '0.75rem', border: '1px solid rgba(48,209,88,0.25)', background: 'rgba(48,209,88,0.06)' }}>
            <button onClick={() => setShowProduct(v => !v)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: 'inherit' }}>
              <Package size={14} color="var(--success)" />
              <span style={{ fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--success)' }}>{isEn ? 'What you sell' : 'Qué vendés'}</span>
              {scenario.productPrice > 0 && (
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--success)' }}>· USD {Number(scenario.productPrice).toLocaleString('en-US')}</span>
              )}
              <span style={{ marginLeft: 'auto', display: 'flex', color: 'var(--text-muted)' }}>{showProduct ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
            </button>
            {showProduct && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.45 }}>{scenario.productToSell}</p>
            )}
          </div>
        )}

        {/* Mensajes */}
        <div ref={scrollRef} className="glass-panel" style={{ flex: 1, overflowY: 'auto', padding: '1rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {m.role !== 'user' && m.emotion && m.emotion !== 'neutral' && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0 0 0.2rem 0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>{EMOTION_META[m.emotion]?.emoji}</span>
                  <span style={{ fontStyle: 'italic' }}>{isEn ? EMOTION_META[m.emotion]?.en : EMOTION_META[m.emotion]?.es}</span>
                </div>
              )}
              <div style={{
                padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.9rem', lineHeight: 1.4,
                background: m.role === 'user' ? 'linear-gradient(135deg, var(--primary), #8b5cf6)' : 'rgba(255,255,255,0.06)',
                color: 'white', borderBottomRightRadius: m.role === 'user' ? '0.2rem' : '12px',
                borderBottomLeftRadius: m.role === 'user' ? '12px' : '0.2rem',
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

      {showCoach && <SoloCoachPanel onClose={() => setShowCoach(false)} />}
    </div>
  );
}

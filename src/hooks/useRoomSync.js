import { useState, useEffect } from 'react';
import { ref, onValue, set, update, serverTimestamp } from 'firebase/database';
import { db } from '../utils/db';

export function useRoomSync(roomId) {
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  // error: null = ok. Se expone para que la UI pueda mostrar un aviso de
  // reconexión en vez de quedar tildada en un estado inconsistente.
  const [error, setError] = useState(null);

  // Reference to the specific room in the database
  const roomRef = ref(db, `rooms/${roomId}`);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        setError(null);
        const data = snapshot.val();
        if (data) {
          // Parse current timestamp locally if we use server time for perfectly synced timers
          setRoomData(data);
        } else {
          // Initialize empty room. Si el set falla (permiso/red), no dejamos
          // una promesa rechazada suelta: lo registramos como error de sala.
          set(roomRef, {
            createdAt: serverTimestamp(),
            timerState: {
              isRunning: false,
              startTimestamp: 0,
              accumulatedTime: 0
            },
            activeStageIndex: 0,
            currentScenario: null,
            productPresentation: "",
            questions: [
              { id: 1, question: "¿Encontró la objeción real?", options: [{ text: "Sí", votes: 0, color: "var(--success)" }, { text: "No", votes: 0, color: "var(--danger)" }] },
              { id: 2, question: "¿Quién tuvo el control?", options: [{ text: "Cliente", votes: 0, color: "var(--secondary)" }, { text: "Vendedor", votes: 0, color: "var(--primary)" }] },
              { id: 3, question: "¿Qué faltó?", options: [{ text: "Más preguntas", votes: 0, color: "var(--accent)" }, { text: "Mejor escucha", votes: 0, color: "#8B5CF6" }, { text: "Mejor cierre", votes: 0, color: "#06B6D4" }] }
            ],
            debriefNotes: {}
          }).catch((err) => {
            console.error('[useRoomSync] No se pudo inicializar la sala:', err);
            setError(err);
          });
        }
        setLoading(false);
      },
      (err) => {
        // Callback de error de onValue: sin esto, un fallo de lectura
        // (permiso denegado, red caída) deja loading=true para siempre y la
        // pantalla queda clavada en "Loading...".
        console.error('[useRoomSync] Error al leer la sala:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // Toda escritura pasa por acá: RTDB ya reintenta y encola writes cuando la
  // conexión vuelve, así que atrapar el rechazo inmediato evita "unhandled
  // rejection" sin perder el dato. Devuelve true/false por si el caller quiere
  // reaccionar (ej. mostrar un toast), pero nunca lanza.
  const safeWrite = async (payload, label) => {
    try {
      await update(roomRef, payload);
      return true;
    } catch (err) {
      console.error(`[useRoomSync] Falló la escritura (${label}):`, err);
      return false;
    }
  };

  // Expose methods to update specific parts of the room
  const updateScenario = (scenario) => safeWrite({ currentScenario: scenario }, 'scenario');

  const updateTimer = (timerState) => safeWrite({ timerState }, 'timer');

  const updateActiveStage = (index) => safeWrite({ activeStageIndex: index }, 'activeStage');

  const updateQuestions = (newQuestions) => safeWrite({ questions: newQuestions }, 'questions');

  const updateDebriefNotes = (notes) => safeWrite({ debriefNotes: notes }, 'debriefNotes');

  const triggerSurpriseEvent = (eventText) =>
    safeWrite({ surpriseEvent: { text: eventText, id: Date.now() } }, 'surpriseEvent');

  const updateProductPresentation = (text) => safeWrite({ productPresentation: text }, 'productPresentation');

  const updateSessionStartedAt = () => safeWrite({ sessionStartedAt: Date.now() }, 'sessionStartedAt');

  // Checkout simulado (Etapa 3)
  const enableCheckout = () =>
    safeWrite({ checkout: { enabled: true, phase: 'idle', result: null, completedAt: null } }, 'enableCheckout');

  const updateCheckoutPhase = (phase, result = null) =>
    safeWrite({
      'checkout/phase': phase,
      'checkout/result': result,
      'checkout/completedAt': result ? Date.now() : null
    }, 'checkoutPhase');

  // Rúbrica de evaluación del Closer (puntajes 1-5 por criterio).
  const updateRubric = (rubric) => safeWrite({ rubric }, 'rubric');

  // Config de la sala seteada por el Trainer (comisión %, producto real, etc.).
  const updateConfig = (config) => safeWrite({ config }, 'config');

  // Registra quién actúa de Closer (para acreditarle la comisión al analizar).
  const registerCloser = (uid, name) => safeWrite({ closerUid: uid, closerName: name || null }, 'closer');

  return {
    roomData,
    loading,
    error,
    updateScenario,
    updateTimer,
    updateActiveStage,
    updateQuestions,
    updateDebriefNotes,
    triggerSurpriseEvent,
    updateProductPresentation,
    updateSessionStartedAt,
    enableCheckout,
    updateCheckoutPhase,
    updateRubric,
    updateConfig,
    registerCloser
  };
}

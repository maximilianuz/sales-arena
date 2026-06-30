import { useState, useEffect } from 'react';
import { ref, onValue, set, update, serverTimestamp } from 'firebase/database';
import { db } from '../utils/db';

export function useRoomSync(roomId) {
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reference to the specific room in the database
  const roomRef = ref(db, `rooms/${roomId}`);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Parse current timestamp locally if we use server time for perfectly synced timers
        setRoomData(data);
      } else {
        // Initialize empty room
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
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Expose methods to update specific parts of the room
  const updateScenario = async (scenario) => {
    await update(roomRef, { currentScenario: scenario });
  };

  const updateTimer = async (timerState) => {
    await update(roomRef, { timerState });
  };

  const updateActiveStage = async (index) => {
    await update(roomRef, { activeStageIndex: index });
  };

  const updateQuestions = async (newQuestions) => {
    await update(roomRef, { questions: newQuestions });
  };

  const updateDebriefNotes = async (notes) => {
    await update(roomRef, { debriefNotes: notes });
  };

  const triggerSurpriseEvent = async (eventText) => {
    await update(roomRef, { surpriseEvent: { text: eventText, id: Date.now() } });
  };

  const updateProductPresentation = async (text) => {
    await update(roomRef, { productPresentation: text });
  };

  const updateSessionStartedAt = async () => {
    await update(roomRef, { sessionStartedAt: Date.now() });
  };

  // Checkout simulado (Etapa 3)
  const enableCheckout = async () => {
    await update(roomRef, { checkout: { enabled: true, phase: 'idle', result: null, completedAt: null } });
  };

  const updateCheckoutPhase = async (phase, result = null) => {
    await update(roomRef, {
      'checkout/phase': phase,
      'checkout/result': result,
      'checkout/completedAt': result ? Date.now() : null
    });
  };

  return {
    roomData,
    loading,
    updateScenario,
    updateTimer,
    updateActiveStage,
    updateQuestions,
    updateDebriefNotes,
    triggerSurpriseEvent,
    updateProductPresentation,
    updateSessionStartedAt,
    enableCheckout,
    updateCheckoutPhase
  };
}

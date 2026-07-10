import { auth } from './db';
import { buildBuyerSystem, initialBuyerState } from './buyerPrompt';
import { buildCloserSystem } from './closerPrompt';

// Cliente del COMPRADOR IA. Cada turno reconstruye el system prompt con el
// estado actual (temperatura/confianza/paciencia) y lo manda junto con el
// historial. El estado vive en el cliente y se reinyecta → memoria emocional.

export { initialBuyerState };

async function roleplayTurn(system, history) {
  const res = await fetch('/api/roleplay-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: auth.currentUser?.uid,
      system,
      // Solo role+content: los mensajes de la UI llevan campos extra (emotion,
      // technique) que la API de la IA rechaza.
      messages: (history || []).map(m => ({ role: m.role, content: m.content }))
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en el turno');
  return data;
}

// history: [{ role: 'user'|'assistant', content }] donde user = closer.
// Devuelve el turno del lead: { reply, emotion, state, thought, outcome }.
export async function buyerTurn({ scenario, state, history, language = 'es', focusStage = null }) {
  // Cuántas veces habló el closer = profundidad de la llamada (el lead no debe
  // cerrar en 10 min: una decisión high-ticket lleva muchas idas y vueltas).
  const exchangeCount = (history || []).filter(m => m.role === 'user').length;
  return roleplayTurn(buildBuyerSystem(scenario, state, language, focusStage, exchangeCount), history);
}

// Turno del CLOSER IA experto (modos "Ser Lead" / "Observador"). En el history
// user = líneas del LEAD y assistant = líneas del closer. Devuelve
// { reply, thought (= técnica aplicada), outcome }.
export async function closerTurn({ scenario, history, language = 'es', stages = [] }) {
  return roleplayTurn(buildCloserSystem(scenario, language, stages), history);
}

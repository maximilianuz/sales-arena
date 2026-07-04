import { auth } from './db';
import { buildBuyerSystem, initialBuyerState } from './buyerPrompt';

// Cliente del COMPRADOR IA. Cada turno reconstruye el system prompt con el
// estado actual (temperatura/confianza/paciencia) y lo manda junto con el
// historial. El estado vive en el cliente y se reinyecta → memoria emocional.

export { initialBuyerState };

// history: [{ role: 'user'|'assistant', content }]. Devuelve el turno del lead.
export async function buyerTurn({ scenario, state, history, language = 'es' }) {
  const system = buildBuyerSystem(scenario, state, language);
  const res = await fetch('/api/roleplay-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid: auth.currentUser?.uid,
      system,
      messages: history
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en el turno');
  return data; // { reply, state, revealedHiddenObjection, thought, outcome }
}

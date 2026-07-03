import { auth } from './db';

// Cliente de la cantera de closers. El opt-in/opt-out y el listado pasan por
// la función serverless (que aplica el filtro: listar exige plan Trainer).

async function scoutingRequest(action, extra = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado');

  const res = await fetch('/api/scouting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, uid: user.uid, ...extra })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

export function setScoutingProfile({ openToWork, name, headline, contactEmail, country }) {
  return scoutingRequest('set-profile', { openToWork, name, headline, contactEmail, country });
}

export function listScouting() {
  return scoutingRequest('list');
}

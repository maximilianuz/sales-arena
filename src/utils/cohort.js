import { auth } from './db';

async function cohortRequest(action, extra = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado');

  const res = await fetch('/api/cohort', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, uid: user.uid, ...extra })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

export function getCohortCode() {
  return cohortRequest('get-code');
}

export function joinCohort(code) {
  const user = auth.currentUser;
  return cohortRequest('join', {
    code,
    name: user?.displayName || user?.email?.split('@')[0] || 'Alumno',
    email: user?.email || ''
  });
}

export function leaveCohort() {
  return cohortRequest('leave');
}

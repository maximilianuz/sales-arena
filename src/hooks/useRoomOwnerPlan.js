import { useState, useEffect } from 'react';

// Consulta al servidor si el dueño de la sala tiene plan pago activo (feature
// "el owner paga y el resto entra gratis"). No lee users/{ownerId} directo:
// las reglas de Firebase solo permiten que cada usuario lea su propio nodo,
// así que un participante que no es el dueño recibiría PERMISSION_DENIED.
export function useRoomOwnerPlan(roomData) {
  const [ownerIsPaid, setOwnerIsPaid] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(true);

  useEffect(() => {
    const ownerId = roomData?.ownerId;
    let alive = true;
    (async () => {
      if (!ownerId) {
        if (alive) { setOwnerIsPaid(false); setOwnerLoading(false); }
        return;
      }
      if (alive) setOwnerLoading(true);
      try {
        const res = await fetch('/api/room-owner-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId })
        });
        const data = await res.json().catch(() => ({}));
        if (alive) setOwnerIsPaid(res.ok && !!data.isPaid);
      } catch {
        if (alive) setOwnerIsPaid(false);
      } finally {
        if (alive) setOwnerLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [roomData?.ownerId]);

  return { ownerIsPaid, ownerLoading };
}

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../utils/db';

export function useSubscription(uid) {
  const [status, setStatus] = useState(undefined); // undefined = cargando
  const [plan, setPlan] = useState(null);
  const [expiry, setExpiry] = useState(null);

  useEffect(() => {
    if (!uid) { setStatus(null); return; }

    const userRef = ref(db, `users/${uid}`);
    const unsub = onValue(userRef, (snap) => {
      const data = snap.val() || {};
      // 'none' = todavía NO eligió plan → el gate muestra la pantalla de planes
      // apenas entra. Recién al elegir (free o pago) se escribe subscriptionStatus
      // y se abre el acceso. Antes defaulteaba a 'free' y los planes no se veían.
      setStatus(data.subscriptionStatus || 'none');
      setPlan(data.subscriptionPlan || null);
      setExpiry(data.subscriptionExpiry || null);
    });

    return () => unsub();
  }, [uid]);

  const isActive = status === 'active' && (!expiry || expiry > Date.now());
  const isLoading = status === undefined;

  return { status, plan, expiry, isActive, isLoading };
}

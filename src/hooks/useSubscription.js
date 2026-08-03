import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../utils/db';
import { auth } from '../utils/db';

export function useSubscription(uid) {
  const [status, setStatus] = useState(undefined); // undefined = cargando
  const [plan, setPlan] = useState(null);
  const [expiry, setExpiry] = useState(null);
  const [authCheckDone, setAuthCheckDone] = useState(false);

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

      // Si el usuario no tiene plan elegido aún y no hemos verificado autorización,
      // hacemos la verificación
      if ((data.subscriptionStatus || 'none') === 'none' && !authCheckDone) {
        verifyEmailAuthorization(uid);
      }
    });

    return () => unsub();
  }, [uid, authCheckDone]);

  const verifyEmailAuthorization = async (userId) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;

    try {
      const res = await fetch('/api/verify-authorized-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, email: currentUser.email })
      });

      // Si la verificación fue exitosa, el servidor ya actualizó subscriptionStatus
      // y el listener de onValue arriba se actualizará automáticamente
      if (!res.ok) {
        // Email no está autorizado, pero no hacemos nada aquí
        // El usuario verá la pantalla de planes normalmente
      }
    } catch (error) {
      console.error('Error checking email authorization:', error);
    } finally {
      setAuthCheckDone(true);
    }
  };

  const isActive = status === 'active' && (!expiry || expiry > Date.now());
  const isLoading = status === undefined;

  return { status, plan, expiry, isActive, isLoading };
}

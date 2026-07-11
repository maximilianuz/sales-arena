import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../utils/db';

export function useRoomOwnerPlan(roomData) {
  const [ownerIsPaid, setOwnerIsPaid] = useState(false);
  const [ownerLoading, setOwnerLoading] = useState(true);

  useEffect(() => {
    if (!roomData?.ownerId) {
      setOwnerIsPaid(false);
      setOwnerLoading(false);
      return;
    }

    const ownerRef = ref(db, `users/${roomData.ownerId}`);
    const unsub = onValue(
      ownerRef,
      (snap) => {
        const ownerData = snap.val() || {};
        const ownerStatus = ownerData.subscriptionStatus || 'none';
        const ownerExpiry = ownerData.subscriptionExpiry;

        // El propietario es Pro si:
        // 1. Su estado es 'active'
        // 2. No tiene fecha de expiración O la fecha no ha pasado
        const isActive = ownerStatus === 'active' && (!ownerExpiry || ownerExpiry > Date.now());
        setOwnerIsPaid(isActive);
        setOwnerLoading(false);
      },
      () => {
        setOwnerIsPaid(false);
        setOwnerLoading(false);
      }
    );

    return () => unsub();
  }, [roomData?.ownerId]);

  return { ownerIsPaid, ownerLoading };
}

import React, { createContext, useContext, useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { FREE_ACCESS_MODE } from '../config/appMode';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ user, children }) {
  const { status, plan, expiry, isActive, isLoading } = useSubscription(user?.uid);
  const [showPlans, setShowPlans] = useState(false);

  // En modo acceso gratis: todos quedan como "Pro" (isPaid) y sin las
  // limitaciones del plan free (isFree = false). Así se desbloquean todas las
  // funciones individuales/grupales sin exigir pago. Ver src/config/appMode.js.
  const rawFree = status === 'free';
  const isFree = FREE_ACCESS_MODE ? false : rawFree;
  const isPaid = FREE_ACCESS_MODE ? true : (isActive && !rawFree);
  const tier = isPaid ? (plan?.startsWith('trainer') ? 'trainer' : 'closer') : (isFree ? 'free' : null);

  return (
    <SubscriptionContext.Provider value={{
      status, plan, expiry, isActive, isLoading, isFree, isPaid, tier,
      showPlans, openPlans: () => setShowPlans(true), closePlans: () => setShowPlans(false)
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}

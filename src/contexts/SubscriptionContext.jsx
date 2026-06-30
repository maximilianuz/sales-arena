import React, { createContext, useContext, useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ user, children }) {
  const { status, plan, expiry, isActive, isLoading } = useSubscription(user?.uid);
  const [showPlans, setShowPlans] = useState(false);

  const isFree = status === 'free';
  const isPaid = isActive && !isFree;
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

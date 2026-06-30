import React, { createContext, useContext } from 'react';
import { useSubscription } from '../hooks/useSubscription';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ user, children }) {
  const { status, plan, expiry, isActive, isLoading } = useSubscription(user?.uid);

  const isFree = status === 'free';
  const isPaid = isActive && !isFree;
  const tier = isPaid ? (plan?.startsWith('trainer') ? 'trainer' : 'closer') : (isFree ? 'free' : null);

  return (
    <SubscriptionContext.Provider value={{ status, plan, expiry, isActive, isLoading, isFree, isPaid, tier }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}

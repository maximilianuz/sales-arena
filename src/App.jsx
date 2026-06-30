import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './pages/Lobby';
import Room from './pages/Room';
import Login from './pages/Login';
import SubscriptionGate from './components/SubscriptionGate';
import { SubscriptionProvider, useSubscriptionContext } from './contexts/SubscriptionContext';
import { subscribeToAuthState } from './utils/auth';
import './App.css';

function GatedRoutes({ user }) {
  const { isActive, isLoading, isFree, showPlans, closePlans } = useSubscriptionContext();
  const hasAccess = (isActive || isFree) && !showPlans;

  return (
    <SubscriptionGate user={user} isActive={hasAccess} isLoading={isLoading} onClose={closePlans}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </SubscriptionGate>
  );
}

function AuthenticatedApp({ user }) {
  return (
    <SubscriptionProvider user={user}>
      <GatedRoutes user={user} />
    </SubscriptionProvider>
  );
}

function App() {
  const [user, setUser] = useState(undefined); // undefined = cargando, null = sin sesión

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(setUser);
    return () => unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!user) return <Login />;

  return <AuthenticatedApp user={user} />;
}

export default App;

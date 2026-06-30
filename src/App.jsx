import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './pages/Lobby';
import Room from './pages/Room';
import Login from './pages/Login';
import SubscriptionGate from './components/SubscriptionGate';
import { subscribeToAuthState } from './utils/auth';
import { useSubscription } from './hooks/useSubscription';
import './App.css';

function AuthenticatedApp({ user }) {
  const { isActive, isLoading } = useSubscription(user.uid);

  return (
    <SubscriptionGate user={user} isActive={isActive} isLoading={isLoading}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </SubscriptionGate>
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

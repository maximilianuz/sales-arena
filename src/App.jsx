import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SubscriptionGate from './components/SubscriptionGate';
import { SubscriptionProvider, useSubscriptionContext } from './contexts/SubscriptionContext';
import { subscribeToAuthState } from './utils/auth';
import './App.css';

// Code-splitting por ruta: Room arrastra ~21 componentes + utilidades de IA +
// prompts, y Lobby su propia carga. Cargarlos bajo demanda saca ese peso del
// bundle inicial → primer render mucho más rápido (clave en móvil / conexiones
// lentas). Login queda estático porque es la primera pantalla y no debe parpadear.
const Lobby = lazy(() => import('./pages/Lobby'));
const Room = lazy(() => import('./pages/Room'));

function RouteFallback() {
  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
    </div>
  );
}

function GatedRoutes({ user }) {
  const { isActive, isLoading, isFree, showPlans, closePlans } = useSubscriptionContext();
  const hasAccess = (isActive || isFree) && !showPlans;

  return (
    <SubscriptionGate user={user} isActive={hasAccess} isLoading={isLoading} onClose={closePlans}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Lobby />} />
            <Route path="/room/:roomId" element={<Room />} />
          </Routes>
        </Suspense>
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

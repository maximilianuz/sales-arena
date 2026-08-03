import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SubscriptionGate from './components/SubscriptionGate';
import { SubscriptionProvider, useSubscriptionContext } from './contexts/SubscriptionContext';
import { subscribeToAuthState } from './utils/auth';
import { GROUP_ONLY_MODE, FREE_ACCESS_MODE } from './config/appMode';
import './App.css';

// Code-splitting por ruta: Room arrastra ~21 componentes + utilidades de IA +
// prompts, y Lobby su propia carga. Cargarlos bajo demanda saca ese peso del
// bundle inicial → primer render mucho más rápido (clave en móvil / conexiones
// lentas). Login queda estático porque es la primera pantalla y no debe parpadear.
const Lobby = lazy(() => import('./pages/Lobby'));
const Room = lazy(() => import('./pages/Room'));
// Vista pública de propuestas VIP (/p/:id). Se carga solo cuando un prospecto
// abre el link, y esquiva por completo el login (no necesita cuenta).
const PublicProposal = lazy(() => import('./modules/proposals/PublicProposal'));

function RouteFallback() {
  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
    </div>
  );
}

function GatedRoutes({ user }) {
  const { isActive, isLoading, isFree, showPlans, closePlans } = useSubscriptionContext();
  // En modo solo-grupal o acceso-gratis nadie ve la pantalla de pagos: se entra
  // directo con acceso completo. En modo normal el acceso depende de tener plan
  // (free o activo) y de no estar mirando la pantalla de planes.
  const hasAccess = GROUP_ONLY_MODE
    ? (isActive || isFree)
    : FREE_ACCESS_MODE
    ? true
    : (isActive || isFree) && !showPlans;

  return (
    // onClose solo cuando el usuario abrió planes manualmente (showPlans): en el
    // primer ingreso (sin plan elegido) no hay "volver" — debe elegir un plan.
    <SubscriptionGate user={user} isActive={hasAccess} isLoading={isLoading} onClose={showPlans ? closePlans : undefined}>
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

  // Ruta pública: si la URL es /p/:id mostramos la propuesta sin pedir login.
  // Va antes de cualquier chequeo de sesión para que el prospecto la vea directo.
  if (window.location.pathname.startsWith('/p/')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <PublicProposal />
      </Suspense>
    );
  }

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

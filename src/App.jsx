import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './pages/Lobby';
import Room from './pages/Room';
import Login from './pages/Login';
import { subscribeToAuthState } from './utils/auth';
import './App.css';

function App() {
  const [user, setUser] = useState(undefined); // undefined = cargando, null = sin sesión

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(setUser);
    return () => unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

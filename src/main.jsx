import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { logError } from './utils/telemetry'
import './i18n/index.js'

// Última línea de defensa + observador Kaizen: promesas rechazadas sin .catch y
// errores sueltos se registran en la telemetría (Firebase) para que el dueño los
// revise y mejore en continuo, además de loguearlos localmente.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[global] Promesa rechazada sin manejar:', event.reason);
    logError(event.reason, { source: 'unhandledrejection' });
  });
  window.addEventListener('error', (event) => {
    console.error('[global] Error no capturado:', event.error || event.message);
    logError(event.error || event.message, { source: 'window.error' });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

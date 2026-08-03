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

  // Remover elementos de debug/UID que se inyecten dinámicamente en la página
  const removeUIDElements = () => {
    document.querySelectorAll('[style*="UID"], [style*="uid"], [class*="uid-badge"], [data-testid*="uid"]').forEach(el => {
      el.style.display = 'none';
    });
    // Buscar y ocultar elementos que contengan texto "UID:" o "V8AGEhfn"
    document.querySelectorAll('*').forEach(el => {
      if (el.textContent && (el.textContent.includes('UID:') || el.textContent.includes('V8AGEhfn'))) {
        // Solo ocultar si es un elemento pequeño (como un badge), no toda la página
        if (el.children.length === 0 || el.textContent.length < 100) {
          el.style.display = 'none';
        }
      }
    });
  };

  // Ejecutar cuando se carga el DOM y cada vez que cambia
  document.addEventListener('DOMContentLoaded', removeUIDElements);
  const observer = new MutationObserver(removeUIDElements);
  observer.observe(document.body, { childList: true, subtree: true });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

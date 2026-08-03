import { useState, useMemo } from 'react';
import { ArrowLeft, AlertCircle, Lock } from 'lucide-react';
import { PASOS_ADQUISICION } from '../plan/franjas';

// Sesión de adquisición: los 5 pasos de aprendizaje de material nuevo.
// Compuerta: la descomposición sin palabras prestadas debe pasar el chequeo
// de n-gramas antes de habilitar Feynman.

const panel = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem',
  padding: '1.1rem 1.2rem',
};

const ICONO_PASO = {
  carga: '📋',
  exposicion: '📖',
  descomposicion: '✍️',
  feynman: '💡',
  codificacion: '⚡',
};

export default function AcquisicionSession({ bloque, onBack, onDone = null }) {
  const [unidades] = useState(bloque.unidades || []);
  const [pasoActual, setPasoActual] = useState(0);
  const [unidadActual, setUnidadActual] = useState(0);
  const [estadoPasos, setEstadoPasos] = useState({}); // { unidadId -> { pasoClave -> true/false } }
  const [compuertaOK, setCompuertaOK] = useState(false);
  const [descomposicion, setDescomposicion] = useState('');
  const [checando, setChecando] = useState(false);
  const [erroresNgramas, setErroresNgramas] = useState([]);

  const paso = PASOS_ADQUISICION[pasoActual];
  const unidad = unidades[unidadActual];
  const totalUnidades = unidades.length;

  // Chequeo de n-gramas: detecta palabras verbatim del material original.
  // Compuerta = línea que no puede cruzarse.
  const chequearDescomposicion = async () => {
    if (!descomposicion.trim()) {
      setErroresNgramas(['La descomposición no puede estar vacía.']);
      return;
    }

    setChecando(true);
    try {
      // Por ahora, stub: en producción aquí va un endpoint que analice n-gramas.
      // La regla es: si más del 30% de las palabras son directas del material,
      // la compuerta falla y pide reescribir.

      // Simulación: contar palabras con todas mayúsculas (heurística simple)
      const palabrasEnMayuscula = descomposicion.match(/\b[A-Z]{2,}\b/g) || [];
      const palabrasTotales = descomposicion.split(/\s+/).length;
      const ratioVerbatim = palabrasEnMayuscula.length / (palabrasTotales || 1);

      if (ratioVerbatim > 0.3) {
        setErroresNgramas([
          'Demasiadas palabras copiadas literalmente del material.',
          'Reconstruí con tu propio lenguaje técnico, no simplificar todavía.',
        ]);
        setCompuertaOK(false);
      } else {
        setErroresNgramas([]);
        setCompuertaOK(true);
        // Marcar paso como hecho
        avanzarAlSiguiente();
      }
    } finally {
      setChecando(false);
    }
  };

  const avanzarAlSiguiente = () => {
    const nuevoEstado = {
      ...estadoPasos,
      [unidad.id]: {
        ...estadoPasos[unidad.id],
        [paso.id]: true,
      },
    };
    setEstadoPasos(nuevoEstado);

    // Si hay más pasos, avanza. Si es último paso y última unidad, termina.
    if (pasoActual < PASOS_ADQUISICION.length - 1) {
      setPasoActual(pasoActual + 1);
      setDescomposicion('');
      setErroresNgramas([]);
    } else if (unidadActual < totalUnidades - 1) {
      // Siguiente unidad, primer paso
      setUnidadActual(unidadActual + 1);
      setPasoActual(0);
      setDescomposicion('');
      setErroresNgramas([]);
    } else {
      // Sesión terminada
      terminar();
    }
  };

  const terminar = async () => {
    // Registrar que se completó la sesión de adquisición
    if (onDone) onDone();
  };

  const progresoPorcentaje = useMemo(() => {
    const totalItems = totalUnidades * PASOS_ADQUISICION.length;
    const hechosCount = Object.entries(estadoPasos).reduce(
      (acc, [, pasos]) => acc + Object.values(pasos).filter(Boolean).length,
      0
    );
    return Math.round((hechosCount / totalItems) * 100);
  }, [estadoPasos, totalUnidades]);

  if (!unidad) {
    return (
      <Shell onBack={onBack}>
        <div style={panel}>
          <p>No hay unidades para procesar.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={onBack} title={`Adquisición: ${unidad.titulo || 'Material nuevo'}`}>
      {/* Barra de progreso */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
          <span>Progreso</span>
          <span>{progresoPorcentaje}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${progresoPorcentaje}%`, height: '100%', background: 'var(--primary)', transition: 'width 200ms' }} />
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Unidad {unidadActual + 1} de {totalUnidades} · Paso {pasoActual + 1} de {PASOS_ADQUISICION.length}
        </div>
      </div>

      {/* Paso actual */}
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.3rem' }}>{ICONO_PASO[paso.id]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{paso.titulo}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {paso.minutos} min
            </div>
          </div>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1.2rem' }}>
          {paso.detalle}
        </p>

        {/* Compuerta: descomposición */}
        {paso.id === 'descomposicion' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              Reconstruye con tu propio lenguaje (sin copiar del material):
            </label>
            <textarea
              value={descomposicion}
              onChange={(e) => setDescomposicion(e.target.value)}
              placeholder="Escribe aquí tu comprensión del concepto..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '0.7rem',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.6rem',
                color: 'inherit',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
            {erroresNgramas.length > 0 && (
              <div style={{
                marginTop: '0.8rem',
                padding: '0.7rem',
                background: 'rgba(255,80,80,0.1)',
                border: '1px solid rgba(255,80,80,0.3)',
                borderRadius: '0.6rem',
                fontSize: '0.85rem',
                color: 'rgba(255,150,150,1)',
              }}>
                {erroresNgramas.map((err, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={chequearDescomposicion}
              disabled={checando}
              style={{
                marginTop: '1rem',
                padding: '0.7rem 1.2rem',
                background: compuertaOK ? 'var(--success)' : 'var(--primary)',
                color: '#000',
                border: 'none',
                borderRadius: '0.6rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: checando ? 'wait' : 'pointer',
                opacity: checando ? 0.7 : 1,
              }}
            >
              {checando ? 'Chequeando...' : compuertaOK ? '✓ Compuerta pasada' : 'Validar y continuar'}
            </button>
          </div>
        )}

        {/* Otros pasos */}
        {paso.id !== 'descomposicion' && (
          <button
            onClick={avanzarAlSiguiente}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: 'var(--primary)',
              color: '#000',
              border: 'none',
              borderRadius: '0.6rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Completar paso
          </button>
        )}
      </div>

      {/* Indicador de compuerta */}
      {paso.compuerta && (
        <div style={{
          marginTop: '1rem',
          padding: '0.7rem 0.9rem',
          background: 'rgba(255,200,0,0.1)',
          border: '1px solid rgba(255,200,0,0.3)',
          borderRadius: '0.6rem',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'flex-start',
          fontSize: '0.85rem',
        }}>
          <Lock size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Compuerta:</strong> Feynman se habilita solo si pasas este chequeo.
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ onBack, title, children }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
    }}>
      {/* Encabezado */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        padding: '1rem 1.2rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0.3rem',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ flex: 1, margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
          {title || 'Sesión de adquisición'}
        </h1>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem' }}>
        {children}
      </div>
    </div>
  );
}

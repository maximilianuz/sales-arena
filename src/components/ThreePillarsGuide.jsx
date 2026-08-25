import { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Guía de referencia ESTÁTICA (no depende de IA ni del escenario) con el
// framework de pitch "Puente de 3 Pilares" del dueño del producto. Es solo
// consulta para el Closer HUMANO durante la práctica — no afecta al lead IA
// ni al scoring/análisis de la sesión, no se conecta a la generación de
// escenarios. Contenido transcripto tal cual, en español (metodología propia
// del cliente) — solo el título del panel se traduce.
// Colapsable y colapsado por defecto (mismo patrón que "Qué vendés" /
// "Product reference"): es referencia, no debe tapar la práctica.

function PillarBlock({ title, children }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#a78bfa', marginBottom: '0.35rem' }}>{title}</div>
      {children}
    </div>
  );
}

// Resalta lo que viene del producto real (vs. lo que sigue siendo un corchete
// porque depende del lead de esta llamada puntual, no del producto).
function Filled({ children }) {
  return <strong style={{ color: '#c4b5fd' }}>{children}</strong>;
}

export default function ThreePillarsGuide({ defaultOpen = false, product }) {
  const [open, setOpen] = useState(defaultOpen);
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  // Datos del producto real que se está vendiendo en esta sesión (del
  // escenario: estampado del producto real de la sala, o generado por IA).
  // Con esto el framework deja de ser 100% abstracto para las partes que
  // dependen del PRODUCTO — lo que depende del LEAD (dolor, situación actual)
  // sigue en corchetes porque recién se sabe charlando con él.
  const name = product?.name?.trim();
  const deliverable = product?.differentiator?.trim() || (Array.isArray(product?.includes) && product.includes.length > 0 ? product.includes.join(', ') : '');
  const outcome = product?.outcome?.trim();
  const price = Number(product?.price) > 0 ? Number(product.price) : null;
  const hasProduct = !!(name || deliverable || outcome || price);

  return (
    <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: '0.75rem', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{ width: '100%', padding: '0.7rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa', textAlign: 'left', font: 'inherit' }}
      >
        <Layers size={14} />
        <span style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {isEn ? 'Framework: 3-Pillar Bridge' : 'Framework: Puente de 3 Pilares'}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex' }}>{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>
      {open && (
        <div style={{ padding: '0 0.9rem 1rem', fontSize: '0.83rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 0.9rem', fontWeight: '700', color: 'white' }}>PUENTE DE 3 PILARES PARA EL ÉXITO</p>

          {hasProduct && (
            <div style={{ margin: '0 0 1rem', padding: '0.6rem 0.75rem', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>
                {isEn ? 'Applied to what you sell in this session:' : 'Aplicado a lo que vendés en esta sesión:'}
              </p>
              {name && <p style={{ margin: '0.2rem 0 0', fontWeight: '800', color: 'white' }}>{name}{price ? ` — USD ${price.toLocaleString('en-US')}` : ''}</p>}
              {deliverable && <p style={{ margin: '0.2rem 0 0', color: 'rgba(255,255,255,0.85)' }}>{deliverable}</p>}
            </div>
          )}

          <PillarBlock title="Pilar 1 — Promesa de Alto Valor">
            <p style={{ margin: '0 0 0.4rem' }}>La promesa de alto nivel consta de 2 frases que muestran el "resultado final" que {name ? <Filled>{name}</Filled> : 'tu oferta'} está diseñada para proporcionar.</p>
            <ul style={{ margin: '0 0 0.4rem', paddingLeft: '1.1rem' }}>
              <li>Objetivo: que el cliente esté conectado con el RESULTADO (no con el proceso) → aumenta la certeza y da "tangibilidad"</li>
              <li>Debe ser específico en el resultado y en un tiempo concreto</li>
              <li>El % o métrica exacta importa poco — es valioso pero no es la fórmula central</li>
            </ul>
            <p style={{ margin: 0, fontStyle: 'italic', color: 'rgba(255,255,255,0.75)' }}>
              Fórmula base: "Estos van a ser los [# de pilares] para llevarte de [situación actual] a {outcome ? <Filled>{outcome}</Filled> : '[situación deseada]'} en [período de tiempo aprox]"
            </p>
          </PillarBlock>

          <PillarBlock title="Pilar 2 — Mecanismo (Dolor → Solución → Beneficio)">
            <p style={{ margin: '0 0 0.5rem' }}>Tres variantes de fórmula, usar la que mejor encaje:</p>

            <p style={{ margin: '0 0 0.25rem', fontWeight: '700', color: 'rgba(255,255,255,0.92)' }}>Fórmula A:</p>
            <ol style={{ margin: '0 0 0.6rem', paddingLeft: '1.2rem' }}>
              <li>Cómo no [dolor lógico]</li>
              <li>Y te está haciendo sentir [dolor emocional]</li>
              <li>Bueno, lo que hacemos aquí es {deliverable ? <Filled>{deliverable}</Filled> : '[entregable / cómo funciona]'}</li>
              <li>Para que puedas tener [beneficio lógico]</li>
              <li>Lo que te permitirá [beneficio emocional]</li>
              <li>¿Cuál es el sentido? [atalo]</li>
              <li>Y la razón por la que esto es tan importante es que [consecuencia de no tener eso] (opcional)</li>
            </ol>

            <p style={{ margin: '0 0 0.25rem', fontWeight: '700', color: 'rgba(255,255,255,0.92)' }}>Fórmula B (agitación del problema):</p>
            <ol style={{ margin: '0 0 0.6rem', paddingLeft: '1.2rem' }}>
              <li>La mayor parte del mercado está haciendo esto... [el error]</li>
              <li>Pero el problema de esto es... [explica el problema]</li>
              <li>Y lo que pasa por eso es... [la razón por la que el problema es un problema]</li>
              <li>Lo que en última instancia significa... [la última consecuencia del problema]</li>
              <li>Entonces, en cambio, lo que hacemos es... [la característica]</li>
              <li>Para que puedas... [beneficio inverso del problema]</li>
              <li>Y en definitiva... [beneficio del beneficio]</li>
            </ol>

            <p style={{ margin: 0 }}>
              <strong style={{ color: 'rgba(255,255,255,0.92)' }}>Fórmula C:</strong> Igual que la Fórmula B, pero reescrita para sonar natural hablada en voz alta (no leída).
            </p>
          </PillarBlock>

          <PillarBlock title="Pilar 3 — Entrega del Servicio">
            <p style={{ margin: '0 0 0.4rem' }}>
              Después de atar todos los pilares, dar una breve explicación de CÓMO se cumplen esos pilares
              {deliverable ? <> — en tu caso, sobre <Filled>{deliverable}</Filled></> : ''}.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              <li>La mente del prospecto se desvía naturalmente del "qué" al "cómo" — hay que abordarlo antes de que se convierta en objeción</li>
              <li>Ser MUY breve: decir lo suficiente para (1) establecer expectativas realistas y (2) que tenga sentido el cómo va a ser la entrega — sin dar tanto detalle que suene "más de lo mismo" (ej: comparar llamadas grupales vs. acompañamiento 1 a 1)</li>
              <li>Responder antes las dudas típicas: ¿qué tan rápido voy a obtener soporte? ¿qué pasa después? ¿me voy a perder? ¿voy a tener suficiente apoyo para tener éxito?</li>
              <li>Usarlo para eliminar objeciones/inquietudes antes de que aparezcan</li>
            </ul>
          </PillarBlock>
        </div>
      )}
    </div>
  );
}

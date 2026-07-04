// Avatar reactivo estilizado del comprador IA. Es una cara SVG que refleja EN
// VIVO el estado emocional que ya calcula el buyer (temperatura/confianza/
// paciencia): cejas por paciencia, boca por temperatura/interés, párpados por
// confianza, aura de color por temperatura, y animación de habla. Costo $0 y
// es un diferenciador único: está atado a NUESTRO modelo psicológico, cosa que
// un avatar fotorrealista genérico no hace. Sin dependencias.

// Interpola frío (azul) → cálido (naranja/rojo) según la temperatura de compra.
function tempColor(t) {
  // t: 0..100 → hue 210 (azul) a 20 (naranja)
  const hue = 210 - (Math.max(0, Math.min(100, t)) / 100) * 190;
  return `hsl(${hue}, 70%, 55%)`;
}

function moodLabel(state, isEn) {
  const { temperature: t, trust: tr, patience: p } = state;
  if (p < 20) return isEn ? 'Impatient' : 'Impaciente';
  if (t < 20) return isEn ? 'Checked out' : 'Se enfría';
  if (tr < 25) return isEn ? 'Guarded' : 'A la defensiva';
  if (t > 70 && tr > 60) return isEn ? 'Warming up' : 'Enganchado';
  if (tr > 55) return isEn ? 'Opening up' : 'Se abre';
  return isEn ? 'Neutral' : 'Neutral';
}

export default function BuyerAvatar({ state, speaking = false, name = '', isEn = false, size = 160 }) {
  const t = state?.temperature ?? 35;
  const tr = state?.trust ?? 25;
  const p = state?.patience ?? 70;

  const skin = tempColor(t);
  const glow = tempColor(t);

  // Cejas: paciencia baja → anguladas hacia adentro (enojo). Alta → relajadas.
  // browAngle en grados; browY desplazamiento vertical.
  const browAngle = p < 40 ? (40 - p) / 3 : 0;      // 0..13°
  const browLift = tr > 60 ? -3 : 0;                 // confianza alta → cejas levantadas

  // Párpados: confianza baja → ojos entrecerrados (desconfía).
  const eyeOpen = tr < 25 ? 0.55 : tr < 55 ? 0.8 : 1;
  const eyeRy = 7 * eyeOpen;

  // Boca: temperatura alta → sonrisa (curva hacia arriba); baja → ceño.
  // curve>0 sonríe, <0 frunce. Rango -8..+10.
  const curve = ((t - 45) / 100) * 18;
  const mouthPath = `M 60 118 Q 100 ${118 + curve} 140 118`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 ${speaking ? 40 : 24}px ${glow}${speaking ? '66' : '33'}`,
        transition: 'box-shadow 0.3s ease',
      }}>
        <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: 'block' }}>
          {/* Halo/aura por temperatura */}
          <circle cx="100" cy="100" r="92" fill="none" stroke={glow} strokeWidth="2" opacity="0.35" />
          {/* Cabeza */}
          <circle cx="100" cy="100" r="78" fill={skin} opacity="0.22" stroke={skin} strokeWidth="2.5" />

          {/* Cejas */}
          <g stroke="rgba(255,255,255,0.85)" strokeWidth="4" strokeLinecap="round">
            <line
              x1="62" y1={72 + browLift + browAngle} x2="86" y2={72 + browLift - browAngle}
              style={{ transition: 'all 0.4s ease' }}
            />
            <line
              x1="114" y1={72 + browLift - browAngle} x2="138" y2={72 + browLift + browAngle}
              style={{ transition: 'all 0.4s ease' }}
            />
          </g>

          {/* Ojos (párpados por confianza) */}
          <g fill="white">
            <ellipse cx="74" cy="90" rx="8" ry={eyeRy} style={{ transition: 'all 0.4s ease' }} />
            <ellipse cx="126" cy="90" rx="8" ry={eyeRy} style={{ transition: 'all 0.4s ease' }} />
          </g>
          <g fill="#1a1a2e">
            <circle cx="74" cy="91" r={3.2 * eyeOpen} />
            <circle cx="126" cy="91" r={3.2 * eyeOpen} />
          </g>

          {/* Boca: si habla, animación; si no, curva por temperatura */}
          {speaking ? (
            <g>
              <ellipse cx="100" cy="120" rx="16" ry="9" fill="rgba(255,255,255,0.9)">
                <animate attributeName="ry" values="4;11;5;10;4" dur="0.5s" repeatCount="indefinite" />
              </ellipse>
            </g>
          ) : (
            <path d={mouthPath} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" style={{ transition: 'all 0.4s ease' }} />
          )}
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        {name && <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{name}</div>}
        <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: glow }}>
          {moodLabel({ temperature: t, trust: tr, patience: p }, isEn)}
        </div>
      </div>
    </div>
  );
}

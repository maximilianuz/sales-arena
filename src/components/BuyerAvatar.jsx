import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

// Avatar ILUSTRADO y REACTIVO del comprador IA. Usa DiceBear (librería offline,
// sin API ni tokens): genera una persona ilustrada estable por lead (semilla =
// su nombre) y MAPEA el estado emocional del buyer (temperatura/confianza/
// paciencia) a su expresión (boca, cejas, ojos). Así queda lindo Y sigue
// reaccionando en vivo a cómo va la venta — lo mejor de ambos mundos.

function tempColor(t) {
  const hue = 210 - (Math.max(0, Math.min(100, t)) / 100) * 190; // azul→naranja
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

// Estado → expresión (valores válidos del estilo avataaars de DiceBear).
function expressionFor({ temperature: t, trust: tr, patience: p }) {
  if (p < 20) return { eyebrows: 'angry', mouth: 'serious', eyes: 'squint' };
  if (t < 20) return { eyebrows: 'sadConcerned', mouth: 'sad', eyes: 'side' };
  if (tr < 25) return { eyebrows: 'flatNatural', mouth: 'serious', eyes: 'squint' };
  if (t > 70 && tr > 60) return { eyebrows: 'raisedExcited', mouth: 'smile', eyes: 'happy' };
  if (tr > 55) return { eyebrows: 'defaultNatural', mouth: 'default', eyes: 'default' };
  return { eyebrows: 'defaultNatural', mouth: 'default', eyes: 'default' };
}

export default function BuyerAvatar({ state, speaking = false, name = '', seed = '', isEn = false, size = 130 }) {
  const t = state?.temperature ?? 35;
  const tr = state?.trust ?? 25;
  const p = state?.patience ?? 70;
  const glow = tempColor(t);
  const expr = expressionFor({ temperature: t, trust: tr, patience: p });

  // Regeneramos el SVG solo cuando cambia el lead o su expresión (barato).
  const uri = useMemo(() => createAvatar(avataaars, {
    seed: seed || name || 'lead',
    mouth: [expr.mouth],
    eyebrows: [expr.eyebrows],
    eyes: [expr.eyes],
    backgroundColor: [],
    radius: 50,
  }).toDataUri(), [seed, name, expr.mouth, expr.eyebrows, expr.eyes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `3px solid ${glow}`,
        boxShadow: `0 0 ${speaking ? 34 : 18}px ${glow}${speaking ? '77' : '44'}`,
        transition: 'box-shadow 0.3s ease, border-color 0.4s ease',
        overflow: 'hidden', background: 'rgba(255,255,255,0.04)',
        animation: speaking ? 'avatarPulse 1.1s ease-in-out infinite' : 'none',
      }}>
        <img src={uri} alt="" width={size} height={size} style={{ display: 'block' }} />
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

import { useMemo, useEffect, useRef, useState } from 'react';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import { inferGender } from '../utils/genderFromName';
import { getSpeechLevel } from '../utils/voice';

// Peinados/vello facial coherentes por género (opciones válidas de avataaars).
const TOPS_MALE = ['shortFlat', 'shortRound', 'shortWaved', 'theCaesar', 'theCaesarAndSidePart', 'sides'];
const TOPS_FEMALE = ['longButNotTooLong', 'straight01', 'straight02', 'straightAndStrand', 'bob', 'bigHair', 'curly'];

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

// Emoción del turno (la emite la IA) → expresión facial. Es MÁS específica que
// el estado (medidores): cuando el lead reacciona a la última frase, la cara lo
// muestra. Si es 'neutral', dejamos que mande el estado ambiente.
const EMOTION_EXPR = {
  interesado:   { eyebrows: 'raisedExcited', mouth: 'default',   eyes: 'default' },
  esceptico:    { eyebrows: 'flatNatural',   mouth: 'serious',   eyes: 'squint' },
  molesto:      { eyebrows: 'angry',         mouth: 'serious',   eyes: 'squint' },
  entusiasmado: { eyebrows: 'raisedExcited', mouth: 'smile',     eyes: 'happy' },
  dudoso:       { eyebrows: 'sadConcerned',  mouth: 'concerned', eyes: 'side' },
  apurado:      { eyebrows: 'flatNatural',   mouth: 'serious',   eyes: 'default' },
};

export default function BuyerAvatar({ state, speaking = false, emotion = 'neutral', name = '', seed = '', isEn = false, size = 130 }) {
  const t = state?.temperature ?? 35;
  const tr = state?.trust ?? 25;
  const p = state?.patience ?? 70;
  const glow = tempColor(t);
  // La emoción del turno manda; si es neutral, cae al estado ambiente.
  const expr = (emotion && emotion !== 'neutral' && EMOTION_EXPR[emotion])
    || expressionFor({ temperature: t, trust: tr, patience: p });

  // Pre-generamos 4 variantes de boca por expresión: reposo (la emocional) + 3
  // niveles de apertura para "hablar". Cejas/ojos quedan fijos → sólo cambia la
  // boca, que es lo barato de intercambiar frame a frame (swap de <img src>).
  const gender = inferGender(name || seed);
  const uris = useMemo(() => {
    const base = {
      seed: seed || name || 'lead',
      eyebrows: [expr.eyebrows],
      eyes: [expr.eyes],
      top: gender === 'female' ? TOPS_FEMALE : TOPS_MALE,
      facialHairProbability: gender === 'female' ? 0 : 35,
      backgroundColor: [],
      radius: 50,
    };
    const make = (mouth) => createAvatar(avataaars, { ...base, mouth: [mouth] }).toDataUri();
    return {
      rest: make(expr.mouth),   // en silencio: la boca de la emoción
      closed: make('serious'),  // hablando, entre palabras
      mid: make('default'),     // apertura media
      wide: make('screamOpen'), // pico de volumen
    };
  }, [seed, name, gender, expr.eyebrows, expr.eyes, expr.mouth]);

  // Mientras habla, leemos la amplitud real del audio (getSpeechLevel) por frame
  // y elegimos el nivel de apertura de boca. Si no hay amplitud (fallback del TTS
  // del navegador), hacemos un "flap" creíble por tiempo. Sólo re-render cuando
  // cambia el nivel (0/1/2) → nada de 60 renders/seg.
  const [mouthBucket, setMouthBucket] = useState(-1); // -1 = reposo
  const bucketRef = useRef(-1);
  useEffect(() => {
    // En reposo no tocamos el estado: `uri` cae a rest porque speaking es false.
    if (!speaking) return;
    let raf = 0;
    bucketRef.current = -1;
    const startT = performance.now();
    const loop = () => {
      let v = getSpeechLevel();
      if (v <= 0.001) {
        const s = (performance.now() - startT) / 1000;
        v = 0.18 + 0.22 * Math.abs(Math.sin(s * 9)); // flap ~1.4Hz
      }
      const b = v < 0.10 ? 0 : v < 0.28 ? 1 : 2;
      if (b !== bucketRef.current) { bucketRef.current = b; setMouthBucket(b); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speaking]);

  const uri = (speaking && mouthBucket >= 0)
    ? (mouthBucket === 2 ? uris.wide : mouthBucket === 1 ? uris.mid : uris.closed)
    : uris.rest;

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

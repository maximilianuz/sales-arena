import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader, Check } from 'lucide-react';
import { PASOS_ARRANQUE, CATEGORIAS_META, armarDeclaracion, metaValida, faltaEnMeta } from './questions';
import { guardarDeclaracion, guardarMeta, completarOnboarding } from './store';
import { slugId } from '../schemas';

// Módulo 0 — Identidad. Va ANTES del onboarding técnico del plan: primero para
// qué entrenás, después cómo.
//
// Mismo patrón que plan/Onboarding: una pantalla por vez, responder se siente
// como avanzar. La diferencia es que acá se escribe en vez de elegir, así que
// cada pantalla pide un mínimo de caracteres — no para castigar, sino porque una
// declaración de seis palabras no se puede leer todas las mañanas.
//
// La última pantalla es el panel visionario y exige cifra + fecha por meta. Esa
// validación es el módulo entero: sin números, esto es una lista de deseos.

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

const inputBase = {
  display: 'block', width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.7rem',
  borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.88rem',
};

// Solo el arranque: las dos preguntas de motor y el panel. Las otras cuatro
// llegan de a una por día desde el plan (ver identidad/dossier.js) — pedirlas
// acá era lo que hacía que el wizard tuviera siete pantallas.
const TOTAL_PASOS = PASOS_ARRANQUE.length + 1;

export default function IdentidadOnboarding({ identidad, onListo, onCancel }) {
  // Reabrir el wizard no puede pisar lo ya escrito: se precarga lo que haya y se
  // arranca en la primera pregunta sin responder. Es el caso de quien completa
  // las dos preguntas de motor que se agregaron después.
  const [partes, setPartes] = useState(() => ({ ...(identidad?.declaracion?.partes || {}) }));
  const [paso, setPaso] = useState(() => {
    const i = PASOS_ARRANQUE.findIndex(p => !(identidad?.declaracion?.partes?.[p.key] || '').trim());
    return i === -1 ? PASOS_ARRANQUE.length : i;
  });
  const [metas, setMetas] = useState(() => CATEGORIAS_META.map(c => {
    const previa = (identidad?.metas || []).find(m => m.categoria === c.id);
    return previa
      ? { ...previa, valorObjetivo: String(previa.valorObjetivo ?? ''), valorInicial: previa.valorInicial ?? 0 }
      : { categoria: c.id, titulo: '', metrica: '', unidad: '', valorInicial: 0, valorObjetivo: '', fechaObjetivo: '', porQue: '' };
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const esPanel = paso === PASOS_ARRANQUE.length;
  const pregunta = PASOS_ARRANQUE[paso];
  const valor = pregunta ? (partes[pregunta.key] || '') : '';
  const suficiente = !pregunta || valor.trim().length >= pregunta.minimo;

  // Al menos una meta completa. Exigir las tres sería la forma más rápida de que
  // abandone acá: se puede volver al panel y agregar el resto después.
  const metasCompletas = metas.filter(metaValida);
  const puedeTerminar = metasCompletas.length >= 1;

  const atras = () => (paso === 0 ? onCancel?.() : setPaso(paso - 1));

  const cambiarMeta = (i, campo, v) => {
    setMetas(metas.map((m, j) => (j === i ? { ...m, [campo]: v } : m)));
  };

  const terminar = async () => {
    setGuardando(true);
    setError('');
    try {
      await guardarDeclaracion({ partes, texto: armarDeclaracion(partes) });
      for (const [i, meta] of metasCompletas.entries()) {
        const id = slugId('meta-', meta.titulo);
        await guardarMeta(id, {
          ...meta,
          valorObjetivo: Number(meta.valorObjetivo),
          valorInicial: Number(meta.valorInicial) || 0,
          valorActual: Number(meta.valorInicial) || 0,
          orden: i,
          creadoAt: Date.now(),
        });
      }
      await completarOnboarding();
      onListo?.();
    } catch (e) {
      setError(e.message || 'No se pudo guardar');
      setGuardando(false);
    }
  };

  return (
    <div>
      {/* Progreso */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.2rem' }}>
        {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: i <= paso ? 'linear-gradient(90deg,#30d158,#06b6d4)' : 'rgba(255,255,255,0.1)',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
        <button className="btn btn-outline" onClick={atras} disabled={guardando} style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}>
          <ArrowLeft size={15} />
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
          {paso + 1} DE {TOTAL_PASOS}
        </span>
      </div>

      {!esPanel ? (
        <>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem', lineHeight: 1.35 }}>{pregunta.titulo}</h3>
          <p style={{ margin: '0 0 1.1rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{pregunta.ayuda}</p>

          <textarea
            rows={5}
            value={valor}
            autoFocus
            placeholder={pregunta.placeholder}
            onChange={(e) => setPartes({ ...partes, [pregunta.key]: e.target.value })}
            style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
          />
          <p style={{ fontSize: '0.74rem', color: suficiente ? 'var(--text-muted)' : '#ff9f0a', margin: '0.45rem 0 0' }}>
            {suficiente
              ? 'Está en tus palabras. Eso es lo que importa.'
              : `Escribí un poco más — te faltan ${pregunta.minimo - valor.trim().length} caracteres.`}
          </p>
        </>
      ) : (
        <>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem', lineHeight: 1.35 }}>Tu panel: a dónde vas</h3>
          <p style={{ margin: '0 0 1.1rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            Cada meta necesita <strong>un número y una fecha</strong>. Sin eso no hay contra qué medirse
            dentro de tres meses. Con una alcanza para empezar; las otras las cargás después.
          </p>

          {metas.map((meta, i) => {
            const cat = CATEGORIAS_META[i];
            const falta = faltaEnMeta(meta);
            const vacia = !meta.titulo && !meta.valorObjetivo && !meta.fechaObjetivo;
            return (
              <div key={cat.id} style={{
                ...panel, marginBottom: '0.7rem', padding: '0.9rem 1rem',
                borderColor: metaValida(meta) ? 'rgba(48,209,88,0.4)' : 'rgba(255,255,255,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: metaValida(meta) ? '#30d158' : 'var(--text-muted)' }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>· {cat.ayuda}</span>
                  {metaValida(meta) && <Check size={14} color="#30d158" style={{ marginLeft: 'auto' }} />}
                </div>

                <input value={meta.titulo} placeholder={cat.ejemplo.titulo}
                  onChange={(e) => cambiarMeta(i, 'titulo', e.target.value)}
                  style={{ ...inputBase, marginBottom: '0.45rem' }} />

                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <input type="number" value={meta.valorInicial} placeholder="hoy"
                    onChange={(e) => cambiarMeta(i, 'valorInicial', e.target.value)}
                    style={{ ...inputBase, width: '5.5rem', flex: '0 0 auto' }} />
                  <span style={{ alignSelf: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>→</span>
                  <input type="number" value={meta.valorObjetivo} placeholder={String(cat.ejemplo.valorObjetivo)}
                    onChange={(e) => cambiarMeta(i, 'valorObjetivo', e.target.value)}
                    style={{ ...inputBase, width: '6rem', flex: '0 0 auto' }} />
                  <input value={meta.unidad} placeholder={cat.ejemplo.unidad}
                    onChange={(e) => cambiarMeta(i, 'unidad', e.target.value)}
                    style={{ ...inputBase, flex: 1, minWidth: '7rem' }} />
                </div>

                <input type="date" value={meta.fechaObjetivo}
                  onChange={(e) => cambiarMeta(i, 'fechaObjetivo', e.target.value)}
                  style={{ ...inputBase, marginTop: '0.45rem', colorScheme: 'dark' }} />

                {!vacia && falta && (
                  <p style={{ fontSize: '0.74rem', color: '#ff9f0a', margin: '0.45rem 0 0' }}>{falta}</p>
                )}
              </div>
            );
          })}

          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            {metasCompletas.length === 0
              ? 'Completá al menos una para seguir.'
              : `${metasCompletas.length} de 3 cargadas. Las que falten las agregás cuando quieras.`}
          </p>
        </>
      )}

      {error && <p style={{ color: '#ff453a', fontSize: '0.82rem', marginTop: '0.8rem' }}>{error}</p>}

      <button
        className="btn btn-primary"
        disabled={guardando || (esPanel ? !puedeTerminar : !suficiente)}
        onClick={esPanel ? terminar : () => setPaso(paso + 1)}
        style={{ width: '100%', marginTop: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
      >
        {guardando
          ? <><Loader size={15} className="spin" /> Guardando…</>
          : esPanel ? <>Guardar mi identidad</> : <>Seguir <ArrowRight size={15} /></>}
      </button>
    </div>
  );
}

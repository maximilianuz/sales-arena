import { useState } from 'react';
import { Loader, Check, CalendarClock } from 'lucide-react';
import { OPCIONES_DIAS, OPCIONES_MINUTOS, metaDeLaSemana } from './checkin';
import { guardarCheckin, posponerCheckin } from './store';
import { registrarAvance } from '../identidad/store';

// El check-in semanal en Hoy. Aparece arriba del día y solo cuando no hay nada
// empezado: cortar a alguien a mitad de una sesión para preguntarle cuántos días
// tiene disponibles es la peor manera de preguntarlo.
//
// Tres preguntas y afuera. Las dos primeras recalculan lo que falta del bloque;
// la tercera mantiene vivo el panel visionario sin cargar el check diario.

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

export default function CheckinSemanal({ plan, identidad, onListo }) {
  const [dias, setDias] = useState(plan?.config?.diasPorSemana ?? 3);
  const [minutos, setMinutos] = useState(plan?.config?.minutosPorSesion ?? 20);
  const [valorMeta, setValorMeta] = useState('');
  const [guardando, setGuardando] = useState(false);

  const meta = metaDeLaSemana(identidad?.metas || []);
  const cambio = dias !== plan?.config?.diasPorSemana || minutos !== plan?.config?.minutosPorSesion;

  const guardar = async () => {
    setGuardando(true);
    try {
      if (meta && valorMeta !== '') await registrarAvance(meta.id, Number(valorMeta) || 0);
      await guardarCheckin({
        plan,
        respuestas: {
          diasPorSemana: dias, minutosPorSesion: minutos,
          metaId: meta?.id || null, metaValor: valorMeta === '' ? null : Number(valorMeta),
        },
      });
      onListo?.();
    } finally {
      setGuardando(false);
    }
  };

  const posponer = async () => {
    setGuardando(true);
    try { await posponerCheckin(); onListo?.(); } finally { setGuardando(false); }
  };

  return (
    <div style={{ ...panel, borderColor: 'rgba(167,139,250,0.4)', background: 'rgba(167,139,250,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.3rem' }}>
        <CalendarClock size={16} color="#a78bfa" />
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Check-in de la semana</span>
      </div>
      <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Un minuto. Se ajusta lo que falta del bloque — lo que ya hiciste no se toca.
      </p>

      <Grupo titulo="¿Cuántos días por semana vas a poder esta semana?">
        {OPCIONES_DIAS.map(o => (
          <Opcion key={o.value} activo={dias === o.value} onClick={() => setDias(o.value)} label={o.label} detalle={o.detalle} />
        ))}
      </Grupo>

      <Grupo titulo="¿Cuánto tiempo por sesión?">
        {OPCIONES_MINUTOS.map(o => (
          <Opcion key={o.value} activo={minutos === o.value} onClick={() => setMinutos(o.value)} label={o.label} detalle={o.detalle} />
        ))}
      </Grupo>

      {meta && (
        <div style={{ marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            ¿Cómo viene <strong style={{ color: 'var(--text)' }}>{meta.titulo}</strong>?
            {' '}Objetivo: {meta.valorObjetivo} {meta.unidad}.
          </div>
          <input
            type="number" value={valorMeta} placeholder={String(meta.valorActual ?? meta.valorInicial ?? 0)}
            onChange={(e) => setValorMeta(e.target.value)}
            style={{
              display: 'block', width: '8rem', padding: '0.5rem 0.7rem', borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)',
              color: 'white', font: 'inherit', fontSize: '0.88rem',
            }}
          />
        </div>
      )}

      {cambio && (
        <p style={{ margin: '0 0 0.8rem', fontSize: '0.78rem', color: '#a78bfa', lineHeight: 1.5 }}>
          Se recalculan los días que faltan del bloque. El largo no cambia: se mide en sesiones,
          así que vas a tardar más o menos semanas en llegar al final, no más o menos entrenamiento.
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={guardando} onClick={guardar} style={{ fontSize: '0.85rem' }}>
          {guardando ? <><Loader size={14} className="spin" /> Guardando…</> : <><Check size={14} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} /> Listo</>}
        </button>
        <button className="btn btn-outline" disabled={guardando} onClick={posponer} style={{ fontSize: '0.85rem' }}>
          Ahora no
        </button>
      </div>
    </div>
  );
}

function Grupo({ titulo, children }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{titulo}</div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Opcion({ activo, onClick, label, detalle }) {
  return (
    <button onClick={onClick} title={detalle} style={{
      padding: '0.4rem 0.85rem', borderRadius: '2rem', cursor: 'pointer', font: 'inherit',
      fontSize: '0.82rem', fontWeight: activo ? 700 : 400,
      border: `1px solid ${activo ? 'rgba(48,209,88,0.6)' : 'rgba(255,255,255,0.12)'}`,
      background: activo ? 'rgba(48,209,88,0.15)' : 'transparent', color: 'inherit',
    }}>{label}</button>
  );
}

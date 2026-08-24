import { useState } from 'react';
import { Pencil, Check, X, Flame, Target } from 'lucide-react';
import { guardarDeclaracion, registrarAvance, rachaCheck } from './store';
import { metaValida, faltaEnMeta, PASOS_ARRANQUE } from './questions';
import { progresoDossier } from './dossier';

// El panel visionario: la declaración y las metas cuantificadas, en una sola
// pantalla. Se llega desde el check de la mañana o desde la pestaña Identidad.
//
// Es sobre todo para LEER. La edición existe porque una declaración escrita hace
// dos meses deja de sonar propia, pero está en segundo plano: el botón grande es
// actualizar la cifra de una meta, no reescribir el texto.

const panel = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.9rem', padding: '1.1rem 1.2rem',
};

const inputBase = {
  display: 'block', width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.7rem',
  borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.88rem',
};

const diasHasta = (fecha) => {
  const ms = new Date(`${fecha}T00:00:00`).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

export default function PanelVisionario({ identidad, onEmpezar }) {
  const [editandoTexto, setEditandoTexto] = useState(false);
  const [guardandoTexto, setGuardandoTexto] = useState(false);
  const [borrador, setBorrador] = useState('');

  if (!identidad?.declaracion?.texto) {
    return (
      <div style={{ ...panel, textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
        <p style={{ fontWeight: 700, margin: '0 0 0.4rem', fontSize: '1.02rem' }}>Todavía no escribiste tu declaración</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.1rem', lineHeight: 1.55 }}>
          Cinco pantallas: quién sos vendiendo, qué sostenés, cómo trabajás, con qué te comprometés,
          y a dónde vas con números y fecha. Después aparece cada mañana arriba de tu día.
        </p>
        <button className="btn btn-primary" onClick={onEmpezar}>Escribirla ahora</button>
      </div>
    );
  }

  const racha = rachaCheck(identidad);
  const metas = identidad.metas || [];
  // El aviso es SOLO por las dos de motor. Antes usaba `partesFaltantes`, que
  // mira las seis, y desde que las otras cuatro llegan de a una por día eso
  // habría puesto una alarma naranja el primer día por algo que es el diseño
  // funcionando. Las de motor sí son un hueco real: sin ellas el recordatorio de
  // continuidad se queda sin la mitad de su munición.
  const partesEscritas = identidad.declaracion?.partes || {};
  const faltantes = PASOS_ARRANQUE.filter(p => !(partesEscritas[p.key] || '').trim());
  const dossier = progresoDossier(identidad);

  const guardarTexto = async () => {
    if (guardandoTexto) return;
    setGuardandoTexto(true);
    try {
    await guardarDeclaracion({ partes: identidad.declaracion.partes || {}, texto: borrador });
    setEditandoTexto(false);
    } finally { setGuardandoTexto(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {racha > 0 && (
        <div style={{ ...panel, padding: '0.7rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Flame size={16} color="#ff9f0a" />
          <span style={{ fontSize: '0.85rem' }}>
            <strong>{racha}</strong> {racha === 1 ? 'día' : 'días'} seguidos leyendo tu declaración
          </span>
        </div>
      )}

      {faltantes.length > 0 && (
        <div style={{
          ...panel, padding: '0.85rem 1rem',
          borderColor: 'rgba(255,159,10,0.35)', background: 'rgba(255,159,10,0.06)',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.25rem' }}>
            Te {faltantes.length === 1 ? 'falta una pregunta' : `faltan ${faltantes.length} preguntas`}
          </div>
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Sin “a qué no volvés” y “por qué estás dispuesto”, el recordatorio semanal se queda
            sin lo que más empuja cuando aflojás.
          </p>
          <button className="btn btn-outline" onClick={onEmpezar} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
            Completarlas
          </button>
        </div>
      )}

      {/* El dossier no es un pendiente: es algo que se va llenando solo. Se
          muestra como avance y sin botón — no hay nada que apurar acá. */}
      {!faltantes.length && !dossier.completo && (
        <div style={{ ...panel, padding: '0.8rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>Tu dossier</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {dossier.hechas} de {dossier.total}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.79rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Las preguntas que faltan van llegando de a una, cada dos días de entrenamiento. Se
            contestan mejor así: después de haber entrenado, no antes.
          </p>
        </div>
      )}

      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.7rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Tu declaración
          </span>
          {!editandoTexto && (
            <button onClick={() => { setBorrador(identidad.declaracion.texto); setEditandoTexto(true); }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
              <Pencil size={14} />
            </button>
          )}
        </div>

        {editandoTexto ? (
          <>
            <textarea rows={10} value={borrador} onChange={(e) => setBorrador(e.target.value)}
              style={{ ...inputBase, resize: 'vertical', lineHeight: 1.65 }} />
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
              <button className="btn btn-primary" onClick={guardarTexto} disabled={guardandoTexto} style={{ fontSize: '0.82rem', minHeight: '44px' }}>
                <Check size={14} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} /> Guardar
              </button>
              <button className="btn btn-outline" onClick={() => setEditandoTexto(false)} style={{ fontSize: '0.82rem' }}>
                <X size={14} />
              </button>
            </div>
          </>
        ) : (
          <p style={{
            margin: 0, fontSize: '0.92rem', lineHeight: 1.7, whiteSpace: 'pre-wrap',
            borderLeft: '2px solid #30d158', paddingLeft: '0.9rem',
          }}>
            {identidad.declaracion.texto}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 0.2rem' }}>
        <Target size={14} color="var(--text-muted)" />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          A dónde vas
        </span>
      </div>

      {metas.length === 0 && (
        <div style={{ ...panel, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          No hay metas cargadas. Una meta sin número y sin fecha no se puede medir, así que
          el panel prefiere estar vacío antes que lleno de intenciones.
        </div>
      )}

      {metas.map(meta => <FilaMeta key={meta.id} meta={meta} />)}
    </div>
  );
}

// Una meta. Lo único que se edita seguido es el valor actual — y eso se hace acá
// o en el check-in semanal, no todos los días: pedir una cifra diaria es la
// forma más rápida de que dejen de cargarla.
function FilaMeta({ meta }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(meta.valorActual ?? meta.valorInicial ?? 0));
  const [guardando, setGuardando] = useState(false);

  const inicial = Number(meta.valorInicial) || 0;
  const objetivo = Number(meta.valorObjetivo) || 0;
  const actual = Number(meta.valorActual ?? inicial) || 0;
  // Progreso desde donde arrancó, no desde cero: si empezaste en 5 y vas a 20,
  // estar en 5 es 0% de avance, no 25%.
  const pct = objetivo === inicial ? 0 : Math.max(0, Math.min(100, Math.round(((actual - inicial) / (objetivo - inicial)) * 100)));
  const dias = meta.fechaObjetivo ? diasHasta(meta.fechaObjetivo) : null;
  const falta = faltaEnMeta(meta);

  const guardar = async () => {
    setGuardando(true);
    try {
      await registrarAvance(meta.id, Number(valor) || 0);
      setEditando(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={panel}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{meta.titulo}</span>
        {!editando && (
          <button onClick={() => setEditando(true)} style={{
            background: 'none', border: 'none', color: '#30d158', cursor: 'pointer', font: 'inherit',
            fontWeight: 700, fontSize: '0.88rem', padding: 0, whiteSpace: 'nowrap',
          }}>
            {actual} / {objetivo} {meta.unidad}
          </button>
        )}
      </div>

      {editando ? (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', alignItems: 'center' }}>
          <input type="number" value={valor} autoFocus onChange={(e) => setValor(e.target.value)}
            style={{ ...inputBase, width: '7rem' }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{meta.unidad}</span>
          <button className="btn btn-primary" disabled={guardando} onClick={guardar} style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
            {guardando ? '…' : <Check size={14} />}
          </button>
          <button className="btn btn-outline" onClick={() => setEditando(false)} style={{ fontSize: '0.8rem' }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginTop: '0.7rem', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#30d158,#06b6d4)' }} />
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {pct}% del camino
            {dias !== null && (dias >= 0
              ? ` · quedan ${dias} ${dias === 1 ? 'día' : 'días'}`
              : ` · la fecha pasó hace ${-dias} ${dias === -1 ? 'día' : 'días'}`)}
          </div>
          {falta && !metaValida(meta) && (
            <div style={{ fontSize: '0.74rem', color: '#ff9f0a', marginTop: '0.3rem' }}>{falta}</div>
          )}
        </>
      )}
    </div>
  );
}

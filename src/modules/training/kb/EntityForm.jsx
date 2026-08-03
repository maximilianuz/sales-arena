import { useState } from 'react';

// Editor genérico de entidades de la base de conocimiento: renderiza el
// formulario a partir del schema declarativo (schemas.js). Sin contenido
// hardcodeado: agregar un campo es editar el schema.

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem',
  borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.3)', color: 'white', font: 'inherit', fontSize: '0.88rem',
};

function fieldToDraft(field, value) {
  if (value == null) return '';
  switch (field.type) {
    case 'list': return Array.isArray(value) ? value.join('\n') : String(value);
    case 'tags': return Array.isArray(value) ? value.join(', ') : String(value);
    case 'json': return JSON.stringify(value, null, 2);
    default: return value;
  }
}

function draftToField(field, draft) {
  const t = typeof draft === 'string' ? draft.trim() : draft;
  switch (field.type) {
    case 'list':
      return String(t).split('\n').map(s => s.trim()).filter(Boolean);
    case 'tags':
      return String(t).split(',').map(s => s.trim()).filter(Boolean);
    case 'number': {
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
    case 'json':
      if (!t) return null;
      return JSON.parse(t); // el caller captura el error y lo muestra
    default:
      return t;
  }
}

export default function EntityForm({ schema, initial, principios = [], onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(() => {
    const d = {};
    for (const f of schema.fields) d[f.key] = fieldToDraft(f, initial?.[f.key]);
    return d;
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setError('');
    const data = {};
    for (const f of schema.fields) {
      let value;
      try {
        value = draftToField(f, draft[f.key]);
      } catch {
        setError(`"${f.label}": JSON inválido.`);
        return;
      }
      if (f.required && (value == null || value === '' || (Array.isArray(value) && value.length === 0))) {
        setError(`"${f.label}" es obligatorio.`);
        return;
      }
      if (value !== null && value !== '') data[f.key] = value;
    }
    setSaving(true);
    try {
      await onSave(data);
    } catch (e) {
      setError(e?.message || 'No se pudo guardar.');
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {schema.fields.map((f) => (
        <label key={f.key} style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {f.label}{f.required && <span style={{ color: '#ff9f0a' }}> *</span>}
          </span>
          {f.type === 'select' ? (
            <select style={inputStyle} value={draft[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)}>
              <option value="">—</option>
              {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'principioRef' ? (
            <select style={inputStyle} value={draft[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)}>
              <option value="">—</option>
              {principios.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          ) : (f.type === 'textarea' || f.type === 'list' || f.type === 'json') ? (
            <textarea
              style={{ ...inputStyle, resize: 'vertical', fontFamily: f.type === 'json' ? 'monospace' : 'inherit' }}
              rows={f.rows || (f.type === 'list' ? 4 : 3)}
              value={draft[f.key] || ''}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          ) : (
            <input
              style={inputStyle}
              type={f.type === 'number' ? 'number' : 'text'}
              min={f.min} max={f.max}
              value={draft[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          )}
        </label>
      ))}

      {error && <p style={{ color: '#ff453a', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
        {onDelete && (
          <button
            className="btn btn-outline"
            style={{ marginLeft: 'auto', color: '#ff453a', borderColor: 'rgba(255,69,58,0.4)' }}
            onClick={() => { if (window.confirm(`¿Borrar esta ${schema.singular}? No se puede deshacer.`)) onDelete(); }}
          >
            Borrar
          </button>
        )}
      </div>
    </div>
  );
}

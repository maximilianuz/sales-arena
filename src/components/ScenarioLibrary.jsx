import React, { useState, useEffect } from 'react';
import { X, BookMarked, Trash2, Play, Save, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { subscribeToLibrary, deleteScenario, saveScenario } from '../utils/library';

export default function ScenarioLibrary({ mode, currentScenario, currentConfig, onLoad, onClose }) {
  // mode: 'load' (elegir uno para cargar) | 'save' (guardar el actual)
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    const unsub = subscribeToLibrary(list => { setItems(list); setLoading(false); });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!currentScenario) return;
    setSaving(true);
    try {
      const defaultName = currentScenario.demographics?.name
        ? `${currentScenario.demographics.name} — ${currentScenario.demographics.industry || ''}`.trim()
        : (isEn ? 'Scenario' : 'Escenario');
      await saveScenario(saveName.trim() || defaultName, currentScenario, currentConfig);
      setSavedOk(true);
      setSaveName('');
      setTimeout(() => setSavedOk(false), 2000);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm(isEn ? 'Delete this scenario?' : '¿Borrar este escenario?')) return;
    await deleteScenario(id);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: '1rem' }}>
      <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <BookMarked size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>
            {isEn ? 'Scenario Library' : 'Biblioteca de Escenarios'}
          </h3>
        </div>

        {/* Save section */}
        {mode === 'save' && currentScenario && (
          <div style={{ background: 'rgba(100,210,255,0.08)', border: '1px solid rgba(100,210,255,0.2)', borderRadius: '0.875rem', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: '0.6rem' }}>
              {isEn ? 'Save current scenario' : 'Guardar escenario actual'}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder={isEn ? 'Name (optional)' : 'Nombre (opcional)'}
                className="form-input"
                style={{ flex: 1 }}
              />
              <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                {saving ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                {savedOk ? (isEn ? 'Saved ✓' : 'Guardado ✓') : (isEn ? 'Save' : 'Guardar')}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.75rem' }}>
            {isEn ? `Saved (${items.length})` : `Guardados (${items.length})`}
          </div>

          {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{isEn ? 'Loading...' : 'Cargando...'}</p>}

          {!loading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isEn ? 'No saved scenarios yet. Generate one and save it to build your curriculum.' : 'Todavía no hay escenarios guardados. Generá uno y guardalo para armar tu currícula.'}
            </div>
          )}

          {items.map(item => (
            <div
              key={item.id}
              onClick={() => mode === 'load' && onLoad && onLoad(item.scenario)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem', marginBottom: '0.5rem', borderRadius: '0.75rem',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                cursor: mode === 'load' ? 'pointer' : 'default'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {item.scenario?.demographics?.role} · {item.scenario?.demographics?.industry}
                </div>
              </div>
              {mode === 'load' && (
                <button onClick={(e) => { e.stopPropagation(); onLoad(item.scenario); }} style={{ padding: '0.4rem 0.7rem', borderRadius: '0.5rem', background: 'rgba(100,210,255,0.15)', border: '1px solid rgba(100,210,255,0.3)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: '600' }}>
                  <Play size={13} /> {isEn ? 'Load' : 'Cargar'}
                </button>
              )}
              <button onClick={(e) => handleDelete(item.id, e)} style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', color: 'rgba(255,69,58,0.7)', cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

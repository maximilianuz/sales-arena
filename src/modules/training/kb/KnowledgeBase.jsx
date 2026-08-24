import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, BookOpen } from 'lucide-react';
import { subscribeList, setItem, removeItem } from '../db';
import { ENTITY_SCHEMAS, slugId } from '../schemas';
import { DECKS } from '../seedImport';
import EntityForm from './EntityForm';

// Base de conocimiento: CRUD completo sobre principios, flashcards (los 4
// mazos), perfiles de prospecto del simulador, ofertas y su guion por fases.
// Todo el contenido vive en RTDB — acá no hay nada hardcodeado.

const TABS = [
  { id: 'principios', label: 'Principios' },
  { id: 'cards', label: 'Flashcards' },
  { id: 'perfiles', label: 'Perfiles simulador' },
  { id: 'ofertas', label: 'Ofertas' },
  { id: 'fases', label: 'Guion por fases' },
];

const card = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.8rem', padding: '0.9rem 1rem',
};

export default function KnowledgeBase() {
  const [tab, setTab] = useState('principios');
  // {path, list}: la lista queda atada al path que la produjo, así el cambio de
  // pestaña no muestra datos viejos mientras llega el snapshot nuevo.
  const [raw, setRaw] = useState({ path: null, list: [] });
  const [principios, setPrincipios] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [ofertaId, setOfertaId] = useState('');
  const [deckFilter, setDeckFilter] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const schema = ENTITY_SCHEMAS[tab];

  // Los principios se necesitan siempre (selector principioRef de las cartas).
  useEffect(() => subscribeList('kb/principios', setPrincipios), []);
  useEffect(() => subscribeList('kb/ofertas', (list) => {
    setOfertas(list);
    setOfertaId((prev) => prev || list[0]?.id || '');
  }), []);

  // Path efectivo de la pestaña activa (fases dependen de la oferta elegida).
  const path = tab === 'fases' ? (ofertaId ? `kb/fases/${ofertaId}` : null) : schema.path;

  useEffect(() => {
    if (!path || tab === 'principios') return;
    return subscribeList(path, (list) => setRaw({ path, list }));
  }, [path, tab]);

  const items = useMemo(
    () => (tab === 'principios' ? principios : (path && raw.path === path ? raw.list : [])),
    [tab, principios, path, raw],
  );

  const switchTab = (id) => { setTab(id); setEditing(null); };

  const visible = useMemo(() => {
    let list = items;
    if (tab === 'cards' && deckFilter) list = list.filter(i => i.mazo === deckFilter);
    const sortKey = schema.sortField;
    return [...list].sort((a, b) => sortKey
      ? (a[sortKey] || 0) - (b[sortKey] || 0)
      : String(a[schema.titleField] || '').localeCompare(String(b[schema.titleField] || '')));
  }, [items, tab, deckFilter, schema]);

  const principioName = (id) => principios.find(p => p.id === id)?.nombre;

  const save = async (data) => {
    const id = editing === 'new'
      ? slugId(schema.idPrefix, data[schema.titleField])
      : editing.id;
    await setItem(path, id, data);
    setEditing(null);
  };

  const del = async () => {
    await removeItem(path, editing.id);
    setEditing(null);
  };

  return (
    <div>
      {/* Pestañas de entidad */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)} style={{
            padding: '0.45rem 0.9rem', borderRadius: '2rem', cursor: 'pointer', font: 'inherit',
            fontSize: '0.82rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.12)',
            background: tab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.04)',
            color: tab === t.id ? 'white' : 'var(--text-muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Selectores contextuales */}
      {tab === 'cards' && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <FilterChip active={!deckFilter} label="Todos" onClick={() => setDeckFilter('')} />
          {DECKS.map(d => (
            <FilterChip key={d.id} active={deckFilter === d.id} label={d.nombre} color={d.color} onClick={() => setDeckFilter(d.id)} />
          ))}
        </div>
      )}
      {tab === 'fases' && (
        <div style={{ marginBottom: '1rem' }}>
          <select value={ofertaId} onChange={(e) => { setOfertaId(e.target.value); setEditing(null); }} style={{
            padding: '0.5rem 0.7rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)',
            color: 'white', border: '1px solid rgba(255,255,255,0.12)', font: 'inherit', fontSize: '0.85rem',
          }}>
            {ofertas.length === 0 && <option value="">Sin ofertas — creá una primero</option>}
            {ofertas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
      )}

      {editing ? (
        <div style={card}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>
            {editing === 'new' ? `Nueva ${schema.singular}` : `Editar ${schema.singular}`}
          </h3>
          <EntityForm
            schema={schema}
            initial={editing === 'new' ? null : editing}
            principios={principios}
            onSave={save}
            onCancel={() => setEditing(null)}
            onDelete={editing !== 'new' ? del : undefined}
          />
        </div>
      ) : (
        <>
          <button className="btn btn-outline" disabled={!path} onClick={() => setEditing('new')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <Plus size={15} /> Agregar {schema.singular}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {visible.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <BookOpen size={14} style={{ verticalAlign: '-2px' }} /> Nada por acá todavía.
              </p>
            )}
            {visible.map(item => (
              <button key={item.id} onClick={() => setEditing(item)} style={{
                ...card, textAlign: 'left', cursor: 'pointer', color: 'white', font: 'inherit',
                display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {tab === 'fases' && item.orden ? `${item.orden}. ` : ''}{item[schema.titleField] || item.id}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tab === 'cards'
                      ? [DECKS.find(d => d.id === item.mazo)?.nombre, item.tipo === 'feynman' ? 'Feynman' : null, principioName(item.principioId)].filter(Boolean).join(' · ')
                      : item[schema.subtitleField]}
                  </div>
                </div>
                <Pencil size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({ active, label, color = '148,163,184', onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.3rem 0.75rem', borderRadius: '2rem', cursor: 'pointer', font: 'inherit',
      fontSize: '0.75rem', fontWeight: 700,
      border: `1px solid rgba(${color},${active ? 0.7 : 0.25})`,
      background: active ? `rgba(${color},0.18)` : 'transparent',
      color: active ? `rgb(${color})` : 'var(--text-muted)',
    }}>{label}</button>
  );
}

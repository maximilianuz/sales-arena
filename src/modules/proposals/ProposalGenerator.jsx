import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Plus, Trash2, Copy, CheckCircle2, Eye, MousePointerClick,
  ExternalLink, Video, MessageSquare, Calendar, Sparkles,
  Save, Pencil, FileText, TrendingUp, Palette, Files, Image as ImageIcon, User
} from 'lucide-react';
import { auth } from '../../utils/db';
import {
  emptyProposal, createProposal, updateProposal, deleteProposal, duplicateProposal,
  subscribeMyProposals, subscribeStats, publicLink
} from './proposalService';
import { NICHES, getNiche } from './nicheTemplates';
import { VideoPlayer, ImageUploader } from './MediaComponents';

// Paletas de marca que el closer puede elegir para su propuesta VIP.
const ACCENTS = [
  { rgb: '134,59,255', name: 'Violeta' },
  { rgb: '16,185,129', name: 'Esmeralda' },
  { rgb: '71,191,255', name: 'Celeste' },
  { rgb: '236,72,153', name: 'Magenta' },
  { rgb: '245,158,11', name: 'Ámbar' },
  { rgb: '99,102,241', name: 'Índigo' }
];

// ── Tarjeta de propuesta en el dashboard ─────────────────────────────────────
function ProposalCard({ p, onEdit, onDelete, onDuplicate }) {
  const [stats, setStats] = useState({ views: 0, clicks: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeStats(p.id, setStats), [p.id]);

  const link = publicLink(p.id);
  const niche = getNiche(p.niche);
  const conv = stats.views ? Math.round((stats.clicks / stats.views) * 100) : 0;

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(15,15,30,0.6)', backdropFilter: 'blur(16px)',
      border: `1px solid rgba(${p.accent},0.25)`, borderRadius: '1.1rem',
      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
            {p.title || 'Sin título'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {p.prospectName || '—'} {p.prospectHandle ? `· ${p.prospectHandle}` : ''}
          </div>
          {niche && niche.id !== 'blank' && (
            <div style={{ fontSize: '0.72rem', color: `rgb(${p.accent})`, marginTop: '0.3rem', fontWeight: 600 }}>
              {niche.emoji} {niche.label}
            </div>
          )}
        </div>
        <span style={{
          fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '0.2rem 0.6rem', borderRadius: '2rem', whiteSpace: 'nowrap',
          background: p.status === 'sent' ? `rgba(${p.accent},0.15)` : 'rgba(255,255,255,0.06)',
          border: p.status === 'sent' ? `1px solid rgba(${p.accent},0.4)` : '1px solid rgba(255,255,255,0.12)',
          color: p.status === 'sent' ? `rgb(${p.accent})` : 'var(--text-muted)'
        }}>
          {p.status === 'sent' ? 'Enviada' : 'Borrador'}
        </span>
      </div>

      {/* Métricas de tracking */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { icon: <Eye size={14} />, val: stats.views, label: 'Vistas' },
          { icon: <MousePointerClick size={14} />, val: stats.clicks, label: 'Clics' },
          { icon: <TrendingUp size={14} />, val: `${conv}%`, label: 'Conversión' }
        ].map((m, i) => (
          <div key={i} style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '0.7rem',
            padding: '0.55rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: `rgb(${p.accent})`, fontSize: '1.05rem', fontWeight: 800 }}>
              {m.icon}{m.val}
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={copy} style={btnStyle(copied ? '16,185,129' : p.accent, copied)}>
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copied ? '¡Copiado!' : 'Copiar link VIP'}
        </button>
        <a href={link} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle('148,163,184'), textDecoration: 'none' }}>
          <ExternalLink size={14} /> Ver
        </a>
        <button onClick={() => onEdit(p)} style={btnStyle('148,163,184')}>
          <Pencil size={14} /> Editar
        </button>
        <button onClick={() => onDuplicate(p)} style={btnStyle('148,163,184')} title="Duplicar para otro prospecto">
          <Files size={14} />
        </button>
        <button onClick={() => onDelete(p)} style={{ ...btnStyle('239,68,68'), marginLeft: 'auto' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function btnStyle(rgb, active = false) {
  return {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    background: active ? `rgba(${rgb},0.18)` : `rgba(${rgb},0.1)`,
    border: `1px solid rgba(${rgb},0.35)`, color: `rgb(${rgb})`,
    padding: '0.45rem 0.8rem', borderRadius: '0.6rem', cursor: 'pointer',
    fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s'
  };
}

// ── Input reutilizable ───────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
        {label}{hint && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
  borderRadius: '0.6rem', padding: '0.65rem 0.8rem', color: 'var(--text-main)',
  fontSize: '0.9rem', fontFamily: 'inherit', width: '100%', outline: 'none'
};

// ── Builder ──────────────────────────────────────────────────────────────────
function Builder({ initial, onBack, onSaved }) {
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setP((prev) => ({ ...prev, ...patch }));

  const addTo = (key, item) => set({ [key]: [...(p[key] || []), item] });
  const updAt = (key, i, item) => set({ [key]: p[key].map((x, j) => (j === i ? item : x)) });
  const rmAt = (key, i) => set({ [key]: p[key].filter((_, j) => j !== i) });

  const save = async (status) => {
    setSaving(true);
    try {
      const data = { ...p, status: status || p.status };
      if (p.id) {
        await updateProposal(p.id, data);
        onSaved({ ...data, id: p.id });
      } else {
        const id = await createProposal(data);
        onSaved({ ...data, id });
      }
    } catch (e) {
      alert('No se pudo guardar: ' + (e?.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem', alignItems: 'start' }} className="proposal-builder-grid">
      {/* ── Columna izquierda: formulario ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
        <button onClick={onBack} style={{ ...btnStyle('148,163,184'), alignSelf: 'flex-start' }}>
          <ArrowLeft size={14} /> Volver
        </button>

        <Section title="Lo básico" accent={p.accent}>
          <Field label="Título de la propuesta">
            <input style={inputStyle} value={p.title} onChange={(e) => set({ title: e.target.value })} placeholder="Propuesta de Closing · Marca X" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <Field label="Prospecto">
              <input style={inputStyle} value={p.prospectName} onChange={(e) => set({ prospectName: e.target.value })} placeholder="Nombre" />
            </Field>
            <Field label="@ / Empresa">
              <input style={inputStyle} value={p.prospectHandle} onChange={(e) => set({ prospectHandle: e.target.value })} placeholder="@marca" />
            </Field>
          </div>
          <Field label="Apertura personalizada" hint="tu pitch inicial">
            <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} value={p.intro} onChange={(e) => set({ intro: e.target.value })} placeholder="Hola [nombre], vi tu cuenta y detecté 3 oportunidades concretas para escalar tus ventas..." />
          </Field>
          <Field label="Imagen de portada" hint="opcional">
            <ImageUploader accent={p.accent} value={{ url: p.coverImage }} height={150}
              label="Subir portada"
              onChange={({ url }) => set({ coverImage: url })} />
          </Field>
        </Section>

        <Section title="Cómo trabajás" accent={p.accent} icon={<Video size={15} />}>
          <Field label="Video principal" hint="Loom, YouTube, Vimeo o reel de IG">
            <input style={inputStyle} value={p.loomUrl} onChange={(e) => set({ loomUrl: e.target.value })} placeholder="https://www.loom.com/share/...  ·  o un reel de instagram.com/reel/..." />
          </Field>
          <ArrayEditor
            label="Videos extra" accent={p.accent}
            items={p.videos} placeholder1="Título (ej: Testimonio cliente)" placeholder2="Link (Loom, YouTube, IG...)"
            onAdd={() => addTo('videos', { title: '', url: '' })}
            onChange={(i, v) => updAt('videos', i, v)}
            onRemove={(i) => rmAt('videos', i)}
            fields={['title', 'url']}
          />
          <ArrayEditor
            label="Llamadas / role-plays" accent={p.accent}
            items={p.callUrls} placeholder1="Etiqueta (ej: Cierre objeción precio)" placeholder2="URL"
            onAdd={() => addTo('callUrls', { label: '', url: '' })}
            onChange={(i, v) => updAt('callUrls', i, v)}
            onRemove={(i) => rmAt('callUrls', i)}
            fields={['label', 'url']}
          />
        </Section>

        <Section title="Galería" accent={p.accent} icon={<ImageIcon size={15} />}>
          <GalleryEditor
            items={p.gallery} accent={p.accent}
            onAdd={(img) => addTo('gallery', img)}
            onCaption={(i, caption) => updAt('gallery', i, { ...p.gallery[i], caption })}
            onRemove={(i) => rmAt('gallery', i)}
          />
        </Section>

        <Section title="Auditoría" accent={p.accent} icon={<Sparkles size={15} />}>
          <ArrayEditor
            label="Oportunidades detectadas" accent={p.accent}
            items={p.auditPoints} placeholder1="Título (ej: Sin sistema de seguimiento)" placeholder2="Detalle"
            onAdd={() => addTo('auditPoints', { title: '', detail: '' })}
            onChange={(i, v) => updAt('auditPoints', i, v)}
            onRemove={(i) => rmAt('auditPoints', i)}
            fields={['title', 'detail']}
          />
        </Section>

        <Section title="Objeciones que ya resolviste" accent={p.accent} icon={<MessageSquare size={15} />}>
          <ArrayEditor
            label="Q&A de objeciones" accent={p.accent}
            items={p.objections} placeholder1="Objeción (ej: Es caro)" placeholder2="Tu respuesta"
            onAdd={() => addTo('objections', { q: '', a: '' })}
            onChange={(i, v) => updAt('objections', i, v)}
            onRemove={(i) => rmAt('objections', i)}
            fields={['q', 'a']}
          />
        </Section>

        <Section title="La oferta" accent={p.accent}>
          <Field label="Resumen de la oferta">
            <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={p.offer.summary} onChange={(e) => set({ offer: { ...p.offer, summary: e.target.value } })} placeholder="Me sumo como closer de tu equipo: gestiono tu pipeline, hago seguimiento y cierro..." />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.8rem' }}>
            <Field label="Precio / fee">
              <input style={inputStyle} value={p.offer.price} onChange={(e) => set({ offer: { ...p.offer, price: e.target.value } })} placeholder="15% + fijo" />
            </Field>
            <Field label="Nota">
              <input style={inputStyle} value={p.offer.priceNote} onChange={(e) => set({ offer: { ...p.offer, priceNote: e.target.value } })} placeholder="Primeras 2 semanas a prueba" />
            </Field>
          </div>
        </Section>

        <Section title="Prueba social" accent={p.accent}>
          <ArrayEditor
            label="Testimonios" accent={p.accent}
            items={p.testimonials} placeholder1="Nombre" placeholder2="Testimonio"
            onAdd={() => addTo('testimonials', { name: '', text: '' })}
            onChange={(i, v) => updAt('testimonials', i, v)}
            onRemove={(i) => rmAt('testimonials', i)}
            fields={['name', 'text']}
          />
        </Section>

        <Section title="Cierre" accent={p.accent} icon={<Calendar size={15} />}>
          <Field label="Link de Calendly">
            <input style={inputStyle} value={p.ctaCalendly} onChange={(e) => set({ ctaCalendly: e.target.value })} placeholder="https://calendly.com/tu-usuario/..." />
          </Field>
          <Field label="WhatsApp" hint="número con código de país">
            <input style={inputStyle} value={p.ctaWhatsapp} onChange={(e) => set({ ctaWhatsapp: e.target.value })} placeholder="+54911..." />
          </Field>
        </Section>

        <Section title="Tu marca" accent={p.accent} icon={<Palette size={15} />}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Tu foto</span>
              <ImageUploader accent={p.accent} round value={{ url: p.ownerPhoto }}
                onChange={({ url }) => set({ ownerPhoto: url })} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <Field label="Tu nombre">
                <input style={inputStyle} value={p.ownerName} onChange={(e) => set({ ownerName: e.target.value })} placeholder="Tu nombre" />
              </Field>
              <Field label="Tu rol / tagline">
                <input style={inputStyle} value={p.ownerTagline} onChange={(e) => set({ ownerTagline: e.target.value })} placeholder="Closer de ventas high-ticket" />
              </Field>
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Color de marca</span>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {ACCENTS.map((a) => (
                <button key={a.rgb} onClick={() => set({ accent: a.rgb })} title={a.name} style={{
                  width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer',
                  background: `rgb(${a.rgb})`,
                  border: p.accent === a.rgb ? '3px solid white' : '3px solid transparent',
                  boxShadow: `0 0 12px rgba(${a.rgb},0.5)`
                }} />
              ))}
            </div>
          </div>
        </Section>

        <div style={{ display: 'flex', gap: '0.7rem', position: 'sticky', bottom: '1rem' }}>
          <button disabled={saving} onClick={() => save('draft')} style={{ ...bigBtn('148,163,184'), flex: 1 }}>
            <Save size={16} /> {saving ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button disabled={saving} onClick={() => save('sent')} style={{ ...bigBtn(p.accent), flex: 1 }}>
            <CheckCircle2 size={16} /> Guardar y marcar enviada
          </button>
        </div>
      </div>

      {/* ── Columna derecha: preview en vivo ── */}
      <div style={{ position: 'sticky', top: '1rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Eye size={13} /> Preview en vivo
        </div>
        <div style={{ borderRadius: '1.2rem', overflow: 'hidden', border: `1px solid rgba(${p.accent},0.3)`, maxHeight: '80vh', overflowY: 'auto' }}>
          <ProposalPreview p={p} />
        </div>
      </div>
    </div>
  );
}

function bigBtn(rgb) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    background: `linear-gradient(135deg, rgb(${rgb}), rgba(${rgb},0.7))`,
    border: 'none', color: 'white', padding: '0.85rem', borderRadius: '0.8rem',
    cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800,
    boxShadow: `0 6px 20px rgba(${rgb},0.4)`
  };
}

function Section({ title, icon, accent, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {icon && <span style={{ color: `rgb(${accent})` }}>{icon}</span>}
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Editor genérico de arrays (auditoría, llamadas, objeciones, testimonios).
function ArrayEditor({ label, items, fields, placeholder1, placeholder2, accent, onAdd, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{label}</span>
      {(items || []).map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <input style={inputStyle} value={item[fields[0]]} placeholder={placeholder1}
              onChange={(e) => onChange(i, { ...item, [fields[0]]: e.target.value })} />
            <input style={inputStyle} value={item[fields[1]]} placeholder={placeholder2}
              onChange={(e) => onChange(i, { ...item, [fields[1]]: e.target.value })} />
          </div>
          <button onClick={() => onRemove(i)} style={{ ...btnStyle('239,68,68'), padding: '0.5rem' }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={onAdd} style={{ ...btnStyle(accent), alignSelf: 'flex-start' }}>
        <Plus size={14} /> Agregar
      </button>
    </div>
  );
}

// Editor de galería: sube imágenes a Storage y permite un caption por cada una.
function GalleryEditor({ items, accent, onAdd, onCaption, onRemove }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      {(items || []).map((img, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
          <img src={img.url} alt="" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '0.5rem', border: `1px solid rgba(${accent},0.3)` }} />
          <input style={{ ...inputStyle, flex: 1 }} value={img.caption || ''} placeholder="Descripción (opcional)"
            onChange={(e) => onCaption(i, e.target.value)} />
          <button onClick={() => onRemove(i)} style={{ ...btnStyle('239,68,68'), padding: '0.5rem' }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div style={{ maxWidth: '260px' }}>
        <ImageUploader accent={accent} value={{ url: '' }} height={90} label="Subir imagen a la galería"
          onChange={({ url }) => url && onAdd({ url, caption: '' })} />
      </div>
    </div>
  );
}

// Preview: renderiza una versión compacta de lo que verá el prospecto.
function ProposalPreview({ p }) {
  return (
    <div style={{ background: '#0a0a14', padding: '1.5rem', color: 'white' }}>
      {p.coverImage && (
        <img src={p.coverImage} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '0.7rem', marginBottom: '1rem' }} />
      )}
      {(p.ownerPhoto || p.ownerName) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          {p.ownerPhoto
            ? <img src={p.ownerPhoto} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: `2px solid rgb(${p.accent})` }} />
            : <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `rgba(${p.accent},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} color={`rgb(${p.accent})`} /></div>}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.ownerName}</div>
            {p.ownerTagline && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.ownerTagline}</div>}
          </div>
        </div>
      )}
      <div style={{ fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: `rgb(${p.accent})`, fontWeight: 700 }}>
        Propuesta VIP {p.prospectName ? `· para ${p.prospectName}` : ''}
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0.4rem 0 0', lineHeight: 1.15 }}>
        {p.title || 'Tu título aparecerá acá'}
      </h1>
      {p.intro && <p style={{ color: 'var(--text-muted)', marginTop: '0.8rem', fontSize: '0.9rem', lineHeight: 1.5 }}>{p.intro}</p>}

      {p.loomUrl && (
        <div style={{ marginTop: '1rem' }}>
          <VideoPlayer url={p.loomUrl} accent={p.accent} />
        </div>
      )}

      {p.videos?.filter((v) => v.url).length > 0 && (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.8rem' }}>
          {p.videos.filter((v) => v.url).map((v, i) => (
            <VideoPlayer key={i} url={v.url} title={v.title} accent={p.accent} />
          ))}
        </div>
      )}

      {p.gallery?.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
          {p.gallery.map((img, i) => (
            <img key={i} src={img.url} alt={img.caption || ''} style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '0.4rem' }} />
          ))}
        </div>
      )}

      {p.auditPoints?.length > 0 && (
        <div style={{ marginTop: '1.2rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>Oportunidades detectadas</div>
          {p.auditPoints.map((a, i) => a.title && (
            <div key={i} style={{ padding: '0.6rem 0.8rem', background: `rgba(${p.accent},0.08)`, borderLeft: `3px solid rgb(${p.accent})`, borderRadius: '0.4rem', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.title}</div>
              {a.detail && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.detail}</div>}
            </div>
          ))}
        </div>
      )}

      {p.offer?.summary && (
        <div style={{ marginTop: '1.2rem', padding: '1rem', borderRadius: '0.8rem', background: `linear-gradient(135deg, rgba(${p.accent},0.15), rgba(${p.accent},0.05))`, border: `1px solid rgba(${p.accent},0.3)` }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.3rem' }}>La propuesta</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{p.offer.summary}</p>
          {p.offer.price && <div style={{ marginTop: '0.6rem', fontSize: '1.1rem', fontWeight: 900, color: `rgb(${p.accent})` }}>{p.offer.price}</div>}
        </div>
      )}

      {(p.ctaCalendly || p.ctaWhatsapp) && (
        <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.5rem' }}>
          {p.ctaCalendly && <div style={{ flex: 1, textAlign: 'center', padding: '0.7rem', borderRadius: '0.7rem', background: `rgb(${p.accent})`, fontWeight: 800, fontSize: '0.85rem' }}>Agendar llamada</div>}
          {p.ctaWhatsapp && <div style={{ flex: 1, textAlign: 'center', padding: '0.7rem', borderRadius: '0.7rem', background: 'rgba(255,255,255,0.08)', fontWeight: 800, fontSize: '0.85rem' }}>WhatsApp</div>}
        </div>
      )}
    </div>
  );
}

// ── Selector de nicho (paso previo a crear una propuesta) ────────────────────
function NichePicker({ onPick, onBack }) {
  return (
    <div className="app-container" style={{ overflowY: 'auto', padding: '1.5rem 1.25rem 4rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.5rem' }}>
          <button onClick={onBack} style={btnStyle('148,163,184')}>
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
        <h1 style={{ margin: '1rem 0 0.3rem', fontSize: '1.6rem', fontWeight: 900 }}>¿A qué nicho apuntás?</h1>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 1.8rem', fontSize: '0.9rem' }}>
          Elegí un punto de partida. Precargamos oportunidades, objeciones y encuadre típicos del rubro — después editás todo a gusto.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {NICHES.map((n) => (
            <button key={n.id} onClick={() => onPick(n)} style={{
              textAlign: 'left', cursor: 'pointer', padding: '1.3rem',
              background: 'rgba(15,15,30,0.6)', backdropFilter: 'blur(16px)',
              border: `1px solid rgba(${n.accent},0.3)`, borderRadius: '1.1rem',
              display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'all 0.2s',
              color: 'white'
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 30px rgba(${n.accent},0.25)`; e.currentTarget.style.borderColor = `rgba(${n.accent},0.6)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `rgba(${n.accent},0.3)`; }}
            >
              <div style={{
                width: '46px', height: '46px', borderRadius: '0.8rem', fontSize: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `rgba(${n.accent},0.15)`, border: `1px solid rgba(${n.accent},0.3)`
              }}>{n.emoji}</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{n.label}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.blurb}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal exportado ───────────────────────────────────────────
export default function ProposalGenerator({ onBack }) {
  const uid = auth.currentUser?.uid;
  const ownerName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Closer';
  const [view, setView] = useState('dashboard'); // dashboard | picker | builder
  const [editing, setEditing] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeMyProposals(uid, (items) => {
      setProposals(items);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, [uid]);

  const openNew = () => setView('picker');

  // El closer eligió un nicho: fusionamos su plantilla sobre la base vacía.
  const pickNiche = (niche) => {
    setEditing({
      ...emptyProposal(ownerName),
      niche: niche.id === 'blank' ? '' : niche.id,
      accent: niche.accent,
      ...niche.template
    });
    setView('builder');
  };

  // Firebase RTDB no almacena arrays vacíos: al releer, esos campos vuelven
  // como undefined. Fusionamos sobre la base vacía para restaurar defaults.
  const openEdit = (p) => { setEditing({ ...emptyProposal(ownerName), ...p }); setView('builder'); };

  const handleDuplicate = useCallback(async (p) => {
    try { await duplicateProposal(p); } catch (e) { alert('No se pudo duplicar: ' + e.message); }
  }, []);

  const handleDelete = useCallback(async (p) => {
    if (!window.confirm(`¿Borrar "${p.title || 'esta propuesta'}"?`)) return;
    try { await deleteProposal(p.id); } catch (e) { alert('No se pudo borrar: ' + e.message); }
  }, []);

  if (view === 'picker') {
    return <NichePicker onPick={pickNiche} onBack={() => setView('dashboard')} />;
  }

  if (view === 'builder') {
    return (
      <div className="app-container" style={{ overflowY: 'auto', padding: '1.5rem 1.25rem 4rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
          <Builder
            initial={editing}
            onBack={() => setView('dashboard')}
            onSaved={() => setView('dashboard')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ overflowY: 'auto', padding: '1.5rem 1.25rem 4rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <button onClick={onBack} style={btnStyle('148,163,184')}>
              <ArrowLeft size={14} /> Lobby
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={22} color="#863bff" /> Propuestas VIP
              </h1>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Armá, enviá y medí tus propuestas de closing.
              </p>
            </div>
          </div>
          <button onClick={openNew} style={bigBtn('134,59,255')}>
            <Plus size={16} /> Nueva propuesta
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Cargando…</p>
        ) : proposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '1.2rem' }}>
            <Sparkles size={32} color="#863bff" style={{ marginBottom: '0.8rem' }} />
            <h3 style={{ margin: 0, color: 'white' }}>Todavía no tenés propuestas</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0.4rem 0 1.2rem', fontSize: '0.88rem' }}>
              Creá tu primera propuesta VIP: con tu Loom, tus llamadas y un link para trackear.
            </p>
            <button onClick={openNew} style={{ ...bigBtn('134,59,255'), margin: '0 auto' }}>
              <Plus size={16} /> Crear la primera
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {proposals.map((p) => (
              <ProposalCard key={p.id} p={p} onEdit={openEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

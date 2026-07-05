import { useState, useEffect } from 'react';
import { getProposal, trackEvent } from './proposalService';
import { VideoPlayer } from './MediaComponents';
import { safeHttpUrl } from './mediaEmbed';

// Vista PÚBLICA de una propuesta VIP.
// La abre el prospecto desde el link /p/:id — sin login. Es un componente
// autónomo: lee el id de la URL directamente (no depende del router de la app),
// así no toca en absoluto el flujo autenticado de Sales Arena.
export default function PublicProposal() {
  const id = window.location.pathname.replace(/^\/p\//, '').replace(/\/$/, '');
  const [p, setP] = useState(undefined); // undefined = cargando, null = no existe

  useEffect(() => {
    let alive = true;
    getProposal(id).then((data) => {
      if (!alive) return;
      setP(data);
      if (data) {
        trackEvent(id, 'view');                   // registra la apertura
        if (data.title) document.title = `${data.title} · Propuesta VIP`;
      }
    }).catch(() => alive && setP(null));
    return () => { alive = false; };
  }, [id]);

  if (p === undefined) return <Centered>Cargando propuesta…</Centered>;
  if (p === null) return <Centered>Esta propuesta no existe o fue eliminada.</Centered>;

  const accent = p.accent || '94,92,230';

  const onCta = (label, url) => {
    trackEvent(id, 'click', label);
    const safe = safeHttpUrl(url);
    if (safe) window.open(safe, '_blank', 'noopener');
  };

  // WhatsApp con mensaje pre-armado para que el contratador escriba directo.
  const waMsg = encodeURIComponent(
    `Hola${p.ownerName ? ' ' + p.ownerName : ''}, vi tu propuesta VIP${p.title ? ` "${p.title}"` : ''} y quiero avanzar.`
  );
  const waLink = p.ctaWhatsapp
    ? `https://wa.me/${p.ctaWhatsapp.replace(/[^\d]/g, '')}?text=${waMsg}`
    : '';

  return (
    <div style={{
      minHeight: '100vh', background: '#09090b', color: '#f8fafc',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif",
      backgroundImage: `radial-gradient(circle at 15% 20%, rgba(${accent},0.12), transparent 30%), radial-gradient(circle at 85% 60%, rgba(${accent},0.08), transparent 30%)`
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.25rem 6rem' }}>

        {/* Portada */}
        {p.coverImage && (
          <img src={p.coverImage} alt="" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1.8rem', border: `1px solid rgba(${accent},0.2)` }} />
        )}

        {/* Perfil del closer */}
        {(p.ownerPhoto || p.ownerName) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.8rem' }}>
            {p.ownerPhoto
              ? <img src={p.ownerPhoto} alt={p.ownerName} style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', border: `2px solid rgb(${accent})` }} />
              : <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: `rgba(${accent},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 600, color: `rgb(${accent})` }}>{(p.ownerName || '?')[0].toUpperCase()}</div>}
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{p.ownerName}</div>
              {p.ownerTagline && <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{p.ownerTagline}</div>}
            </div>
          </div>
        )}

        {/* Eyebrow */}
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: `rgb(${accent})`, fontWeight: 700 }}>
          Propuesta VIP{p.ownerName && !p.ownerPhoto ? ` · de ${p.ownerName}` : ''}
        </div>

        {/* Hero */}
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 700, margin: '0.5rem 0 0', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          {p.title}
        </h1>
        {p.prospectName && (
          <p style={{ fontSize: '1.05rem', color: '#94a3b8', marginTop: '0.6rem' }}>
            Preparada para <strong style={{ color: 'white' }}>{p.prospectName}</strong>
            {p.prospectHandle ? ` · ${p.prospectHandle}` : ''}
          </p>
        )}

        {p.intro && (
          <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#cbd5e1', marginTop: '1.5rem' }}>
            {p.intro}
          </p>
        )}

        {/* Video principal */}
        {p.loomUrl && (
          <Block accent={accent} label="Cómo trabajo">
            <VideoPlayer url={p.loomUrl} accent={accent} />
          </Block>
        )}

        {/* Videos extra (multi-proveedor) */}
        {p.videos?.filter((v) => v.url).length > 0 && (
          <Block accent={accent} label="Más videos">
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {p.videos.filter((v) => v.url).map((v, i) => (
                <VideoPlayer key={i} url={v.url} title={v.title} accent={accent} />
              ))}
            </div>
          </Block>
        )}

        {/* Galería de imágenes */}
        {p.gallery?.length > 0 && (
          <Block accent={accent} label="Galería">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.7rem' }}>
              {p.gallery.map((img, i) => (
                <figure key={i} style={{ margin: 0 }}>
                  <img src={img.url} alt={img.caption || ''} style={{ width: '100%', borderRadius: '10px', border: `1px solid rgba(${accent},0.2)`, display: 'block' }} />
                  {img.caption && <figcaption style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.3rem' }}>{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </Block>
        )}

        {/* Llamadas / role-plays */}
        {p.callUrls?.filter((c) => safeHttpUrl(c.url)).length > 0 && (
          <Block accent={accent} label="Llamadas y role-plays">
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {p.callUrls.filter((c) => safeHttpUrl(c.url)).map((c, i) => (
                <a key={i} href={safeHttpUrl(c.url)} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackEvent(id, 'click', `call:${c.label || i}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.9rem 1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(${accent},0.2)`, color: 'white', textDecoration: 'none' }}>
                  <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: `rgba(${accent},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: `rgb(${accent})`, fontWeight: 600 }}>▶</span>
                  <span style={{ fontWeight: 600 }}>{c.label || `Grabación ${i + 1}`}</span>
                </a>
              ))}
            </div>
          </Block>
        )}

        {/* Auditoría */}
        {p.auditPoints?.filter((a) => a.title).length > 0 && (
          <Block accent={accent} label="Lo que detecté">
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {p.auditPoints.filter((a) => a.title).map((a, i) => (
                <div key={i} style={{ padding: '1rem 1.1rem', background: `rgba(${accent},0.07)`, borderLeft: `3px solid rgb(${accent})`, borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{a.title}</div>
                  {a.detail && <div style={{ color: '#94a3b8', marginTop: '0.25rem', fontSize: '0.92rem', lineHeight: 1.5 }}>{a.detail}</div>}
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* Oferta */}
        {(p.offer?.summary || p.offer?.price) && (
          <div style={{ marginTop: '2.5rem', padding: '1.8rem', borderRadius: '14px', background: `linear-gradient(135deg, rgba(${accent},0.16), rgba(${accent},0.04))`, border: `1px solid rgba(${accent},0.35)` }}>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: `rgb(${accent})`, fontWeight: 700, marginBottom: '0.6rem' }}>La propuesta</div>
            {p.offer.summary && <p style={{ fontSize: '1.02rem', lineHeight: 1.6, color: '#e2e8f0', margin: 0 }}>{p.offer.summary}</p>}
            {p.offer.price && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: `rgb(${accent})` }}>{p.offer.price}</span>
                {p.offer.priceNote && <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{p.offer.priceNote}</span>}
              </div>
            )}
          </div>
        )}

        {/* Objeciones */}
        {p.objections?.filter((o) => o.q).length > 0 && (
          <Block accent={accent} label="Preguntas frecuentes">
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {p.objections.filter((o) => o.q).map((o, i) => (
                <div key={i} style={{ padding: '1rem 1.1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700 }}>{o.q}</div>
                  {o.a && <div style={{ color: '#94a3b8', marginTop: '0.3rem', fontSize: '0.92rem', lineHeight: 1.5 }}>{o.a}</div>}
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* Testimonios */}
        {p.testimonials?.filter((t) => t.text).length > 0 && (
          <Block accent={accent} label="Lo que dicen">
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {p.testimonials.filter((t) => t.text).map((t, i) => (
                <blockquote key={i} style={{ margin: 0, padding: '1rem 1.2rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid rgba(${accent},0.5)` }}>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#e2e8f0' }}>"{t.text}"</p>
                  {t.name && <footer style={{ marginTop: '0.5rem', color: `rgb(${accent})`, fontWeight: 700, fontSize: '0.88rem' }}>— {t.name}</footer>}
                </blockquote>
              ))}
            </div>
          </Block>
        )}

        {/* CTA */}
        {(p.ctaCalendly || waLink) && (
          <div style={{ marginTop: '3rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            {p.ctaCalendly && (
              <button onClick={() => onCta('calendly', p.ctaCalendly)} style={ctaBtn(accent, true)}>
                📅 Agendar una llamada
              </button>
            )}
            {waLink && (
              <button onClick={() => onCta('whatsapp', waLink)} style={ctaBtn(accent, false)}>
                💬 Escribir por WhatsApp
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: '3.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#475569' }}>
          Propuesta generada con Sales Arena
        </div>
      </div>

      {/* Botón flotante: contacto directo por WhatsApp desde cualquier punto */}
      {waLink && (
        <button onClick={() => onCta('whatsapp_float', waLink)} style={{
          position: 'fixed', bottom: '1.4rem', right: '1.4rem', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '0.55rem',
          padding: '0.9rem 1.3rem', borderRadius: '2.5rem', border: 'none', cursor: 'pointer',
          background: '#25D366', color: 'white',
          fontWeight: 600, fontSize: '0.95rem', fontFamily: 'inherit',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.1-.2.2-.3.2-.6.1-1.5-.8-2.6-1.4-3.6-3.1-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2 .8 2.7.9 3.7.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2z"/></svg>
          Contactar por WhatsApp
        </button>
      )}
    </div>
  );
}

function Block({ label, accent, children }) {
  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: `rgb(${accent})`, fontWeight: 700, marginBottom: '0.9rem' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ctaBtn(accent, primary) {
  return {
    flex: '1 1 220px', padding: '14px 20px', borderRadius: '12px', cursor: 'pointer',
    fontSize: '16px', fontWeight: 600, border: primary ? 'none' : '1px solid rgba(255,255,255,0.1)',
    background: primary ? `rgb(${accent})` : 'rgba(255,255,255,0.08)',
    color: 'white', boxShadow: primary ? '0 1px 3px rgba(0,0,0,0.25)' : 'none',
    fontFamily: 'inherit',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };
}

function Centered({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#94a3b8', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif", padding: '2rem', textAlign: 'center' }}>
      <p>{children}</p>
    </div>
  );
}

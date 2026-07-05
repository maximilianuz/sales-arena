import { useState, useRef } from 'react';
import { ImagePlus, X, Loader, ExternalLink } from 'lucide-react';
import { resolveVideo } from './mediaEmbed';
import { uploadImage } from './proposalService';

// Player de video limpio: enmarca cualquier proveedor (Loom/YT/Vimeo/IG/archivo)
// en un contenedor con bordes redondeados, sombra y un título opcional arriba.
// Así la grabación queda prolija aunque el closer aparezca hablando dentro.
export function VideoPlayer({ url, title, accent = '94,92,230' }) {
  const v = resolveVideo(url);
  if (!v) return null;

  if (v.kind === 'link') {
    return (
      <a href={v.src} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: `rgb(${accent})`, fontWeight: 700, textDecoration: 'none' }}>
        <ExternalLink size={15} /> {title || 'Ver video'}
      </a>
    );
  }

  const frame = (
    <div style={{
      position: 'relative', paddingBottom: `${v.ratio}%`,
      borderRadius: '12px', overflow: 'hidden',
      boxShadow: `0 12px 40px rgba(${accent},0.2)`,
      border: `1px solid rgba(${accent},0.25)`, background: '#000',
      maxWidth: v.maxWidth ? `${v.maxWidth}px` : '100%',
      margin: v.maxWidth ? '0 auto' : undefined
    }}>
      {v.kind === 'iframe' ? (
        <iframe src={v.src} title={title || 'Video'} allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
      ) : (
        <video src={v.src} controls playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );

  if (!title) return frame;
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>{title}</div>
      {frame}
    </div>
  );
}

// Uploader de imagen: sube a Storage y muestra preview. `round` para avatares.
export function ImageUploader({ value, onChange, accent = '94,92,230', label = 'Subir imagen', round = false, height = 140 }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  const pick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const { url, path } = await uploadImage(file);
      onChange({ url, path });
    } catch (x) {
      setErr(x.message || 'No se pudo subir');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clear = () => onChange({ url: '', path: '' });

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      {value?.url ? (
        <div style={{ position: 'relative', width: round ? '80px' : '100%' }}>
          <img src={value.url} alt="" style={{
            width: round ? '80px' : '100%', height: round ? '80px' : `${height}px`,
            objectFit: 'cover', borderRadius: round ? '50%' : '0.7rem',
            border: `2px solid rgba(${accent},0.4)`
          }} />
          <button onClick={clear} type="button" title="Quitar" style={{
            position: 'absolute', top: round ? 0 : '0.4rem', right: round ? 0 : '0.4rem',
            width: '24px', height: '24px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><X size={14} /></button>
        </div>
      ) : (
        <button onClick={pick} type="button" disabled={busy} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          width: round ? '80px' : '100%', height: round ? '80px' : `${height}px`,
          borderRadius: round ? '50%' : '0.7rem', cursor: 'pointer',
          background: `rgba(${accent},0.06)`, border: `1px dashed rgba(${accent},0.4)`,
          color: `rgb(${accent})`, fontWeight: 700, fontSize: round ? 0 : '0.85rem', flexDirection: 'column'
        }}>
          {busy ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={round ? 22 : 18} />}
          {!round && (busy ? 'Subiendo…' : label)}
        </button>
      )}
      {err && <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.3rem' }}>{err}</div>}
    </div>
  );
}

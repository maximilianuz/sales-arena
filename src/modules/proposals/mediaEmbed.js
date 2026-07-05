// ─────────────────────────────────────────────────────────────────────────────
// Embebido de video multi-proveedor.
// Detecta Loom / YouTube / Vimeo / Instagram / archivo directo y devuelve cómo
// renderizarlo de forma limpia. Instagram usa su modo /embed oficial, así el
// reel queda dentro de la propuesta sin descargar nada (respeta los términos de IG).
// ─────────────────────────────────────────────────────────────────────────────

// Devuelve { kind: 'iframe'|'video'|'link', src, ratio } o null si está vacío.
export function resolveVideo(url) {
  if (!url) return null;
  const u = url.trim();

  // Loom
  let m = /loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/.exec(u);
  if (m) return { kind: 'iframe', src: `https://www.loom.com/embed/${m[1]}`, ratio: 56.25 };

  // YouTube (watch, youtu.be, shorts)
  m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(u);
  if (m) return { kind: 'iframe', src: `https://www.youtube.com/embed/${m[1]}`, ratio: 56.25 };

  // Vimeo
  m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
  if (m) return { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}`, ratio: 56.25 };

  // Instagram (reel / post / tv) → embed vertical
  m = /instagram\.com\/(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/.exec(u);
  if (m) {
    const kindPath = m[1] === 'reels' ? 'reel' : m[1];
    return { kind: 'iframe', src: `https://www.instagram.com/${kindPath}/${m[2]}/embed`, ratio: 125, maxWidth: 400 };
  }

  // Archivo de video directo (solo http/https)
  if (/^https?:\/\/.+\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(u)) {
    return { kind: 'video', src: u, ratio: 56.25 };
  }

  // No reconocido → link plano, pero SOLO si es http(s).
  // Esto bloquea esquemas peligrosos (javascript:, data:) en la vista pública.
  if (/^https?:\/\//i.test(u)) return { kind: 'link', src: u };
  return null;
}

// Devuelve la URL solo si es http(s); si no, cadena vacía. Para hrefs/window.open.
export function safeHttpUrl(url) {
  const u = (url || '').trim();
  return /^https?:\/\//i.test(u) ? u : '';
}

// Compat: mantiene la firma anterior usada en el código base.
export function loomEmbedUrl(url) {
  const v = resolveVideo(url);
  return v && v.kind === 'iframe' ? v.src : '';
}

// Etiqueta amigable del proveedor (para el builder).
export function videoProviderName(url) {
  if (!url) return '';
  if (/loom\.com/.test(url)) return 'Loom';
  if (/youtu/.test(url)) return 'YouTube';
  if (/vimeo\.com/.test(url)) return 'Vimeo';
  if (/instagram\.com/.test(url)) return 'Instagram';
  if (/\.(mp4|webm|mov|m4v)/i.test(url)) return 'Video';
  return 'Link';
}

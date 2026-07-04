// Países para la bandera identificatoria del closer. Lista curada (foco LatAm +
// España + EEUU + mercados frecuentes de closing). Guardamos el código ISO-2 en
// users/{uid}/country; la bandera se deriva con flagEmoji (sin imágenes/assets).

export const COUNTRIES = [
  { code: 'AR', es: 'Argentina', en: 'Argentina' },
  { code: 'BO', es: 'Bolivia', en: 'Bolivia' },
  { code: 'BR', es: 'Brasil', en: 'Brazil' },
  { code: 'CL', es: 'Chile', en: 'Chile' },
  { code: 'CO', es: 'Colombia', en: 'Colombia' },
  { code: 'CR', es: 'Costa Rica', en: 'Costa Rica' },
  { code: 'CU', es: 'Cuba', en: 'Cuba' },
  { code: 'DO', es: 'República Dominicana', en: 'Dominican Republic' },
  { code: 'EC', es: 'Ecuador', en: 'Ecuador' },
  { code: 'SV', es: 'El Salvador', en: 'El Salvador' },
  { code: 'ES', es: 'España', en: 'Spain' },
  { code: 'US', es: 'Estados Unidos', en: 'United States' },
  { code: 'GT', es: 'Guatemala', en: 'Guatemala' },
  { code: 'HN', es: 'Honduras', en: 'Honduras' },
  { code: 'MX', es: 'México', en: 'Mexico' },
  { code: 'NI', es: 'Nicaragua', en: 'Nicaragua' },
  { code: 'PA', es: 'Panamá', en: 'Panama' },
  { code: 'PY', es: 'Paraguay', en: 'Paraguay' },
  { code: 'PE', es: 'Perú', en: 'Peru' },
  { code: 'PR', es: 'Puerto Rico', en: 'Puerto Rico' },
  { code: 'UY', es: 'Uruguay', en: 'Uruguay' },
  { code: 'VE', es: 'Venezuela', en: 'Venezuela' },
  { code: 'CA', es: 'Canadá', en: 'Canada' },
  { code: 'GB', es: 'Reino Unido', en: 'United Kingdom' },
  { code: 'PT', es: 'Portugal', en: 'Portugal' },
  { code: 'FR', es: 'Francia', en: 'France' },
  { code: 'IT', es: 'Italia', en: 'Italy' },
  { code: 'DE', es: 'Alemania', en: 'Germany' },
];

// Convierte un ISO-2 ("AR") en su emoji de bandera (indicadores regionales).
export function flagEmoji(code) {
  if (!code || typeof code !== 'string' || code.length !== 2) return '';
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function countryName(code, lng = 'es') {
  const c = COUNTRIES.find(x => x.code === code);
  if (!c) return '';
  return (typeof lng === 'string' && lng.startsWith('en')) ? c.en : c.es;
}

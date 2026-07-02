// Catálogo exhaustivo de rubros/industrias para los escenarios. Cubre la mayoría
// de sectores que existen, agrupados por categoría. El "value" canónico es la
// etiqueta en español (config.theme); la UI muestra es/en. Compartido web+móvil.

export const INDUSTRY_CATEGORIES = [
  { es: 'Tecnología & Software', en: 'Technology & Software', items: [
    { es: 'Software B2B / SaaS', en: 'B2B Software / SaaS' },
    { es: 'Apps móviles', en: 'Mobile apps' },
    { es: 'Ciberseguridad', en: 'Cybersecurity' },
    { es: 'Inteligencia Artificial', en: 'Artificial Intelligence' },
    { es: 'E-commerce / Marketplaces', en: 'E-commerce / Marketplaces' },
    { es: 'Fintech', en: 'Fintech' },
    { es: 'Hosting & infraestructura', en: 'Hosting & Infrastructure' },
    { es: 'Automatización / No-code', en: 'Automation / No-code' },
  ]},
  { es: 'Marketing & Agencias', en: 'Marketing & Agencies', items: [
    { es: 'Agencia de marketing digital', en: 'Digital marketing agency' },
    { es: 'SEO / SEM', en: 'SEO / SEM' },
    { es: 'Branding & diseño', en: 'Branding & design' },
    { es: 'Gestión de redes sociales', en: 'Social media management' },
    { es: 'Publicidad / Media buying', en: 'Advertising / Media buying' },
    { es: 'Marketing de influencers', en: 'Influencer marketing' },
    { es: 'Producción audiovisual', en: 'Video production' },
  ]},
  { es: 'Coaching & Desarrollo', en: 'Coaching & Development', items: [
    { es: 'Coaching de negocios', en: 'Business coaching' },
    { es: 'Coaching de vida', en: 'Life coaching' },
    { es: 'Coaching de ventas / Closers', en: 'Sales / Closing coaching' },
    { es: 'Mentoría de emprendedores', en: 'Entrepreneur mentoring' },
    { es: 'Oratoria & comunicación', en: 'Public speaking & communication' },
    { es: 'Mindset & alto rendimiento', en: 'Mindset & high performance' },
  ]},
  { es: 'Educación & Formación', en: 'Education & Training', items: [
    { es: 'Cursos online High Ticket', en: 'High ticket online courses' },
    { es: 'Academia de idiomas', en: 'Language academy' },
    { es: 'Bootcamps / programación', en: 'Coding bootcamps' },
    { es: 'Certificaciones profesionales', en: 'Professional certifications' },
    { es: 'Educación financiera', en: 'Financial education' },
    { es: 'Tutorías / apoyo escolar', en: 'Tutoring' },
  ]},
  { es: 'Salud & Bienestar', en: 'Health & Wellness', items: [
    { es: 'Clínica médica / especialistas', en: 'Medical clinic / specialists' },
    { es: 'Odontología', en: 'Dentistry' },
    { es: 'Nutrición & planes alimenticios', en: 'Nutrition & meal plans' },
    { es: 'Salud mental / terapia', en: 'Mental health / therapy' },
    { es: 'Fisioterapia & rehabilitación', en: 'Physiotherapy & rehab' },
    { es: 'Medicina estética', en: 'Aesthetic medicine' },
    { es: 'Suplementos & bienestar', en: 'Supplements & wellness' },
  ]},
  { es: 'Estética & Belleza', en: 'Beauty & Aesthetics', items: [
    { es: 'Cirugía estética', en: 'Cosmetic surgery' },
    { es: 'Centro de estética', en: 'Beauty / aesthetic center' },
    { es: 'Peluquería & barbería', en: 'Hair & barber' },
    { es: 'Cosmética & skincare', en: 'Cosmetics & skincare' },
    { es: 'Spa & masajes', en: 'Spa & massage' },
  ]},
  { es: 'Finanzas & Seguros', en: 'Finance & Insurance', items: [
    { es: 'Seguros de vida', en: 'Life insurance' },
    { es: 'Seguros generales (auto/hogar)', en: 'General insurance (auto/home)' },
    { es: 'Inversiones & gestión patrimonial', en: 'Investments & wealth management' },
    { es: 'Créditos & préstamos', en: 'Loans & credit' },
    { es: 'Cripto & trading', en: 'Crypto & trading' },
    { es: 'Planificación financiera', en: 'Financial planning' },
    { es: 'Contabilidad & impuestos', en: 'Accounting & taxes' },
  ]},
  { es: 'Inmobiliaria & Construcción', en: 'Real Estate & Construction', items: [
    { es: 'Venta de propiedades', en: 'Property sales' },
    { es: 'Alquileres & administración', en: 'Rentals & management' },
    { es: 'Desarrollo inmobiliario', en: 'Real estate development' },
    { es: 'Reformas & remodelación', en: 'Renovation & remodeling' },
    { es: 'Arquitectura & diseño', en: 'Architecture & design' },
    { es: 'Inversión inmobiliaria', en: 'Real estate investment' },
  ]},
  { es: 'Automotriz & Transporte', en: 'Automotive & Transport', items: [
    { es: 'Venta de autos / concesionaria', en: 'Car dealership' },
    { es: 'Autos de lujo / premium', en: 'Luxury / premium cars' },
    { es: 'Motos & vehículos', en: 'Motorcycles & vehicles' },
    { es: 'Logística & flotas', en: 'Logistics & fleets' },
    { es: 'Accesorios & tuning', en: 'Accessories & tuning' },
  ]},
  { es: 'Retail & Consumo', en: 'Retail & Consumer', items: [
    { es: 'Moda & indumentaria', en: 'Fashion & apparel' },
    { es: 'Joyería & relojes', en: 'Jewelry & watches' },
    { es: 'Muebles & decoración', en: 'Furniture & decor' },
    { es: 'Electrodomésticos & electrónica', en: 'Appliances & electronics' },
    { es: 'Productos de lujo', en: 'Luxury goods' },
  ]},
  { es: 'Turismo & Hospitalidad', en: 'Travel & Hospitality', items: [
    { es: 'Agencia de viajes', en: 'Travel agency' },
    { es: 'Turismo de lujo', en: 'Luxury travel' },
    { es: 'Hotelería', en: 'Hospitality / hotels' },
    { es: 'Experiencias & eventos', en: 'Experiences & events' },
    { es: 'Wedding & bodas', en: 'Weddings' },
  ]},
  { es: 'Servicios Profesionales', en: 'Professional Services', items: [
    { es: 'Consultoría de negocios', en: 'Business consulting' },
    { es: 'Servicios legales / abogados', en: 'Legal services' },
    { es: 'Recursos Humanos / Headhunting', en: 'HR / Headhunting' },
    { es: 'Arquitectura & ingeniería', en: 'Architecture & engineering' },
    { es: 'Traducción & servicios lingüísticos', en: 'Translation & language services' },
  ]},
  { es: 'Industria & Manufactura', en: 'Industry & Manufacturing', items: [
    { es: 'Equipamiento industrial', en: 'Industrial equipment' },
    { es: 'Maquinaria & herramientas', en: 'Machinery & tools' },
    { es: 'Packaging & envases', en: 'Packaging' },
    { es: 'Insumos & materias primas', en: 'Raw materials & supplies' },
    { es: 'Automatización industrial', en: 'Industrial automation' },
  ]},
  { es: 'Agro & Energía', en: 'Agriculture & Energy', items: [
    { es: 'Insumos agrícolas', en: 'Agricultural supplies' },
    { es: 'Maquinaria agrícola', en: 'Agricultural machinery' },
    { es: 'Ganadería', en: 'Livestock' },
    { es: 'Energía solar & renovables', en: 'Solar & renewable energy' },
    { es: 'Eficiencia energética', en: 'Energy efficiency' },
  ]},
  { es: 'Gastronomía & Alimentos', en: 'Food & Gastronomy', items: [
    { es: 'Restaurantes & gastronomía', en: 'Restaurants' },
    { es: 'Catering & eventos', en: 'Catering & events' },
    { es: 'Productos gourmet', en: 'Gourmet products' },
    { es: 'Delivery & dark kitchens', en: 'Delivery & dark kitchens' },
    { es: 'Franquicias gastronómicas', en: 'Food franchises' },
  ]},
  { es: 'Fitness & Deporte', en: 'Fitness & Sports', items: [
    { es: 'Gimnasios & boxes', en: 'Gyms' },
    { es: 'Entrenamiento personal', en: 'Personal training' },
    { es: 'Nutrición deportiva', en: 'Sports nutrition' },
    { es: 'Equipamiento deportivo', en: 'Sports equipment' },
  ]},
  { es: 'Servicios para el Hogar', en: 'Home Services', items: [
    { es: 'Seguridad & domótica', en: 'Security & home automation' },
    { es: 'Limpieza & mantenimiento', en: 'Cleaning & maintenance' },
    { es: 'Jardinería & paisajismo', en: 'Gardening & landscaping' },
    { es: 'Mudanzas & fletes', en: 'Moving services' },
    { es: 'Piscinas & climatización', en: 'Pools & HVAC' },
  ]},
  { es: 'Negocios & Oportunidades', en: 'Business & Opportunities', items: [
    { es: 'Franquicias', en: 'Franchises' },
    { es: 'Oportunidades de negocio', en: 'Business opportunities' },
    { es: 'Networking / MLM', en: 'Networking / MLM' },
    { es: 'Membresías & comunidades', en: 'Memberships & communities' },
  ]},
];

// Lista plana de todos los rubros.
export const INDUSTRIES_FLAT = INDUSTRY_CATEGORIES.flatMap((c) => c.items);

// Valor canónico (es) al azar — lo que se pasa al prompt como theme.
export function randomIndustryValue() {
  const item = INDUSTRIES_FLAT[Math.floor(Math.random() * INDUSTRIES_FLAT.length)];
  return item.es;
}

export function industryLabel(item, lng = 'es') {
  const en = typeof lng === 'string' && lng.startsWith('en');
  return en ? item.en : item.es;
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationES from './locales/es.json';
import translationEN from './locales/en.json';

const resources = {
  es: {
    translation: translationES
  },
  en: {
    translation: translationEN
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es', // Español por defecto si no hay elección explícita
    supportedLngs: ['es', 'en'],
    // La app es español-first. Solo se pasa a inglés si la PERSONA lo elige
    // explícitamente (queda guardado en localStorage) o vía ?lng=en. NO usamos
    // el idioma del navegador ('navigator'): así un navegador en inglés NO fuerza
    // toda la página (ni las devoluciones de IA) a inglés.
    detection: {
      order: ['querystring', 'localStorage'],
      caches: ['localStorage'],
      lookupQuerystring: 'lng'
    },
    interpolation: {
      escapeValue: false // React already escapes by default
    }
  });

export default i18n;

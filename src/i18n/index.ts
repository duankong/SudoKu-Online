import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

const LANGUAGE_KEY = 'sudokucalm-language';

function detectLanguage(): string {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch { /* ignore */ }
  // Fall back to browser language
  const browserLang = navigator.language?.startsWith('zh') ? 'zh' : 'en';
  return browserLang;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: 'en' | 'zh') {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch { /* ignore */ }
  i18n.changeLanguage(lang);
}

export default i18n;

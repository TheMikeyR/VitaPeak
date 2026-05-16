import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { da, defaultLocale, en, fallbackLocale, isLocale } from '@vitapeak/i18n';

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? defaultLocale;
const initial = isLocale(deviceLocale) ? deviceLocale : defaultLocale;

void i18n.use(initReactI18next).init({
  lng: initial,
  fallbackLng: fallbackLocale,
  resources: {
    da: { translation: da },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };

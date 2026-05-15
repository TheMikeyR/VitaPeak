export const locales = ['da', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'da';
export const fallbackLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  da: 'Dansk',
  en: 'English',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'da' || value === 'en';
}

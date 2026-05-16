import daMessages from './locales/da.json' with { type: 'json' };
import enMessages from './locales/en.json' with { type: 'json' };

export * from './config.js';

export const messages = {
  da: daMessages,
  en: enMessages,
} as const;

export const da = daMessages;
export const en = enMessages;

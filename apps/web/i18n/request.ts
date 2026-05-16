import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isLocale } from '@vitapeak/i18n';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const messages = (
    (await import(`@vitapeak/i18n/locales/${locale}.json`)) as { default: Record<string, unknown> }
  ).default;

  return { locale, messages };
});

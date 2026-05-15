import type { MailMessage } from '../mail.types.js';

export interface MagicLinkEmailParams {
  to: string;
  url: string;
}

export function magicLinkEmail(params: MagicLinkEmailParams): MailMessage {
  const { to, url } = params;
  const subject = 'Dit log på-link til VitaPeak';
  const text = `Hej,

Klik på linket for at logge på VitaPeak:
${url}

Linket udløber om 15 minutter. Hvis du ikke har anmodet om dette, kan du ignorere e-mailen.

VitaPeak`;
  const html = `<!DOCTYPE html>
<html lang="da">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a;">
    <h2>Log på VitaPeak</h2>
    <p>Klik på knappen for at logge på din konto:</p>
    <p><a href="${escapeAttr(url)}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Log på</a></p>
    <p style="color: #6b7280; font-size: 12px;">Linket udløber om 15 minutter. Hvis du ikke har anmodet om dette, kan du ignorere e-mailen.</p>
  </body>
</html>`;
  return { to, subject, text, html, templateId: 'magic-link' };
}

function escapeAttr(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

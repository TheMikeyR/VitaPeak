import type { MailMessage } from '../mail.types.js';

export interface InviteEmailParams {
  to: string;
  inviteUrl: string;
  clinicName: string;
  therapistName: string;
}

export function inviteEmail(params: InviteEmailParams): MailMessage {
  const { to, inviteUrl, clinicName, therapistName } = params;
  const subject = `Invitation til ${clinicName}`;
  const text = `Hej,

${therapistName} har inviteret dig til at deltage i ${clinicName} på VitaPeak.

Klik på linket for at oprette din konto:
${inviteUrl}

Linket udløber om 7 dage.

Venlig hilsen,
VitaPeak`;
  const html = `<!DOCTYPE html>
<html lang="da">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a;">
    <h2>Invitation til ${escapeHtml(clinicName)}</h2>
    <p>${escapeHtml(therapistName)} har inviteret dig til at deltage i <strong>${escapeHtml(clinicName)}</strong> på VitaPeak.</p>
    <p><a href="${escapeAttr(inviteUrl)}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Opret min konto</a></p>
    <p style="color: #6b7280; font-size: 12px;">Linket udløber om 7 dage. Hvis du ikke forventede denne invitation, kan du roligt ignorere e-mailen.</p>
  </body>
</html>`;
  return { to, subject, text, html, templateId: 'invite' };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(input: string): string {
  return escapeHtml(input);
}

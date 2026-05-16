export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  templateId?: string;
}

export interface MailSendResult {
  id?: string;
}

export interface MailProvider {
  send(message: MailMessage): Promise<MailSendResult>;
}

export const MAIL_PROVIDER = Symbol.for('vitapeak.mail.provider');

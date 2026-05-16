import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type { MailMessage, MailProvider, MailSendResult } from '../mail.types.js';

@Injectable()
export class SmtpMailProvider implements MailProvider, OnModuleDestroy {
  private readonly logger = new Logger('MailProvider:smtp');
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST ?? 'localhost';
    const port = Number(process.env.SMTP_PORT ?? 1025);
    this.from = process.env.MAIL_FROM ?? 'no-reply@vitapeak.local';
    this.transporter = createTransport({
      host,
      port,
      secure: false,
      ignoreTLS: true,
    });
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    this.logger.debug({ kind: 'mail.sent', to: message.to, messageId: info.messageId });
    return { id: info.messageId };
  }

  onModuleDestroy() {
    this.transporter.close();
  }
}

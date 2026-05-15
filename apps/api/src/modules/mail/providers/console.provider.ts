import { Injectable, Logger } from '@nestjs/common';
import type { MailMessage, MailProvider, MailSendResult } from '../mail.types.js';

@Injectable()
export class ConsoleMailProvider implements MailProvider {
  private readonly logger = new Logger('MailProvider:console');

  async send(message: MailMessage): Promise<MailSendResult> {
    this.logger.log({
      kind: 'mail',
      to: message.to,
      subject: message.subject,
      templateId: message.templateId,
      bodyText: message.text,
      bodyHtml: message.html,
    });
    return { id: `console-${Date.now()}` };
  }
}

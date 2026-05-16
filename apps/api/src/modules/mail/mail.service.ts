import { Inject, Injectable } from '@nestjs/common';
import { MAIL_PROVIDER, type MailProvider, type MailSendResult } from './mail.types.js';
import { inviteEmail, type InviteEmailParams } from './templates/invite.js';
import { magicLinkEmail, type MagicLinkEmailParams } from './templates/magic-link.js';

@Injectable()
export class MailService {
  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  sendInvite(params: InviteEmailParams): Promise<MailSendResult> {
    return this.provider.send(inviteEmail(params));
  }

  sendMagicLink(params: MagicLinkEmailParams): Promise<MailSendResult> {
    return this.provider.send(magicLinkEmail(params));
  }
}

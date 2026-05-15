import { Global, Module, type Provider } from '@nestjs/common';
import { MAIL_PROVIDER } from './mail.types.js';
import { ConsoleMailProvider } from './providers/console.provider.js';
import { SmtpMailProvider } from './providers/smtp.provider.js';
import { MailService } from './mail.service.js';

const mailProviderFactory: Provider = {
  provide: MAIL_PROVIDER,
  useFactory: () => {
    const kind = (process.env.MAIL_PROVIDER ?? 'console').toLowerCase();
    switch (kind) {
      case 'smtp':
        return new SmtpMailProvider();
      case 'console':
      default:
        return new ConsoleMailProvider();
    }
  },
};

@Global()
@Module({
  providers: [mailProviderFactory, MailService],
  exports: [MailService],
})
export class MailModule {}

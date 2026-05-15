import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './db/prisma.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { AuditModule } from './audit/audit.module.js';
import { BetterAuthModule } from './auth/better-auth.module.js';
import { ClinicsModule } from './modules/clinics/clinics.module.js';
import { InvitesModule } from './modules/invites/invites.module.js';
import { MeModule } from './modules/me/me.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
    MailModule,
    BetterAuthModule,
    AuditModule,
    HealthModule,
    ClinicsModule,
    InvitesModule,
    MeModule,
  ],
})
export class AppModule {}

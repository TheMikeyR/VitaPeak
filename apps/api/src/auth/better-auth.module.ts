import { Global, Module } from '@nestjs/common';
import type { PrismaClient } from '@vitapeak/db';
import { PrismaService } from '../db/prisma.service.js';
import { MailService } from '../modules/mail/mail.service.js';
import { createAuth, type Auth } from './better-auth.config.js';
import { AuthGuard } from './auth.guard.js';
import { TenantGuard } from './tenant.guard.js';
import { AUTH_TOKEN } from './auth.tokens.js';

export { AUTH_TOKEN };

@Global()
@Module({
  providers: [
    {
      provide: AUTH_TOKEN,
      inject: [PrismaService, MailService],
      useFactory: (prisma: PrismaService, mailService: MailService): Auth =>
        createAuth({
          prisma: prisma.client as unknown as PrismaClient,
          mailService,
        }),
    },
    AuthGuard,
    TenantGuard,
  ],
  exports: [AUTH_TOKEN, AuthGuard, TenantGuard],
})
export class BetterAuthModule {}

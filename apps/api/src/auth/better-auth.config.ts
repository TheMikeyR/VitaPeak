import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer, jwt, magicLink } from 'better-auth/plugins';
import type { PrismaClient } from '@vitapeak/db';
import type { MailService } from '../modules/mail/mail.service.js';
import { runWithSystemContext } from '../db/tenant-context.js';

// JWT claim shape — Keycloak-compatible per PLAN.md / ADR 0002.
// `sub` is set by Better-Auth (default = user.id); `realm_access.roles` is
// embedded so guards do not need to change when Keycloak adopts later.
export interface VitapeakJwtClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  preferred_username?: string;
  realm_access: { roles: Array<'therapist' | 'client'> };
}

export interface CreateAuthOptions {
  prisma: PrismaClient;
  mailService: MailService;
  baseURL?: string;
  secret?: string;
}

// Better-Auth's `jwt` plugin does not support HS256 — only asymmetric
// (EdDSA default, ES256, RS256, ...). Using EdDSA with auto-generated keys
// stored in the `jwks` table. RS256 + public JWKS endpoint is the chunk 09
// hardening upgrade either way; algorithm choice doesn't affect Keycloak-shape
// claim compatibility.
export function createAuth(options: CreateAuthOptions) {
  const { prisma, mailService } = options;
  const baseURL = options.baseURL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3001';
  const secret = options.secret ?? process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET must be set (generate with `openssl rand -base64 32`).');
  }

  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret,
    baseURL,
    basePath: '/auth',
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 15,
        sendMagicLink: async ({ email, url }) => {
          await mailService.sendMagicLink({ to: email, url });
        },
      }),
      jwt({
        jwt: {
          expirationTime: '1h',
          issuer: 'vitapeak-better-auth',
          definePayload: async ({ user }) => {
            // JWT mint runs outside any HTTP request frame, so there is no tenant
            // context in AsyncLocalStorage. The Prisma tenancy extension would
            // throw on the Therapist/Client lookups below — wrap them in the
            // system-context escape hatch.
            return runWithSystemContext(async () => {
              const therapist = await prisma.therapist.findUnique({
                where: { externalAuthId: user.id },
                select: { firstName: true, lastName: true },
              });
              if (therapist) {
                return {
                  email: user.email,
                  email_verified: user.emailVerified,
                  preferred_username:
                    user.name ?? `${therapist.firstName} ${therapist.lastName}`.trim(),
                  realm_access: { roles: ['therapist'] },
                } satisfies Omit<VitapeakJwtClaims, 'sub'>;
              }

              const client = await prisma.client.findUnique({
                where: { externalAuthId: user.id },
                select: { firstName: true, lastName: true },
              });
              if (client) {
                return {
                  email: user.email,
                  email_verified: user.emailVerified,
                  preferred_username: user.name ?? `${client.firstName} ${client.lastName}`.trim(),
                  realm_access: { roles: ['client'] },
                } satisfies Omit<VitapeakJwtClaims, 'sub'>;
              }

              return {
                email: user.email,
                email_verified: user.emailVerified,
                preferred_username: user.name ?? undefined,
                realm_access: { roles: [] as Array<'therapist' | 'client'> },
              };
            });
          },
        },
      }),
      bearer(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

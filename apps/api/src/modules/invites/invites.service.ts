import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ResolvedTenantPrincipal } from '../../auth/tenant.guard.js';
import { AUTH_TOKEN } from '../../auth/auth.tokens.js';
import type { Auth } from '../../auth/better-auth.config.js';
import { PrismaService } from '../../db/prisma.service.js';
import { runWithSystemContext } from '../../db/tenant-context.js';
import { MailService } from '../mail/mail.service.js';

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateInviteInput {
  email: string;
  firstName?: string;
  lastName?: string;
  clinicName: string;
  therapistName: string;
}

export interface CreateInviteResult {
  inviteId: string;
  expiresAt: string;
  inviteUrl?: string;
}

export interface AcceptInviteInput {
  token: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AcceptInviteResult {
  clientId: string;
  sessionToken?: string;
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Inject(AUTH_TOKEN) private readonly auth: Auth,
  ) {}

  async create(
    tenant: ResolvedTenantPrincipal,
    input: CreateInviteInput,
  ): Promise<CreateInviteResult> {
    if (tenant.role !== 'therapist') {
      throw new ForbiddenException('Only therapists can create invites.');
    }
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

    const invite = await this.prisma.client.invite.create({
      data: {
        clinicId: tenant.clinicId,
        email: input.email.trim().toLowerCase(),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        tokenHash,
        expiresAt,
        invitedRole: 'CLIENT',
        invitedByTherapistId: tenant.dbUserId,
      },
      select: { id: true, expiresAt: true },
    });

    const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001';
    const webBaseURL = process.env.WEB_BASE_URL ?? baseURL;
    const inviteUrl = `${webBaseURL}/invite/${rawToken}`;

    await this.mail.sendInvite({
      to: input.email,
      inviteUrl,
      clinicName: input.clinicName,
      therapistName: input.therapistName,
    });

    const includeLink = process.env.MAIL_FALLBACK_RETURN_LINK === 'true';
    return {
      inviteId: invite.id,
      expiresAt: invite.expiresAt.toISOString(),
      ...(includeLink ? { inviteUrl } : {}),
    };
  }

  /**
   * Accept an invite: validate token, create Better-Auth user, create Client
   * row, mark invite accepted. Runs entirely under system context — the
   * accepting party has no tenant yet.
   */
  async accept(input: AcceptInviteInput): Promise<AcceptInviteResult> {
    const tokenHash = hashToken(input.token);

    return runWithSystemContext(async () => {
      const invite = await this.prisma.client.invite.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          clinicId: true,
          email: true,
          expiresAt: true,
          acceptedAt: true,
          invitedByTherapistId: true,
        },
      });
      if (!invite) throw new NotFoundException('Invite not found.');
      if (invite.acceptedAt) throw new GoneException('Invite already accepted.');
      if (invite.expiresAt.getTime() < Date.now()) {
        throw new GoneException('Invite has expired.');
      }
      if (invite.email !== input.email.trim().toLowerCase()) {
        throw new ForbiddenException('Email does not match the invite.');
      }

      const signupResult = await this.auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: `${input.firstName} ${input.lastName}`.trim(),
        },
      });
      const userId = signupResult?.user?.id;
      const sessionToken = signupResult?.token;
      if (!userId) {
        throw new ConflictException('Failed to create user from invite.');
      }

      const client = await this.prisma.client.client.create({
        data: {
          clinicId: invite.clinicId,
          therapistId: invite.invitedByTherapistId,
          externalAuthId: userId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          acceptedAt: new Date(),
        },
        select: { id: true },
      });

      await this.prisma.client.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return { clientId: client.id, sessionToken: sessionToken ?? undefined };
    });
  }
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

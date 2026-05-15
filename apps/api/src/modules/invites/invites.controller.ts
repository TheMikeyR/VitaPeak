import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard.js';
import { TenantGuard, type ResolvedTenantPrincipal } from '../../auth/tenant.guard.js';
import { TenantPrincipal } from '../../auth/current-user.decorator.js';
import { Audit } from '../../audit/audit.decorator.js';
import { PrismaService } from '../../db/prisma.service.js';
import { runWithSystemContext } from '../../db/tenant-context.js';
import {
  InvitesService,
  type AcceptInviteResult,
  type CreateInviteResult,
} from './invites.service.js';

interface CreateBody {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
}

interface AcceptBody {
  token?: unknown;
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
}

@Controller('api/invites')
export class InvitesController {
  constructor(
    private readonly invites: InvitesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create')
  @UseGuards(AuthGuard, TenantGuard)
  @Audit('invite.create')
  async create(
    @TenantPrincipal() tenant: ResolvedTenantPrincipal,
    @Body() body: CreateBody,
  ): Promise<CreateInviteResult> {
    const email = stringField(body.email, 'email');
    const firstName = optionalStringField(body.firstName);
    const lastName = optionalStringField(body.lastName);

    const context = await runWithSystemContext(async () => {
      const therapist = await this.prisma.client.therapist.findUnique({
        where: { id: tenant.dbUserId },
        select: { firstName: true, lastName: true, clinic: { select: { name: true } } },
      });
      if (!therapist) {
        throw new BadRequestException('Therapist record not found.');
      }
      return {
        clinicName: therapist.clinic.name,
        therapistName: `${therapist.firstName} ${therapist.lastName}`.trim(),
      };
    });

    return this.invites.create(tenant, {
      email,
      firstName,
      lastName,
      clinicName: context.clinicName,
      therapistName: context.therapistName,
    });
  }

  @Post('accept')
  async accept(@Body() body: AcceptBody): Promise<AcceptInviteResult> {
    const token = stringField(body.token, 'token');
    const email = stringField(body.email, 'email');
    const password = stringField(body.password, 'password');
    const firstName = stringField(body.firstName, 'firstName');
    const lastName = stringField(body.lastName, 'lastName');
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }
    return this.invites.accept({ token, email, password, firstName, lastName });
  }
}

function stringField(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`Field "${field}" is required.`);
  }
  return value.trim();
}

function optionalStringField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

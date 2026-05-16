import { BadRequestException, Controller, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { acceptInviteRoute, createInviteRoute } from '@vitapeak/contracts';
import { AuthGuard } from '../../auth/auth.guard.js';
import { TenantGuard, type ResolvedTenantPrincipal } from '../../auth/tenant.guard.js';
import { TenantPrincipal } from '../../auth/current-user.decorator.js';
import { Audit } from '../../audit/audit.decorator.js';
import { PrismaService } from '../../db/prisma.service.js';
import { runWithSystemContext } from '../../db/tenant-context.js';
import { InvitesService } from './invites.service.js';

@Controller()
export class InvitesController {
  constructor(
    private readonly invites: InvitesService,
    private readonly prisma: PrismaService,
  ) {}

  @TsRestHandler(createInviteRoute)
  @UseGuards(AuthGuard, TenantGuard)
  @Audit('invite.create')
  async create(@TenantPrincipal() tenant: ResolvedTenantPrincipal) {
    return tsRestHandler(createInviteRoute, async ({ body }) => {
      const context = await runWithSystemContext(async () => {
        const therapist = await this.prisma.client.therapist.findUnique({
          where: { id: tenant.dbUserId },
          select: { firstName: true, lastName: true, clinic: { select: { name: true } } },
        });
        if (!therapist) throw new BadRequestException('Therapist record not found.');
        return {
          clinicName: therapist.clinic.name,
          therapistName: `${therapist.firstName} ${therapist.lastName}`.trim(),
        };
      });
      const result = await this.invites.create(tenant, {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        clinicName: context.clinicName,
        therapistName: context.therapistName,
      });
      return { status: 201, body: result };
    });
  }

  @TsRestHandler(acceptInviteRoute)
  @Audit('invite.accept')
  async accept() {
    return tsRestHandler(acceptInviteRoute, async ({ body }) => {
      const result = await this.invites.accept(body);
      return { status: 201, body: result };
    });
  }
}

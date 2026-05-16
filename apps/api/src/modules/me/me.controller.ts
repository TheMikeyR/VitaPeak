import { Controller, ForbiddenException, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { meRoute } from '@vitapeak/contracts';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard.js';
import { TenantGuard, type ResolvedTenantPrincipal } from '../../auth/tenant.guard.js';
import { CurrentUser, TenantPrincipal } from '../../auth/current-user.decorator.js';
import { PrismaService } from '../../db/prisma.service.js';
import { runWithSystemContext } from '../../db/tenant-context.js';

@Controller()
@UseGuards(AuthGuard, TenantGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @TsRestHandler(meRoute)
  async me(
    @CurrentUser() user: AuthenticatedUser,
    @TenantPrincipal() tenant: ResolvedTenantPrincipal,
  ) {
    return tsRestHandler(meRoute, async () => {
      const clinic = await runWithSystemContext(() =>
        this.prisma.client.clinic.findUnique({
          where: { id: tenant.clinicId },
          select: { id: true, name: true },
        }),
      );
      if (!clinic) throw new ForbiddenException('Clinic not found for tenant.');
      return {
        status: 200,
        body: {
          user: {
            id: tenant.dbUserId,
            externalAuthId: user.externalAuthId,
            email: user.email,
            role: tenant.role,
          },
          clinic,
          role: tenant.role,
        },
      };
    });
  }
}

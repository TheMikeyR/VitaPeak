import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard.js';
import { TenantGuard, type ResolvedTenantPrincipal } from '../../auth/tenant.guard.js';
import { CurrentUser, TenantPrincipal } from '../../auth/current-user.decorator.js';
import { PrismaService } from '../../db/prisma.service.js';
import { runWithSystemContext } from '../../db/tenant-context.js';

export interface MeResponse {
  user: {
    id: string;
    externalAuthId: string;
    email: string;
    role: 'therapist' | 'client';
  };
  clinic: { id: string; name: string };
  role: 'therapist' | 'client';
}

@Controller('api/me')
@UseGuards(AuthGuard, TenantGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(
    @CurrentUser() user: AuthenticatedUser,
    @TenantPrincipal() tenant: ResolvedTenantPrincipal,
  ): Promise<MeResponse> {
    const clinic = await runWithSystemContext(() =>
      this.prisma.client.clinic.findUnique({
        where: { id: tenant.clinicId },
        select: { id: true, name: true },
      }),
    );
    if (!clinic) {
      throw new ForbiddenException('Clinic not found for tenant.');
    }
    return {
      user: {
        id: tenant.dbUserId,
        externalAuthId: user.externalAuthId,
        email: user.email,
        role: tenant.role,
      },
      clinic,
      role: tenant.role,
    };
  }
}

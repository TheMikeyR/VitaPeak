import { Controller, ForbiddenException, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { createCheckInRoute, listCheckInsRoute } from '@vitapeak/contracts';
import { AuthGuard } from '../../auth/auth.guard.js';
import { TenantGuard, type ResolvedTenantPrincipal } from '../../auth/tenant.guard.js';
import { TenantPrincipal } from '../../auth/current-user.decorator.js';
import { Audit } from '../../audit/audit.decorator.js';
import { CheckInsService } from './check-ins.service.js';

@Controller()
@UseGuards(AuthGuard, TenantGuard)
export class CheckInsController {
  constructor(private readonly checkIns: CheckInsService) {}

  @TsRestHandler(createCheckInRoute)
  @Audit('checkin.submit')
  async create(@TenantPrincipal() tenant: ResolvedTenantPrincipal) {
    return tsRestHandler(createCheckInRoute, async ({ body }) => {
      if (tenant.role !== 'client') {
        throw new ForbiddenException('Only clients can submit check-ins.');
      }
      const result = await this.checkIns.createForClient(
        { clientDbId: tenant.dbUserId, clinicId: tenant.clinicId },
        body,
      );
      return { status: 201, body: result };
    });
  }

  @TsRestHandler(listCheckInsRoute)
  @Audit('checkin.list')
  async list(@TenantPrincipal() tenant: ResolvedTenantPrincipal) {
    return tsRestHandler(listCheckInsRoute, async ({ query }) => {
      if (tenant.role !== 'client') {
        throw new ForbiddenException('Only clients can list their own check-ins.');
      }
      const checkIns = await this.checkIns.listForClient(
        { clientDbId: tenant.dbUserId, clinicId: tenant.clinicId },
        query,
      );
      return { status: 200, body: { checkIns } };
    });
  }
}

import { Controller, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { bodyRegionsListRoute } from '@vitapeak/contracts';
import { AuthGuard } from '../../auth/auth.guard.js';
import { PrismaService } from '../../db/prisma.service.js';

@Controller()
@UseGuards(AuthGuard)
export class BodyRegionsController {
  constructor(private readonly prisma: PrismaService) {}

  @TsRestHandler(bodyRegionsListRoute)
  async list() {
    return tsRestHandler(bodyRegionsListRoute, async () => {
      // BodyRegion is system-shared (no clinicId) — the tenancy extension
      // bypasses it. No system-context wrapper needed.
      const regions = await this.prisma.client.bodyRegion.findMany({
        select: { id: true, parentId: true, side: true, displayLayer: true, label: true },
        orderBy: [{ displayLayer: 'asc' }, { id: 'asc' }],
      });
      return {
        status: 200,
        body: { regions },
      };
    });
  }
}

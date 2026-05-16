import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../db/prisma.service.js';
import { runWithSystemContext, type Role, type TenantContext } from '../db/tenant-context.js';

export interface ResolvedTenantPrincipal extends TenantContext {
  externalAuthId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: ResolvedTenantPrincipal;
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user;
    if (!user) throw new UnauthorizedException();

    // Tenant resolution itself touches Therapist/Client tables, which the Prisma
    // extension blocks when no tenant context is active. Use the system-context
    // escape hatch for the lookup only.
    const resolved = await runWithSystemContext(async () => {
      const therapist = await this.prisma.client.therapist.findUnique({
        where: { externalAuthId: user.externalAuthId },
        select: { id: true, clinicId: true },
      });
      if (therapist) {
        return {
          clinicId: therapist.clinicId,
          dbUserId: therapist.id,
          role: 'therapist' as Role,
        };
      }
      const client = await this.prisma.client.client.findUnique({
        where: { externalAuthId: user.externalAuthId },
        select: { id: true, clinicId: true },
      });
      if (client) {
        return {
          clinicId: client.clinicId,
          dbUserId: client.id,
          role: 'client' as Role,
        };
      }
      return null;
    });

    if (!resolved) throw new ForbiddenException('No tenant principal for this user.');

    // Attach the resolved principal to the request. The TenantContextInterceptor
    // reads `req.tenant` and wraps the rest of the handler chain in
    // `runWithTenantContext`, which is the propagation path the Prisma tenancy
    // extension relies on.
    req.tenant = { ...resolved, externalAuthId: user.externalAuthId };
    return true;
  }
}

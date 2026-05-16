import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.guard.js';
import type { ResolvedTenantPrincipal } from './tenant.guard.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    return ctx.switchToHttp().getRequest<Request>().user;
  },
);

export const TenantPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedTenantPrincipal | undefined => {
    return ctx.switchToHttp().getRequest<Request>().tenant;
  },
);

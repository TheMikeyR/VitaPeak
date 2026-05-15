import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { runWithTenantContext } from '../db/tenant-context.js';

/**
 * Wraps the downstream handler in `runWithTenantContext` using the principal
 * already resolved by `TenantGuard`. Necessary because NestJS's rxjs pipeline
 * does not reliably propagate `AsyncLocalStorage.enterWith` across the
 * interceptor → controller → service boundary; an explicit `run()` frame on
 * each request closes that gap and lets the Prisma tenancy extension see the
 * tenant context.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const tenant = req.tenant;
    if (!tenant) return next.handle();
    return new Observable((subscriber) => {
      runWithTenantContext(
        { clinicId: tenant.clinicId, dbUserId: tenant.dbUserId, role: tenant.role },
        () => {
          next.handle().subscribe({
            next: (v) => subscriber.next(v),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }
}

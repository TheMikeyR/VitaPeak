import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_ACTION } from './audit.decorator.js';

interface AuditableRequest {
  user?: { externalAuthId?: string; dbUserId?: string };
}

interface AuditableResponseShape {
  id?: string;
  entity?: string;
  entityId?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('audit');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string | undefined>(AUDIT_ACTION, context.getHandler());
    if (!action) return next.handle();

    const req = context.switchToHttp().getRequest<AuditableRequest>();
    const actor = req.user?.dbUserId ?? req.user?.externalAuthId ?? null;

    return next.handle().pipe(
      tap((result) => {
        const shape = (result ?? {}) as AuditableResponseShape;
        this.logger.info({
          kind: 'audit',
          action,
          actor,
          entity: shape.entity ?? null,
          entityId: shape.entityId ?? shape.id ?? null,
        });
      }),
    );
  }
}

import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION = 'audit:action';

/**
 * Mark a controller handler for audit logging. The interceptor logs
 * `{ kind: "audit", action, actor, entity, entityId }` on success.
 * Persistent AuditLog table lands in chunk 07.
 */
export const Audit = (action: string) => SetMetadata(AUDIT_ACTION, action);

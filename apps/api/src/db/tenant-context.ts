import { AsyncLocalStorage } from 'node:async_hooks';

export type Role = 'therapist' | 'client';

export interface TenantContext {
  clinicId: string;
  dbUserId: string;
  role: Role;
}

interface SystemContext {
  system: true;
}

type AnyContext = TenantContext | SystemContext;

export const tenantContext = new AsyncLocalStorage<AnyContext>();

export function getTenantContext(): TenantContext | undefined {
  const store = tenantContext.getStore();
  if (!store || 'system' in store) return undefined;
  return store;
}

export function isSystemContext(): boolean {
  const store = tenantContext.getStore();
  return store !== undefined && 'system' in store && store.system === true;
}

export function runWithSystemContext<T>(fn: () => T): T {
  return tenantContext.run({ system: true }, fn);
}

export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return tenantContext.run(ctx, fn);
}

export class MissingTenantContextError extends Error {
  constructor(model: string, operation: string) {
    super(
      `MissingTenantContextError: ${operation} on ${model} requires a tenant context. ` +
        `Either invoke within tenantContext.run({ clinicId, ... }, ...) or wrap a system-seed read in runWithSystemContext().`,
    );
    this.name = 'MissingTenantContextError';
  }
}

import { Prisma } from '@vitapeak/db';
import { tenantContext, MissingTenantContextError, type TenantContext } from './tenant-context.js';

// CheckIn is tenant-bound directly (carries clinicId). PainPoint is reached only
// through CheckIn joins by controllers — no PainPoint where-injection needed.
// BodyRegion is system-shared (no clinicId) and bypasses tenancy entirely.
const TENANT_BOUND_MODELS = new Set(['Therapist', 'Client', 'Invite', 'CheckIn']);

const WHERE_INJECTABLE_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

const UNIQUE_KEY_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'update', 'upsert', 'delete']);

export class CrossTenantAccessError extends Error {
  constructor(model: string, operation: string) {
    super(
      `CrossTenantAccessError: ${operation} on ${model} returned a row from a different tenant. ` +
        `This indicates a missed TenantGuard or a malformed query.`,
    );
    this.name = 'CrossTenantAccessError';
  }
}

export const tenancyExtension = Prisma.defineExtension({
  name: 'tenancy',
  query: {
    $allModels: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async $allOperations({ model, operation, args, query }: any) {
        if (!TENANT_BOUND_MODELS.has(model)) return query(args);

        const store = tenantContext.getStore();
        if (!store) throw new MissingTenantContextError(model, operation);
        if ('system' in store) return query(args);

        const ctx = store as TenantContext;

        if (WHERE_INJECTABLE_OPS.has(operation)) {
          args.where = { ...(args.where ?? {}), clinicId: ctx.clinicId };
          return query(args);
        }

        if (operation === 'create') {
          args.data = { ...(args.data ?? {}), clinicId: ctx.clinicId };
          return query(args);
        }

        if (operation === 'createMany') {
          const rows = Array.isArray(args.data) ? args.data : [args.data ?? {}];
          args.data = rows.map((d: Record<string, unknown>) => ({ ...d, clinicId: ctx.clinicId }));
          return query(args);
        }

        if (UNIQUE_KEY_OPS.has(operation)) {
          const result = (await query(args)) as { clinicId?: string } | null;
          if (result && result.clinicId && result.clinicId !== ctx.clinicId) {
            if (operation === 'findUnique') return null;
            throw new CrossTenantAccessError(model, operation);
          }
          return result;
        }

        return query(args);
      },
    },
  },
});

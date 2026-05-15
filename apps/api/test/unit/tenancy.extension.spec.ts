import { describe, expect, it } from 'vitest';
import { PrismaClient } from '@vitapeak/db';
import { tenancyExtension } from '../../src/db/tenancy.extension.js';
import {
  MissingTenantContextError,
  runWithSystemContext,
  runWithTenantContext,
} from '../../src/db/tenant-context.js';

describe('Prisma tenancy extension', () => {
  const prisma = new PrismaClient().$extends(tenancyExtension);

  it('throws MissingTenantContextError when no tenant context is active', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).therapist.findMany({}),
    ).rejects.toBeInstanceOf(MissingTenantContextError);
  });

  it('allows queries under system context', async () => {
    await expect(
      runWithSystemContext(async () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).therapist.findMany({ take: 0 }),
      ),
    ).resolves.toEqual([]);
  });

  it('injects clinicId on tenant-scoped reads', async () => {
    await expect(
      runWithTenantContext(
        { clinicId: 'nonexistent-clinic', dbUserId: 'x', role: 'therapist' },
        async () =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (prisma as any).therapist.findMany({}),
      ),
    ).resolves.toEqual([]);
  });
});

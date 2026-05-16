/**
 * Seed:
 *   - one demo Clinic + one demo Therapist (role OWNER) wired to a Better-Auth User row
 *   - one demo Client wired to the same clinic + Better-Auth user
 *   - 44 BodyRegion rows from `packages/db/data/body-regions.json`
 *
 * Idempotent — re-running skips rows whose natural keys (email, region id) already exist.
 *
 * Better-Auth runtime is instantiated locally here (rather than imported from
 * `@vitapeak/api`) to avoid a circular workspace dependency. The minimum config —
 * Prisma adapter + email/password — is enough to mint a user via `auth.api.signUpEmail`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const DEMO_THERAPIST_EMAIL = 'demo@vitapeak.local';
const DEMO_THERAPIST_PASSWORD = 'demo-password-123';
const DEMO_THERAPIST_NAME = 'Demo Therapist';
const DEMO_CLINIC_NAME = 'Demo Clinic';

const DEMO_CLIENT_EMAIL = 'client@vitapeak.local';
const DEMO_CLIENT_PASSWORD = 'demo-password-123';
const DEMO_CLIENT_NAME = 'Demo Client';

type BodyRegionSeed = {
  id: string;
  parentId: string | null;
  side: 'LEFT' | 'RIGHT' | 'CENTER' | null;
  displayLayer: string;
  label: string;
};

const SEED_DIR = dirname(fileURLToPath(import.meta.url));
const REGIONS_PATH = resolve(SEED_DIR, '../data/body-regions.json');

async function seedUser(
  auth: ReturnType<typeof betterAuth>,
  prisma: PrismaClient,
  email: string,
  password: string,
  name: string,
): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] user ${email} already exists, reusing ${existing.id}`);
    return existing.id;
  }
  const result = await auth.api.signUpEmail({ body: { email, password, name } });
  if (!result?.user?.id) {
    throw new Error(`Better-Auth signup did not return a user id: ${JSON.stringify(result)}`);
  }
  console.log(`[seed] created Better-Auth user ${result.user.id} (${email})`);
  return result.user.id;
}

async function seedBodyRegions(prisma: PrismaClient): Promise<number> {
  const raw = readFileSync(REGIONS_PATH, 'utf8');
  const regions: BodyRegionSeed[] = JSON.parse(raw);

  // Two passes so parent rows exist before child rows reference them.
  const rootRegions = regions.filter((r) => !r.parentId);
  const childRegions = regions.filter((r) => r.parentId);

  for (const r of [...rootRegions, ...childRegions]) {
    await prisma.bodyRegion.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        parentId: r.parentId,
        side: r.side,
        displayLayer: r.displayLayer,
        label: r.label,
      },
      update: {
        parentId: r.parentId,
        side: r.side,
        displayLayer: r.displayLayer,
        label: r.label,
      },
    });
  }
  return regions.length;
}

async function main() {
  const prisma = new PrismaClient();

  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: process.env.BETTER_AUTH_SECRET ?? 'seed-only-secret-do-not-use-in-prod',
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    basePath: '/auth',
    emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 8 },
  });

  try {
    // --- Body regions (system-shared, idempotent) ---
    const regionCount = await seedBodyRegions(prisma);
    console.log(`[seed] body regions: ${regionCount} rows upserted`);

    // --- Therapist + clinic ---
    const therapistUserId = await seedUser(
      auth,
      prisma,
      DEMO_THERAPIST_EMAIL,
      DEMO_THERAPIST_PASSWORD,
      DEMO_THERAPIST_NAME,
    );

    let therapist = await prisma.therapist.findUnique({
      where: { externalAuthId: therapistUserId },
    });
    let clinicId: string;
    if (therapist) {
      console.log(`[seed] therapist already wired (clinic=${therapist.clinicId})`);
      clinicId = therapist.clinicId;
    } else {
      const clinic = await prisma.clinic.create({ data: { name: DEMO_CLINIC_NAME } });
      clinicId = clinic.id;
      therapist = await prisma.therapist.create({
        data: {
          clinicId: clinic.id,
          externalAuthId: therapistUserId,
          email: DEMO_THERAPIST_EMAIL,
          firstName: 'Demo',
          lastName: 'Therapist',
          role: 'OWNER',
        },
      });
      console.log(
        `[seed] created clinic=${clinic.id} therapist=${therapist.id} role=OWNER for ${DEMO_THERAPIST_EMAIL}`,
      );
    }

    // --- Client (linked to seeded therapist's clinic) ---
    const clientUserId = await seedUser(
      auth,
      prisma,
      DEMO_CLIENT_EMAIL,
      DEMO_CLIENT_PASSWORD,
      DEMO_CLIENT_NAME,
    );
    const existingClient = await prisma.client.findUnique({
      where: { externalAuthId: clientUserId },
    });
    if (existingClient) {
      console.log(`[seed] client already wired (clinic=${existingClient.clinicId})`);
    } else {
      const client = await prisma.client.create({
        data: {
          clinicId,
          therapistId: therapist.id,
          externalAuthId: clientUserId,
          email: DEMO_CLIENT_EMAIL,
          firstName: 'Demo',
          lastName: 'Client',
          acceptedAt: new Date(),
        },
      });
      console.log(`[seed] created client=${client.id} for ${DEMO_CLIENT_EMAIL}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});

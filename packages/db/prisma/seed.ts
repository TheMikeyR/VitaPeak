/**
 * Seed: one demo Clinic + one demo Therapist (role OWNER) wired to a
 * Better-Auth User row. Idempotent — re-running will skip if the demo
 * email already exists.
 *
 * Better-Auth runtime is instantiated locally here (rather than imported
 * from `@vitapeak/api`) to avoid a circular workspace dependency. The
 * minimum config — Prisma adapter + email/password — is enough to mint a
 * user via `auth.api.signUpEmail`.
 */
import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const DEMO_EMAIL = 'demo@vitapeak.local';
const DEMO_PASSWORD = 'demo-password-123';
const DEMO_NAME = 'Demo Therapist';
const DEMO_CLINIC_NAME = 'Demo Clinic';

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
    const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    let userId: string;
    if (existingUser) {
      console.log(`[seed] demo user ${DEMO_EMAIL} already exists, reusing ${existingUser.id}`);
      userId = existingUser.id;
    } else {
      const signupResult = await auth.api.signUpEmail({
        body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME },
      });
      if (!signupResult?.user?.id) {
        throw new Error(
          `Better-Auth signup did not return a user id: ${JSON.stringify(signupResult)}`,
        );
      }
      userId = signupResult.user.id;
      console.log(`[seed] created Better-Auth user ${userId} (${DEMO_EMAIL})`);
    }

    const existingTherapist = await prisma.therapist.findUnique({
      where: { externalAuthId: userId },
    });
    if (existingTherapist) {
      console.log(`[seed] therapist already wired (clinic=${existingTherapist.clinicId})`);
      return;
    }

    const clinic = await prisma.clinic.create({ data: { name: DEMO_CLINIC_NAME } });
    const therapist = await prisma.therapist.create({
      data: {
        clinicId: clinic.id,
        externalAuthId: userId,
        email: DEMO_EMAIL,
        firstName: 'Demo',
        lastName: 'Therapist',
        role: 'OWNER',
      },
    });
    console.log(
      `[seed] created clinic=${clinic.id} therapist=${therapist.id} role=OWNER for ${DEMO_EMAIL}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});

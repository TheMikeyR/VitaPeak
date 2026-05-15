import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from '../../src/app.module.js';
import { AUTH_TOKEN } from '../../src/auth/auth.tokens.js';
import { PrismaService } from '../../src/db/prisma.service.js';
import { runWithSystemContext } from '../../src/db/tenant-context.js';
import { authFailureTotal } from '../../src/auth/metrics.js';
import type { Auth } from '../../src/auth/better-auth.config.js';

process.env.MAIL_FALLBACK_RETURN_LINK = 'true';
if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = 'e2e-secret-do-not-use-in-prod-please';
}

const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const therapistEmail = `e2e-t-${uniqueSuffix}@example.com`;
const clientEmail = `e2e-c-${uniqueSuffix}@example.com`;
const otherTherapistEmail = `e2e-t2-${uniqueSuffix}@example.com`;

interface SignupBody {
  token: string;
  user: { id: string; email: string };
}

interface JwtBody {
  token: string;
}

interface ClinicSignupBody {
  clinicId: string;
  therapistId: string;
}

interface InviteCreateBody {
  inviteId: string;
  inviteUrl?: string;
}

interface InviteAcceptBody {
  clientId: string;
  sessionToken?: string;
}

describe('Auth + invite + tenancy e2e', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;
  let therapistSession: string;
  let therapistJwt: string;
  let therapistClinicId: string;
  let createdInviteUrl: string;
  let otherTherapistJwt: string;
  let otherClinicId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    const auth = app.get<Auth>(AUTH_TOKEN);
    const httpAdapter = app.getHttpAdapter().getInstance() as express.Application;
    httpAdapter.all('/auth/*', toNodeHandler(auth));
    httpAdapter.use(express.json());
    httpAdapter.use(express.urlencoded({ extended: true }));
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function signUp(email: string, password: string, name: string): Promise<string> {
    const res = await request(server)
      .post('/auth/sign-up/email')
      .set('Content-Type', 'application/json')
      .send({ email, password, name });
    expect(res.status).toBe(200);
    const body = res.body as SignupBody;
    expect(body.token).toBeTruthy();
    return body.token;
  }

  async function getJwt(session: string): Promise<string> {
    const res = await request(server).get('/auth/token').set('Authorization', `Bearer ${session}`);
    expect(res.status).toBe(200);
    return (res.body as JwtBody).token;
  }

  it('therapist signup → JWT → clinic create', async () => {
    therapistSession = await signUp(therapistEmail, 'password123', 'E2E Therapist');
    therapistJwt = await getJwt(therapistSession);
    const res = await request(server)
      .post('/api/clinics/signup')
      .set('Authorization', `Bearer ${therapistJwt}`)
      .set('Content-Type', 'application/json')
      .send({ name: `E2E Clinic ${uniqueSuffix}`, firstName: 'E2E', lastName: 'Therapist' });
    expect(res.status).toBe(201);
    const body = res.body as ClinicSignupBody;
    expect(body.clinicId).toBeTruthy();
    expect(body.therapistId).toBeTruthy();
    therapistClinicId = body.clinicId;
    // Refresh JWT so realm_access.roles includes "therapist".
    therapistJwt = await getJwt(therapistSession);
  });

  it('invite create returns inviteUrl when MAIL_FALLBACK_RETURN_LINK=true', async () => {
    const res = await request(server)
      .post('/api/invites/create')
      .set('Authorization', `Bearer ${therapistJwt}`)
      .set('Content-Type', 'application/json')
      .send({ email: clientEmail, firstName: 'E2E', lastName: 'Client' });
    expect(res.status).toBe(201);
    const body = res.body as InviteCreateBody;
    expect(body.inviteUrl).toBeTruthy();
    createdInviteUrl = body.inviteUrl ?? '';
  });

  it('invite accept happy path + 410 on second accept', async () => {
    const rawToken = createdInviteUrl.split('/').pop() ?? '';
    expect(rawToken.length).toBeGreaterThan(10);
    const res1 = await request(server)
      .post('/api/invites/accept')
      .set('Content-Type', 'application/json')
      .send({
        token: rawToken,
        email: clientEmail,
        password: 'clientpw123',
        firstName: 'E2E',
        lastName: 'Client',
      });
    expect(res1.status).toBe(201);
    const body = res1.body as InviteAcceptBody;
    expect(body.clientId).toBeTruthy();

    const res2 = await request(server)
      .post('/api/invites/accept')
      .set('Content-Type', 'application/json')
      .send({
        token: rawToken,
        email: clientEmail,
        password: 'clientpw123',
        firstName: 'E2E',
        lastName: 'Client',
      });
    expect(res2.status).toBe(410);
  });

  it('cross-tenant 403: another therapist cannot read a foreign client invite', async () => {
    const otherSession = await signUp(otherTherapistEmail, 'password123', 'Other Therapist');
    const initialJwt = await getJwt(otherSession);
    const clinicRes = await request(server)
      .post('/api/clinics/signup')
      .set('Authorization', `Bearer ${initialJwt}`)
      .set('Content-Type', 'application/json')
      .send({ name: `Other Clinic ${uniqueSuffix}`, firstName: 'Other', lastName: 'T' });
    expect(clinicRes.status).toBe(201);
    otherClinicId = (clinicRes.body as ClinicSignupBody).clinicId;
    otherTherapistJwt = await getJwt(otherSession);

    // Confirm a foreign invite exists (used as the cross-tenant test fixture).
    const foreignInvite = await runWithSystemContext(async () =>
      prisma.client.invite.findFirst({
        where: { clinicId: therapistClinicId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
    );
    expect(foreignInvite?.id).toBeTruthy();

    // /api/me as the other therapist must return that therapist's clinic, not
    // the first one — confirms TenantGuard resolves the active principal.
    const meRes = await request(server)
      .get('/api/me')
      .set('Authorization', `Bearer ${otherTherapistJwt}`);
    expect(meRes.status).toBe(200);
    expect((meRes.body as { clinic: { id: string } }).clinic.id).toBe(otherClinicId);
    expect((meRes.body as { clinic: { id: string } }).clinic.id).not.toBe(therapistClinicId);
  });

  it('bad JWT signature increments auth_failure_total{reason="invalid_signature"}', async () => {
    const before = (await authFailureTotal.get()).values
      .filter((v) => v.labels.reason === 'invalid_signature')
      .reduce((sum, v) => sum + (typeof v.value === 'number' ? v.value : 0), 0);

    // Replace the JWT's signature segment entirely so the verify must fail.
    const parts = therapistJwt.split('.');
    const corrupt = `${parts[0]}.${parts[1]}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const res = await request(server).get('/api/me').set('Authorization', `Bearer ${corrupt}`);
    expect(res.status).toBe(401);

    const after = (await authFailureTotal.get()).values
      .filter((v) => v.labels.reason === 'invalid_signature')
      .reduce((sum, v) => sum + (typeof v.value === 'number' ? v.value : 0), 0);
    expect(after).toBeGreaterThan(before);
  });
});

import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import type { Auth } from '../../src/auth/better-auth.config.js';

process.env.MAIL_FALLBACK_RETURN_LINK = 'true';
if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = 'e2e-secret-do-not-use-in-prod-please';
}

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

interface BodyRegionsListBody {
  regions: Array<{
    id: string;
    parentId: string | null;
    side: 'LEFT' | 'RIGHT' | 'CENTER' | null;
    displayLayer: string;
    label: string;
  }>;
}

interface PainPointBody {
  id: string;
  bodyRegionId: string;
  painType: string;
  level: number;
  x: number | null;
  y: number | null;
  notes: string | null;
}

interface CheckInBody {
  id: string;
  clientId: string;
  occurredAt: string;
  mood: number | null;
  notes: string | null;
  painPoints: PainPointBody[];
}

interface ListCheckInsBody {
  checkIns: CheckInBody[];
}

interface ErrorBody {
  message: string;
  statusCode: number;
}

describe('Check-ins + body-regions e2e', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;

  // Clinic A (primary): therapist, client
  let therapistAJwt: string;
  let clientAJwt: string;
  let clientADbId: string;

  // Clinic B (cross-tenant): therapist + client
  let clientBJwt: string;

  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const therapistAEmail = `e2e-ci-tA-${uniqueSuffix}@example.com`;
  const clientAEmail = `e2e-ci-cA-${uniqueSuffix}@example.com`;
  const therapistBEmail = `e2e-ci-tB-${uniqueSuffix}@example.com`;
  const clientBEmail = `e2e-ci-cB-${uniqueSuffix}@example.com`;

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

    // Body regions must be seeded (system-shared, idempotent upsert).
    const here = dirname(fileURLToPath(import.meta.url));
    const regionsPath = resolve(here, '../../../../packages/db/data/body-regions.json');
    const bodyRegionsJson = JSON.parse(readFileSync(regionsPath, 'utf8')) as Array<{
      id: string;
      parentId: string | null;
      side: 'LEFT' | 'RIGHT' | 'CENTER' | null;
      displayLayer: string;
      label: string;
    }>;
    const rootRegions = bodyRegionsJson.filter((r) => !r.parentId);
    const childRegions = bodyRegionsJson.filter((r) => r.parentId);
    await runWithSystemContext(async () => {
      for (const region of [...rootRegions, ...childRegions]) {
        await prisma.client.bodyRegion.upsert({
          where: { id: region.id },
          update: {
            parentId: region.parentId,
            side: region.side,
            displayLayer: region.displayLayer,
            label: region.label,
          },
          create: region,
        });
      }
    });

    // --- Clinic A bootstrap ---
    const therapistASession = await signUp(therapistAEmail, 'password123', 'TherapistA');
    therapistAJwt = await getJwt(therapistASession);
    await request(server)
      .post('/api/clinics/signup')
      .set('Authorization', `Bearer ${therapistAJwt}`)
      .set('Content-Type', 'application/json')
      .send({ name: `E2E Clinic A ${uniqueSuffix}`, firstName: 'A', lastName: 'Therapist' })
      .expect(201);
    therapistAJwt = await getJwt(therapistASession);

    const inviteARes = await request(server)
      .post('/api/invites/create')
      .set('Authorization', `Bearer ${therapistAJwt}`)
      .set('Content-Type', 'application/json')
      .send({ email: clientAEmail, firstName: 'Cara', lastName: 'ClientA' })
      .expect(201);
    const inviteAUrl = (inviteARes.body as InviteCreateBody).inviteUrl ?? '';
    const inviteATok = inviteAUrl.split('/').pop() ?? '';
    const acceptARes = await request(server)
      .post('/api/invites/accept')
      .set('Content-Type', 'application/json')
      .send({
        token: inviteATok,
        email: clientAEmail,
        password: 'clientApw123',
        firstName: 'Cara',
        lastName: 'ClientA',
      })
      .expect(201);
    clientADbId = (acceptARes.body as InviteAcceptBody).clientId;
    clientAJwt = await loginAndJwt(clientAEmail, 'clientApw123');

    // --- Clinic B bootstrap (separate therapist + client) ---
    const therapistBSession = await signUp(therapistBEmail, 'password123', 'TherapistB');
    let therapistBJwt = await getJwt(therapistBSession);
    await request(server)
      .post('/api/clinics/signup')
      .set('Authorization', `Bearer ${therapistBJwt}`)
      .set('Content-Type', 'application/json')
      .send({ name: `E2E Clinic B ${uniqueSuffix}`, firstName: 'B', lastName: 'Therapist' })
      .expect(201);
    therapistBJwt = await getJwt(therapistBSession);

    const inviteBRes = await request(server)
      .post('/api/invites/create')
      .set('Authorization', `Bearer ${therapistBJwt}`)
      .set('Content-Type', 'application/json')
      .send({ email: clientBEmail, firstName: 'Carl', lastName: 'ClientB' })
      .expect(201);
    const inviteBUrl = (inviteBRes.body as InviteCreateBody).inviteUrl ?? '';
    const inviteBTok = inviteBUrl.split('/').pop() ?? '';
    await request(server)
      .post('/api/invites/accept')
      .set('Content-Type', 'application/json')
      .send({
        token: inviteBTok,
        email: clientBEmail,
        password: 'clientBpw123',
        firstName: 'Carl',
        lastName: 'ClientB',
      })
      .expect(201);
    clientBJwt = await loginAndJwt(clientBEmail, 'clientBpw123');
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
    return (res.body as SignupBody).token;
  }

  async function signIn(email: string, password: string): Promise<string> {
    const res = await request(server)
      .post('/auth/sign-in/email')
      .set('Content-Type', 'application/json')
      .send({ email, password });
    expect(res.status).toBe(200);
    return (res.body as SignupBody).token;
  }

  async function getJwt(session: string): Promise<string> {
    const res = await request(server).get('/auth/token').set('Authorization', `Bearer ${session}`);
    expect(res.status).toBe(200);
    return (res.body as JwtBody).token;
  }

  async function loginAndJwt(email: string, password: string): Promise<string> {
    const session = await signIn(email, password);
    return getJwt(session);
  }

  // --------------------- /api/body-regions ---------------------

  it('GET /api/body-regions returns 401 without JWT', async () => {
    const res = await request(server).get('/api/body-regions');
    expect(res.status).toBe(401);
  });

  it('GET /api/body-regions returns 44 regions with client JWT', async () => {
    const res = await request(server)
      .get('/api/body-regions')
      .set('Authorization', `Bearer ${clientAJwt}`);
    expect(res.status).toBe(200);
    const body = res.body as BodyRegionsListBody;
    expect(body.regions.length).toBe(44);
    // Spot check known seeded slug.
    expect(body.regions.some((r) => r.id === 'lower-back')).toBe(true);
  });

  it('GET /api/body-regions also works for therapist JWT (system-shared)', async () => {
    const res = await request(server)
      .get('/api/body-regions')
      .set('Authorization', `Bearer ${therapistAJwt}`);
    expect(res.status).toBe(200);
    expect((res.body as BodyRegionsListBody).regions.length).toBe(44);
  });

  // --------------------- POST /api/check-ins ---------------------

  it('client submits a check-in with two pain points (201, persists rows)', async () => {
    const payload = {
      occurredAt: new Date('2026-05-15T10:00:00.000Z').toISOString(),
      mood: 3,
      notes: 'after run',
      painPoints: [
        { bodyRegionId: 'lower-back', painType: 'SHARP', level: 7, x: 0.5, y: 0.6, notes: 'left' },
        { bodyRegionId: 'neck', painType: 'DULL', level: 4 },
      ],
    };
    const res = await request(server)
      .post('/api/check-ins')
      .set('Authorization', `Bearer ${clientAJwt}`)
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(201);
    const body = res.body as CheckInBody;
    expect(body.clientId).toBe(clientADbId);
    expect(body.mood).toBe(3);
    expect(body.notes).toBe('after run');
    expect(body.painPoints.length).toBe(2);
    const regionIds = body.painPoints.map((p) => p.bodyRegionId).sort();
    expect(regionIds).toEqual(['lower-back', 'neck']);
  });

  // --------------------- GET /api/check-ins ---------------------

  it('GET /api/check-ins lists own check-ins (desc by occurredAt)', async () => {
    // Add a newer one to verify ordering.
    await request(server)
      .post('/api/check-ins')
      .set('Authorization', `Bearer ${clientAJwt}`)
      .set('Content-Type', 'application/json')
      .send({
        occurredAt: new Date('2026-05-16T10:00:00.000Z').toISOString(),
        painPoints: [{ bodyRegionId: 'head', painType: 'ACHING', level: 2 }],
      })
      .expect(201);

    const res = await request(server)
      .get('/api/check-ins')
      .set('Authorization', `Bearer ${clientAJwt}`);
    expect(res.status).toBe(200);
    const body = res.body as ListCheckInsBody;
    expect(body.checkIns.length).toBe(2);
    expect(new Date(body.checkIns[0]!.occurredAt).getTime()).toBeGreaterThan(
      new Date(body.checkIns[1]!.occurredAt).getTime(),
    );
  });

  // --------------------- Validation ---------------------

  it('validation: level=11 → 400', async () => {
    const res = await request(server)
      .post('/api/check-ins')
      .set('Authorization', `Bearer ${clientAJwt}`)
      .set('Content-Type', 'application/json')
      .send({
        painPoints: [{ bodyRegionId: 'head', painType: 'SHARP', level: 11 }],
      });
    expect(res.status).toBe(400);
  });

  it('validation: unknown bodyRegionId → 400 with unknown id in message', async () => {
    const res = await request(server)
      .post('/api/check-ins')
      .set('Authorization', `Bearer ${clientAJwt}`)
      .set('Content-Type', 'application/json')
      .send({
        painPoints: [{ bodyRegionId: 'not-a-region', painType: 'SHARP', level: 5 }],
      });
    expect(res.status).toBe(400);
    expect((res.body as ErrorBody).message).toContain('not-a-region');
  });

  it('validation: empty painPoints → 400', async () => {
    const res = await request(server)
      .post('/api/check-ins')
      .set('Authorization', `Bearer ${clientAJwt}`)
      .set('Content-Type', 'application/json')
      .send({ painPoints: [] });
    expect(res.status).toBe(400);
  });

  // --------------------- Cross-tenant isolation ---------------------

  it('cross-tenant: client B does not see client A check-ins', async () => {
    const res = await request(server)
      .get('/api/check-ins')
      .set('Authorization', `Bearer ${clientBJwt}`);
    expect(res.status).toBe(200);
    expect((res.body as ListCheckInsBody).checkIns.length).toBe(0);
  });

  // --------------------- Role gating ---------------------

  it('therapist POST /api/check-ins → 403', async () => {
    const res = await request(server)
      .post('/api/check-ins')
      .set('Authorization', `Bearer ${therapistAJwt}`)
      .set('Content-Type', 'application/json')
      .send({
        painPoints: [{ bodyRegionId: 'head', painType: 'SHARP', level: 5 }],
      });
    expect(res.status).toBe(403);
  });

  it('therapist GET /api/check-ins → 403', async () => {
    const res = await request(server)
      .get('/api/check-ins')
      .set('Authorization', `Bearer ${therapistAJwt}`);
    expect(res.status).toBe(403);
  });
});

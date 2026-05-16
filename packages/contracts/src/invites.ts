import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const CreateInviteBodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
});
export type CreateInviteBody = z.infer<typeof CreateInviteBodySchema>;

export const CreateInviteResponseSchema = z.object({
  inviteId: z.string(),
  expiresAt: z.string(),
  inviteUrl: z.string().optional(),
});
export type CreateInviteResponse = z.infer<typeof CreateInviteResponseSchema>;

export const AcceptInviteBodySchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
});
export type AcceptInviteBody = z.infer<typeof AcceptInviteBodySchema>;

export const AcceptInviteResponseSchema = z.object({
  clientId: z.string(),
  sessionToken: z.string().optional(),
});
export type AcceptInviteResponse = z.infer<typeof AcceptInviteResponseSchema>;

export const createInviteRoute = c.mutation({
  method: 'POST',
  path: '/api/invites/create',
  body: CreateInviteBodySchema,
  responses: {
    201: CreateInviteResponseSchema,
    400: z.object({ message: z.string(), statusCode: z.literal(400) }),
    401: z.object({ message: z.string(), statusCode: z.literal(401) }),
    403: z.object({ message: z.string(), statusCode: z.literal(403) }),
  },
  summary: 'Therapist creates an invite for a new client.',
});

export const acceptInviteRoute = c.mutation({
  method: 'POST',
  path: '/api/invites/accept',
  body: AcceptInviteBodySchema,
  responses: {
    201: AcceptInviteResponseSchema,
    400: z.object({ message: z.string(), statusCode: z.literal(400) }),
    403: z.object({ message: z.string(), statusCode: z.literal(403) }),
    404: z.object({ message: z.string(), statusCode: z.literal(404) }),
    410: z.object({ message: z.string(), statusCode: z.literal(410) }),
  },
  summary: 'Invitee accepts the invite, creating a Better-Auth user + Client row.',
});

export const invitesContract = c.router({
  create: createInviteRoute,
  accept: acceptInviteRoute,
});

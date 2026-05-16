import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const MeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    externalAuthId: z.string(),
    email: z.string().email(),
    role: z.enum(['therapist', 'client']),
  }),
  clinic: z.object({ id: z.string(), name: z.string() }),
  role: z.enum(['therapist', 'client']),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const meRoute = c.query({
  method: 'GET',
  path: '/api/me',
  responses: {
    200: MeResponseSchema,
    401: z.object({ message: z.string(), statusCode: z.literal(401) }),
    403: z.object({ message: z.string(), statusCode: z.literal(403) }),
  },
  summary: 'Return the authenticated principal, their clinic, and role.',
});

export const authContract = c.router({ me: meRoute });

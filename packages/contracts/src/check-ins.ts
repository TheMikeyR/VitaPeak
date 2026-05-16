import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const PainTypeSchema = z.enum([
  'BURNING',
  'SHARP',
  'RADIATING',
  'DULL',
  'ACHING',
  'TINGLING',
]);
export type PainType = z.infer<typeof PainTypeSchema>;

export const PainPointInputSchema = z.object({
  bodyRegionId: z.string().min(1),
  painType: PainTypeSchema,
  level: z.number().int().min(0).max(10),
  x: z.number().optional(),
  y: z.number().optional(),
  notes: z.string().max(2000).optional(),
});
export type PainPointInput = z.infer<typeof PainPointInputSchema>;

export const CreateCheckInBodySchema = z.object({
  occurredAt: z.string().datetime().optional(),
  mood: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  painPoints: z.array(PainPointInputSchema).min(1),
});
export type CreateCheckInBody = z.infer<typeof CreateCheckInBodySchema>;

export const PainPointItemSchema = z.object({
  id: z.string(),
  bodyRegionId: z.string(),
  painType: PainTypeSchema,
  level: z.number().int(),
  x: z.number().nullable(),
  y: z.number().nullable(),
  notes: z.string().nullable(),
});
export type PainPointItem = z.infer<typeof PainPointItemSchema>;

export const CheckInItemSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  occurredAt: z.string(),
  mood: z.number().int().nullable(),
  notes: z.string().nullable(),
  painPoints: z.array(PainPointItemSchema),
});
export type CheckInItem = z.infer<typeof CheckInItemSchema>;

export const CreateCheckInResponseSchema = CheckInItemSchema;
export type CreateCheckInResponse = z.infer<typeof CreateCheckInResponseSchema>;

export const ListCheckInsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ListCheckInsQuery = z.infer<typeof ListCheckInsQuerySchema>;

export const ListCheckInsResponseSchema = z.object({
  checkIns: z.array(CheckInItemSchema),
});
export type ListCheckInsResponse = z.infer<typeof ListCheckInsResponseSchema>;

export const createCheckInRoute = c.mutation({
  method: 'POST',
  path: '/api/check-ins',
  body: CreateCheckInBodySchema,
  responses: {
    201: CreateCheckInResponseSchema,
    400: z.object({ message: z.string(), statusCode: z.literal(400) }),
    401: z.object({ message: z.string(), statusCode: z.literal(401) }),
    403: z.object({ message: z.string(), statusCode: z.literal(403) }),
  },
  summary: 'Client submits a check-in with one or more pain points.',
});

export const listCheckInsRoute = c.query({
  method: 'GET',
  path: '/api/check-ins',
  query: ListCheckInsQuerySchema,
  responses: {
    200: ListCheckInsResponseSchema,
    401: z.object({ message: z.string(), statusCode: z.literal(401) }),
    403: z.object({ message: z.string(), statusCode: z.literal(403) }),
  },
  summary: "List the authenticated client's check-ins (descending by occurredAt).",
});

export const checkInsContract = c.router({
  create: createCheckInRoute,
  list: listCheckInsRoute,
});

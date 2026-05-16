import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const SideSchema = z.enum(['LEFT', 'RIGHT', 'CENTER']);
export type Side = z.infer<typeof SideSchema>;

export const BodyRegionItemSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  side: SideSchema.nullable(),
  displayLayer: z.string(),
  label: z.string(),
});
export type BodyRegionItem = z.infer<typeof BodyRegionItemSchema>;

export const BodyRegionsListResponseSchema = z.object({
  regions: z.array(BodyRegionItemSchema),
});
export type BodyRegionsListResponse = z.infer<typeof BodyRegionsListResponseSchema>;

export const bodyRegionsListRoute = c.query({
  method: 'GET',
  path: '/api/body-regions',
  responses: {
    200: BodyRegionsListResponseSchema,
    401: z.object({ message: z.string(), statusCode: z.literal(401) }),
  },
  summary: 'Return all system-seeded BodyRegion rows (flat list; hierarchy via parentId).',
});

export const bodyRegionsContract = c.router({
  list: bodyRegionsListRoute,
});

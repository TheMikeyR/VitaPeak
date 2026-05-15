import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const ClinicSignupBodySchema = z.object({
  name: z.string().min(1).max(120),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
});
export type ClinicSignupBody = z.infer<typeof ClinicSignupBodySchema>;

export const ClinicSignupResponseSchema = z.object({
  clinicId: z.string(),
  therapistId: z.string(),
});
export type ClinicSignupResponse = z.infer<typeof ClinicSignupResponseSchema>;

export const clinicSignupRoute = c.mutation({
  method: 'POST',
  path: '/api/clinics/signup',
  body: ClinicSignupBodySchema,
  responses: {
    201: ClinicSignupResponseSchema,
    400: z.object({ message: z.string(), statusCode: z.literal(400) }),
    401: z.object({ message: z.string(), statusCode: z.literal(401) }),
    409: z.object({ message: z.string(), statusCode: z.literal(409) }),
  },
  summary: 'Therapist signup — creates a Clinic + OWNER Therapist row.',
});

export const clinicsContract = c.router({ signup: clinicSignupRoute });

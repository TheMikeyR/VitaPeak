import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { runWithSystemContext } from '../../db/tenant-context.js';
import type { AuthenticatedUser } from '../../auth/auth.guard.js';

export interface CreateClinicInput {
  name: string;
  firstName: string;
  lastName: string;
}

export interface CreateClinicResult {
  clinicId: string;
  therapistId: string;
}

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a Clinic + OWNER Therapist row for an authenticated user that has
   * just signed up via Better-Auth. Runs under the system-context escape
   * hatch — the user has no tenant yet, so the Prisma tenancy extension
   * would otherwise reject the writes.
   */
  async signup(user: AuthenticatedUser, input: CreateClinicInput): Promise<CreateClinicResult> {
    return runWithSystemContext(async () => {
      const existing = await this.prisma.client.therapist.findUnique({
        where: { externalAuthId: user.externalAuthId },
        select: { id: true, clinicId: true },
      });
      if (existing) {
        throw new ConflictException('This account is already linked to a clinic.');
      }

      const clinic = await this.prisma.client.clinic.create({
        data: { name: input.name },
        select: { id: true },
      });
      const therapist = await this.prisma.client.therapist.create({
        data: {
          clinicId: clinic.id,
          externalAuthId: user.externalAuthId,
          email: user.email,
          firstName: input.firstName,
          lastName: input.lastName,
          role: 'OWNER',
        },
        select: { id: true },
      });
      return { clinicId: clinic.id, therapistId: therapist.id };
    });
  }
}

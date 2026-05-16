import { Controller, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { clinicSignupRoute } from '@vitapeak/contracts';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard.js';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { Audit } from '../../audit/audit.decorator.js';
import { ClinicsService } from './clinics.service.js';

@Controller()
export class ClinicsController {
  constructor(private readonly clinics: ClinicsService) {}

  @TsRestHandler(clinicSignupRoute)
  @UseGuards(AuthGuard)
  @Audit('clinic.signup')
  async signup(@CurrentUser() user: AuthenticatedUser) {
    return tsRestHandler(clinicSignupRoute, async ({ body }) => {
      const result = await this.clinics.signup(user, body);
      return { status: 201, body: result };
    });
  }
}

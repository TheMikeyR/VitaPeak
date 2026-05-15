import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard.js';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { Audit } from '../../audit/audit.decorator.js';
import { ClinicsService, type CreateClinicResult } from './clinics.service.js';

interface SignupBody {
  name?: unknown;
  firstName?: unknown;
  lastName?: unknown;
}

@Controller('api/clinics')
export class ClinicsController {
  constructor(private readonly clinics: ClinicsService) {}

  @Post('signup')
  @UseGuards(AuthGuard)
  @Audit('clinic.signup')
  async signup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SignupBody,
  ): Promise<CreateClinicResult> {
    const name = stringField(body.name, 'name');
    const firstName = stringField(body.firstName, 'firstName');
    const lastName = stringField(body.lastName, 'lastName');
    return this.clinics.signup(user, { name, firstName, lastName });
  }
}

function stringField(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`Field "${field}" is required.`);
  }
  return value.trim();
}

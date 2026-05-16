import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createLocalJWKSet, errors as joseErrors, jwtVerify, type JWTPayload } from 'jose';
import type { Request } from 'express';
import { AUTH_TOKEN } from './auth.tokens.js';
import type { Auth, VitapeakJwtClaims } from './better-auth.config.js';
import { recordAuthFailure, type AuthFailureReason } from './metrics.js';

export interface AuthenticatedUser {
  externalAuthId: string;
  email: string;
  emailVerified: boolean;
  role: 'therapist' | 'client' | undefined;
  preferredUsername?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private jwks?: ReturnType<typeof createLocalJWKSet>;

  constructor(@Inject(AUTH_TOKEN) private readonly auth: Auth) {}

  private async getJwks() {
    if (!this.jwks) {
      // Fetch JWKS in-process via Better-Auth's API (no HTTP round-trip). The
      // remote variant only worked when the API was bound to a real port —
      // tests use supertest's in-memory server which has no port.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jwks = (await (this.auth.api as any).getJwks()) as { keys: unknown[] };
      this.jwks = createLocalJWKSet({ keys: jwks.keys as never });
    }
    return this.jwks;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.headers['authorization'];
    if (typeof header !== 'string' || !header.toLowerCase().startsWith('bearer ')) {
      this.fail('missing_token');
    }
    const token = header.slice(7).trim();
    if (!token) this.fail('missing_token');

    let payload: JWTPayload;
    try {
      const jwks = await this.getJwks();
      ({ payload } = await jwtVerify(token, jwks, {
        issuer: 'vitapeak-better-auth',
      }));
    } catch (err) {
      this.fail(this.classifyJoseError(err));
    }

    const claims = payload as unknown as VitapeakJwtClaims;
    if (!claims.sub || typeof claims.sub !== 'string') {
      this.fail('malformed_token');
    }

    req.user = {
      externalAuthId: claims.sub,
      email: claims.email,
      emailVerified: claims.email_verified ?? false,
      role: claims.realm_access?.roles?.[0],
      preferredUsername: claims.preferred_username,
    };

    return true;
  }

  private fail(reason: AuthFailureReason): never {
    recordAuthFailure(reason);
    throw new UnauthorizedException();
  }

  private classifyJoseError(err: unknown): AuthFailureReason {
    if (err instanceof joseErrors.JWTExpired) return 'expired_token';
    if (err instanceof joseErrors.JWSSignatureVerificationFailed) return 'invalid_signature';
    if (err instanceof joseErrors.JWTInvalid) return 'malformed_token';
    if (err instanceof joseErrors.JWSInvalid) return 'malformed_token';
    return 'invalid_signature';
  }
}

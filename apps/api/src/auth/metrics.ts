import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

export const authFailureTotal = new Counter({
  name: 'auth_failure_total',
  help: 'Total number of authentication failures, partitioned by reason.',
  labelNames: ['reason'] as const,
  registers: [metricsRegistry],
});

export type AuthFailureReason =
  | 'missing_token'
  | 'invalid_signature'
  | 'invalid_credentials'
  | 'expired_token'
  | 'malformed_token';

export function recordAuthFailure(reason: AuthFailureReason) {
  authFailureTotal.inc({ reason });
}

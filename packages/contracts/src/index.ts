import { initContract } from '@ts-rest/core';
import { authContract } from './auth.js';
import { clinicsContract } from './clinics.js';
import { invitesContract } from './invites.js';

const c = initContract();

/**
 * Root ts-rest contract. Sub-routers for chunk 01: auth (me), clinics, invites.
 * Feature contracts (checkIns, plans, programs, health) land in later chunks.
 */
export const contract = c.router({
  auth: authContract,
  clinics: clinicsContract,
  invites: invitesContract,
});

export type Contract = typeof contract;

export * from './auth.js';
export * from './clinics.js';
export * from './invites.js';

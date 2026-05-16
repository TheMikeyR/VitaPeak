import { initContract } from '@ts-rest/core';
import { authContract } from './auth.js';
import { bodyRegionsContract } from './body-regions.js';
import { checkInsContract } from './check-ins.js';
import { clinicsContract } from './clinics.js';
import { invitesContract } from './invites.js';

const c = initContract();

/**
 * Root ts-rest contract.
 * Chunk 01: auth (me), clinics, invites.
 * Chunk 02: bodyRegions, checkIns.
 * Feature contracts for plans / programs / health land in later chunks.
 */
export const contract = c.router({
  auth: authContract,
  clinics: clinicsContract,
  invites: invitesContract,
  bodyRegions: bodyRegionsContract,
  checkIns: checkInsContract,
});

export type Contract = typeof contract;

export * from './auth.js';
export * from './body-regions.js';
export * from './check-ins.js';
export * from './clinics.js';
export * from './invites.js';

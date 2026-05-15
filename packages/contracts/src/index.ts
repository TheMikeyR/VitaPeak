import { initContract } from '@ts-rest/core';

const c = initContract();

/**
 * Root ts-rest contract. Sub-routers (clients, checkIns, plans, programs, health)
 * land in their respective feature chunks.
 */
export const contract = c.router({});

export type Contract = typeof contract;

import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@vitapeak/db';
import { tenancyExtension } from './tenancy.extension.js';

const buildClient = () => new PrismaClient().$extends(tenancyExtension);

export type ExtendedPrismaClient = ReturnType<typeof buildClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: ExtendedPrismaClient = buildClient();

  async onModuleInit() {
    await (this.client as unknown as PrismaClient).$connect();
  }

  async onModuleDestroy() {
    await (this.client as unknown as PrismaClient).$disconnect();
  }
}

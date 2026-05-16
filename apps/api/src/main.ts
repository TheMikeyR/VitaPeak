import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AUTH_TOKEN } from './auth/better-auth.module.js';
import type { Auth } from './auth/better-auth.config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // Mount Better-Auth's Node handler BEFORE the JSON body parser — the handler
  // reads the raw request body itself. Express 4 wildcard: `/auth/*`.
  const auth = app.get<Auth>(AUTH_TOKEN);
  app.use('/auth/*', toNodeHandler(auth));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  app.get(Logger).log(`listening on http://localhost:${port}`);
}

void bootstrap();

import { Module } from '@nestjs/common';
import { BodyRegionsController } from './body-regions.controller.js';

@Module({
  controllers: [BodyRegionsController],
})
export class BodyRegionsModule {}

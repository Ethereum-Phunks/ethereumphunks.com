import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '@/app.module';

import { CustomLogger } from '@/modules/shared/services/logger.service';

import dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
    // credentials: true,
  });

  const customLogger = app.get(CustomLogger);
  app.useLogger(customLogger);

  await app.listen(Number(process.env.PORT));
  Logger.debug(`Server running on http://localhost:${process.env.PORT}`, 'Bootstrap');
}

bootstrap();

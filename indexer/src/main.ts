import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';

import { CustomLogger } from './services/logger.service';

import dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: ['GET'],
  });

  const customLogger = app.get(CustomLogger);
  app.useLogger(customLogger);

  await app.listen(Number(process.env.PORT));
}
bootstrap();

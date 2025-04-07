import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '@/app.module';

import { CustomLogger } from '@/modules/shared/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
      callback(null, allowedOrigins.includes(origin) ? origin : false);
    },
    methods: ['GET', 'POST']
  });

  const customLogger = app.get(CustomLogger);
  app.useLogger(customLogger);

  await app.listen(Number(process.env.PORT));
  Logger.debug(`Server running on http://localhost:${process.env.PORT}`, 'Bootstrap');
}

bootstrap();

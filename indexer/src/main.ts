import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '@/app.module';

import { AppConfigService } from '@/config/config.service';
import { CustomLogger } from '@/modules/shared/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configSvc = app.get(AppConfigService);

  app.enableCors({
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = configSvc.allowedOrigins;
      callback(null, allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST']
  });

  const customLogger = app.get(CustomLogger);
  app.useLogger(customLogger);

  await app.listen(configSvc.port);
  Logger.debug(`Server running on http://localhost:${configSvc.port}`, 'Bootstrap');
}

bootstrap();

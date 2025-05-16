import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '@/app.module';

import { AppConfigService } from '@/config/config.service';
import { CustomLogger } from '@/modules/shared/services/logger.service';

async function listenWithRetries(app, startPort: number, maxRetries = 10): Promise<number> {
  let port = startPort;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await app.listen(port);
      return port;
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        Logger.warn(`Port ${port} in use, trying ${port + 1}...`, 'Bootstrap');
        port++;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Unable to bind to a port after ${maxRetries} attempts starting from ${startPort}`);
}

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

  let port: number;
  try {
    port = await listenWithRetries(app, configSvc.port, 10);
    Logger.debug(`Server running on http://localhost:${port}`, 'Bootstrap');
  } catch (err) {
    Logger.error(err.message, '', 'Bootstrap');
    process.exit(1);
  }
}

bootstrap();

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration, { validationSchema } from './configuration';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
      envFilePath: process.env.ENV_FILE || '.env',
      cache: true,
      expandVariables: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}

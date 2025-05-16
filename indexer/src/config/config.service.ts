import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig, ChainConfig, SupabaseConfig, Features, ApiConfig, NotificationsConfig, RelayConfig } from './models/configuration.types';

@Injectable()
export class AppConfigService {
  constructor(
    private configService: ConfigService
  ) {}

  get nodeEnv(): string {
    return this.configService.get('app.nodeEnv') as string;
  }

  get mode(): 'backfill' | 'poll' {
    return this.configService.get('app.mode') as 'backfill' | 'poll';
  }

  get port(): number {
    return this.configService.get('app.port') as number;
  }

  get allowedOrigins(): string[] {
    return this.configService.get('app.allowedOrigins') as string[];
  }

  get bridgeBlockDelayL1(): number {
    return this.configService.get('app.bridgeBlockDelayL1') as number;
  }

  get chain(): ChainConfig {
    return this.configService.get('app.chain') as ChainConfig;
  }

  get supabase(): SupabaseConfig {
    return this.configService.get('app.supabase') as SupabaseConfig;
  }

  get relay() {
    return this.configService.get('app.relay') as RelayConfig;
  }

  get notifications() {
    return this.configService.get('app.notifications') as NotificationsConfig;
  }

  get api() {
    return this.configService.get('app.api') as ApiConfig;
  }

  get features() {
    return this.configService.get('app.features') as Features;
  }

  // Helper methods for common operations
  get contracts() {
    return this.chain.contracts;
  }

  get rpc() {
    return this.chain.rpc;
  }
}

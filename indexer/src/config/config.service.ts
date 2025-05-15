import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig, ChainConfig, SupabaseConfig } from './configuration.types';

@Injectable()
export class AppConfigService {
  constructor(
    private configService: ConfigService<AppConfig>
  ) {}

  get nodeEnv(): string {
    return this.configService.get('nodeEnv');
  }

  get mode(): 'backfill' | 'poll' {
    return this.configService.get('mode');
  }

  get port(): number {
    return this.configService.get('port');
  }

  get allowedOrigins(): string[] {
    return this.configService.get('allowedOrigins');
  }

  get bridgeBlockDelayL1(): number {
    return this.configService.get('bridgeBlockDelayL1');
  }

  get chain(): ChainConfig {
    return this.configService.get('chain');
  }

  get supabase(): SupabaseConfig {
    return this.configService.get('supabase');
  }

  get relay() {
    return this.configService.get('relay');
  }

  get notifications() {
    return this.configService.get('notifications');
  }

  get api() {
    return this.configService.get('api');
  }

  get twitter() {
    return this.configService.get('twitter');
  }

  // Helper methods for common operations
  get contracts() {
    return this.chain.contracts;
  }

  get rpc() {
    return this.chain.rpc;
  }

  get features() {
    return this.configService.get('features');
  }
}

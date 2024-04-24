import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const EXPIRY = 1; // 1 minutes

@Injectable()
export class NonceService {

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async generateNonce(address: string): Promise<string> {
    address = address.toLowerCase();
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    try {
      await this.cacheNonce(address, nonce);
      return nonce;
    } catch (error) {
      Logger.error(`Error caching nonce for address ${address}: ${error}`);
      throw new InternalServerErrorException('Error caching nonce');
    }
  }

  async fetchUserNonce(address: string): Promise<string> {
    address = address.toLowerCase();
    const nonce = await this.cacheManager.get(`nonce_${address}`) as string;
    if (!nonce) throw new BadRequestException('Nonce not found');
    return nonce;
  }

  private async cacheNonce(address: string, nonce: string): Promise<void> {
    await this.cacheManager.set(`nonce_${address}`, nonce, 60 * EXPIRY * 1000);
  }
}

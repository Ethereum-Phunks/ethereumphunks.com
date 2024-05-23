import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * The expiry time for the nonce, in minutes.
 */
const EXPIRY = 1;

@Injectable()
export class NonceService {

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Generates a nonce for the given address.
   *
   * @param address - The address for which to generate the nonce.
   * @returns A promise that resolves to the generated nonce.
   * @throws {InternalServerErrorException} If there is an error caching the nonce.
   */
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

  /**
   * Fetches the nonce for a given user address from cache.
   * @param address - The user address.
   * @returns A promise that resolves to the nonce as a string.
   * @throws {BadRequestException} If the nonce is not found.
   */
  async fetchUserNonce(address: string): Promise<string> {
    address = address.toLowerCase();
    const nonce = await this.cacheManager.get(`nonce_${address}`) as string;
    if (!nonce) throw new BadRequestException('Nonce not found');
    return nonce;
  }

  /**
   * Caches the nonce for a given address.
   * @param address - The address for which to cache the nonce.
   * @param nonce - The nonce to be cached.
   * @returns A promise that resolves when the nonce is successfully cached.
   */
  private async cacheNonce(address: string, nonce: string): Promise<void> {
    await this.cacheManager.set(`nonce_${address}`, nonce, 60 * EXPIRY * 1000);
  }
}

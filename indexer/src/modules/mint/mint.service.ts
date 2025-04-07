// nestjs service
import { Injectable, OnModuleInit } from '@nestjs/common';
import crypto, { createHash } from 'crypto';

import { SupabaseService } from '@/services/supabase.service';
import { TxPoolService } from '@/modules/tx-pool/tx-pool.service';
import { DataService } from '@/services/data.service';

import { Collection } from '@/models/db';
import { MintRequestResponse, MetadataCollection } from './models/mint';
import { from, map, merge } from 'rxjs';

@Injectable()
export class MintService implements OnModuleInit {

  private metadata: MetadataCollection;

  private pendingInscriptionShas: Map<`0x${string}`, string>;
  private queuedInscriptionShas: Map<`0x${string}`, string>;

  private mintingActive: boolean;

  constructor(
    private readonly sbSvc: SupabaseService,
    private readonly txPoolSvc: TxPoolService,
    private readonly dataSvc: DataService,
  ) {}

  /**
   * Initializes the service by loading metadata for the Call Data Comrades collection
   */
  async onModuleInit() {
    this.metadata = await this.sbSvc.getCollectionData('call-data-comrades');

    this.txPoolSvc.eventEmitter.on('txpool.update', (state) => {
      this.pendingInscriptionShas = state.pendingInscriptionShas;
      this.queuedInscriptionShas = state.queuedInscriptionShas;
    });

    this.watchIsMinting();
  }

  watchIsMinting() {
    merge(
      from(this.sbSvc.isMinting('call-data-comrades')),
      this.sbSvc.watchCollection('call-data-comrades').pipe(map((data) => data.mintEnabled && data.isMinting)),
    ).subscribe((mintingActive) => {
      this.mintingActive = mintingActive;
      console.log({ mintingActive });
    });
  }

  /**
   * Validates a mint request and returns metadata for the randomly selected token
   * @param slug - The collection slug to mint from
   * @param address - The wallet address requesting the mint
   * @returns Promise resolving to mint request details including token metadata
   */
  async validateMint(
    slug: string,
    address: string,
  ): Promise<MintRequestResponse> {
    if (!this.mintingActive) throw new Error('Minting is not active');
    if (this.metadata.slug !== slug) throw new Error('Invalid collection slug');

    const randomId = await this.getRandomId(slug, address);
    const metadata = this.metadata?.collection_items.find(item => item.tokenId === randomId);

    const [exists, existsGlobally] = await Promise.all([
      this.sbSvc.checkEthscriptionExistsBySha(metadata.sha),
      this.dataSvc.getEthscriptionBySha(metadata.sha),
    ]);

    // console.log({ exists, existsGlobally });

    const data = {
      slug,
      address,
      id: randomId,
      exists: exists || existsGlobally,
      pending: this.isPendingSha(metadata.sha),
      queued: this.isQueuedSha(metadata.sha),
      metadata
    };
    return data;
  }

  /**
   * Generates a random token ID within a given range using multiple sources of entropy
   * @param slug - The collection slug used as entropy
   * @param address - The wallet address used as entropy
   * @param range - Optional min/max range for the random ID (defaults to 9800-9939)
   * @returns Promise resolving to a random token ID number
   */
  private async getRandomId(
    slug: string,
    address: string,
    range: { min: number; max: number } = { min: 1, max: 9838 },
  ): Promise<number> {
    const { min, max } = range;
    const minMaxRange = max - min + 1;

    // Create entropy source
    const timestamp = process.hrtime.bigint().toString();
    const randomBytes = crypto.randomBytes(32);
    const addressBytes = Buffer.from(address.slice(2), 'hex');
    const slugBytes = Buffer.from(slug);

    // Mix all entropy sources
    const hash = createHash('sha512')
      .update(timestamp)
      .update(randomBytes)
      .update(addressBytes)
      .update(slugBytes)
      .digest();

    // Use the first 8 bytes
    let value = BigInt(0);
    for (let i = 0; i < 8; i++) {
      value = (value << BigInt(8)) + BigInt(hash[i]);
    }

    // Ensure uniform distribution
    const maxUint64 = BigInt('18446744073709551615'); // 2^64 - 1
    const random = Number((value * BigInt(minMaxRange)) / maxUint64);

    // Ensure the result is within bounds
    return Math.min(Math.max(min + random, min), max);
  }

  /**
   * Check if a SHA exists in pending inscriptions
   */
  isPendingSha(sha: string): boolean {
    if (!this.pendingInscriptionShas) return false;
    return Array.from(this.pendingInscriptionShas?.values())?.includes(sha);
  }

  /**
   * Check if a SHA exists in queued inscriptions
   */
  isQueuedSha(sha: string): boolean {
    if (!this.queuedInscriptionShas) return false;
    return Array.from(this.queuedInscriptionShas?.values())?.includes(sha);
  }

  /**
   * Tests the randomization function to ensure uniform distribution
   */
  private async testRandomization() {
    const totalTests = 9_838; // Reduced number of tests for better analysis
    const distribution = new Map<number, number>(); // Track frequency of each number
    const randoms = new Set<number>();

    for (let i = 0; i < totalTests; i++) {
      const randomAddress = `0x${crypto.randomBytes(20).toString('hex')}`;
      const random = await this.getRandomId('call-data-comrades', randomAddress);

      randoms.add(random);
      distribution.set(random, (distribution.get(random) || 0) + 1);
    }

    const uniqueCount = randoms.size;
    const duplicateCount = totalTests - uniqueCount;

    // Calculate statistics
    const duplicatePercentage = (duplicateCount / totalTests) * 100;
    const expectedUniquePercentage = (9838 / totalTests) * 100;

    // Calculate distribution metrics
    const frequencies = Array.from(distribution.values());
    const maxFrequency = Math.max(...frequencies);
    const avgFrequency = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const stdDev = Math.sqrt(
      frequencies.reduce((sq, n) => sq + Math.pow(n - avgFrequency, 2), 0) / frequencies.length
    );

    console.log({
      totalTests,
      uniqueCount,
      duplicateCount,
      duplicatePercentage: `${duplicatePercentage.toFixed(4)}%`,
      expectedUniquePercentage: `${expectedUniquePercentage.toFixed(4)}%`,
      maxFrequency,
      avgFrequency: avgFrequency.toFixed(2),
      stdDev: stdDev.toFixed(2),
      distribution: {
        min: Math.min(...frequencies),
        max: maxFrequency,
        '25th': frequencies.sort((a, b) => a - b)[Math.floor(frequencies.length * 0.25)],
        '75th': frequencies.sort((a, b) => a - b)[Math.floor(frequencies.length * 0.75)]
      }
    });
  }
}

// nestjs service
import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';

import { SupabaseService } from '@/services/supabase.service';

@Injectable()
export class MintService implements OnModuleInit {

  private metadata: any;

  constructor(
    private readonly sbSvc: SupabaseService,
  ) {}

  async onModuleInit() {
    this.metadata = await this.getMetadata('call-data-comrades');
    // console.log(this.metadata);
  }

  async validateMint(
    slug: string,
    address: string,
  ): Promise<{
    slug: string,
    address: string,
    id: number,
    exists: boolean,
    metadata: {
      attributes: {
        [key: string]: string;
      },
      sha: string,
    },
  }> {
    const randomId = await this.getRandomId(slug, address);
    const exists = await this.checkAlreadyExists(slug, randomId);

    const sha = Object.keys(this.metadata)[randomId - 1];
    const metadata = { sha, metadata: this.metadata[sha] };

    return {
      slug,
      address,
      id: randomId,
      exists,
      metadata: {
        attributes: metadata.metadata,
        sha: metadata.sha,
      },
    };
  }

  async getRandomId(
    slug: string,
    address: string,
    range: { min: number; max: number } = { min: 1, max: 9800 },
  ): Promise<number> {

    const min = range.min ?? 0;
    const max = range.max ?? 10000;
    const minMaxRange = max - min + 1;

    // Add multiple sources of entropy
    const timestamp = process.hrtime.bigint().toString();
    const nonce = Math.random().toString();

    const hash = createHash('sha256')
      .update(`${slug}-${address}-${timestamp}-${nonce}`)
      .digest();

    // Use 8 bytes instead of 4 for better distribution
    let value = BigInt(0);
    for (let i = 0; i < 8; i++) {
      value = (value << BigInt(8)) + BigInt(hash[i]);
    }

    // Use BigInt division for more precise distribution
    const maxUint64 = BigInt('18446744073709551615'); // 2^64 - 1
    const random = Number((value * BigInt(minMaxRange)) / maxUint64);

    return min + random;
  }

  async checkAlreadyExists(slug: string, id: number): Promise<boolean> {
    const ethscription = await this.sbSvc.fetchEthscriptionBySlugAndTokenId(slug, id);
    return ethscription !== null;
  }

  async getMetadata(slug: string) {
    const storageUrl = `https://kcbuycbhynlmsrvoegzp.supabase.co/storage/v1/object/public`;
    const metadataUrl = `${storageUrl}/data/${slug}_attributes.json`;
    const metadata = await fetch(metadataUrl);
    return metadata.json();
  }
}

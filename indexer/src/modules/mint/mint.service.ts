// nestjs service
import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';

import { SupabaseService } from '@/services/supabase.service';
import { Web3Service } from '@/modules/shared/services/web3.service';

@Injectable()
export class MintService implements OnModuleInit {

  private metadata: any;

  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    private readonly sbSvc: SupabaseService,
  ) {}

  async onModuleInit() {
    this.metadata = await this.getMetadata('ethereum-phunks');
  }

  async validateMint(
    slug: string,
    address: string,
  ): Promise<{
    slug: string,
    address: string,
    id: number,
    exists: boolean,
    metadata: any,
  }> {
    const validatedAddress = this.web3SvcL1.validateAddress(address);
    if (!validatedAddress) {
      throw new BadRequestException('Invalid address');
    }

    const id = await this.getRandomId(slug, validatedAddress);
    const exists = await this.checkAlreadyExists(slug, id);

    const sha = Object.keys(this.metadata)[id];
    const metadata = { sha, metadata: this.metadata[sha] };
    return { slug, address, id, exists, metadata };
  }

  async getRandomId(slug: string, address: string): Promise<number> {
    const LIMIT = 10000;

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
    const random = Number((value * BigInt(LIMIT)) / maxUint64);
    return random;
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

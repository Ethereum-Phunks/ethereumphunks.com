import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getRandomValues } from 'node:crypto';
import { toHex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class KeyGenService implements OnModuleInit {
  private readonly logger = new Logger(KeyGenService.name);

  async onModuleInit() {
    await this.validateNodeVersion();
  }

  private async validateNodeVersion() {
    const nodeVersion = process.versions.node;
    const [major] = nodeVersion.split('.').map(Number);
    if (major < 20) {
      this.logger.error('Node.js version 20 or higher is required');
      process.exit(1);
    }
  }

  private generateEncryptionKeyHex(): string {
    const uint8Array = getRandomValues(new Uint8Array(32));
    return toHex(uint8Array);
  }

  generateKeys() {
    this.logger.log('Generating keys...');

    const walletKey = generatePrivateKey();
    const account = privateKeyToAccount(walletKey);
    const encryptionKeyHex = this.generateEncryptionKeyHex();
    const publicKey = account.address;

    return {
      walletKey,
      encryptionKey: encryptionKeyHex,
      publicKey,
    };
  }
}

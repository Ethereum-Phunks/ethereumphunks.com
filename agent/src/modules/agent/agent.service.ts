import { Injectable, OnModuleInit } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Client, Signer, type XmtpEnv, IdentifierKind } from '@xmtp/node-sdk';

import { createWalletClient, fromHex, http, toBytes, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { getRandomValues } from 'crypto';

import { KeyGenService } from './services/key-gen.service';
import { LangchainService } from './services/langchain.service';

interface User {
  key: `0x${string}`;
  account: any;
  wallet: any;
}

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AgentService implements OnModuleInit {

  signer = this.createSigner(process.env.AGENT_WALLET_PK as `0x${string}`);
  dbEncryptionKey = this.getEncryptionKeyFromHex(
    process.env.AGENT_ENCRYPTION_KEY
  );

  env: XmtpEnv = process.env.XMTP_ENV as XmtpEnv;

  constructor(
    private readonly keyGenService: KeyGenService,
    private readonly langchainSvc: LangchainService
  ) {}

  async onModuleInit() {
    this.main();
  }

  async main() {
    console.log(`Creating client on the '${this.env}' network...`);
    const signerIdentifier = (await this.signer.getIdentifier()).identifier;
    const client = await Client.create(this.signer, {
      dbEncryptionKey: this.dbEncryptionKey,
      env: this.env,
      dbPath: this.getDbPath(this.env + '-' + signerIdentifier),
      loggingLevel: process.env.LOGGING_LEVEL as any,
    });
    this.logAgentDetails(client);

    console.log('Syncing conversations...');
    await client.conversations.sync();

    console.log('Waiting for messages...');
    const stream = client.conversations.streamAllMessages();

    for await (const message of await stream) {
      if (
        message?.senderInboxId.toLowerCase() === client.inboxId.toLowerCase() ||
        message?.contentType?.typeId !== 'text'
      ) {
        continue;
      }

      console.log(
        `Received message: ${message.content as string} by ${
          message.senderInboxId
        }`
      );

      const conversation = await client.conversations.getConversationById(
        message.conversationId
      );

      if (!conversation) {
        console.log('Unable to find conversation, skipping');
        continue;
      }

      // Use the handleMessage method to process and respond
      // const aiResponse = await this.openAISvc.generateResponse(message.content as string);

      try {
        const aiResponse = await this.langchainSvc.ask(
          message.content as string,
          message.conversationId
        );
        await conversation.send(aiResponse);
      } catch (error) {
        console.error(error);
        await conversation.send('There was an error processing your message. Please try again.');
      }

      console.log('Waiting for messages...');
    }
  }

  createUser(key: string): User {
    const account = privateKeyToAccount(key as `0x${string}`);
    return {
      key: key as `0x${string}`,
      account,
      wallet: createWalletClient({
        account,
        chain: sepolia,
        transport: http(),
      }),
    };
  }

  createSigner(key: string): Signer {
    const sanitizedKey = key.startsWith('0x') ? key : `0x${key}`;
    const user = this.createUser(sanitizedKey);
    return {
      type: 'EOA',
      getIdentifier: () => ({
        identifierKind: IdentifierKind.Ethereum,
        identifier: user.account.address.toLowerCase(),
      }),
      signMessage: async (message: string) => {
        const signature = await user.wallet.signMessage({
          message,
          account: user.account,
        });
        return toBytes(signature);
      },
    };
  }

  generateEncryptionKeyHex() {
    /* Generate a random encryption key */
    const uint8Array = getRandomValues(new Uint8Array(32));
    /* Convert the encryption key to a hex string */
    return toHex(uint8Array);
  }

  /**
   * Get the encryption key from a hex string
   * @param hex - The hex string
   * @returns The encryption key
   */
  getEncryptionKeyFromHex(hex: string) {
    /* Convert the hex string to an encryption key */
    return fromHex(hex as `0x${string}`, 'bytes');
  }

  getDbPath(description: string = 'xmtp') {
    // Use Railway volume path if available, otherwise use local .data directory
    const volumePath = join(process.cwd(), '.data/xmtp');

    // Create database directory if it doesn't exist
    if (!existsSync(volumePath)) {
      mkdir(volumePath, { recursive: true });
    }

    return join(volumePath, `${description}.db3`);
  }

  logAgentDetails(client: Client): void {
    console.log(`\x1b[38;2;252;76;52m
      ██╗  ██╗███╗   ███╗████████╗██████╗
      ╚██╗██╔╝████╗ ████║╚══██╔══╝██╔══██╗
       ╚███╔╝ ██╔████╔██║   ██║   ██████╔╝
       ██╔██╗ ██║╚██╔╝██║   ██║   ██╔═══╝
      ██╔╝ ██╗██║ ╚═╝ ██║   ██║   ██║
      ╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝   ╚═╝
    \x1b[0m`);
    const address = client.accountIdentifier?.identifier ?? '';
    const inboxId = client.inboxId;
    const env = client.options?.env ?? 'dev';
    console.log(`
  ✓ XMTP Client Ready:
  • Address: ${address}
  • InboxId: ${inboxId}
  • Network: ${env}
  • URL: http://xmtp.chat/dm/${address}?env=${env}`);
  }
}

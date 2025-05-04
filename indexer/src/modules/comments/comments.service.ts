import { Injectable, Logger } from '@nestjs/common';

import { StorageService } from '@/modules/storage/storage.service';

import { hexToString, Transaction, zeroAddress } from 'viem';

import { UtilityService } from '@/modules/shared/services/utility.service';

import { TIC } from './models/tic';

@Injectable()
export class CommentsService {

  constructor(
    private readonly storageSvc: StorageService,
    private readonly utilitySvc: UtilityService
  ) {}

  /**
   * Processes the comments for a given transaction.
   * @param transaction - The transaction object.
   * @param receipt - The transaction receipt object.
   * @param createdAt - The creation date of the transaction.
   * @returns A promise that resolves to void.
   */
  async processComments(
    transaction: Transaction,
    createdAt: Date
  ): Promise<void> {
    const { input } = transaction;

    const stringData = hexToString(input.toString() as `0x${string}`);
    const cleanedString = stringData.replace(/\x00/g, '');
    const possibleComment = cleanedString.startsWith('data:message/vnd.tic+json;rule=esip6,');

    if (possibleComment) {
      try {
        // Extract and parse the JSON data
        const jsonData = cleanedString.replace('data:message/vnd.tic+json;rule=esip6,', '');
        const tic: TIC = JSON.parse(jsonData);

        // Validate the TIC object
        if (this.validateTIC(tic)) {
          await this.storageSvc.addComment(tic, transaction, createdAt);
          Logger.debug(`Comment added`, `${transaction.hash}`);
        } else {
          Logger.warn(`Invalid TIC format`, `${transaction.hash}`);
        }
      } catch (error) {
        Logger.error(`Error processing TIC`, `${transaction.hash}`, error);
      }
    }

    // Check if possible transfer
    const possibleTransfer = this.utilitySvc.possibleTransfer(input);
    if (possibleTransfer) {
      const existingComment = await this.storageSvc.getCommentByHashId(input);
      if (!existingComment) return;

      const senderIsOwner = existingComment.from?.toLowerCase() === transaction.from?.toLowerCase();
      const isDeleting = (transaction.to === zeroAddress);

      if (senderIsOwner && isDeleting) {
        await this.storageSvc.deleteComment(input);
        Logger.debug(`Comment deleted`, `${transaction.hash}`);
      }
    }
  }

  /**
   * Validates a topic according to TIC protocol rules
   * @param topic - The topic to validate
   * @returns boolean indicating if the topic is valid
   */
  private validateTopic(topic: string): boolean {
    // Check if topic starts with 0x
    if (!topic.startsWith('0x')) return false;

    // Split by colon if multi-part
    const parts = topic.split(':');

    // Validate each part
    return parts.every(part => {
      // Check if part starts with 0x
      if (!part.startsWith('0x')) return false;

      // Check if remaining characters are valid hex
      const hexPart = part.slice(2);
      return /^[0-9a-fA-F]+$/.test(hexPart);
    });
  }

  /**
   * Validates a TIC object according to protocol rules
   * @param tic - The TIC object to validate
   * @returns boolean indicating if the TIC object is valid
   */
  private validateTIC(tic: TIC): boolean {
    // Check required fields
    if (!tic.topic || !tic.content || !tic.version) return false;

    // Validate topic format
    if (!this.validateTopic(tic.topic)) return false;

    // Validate version is hex
    if (!tic.version.startsWith('0x')) return false;

    // Validate encoding if present
    if (tic.encoding && !['utf8', 'base64', 'hex', 'json', 'markdown', 'ascii'].includes(tic.encoding)) {
      return false;
    }

    // Validate type if present
    if (tic.type && !['comment', 'reaction'].includes(tic.type)) {
      return false;
    }

    return true;
  }
}

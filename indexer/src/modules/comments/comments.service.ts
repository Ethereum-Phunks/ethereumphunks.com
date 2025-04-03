import { Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '@/services/supabase.service';

import { hexToString, Transaction, TransactionReceipt, zeroAddress } from 'viem';

import { UtilityService } from '@/modules/shared/services/utility.service';

@Injectable()
export class CommentsService {

  constructor(
    private readonly sbSvc: SupabaseService,
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
    receipt: TransactionReceipt,
    createdAt: Date
  ): Promise<void> {
    const { input } = transaction;

    const stringData = hexToString(input.toString() as `0x${string}`);
    const cleanedString = stringData.replace(/\x00/g, '');
    const possibleComment = cleanedString.startsWith('data:message/vnd.tic+json,');

    if (possibleComment) {
      await this.sbSvc.addComment(transaction, createdAt);
      Logger.log(`Comment added`, `${transaction.hash}`);
    }

    // Check if possible transfer
    const possibleTransfer = this.utilitySvc.possibleTransfer(input);
    if (possibleTransfer) {
      const existingComment = await this.sbSvc.getCommentByHashId(input);
      if (!existingComment) return;

      const senderIsOwner = existingComment.from?.toLowerCase() === transaction.from?.toLowerCase();
      const isDeleting = (transaction.to === zeroAddress);

      if (senderIsOwner && isDeleting) {
        await this.sbSvc.deleteComment(input);
        Logger.log(`Comment deleted`, `${transaction.hash}`);
      }
    }
  }
}

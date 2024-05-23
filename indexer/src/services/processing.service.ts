import { Inject, Injectable, Logger } from '@nestjs/common';

import { Web3Service } from '@/modules/shared/services/web3.service';
import { SupabaseService } from '@/services/supabase.service';

import { UtilityService } from '@/modules/shared/services/utility.service';
import { TimeService } from '@/modules/shared/services/time.service';
import { EthscriptionsService } from '@/modules/ethscriptions/ethscriptions.service';
import { NftService } from '@/modules/nft/nft.service';

import { chain } from '@/constants/ethereum';

import { Event } from '@/models/db';

import { FormattedTransaction, Transaction, TransactionReceipt } from 'viem';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class ProcessingService {

  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    private readonly sbSvc: SupabaseService,
    private readonly utilSvc: UtilityService,
    private readonly timeSvc: TimeService,
    private readonly ethsSvc: EthscriptionsService
  ) {}

  /**
   * Processes a block by retrieving its transactions, processing them, and adding the events to the database.
   * Optionally, updates the last block in the database.
   *
   * @param blockNum - The number of the block to process.
   * @param updateBlockDb - Whether to update the last block in the database. Default is true.
   * @returns A Promise that resolves when the block processing is complete.
   */
  async processBlock(blockNum: number, updateBlockDb = true): Promise<void> {
    const { txns, createdAt } = await this.web3SvcL1.getBlockTransactions(blockNum);

    // Log the block
    const timeAgo = this.timeSvc.howLongAgo(createdAt as any);
    Logger.log(
      `Processing block ${blockNum} (L1)`,
      `${timeAgo.trim()}`
    );

    // Process the transactions & get the events
    const events = await this.processTransactions(txns, createdAt);
    // console.log(events?.length);
    // Add the events to the database
    if (events.length) await this.sbSvc.addEvents(events);
    // Update the block in db
    if (updateBlockDb) this.sbSvc.updateLastBlock(blockNum, createdAt);
  }

  /**
   * Retries processing a block if an error occurs.
   * @param blockNum - The block number to retry.
   * @returns A Promise that resolves when the block processing is complete.
   */
  async retryBlock(blockNum: number): Promise<void> {
    try {
      Logger.debug(`Retrying block ${blockNum} (${chain})`);

      // Pause for 5 seconds
      await this.utilSvc.delay(5000);

      // Get the transactions from the block
      const { txns, createdAt } = await this.web3SvcL1.getBlockTransactions(blockNum);
      await this.processTransactions(txns, createdAt);
    } catch (error) {
      console.log(error);
      // Pause for 5 seconds
      await this.utilSvc.delay(5000);
      // Retry the block
      return this.retryBlock(blockNum);
    }
  }

  /**
   * Processes an array of transactions and their receipts.
   * Sorts the transactions by transaction index and processes each transaction.
   * If an error occurs during processing, it logs the error, sends a message, and retries the block.
   * @param txns - An array of transactions and their receipts.
   * @param createdAt - The date when the transactions were created.
   * @returns An array of events generated from the processed transactions.
   */
  async processTransactions(
    txns: { transaction: FormattedTransaction; receipt: TransactionReceipt; }[],
    createdAt: Date
  ): Promise<Event[]> {
    // Sort by transaction index
    txns = txns.sort((a, b) => a.receipt.transactionIndex - b.receipt.transactionIndex);

    let events: Event[] = [];

    for (let i = 0; i < txns.length; i++) {
      const transaction = txns[i].transaction as Transaction;
      const receipt = txns[i].receipt as TransactionReceipt;

      try {
        const transactionEvents = await this.processTransaction(transaction, receipt, createdAt);
        if (transactionEvents?.length) events.push(...transactionEvents);
      } catch (error) {
        console.log(error);
        await this.retryBlock(Number(transaction.blockNumber));
      }
    }
    return events;
  }

  /**
   * Processes a transaction and returns an array of events.
   *
   * @param transaction - The transaction object to process.
   * @param receipt - The transaction receipt object.
   * @param createdAt - The date when the transaction was created.
   * @returns A promise that resolves to an array of events.
   */
  async processTransaction(
    transaction: Transaction,
    receipt: TransactionReceipt,
    createdAt: Date
  ): Promise<Event[]> {

    // Skip any transaction that failed
    if (receipt.status !== 'success') return;

    const events: Event[] = [];

    const ethscriptionsEvents = await this.ethsSvc.processEthscriptionsEvents(
      transaction,
      receipt,
      createdAt
    );
    if (ethscriptionsEvents?.length) events.push(...ethscriptionsEvents);

    // const nftEvents = await this.nftSvc.processNftEvents(
    //   transaction,
    //   receipt,
    //   createdAt
    // );
    // if (nftEvents?.length) events.push(...nftEvents);

    return events;
  }
}

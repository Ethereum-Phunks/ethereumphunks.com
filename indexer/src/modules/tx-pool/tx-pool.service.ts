import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { hexToString, Transaction } from 'viem';
import { createHash } from 'crypto';

export interface TxPoolState {
  pendingTransactions: Transaction[];
  queuedTransactions: Transaction[];
  pendingInscriptions: Transaction[];
  queuedInscriptions: Transaction[];
  pendingInscriptionData: Map<`0x${string}`, string>;
  queuedInscriptionData: Map<`0x${string}`, string>;
  pendingInscriptionShas: Map<`0x${string}`, string>;
  queuedInscriptionShas: Map<`0x${string}`, string>;
};

const POLL_INTERVAL = 1000;

/**
 * Service for monitoring and processing transactions in the mempool
 * Specifically focused on tracking inscriptions (data: URIs embedded in transaction data)
 */
@Injectable()
export class TxPoolService implements OnModuleInit {

  /** All pending transactions in the mempool */
  pendingTransactions: Transaction[] = [];
  /** All queued transactions in the mempool */
  queuedTransactions: Transaction[] = [];

  /** Pending transactions that contain inscription data */
  pendingInscriptions: Transaction[] = [];
  /** Queued transactions that contain inscription data */
  queuedInscriptions: Transaction[] = [];

  /** Map of transaction hash to inscription data for pending transactions */
  pendingInscriptionData: Map<`0x${string}`, string> = new Map();
  /** Map of transaction hash to inscription data for queued transactions */
  queuedInscriptionData: Map<`0x${string}`, string> = new Map();

  /** Map of transaction hash to SHA256 hash of inscription data for pending transactions */
  pendingInscriptionShas: Map<`0x${string}`, string> = new Map();
  /** Map of transaction hash to SHA256 hash of inscription data for queued transactions */
  queuedInscriptionShas: Map<`0x${string}`, string> = new Map();

  constructor(
    public readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Initializes the service by starting polling
   */
  async onModuleInit() {
    if (Number(process.env.TX_POOL)) {
      await this.startPolling();
    }
  }

  /**
   * Starts polling the mempool and emitting state updates
   * Fetches initial state and then polls every 100 seconds
   */
  private async startPolling() {
    try {
      // Fetch initial state
      await this.fetchTxpool();
      this.emitState();

      // Poll the mempool
      setInterval(async () => {
        try {
          await this.fetchTxpool();
          this.emitState();
        } catch (error) {
          this.eventEmitter.emit('txpool.error', error);
        }
      }, POLL_INTERVAL);
    } catch (error) {
      this.eventEmitter.emit('txpool.error', error);
    }
  }

  /**
   * Emits the current state of the mempool
   */
  private emitState() {
    const state: TxPoolState = {
      pendingTransactions: this.pendingTransactions,
      queuedTransactions: this.queuedTransactions,
      pendingInscriptions: this.pendingInscriptions,
      queuedInscriptions: this.queuedInscriptions,
      pendingInscriptionData: this.pendingInscriptionData,
      queuedInscriptionData: this.queuedInscriptionData,
      pendingInscriptionShas: this.pendingInscriptionShas,
      queuedInscriptionShas: this.queuedInscriptionShas,
    };
    this.eventEmitter.emit('txpool.update', state);
  }

  /**
   * Returns the current state of the mempool
   */
  getCurrentState(): TxPoolState {
    return {
      pendingTransactions: this.pendingTransactions,
      queuedTransactions: this.queuedTransactions,
      pendingInscriptions: this.pendingInscriptions,
      queuedInscriptions: this.queuedInscriptions,
      pendingInscriptionData: this.pendingInscriptionData,
      queuedInscriptionData: this.queuedInscriptionData,
      pendingInscriptionShas: this.pendingInscriptionShas,
      queuedInscriptionShas: this.queuedInscriptionShas,
    };
  }

  /**
   * Fetches current mempool state and processes transactions
   * Updates internal maps of pending/queued transactions and inscriptions
   */
  async fetchTxpool() {
    const rpc = process.env.RPC_URL_SEPOLIA;
    const response = await fetch(rpc, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'txpool_content',
        params: []
      })
    });
    const data = await response.json();

    // Extract and filter pending transactions
    const pending = Object.values(data.result.pending);
    const pendingTransactions = pending
      .map((tx: any) => Object.values(tx)[0])
      .filter((tx: any) => tx.input !== '0x');

    // Extract and filter queued transactions
    const queued = Object.values(data.result.queued);
    const queuedTransactions = queued
      .map((tx: any) => Object.values(tx)[0])
      .filter((tx: any) => tx.input !== '0x');

    // Filter for transactions containing inscriptions
    const pendingInscriptions = pendingTransactions.filter((tx: any) => {
      return this.isPossibleInscription(tx);
    });
    const queuedInscriptions = queuedTransactions.filter((tx: any) => {
      return this.isPossibleInscription(tx);
    });

    // Update transaction lists
    this.pendingTransactions = pendingTransactions as Transaction[];
    this.queuedTransactions = queuedTransactions as Transaction[];

    this.pendingInscriptions = pendingInscriptions as Transaction[];
    this.queuedInscriptions = queuedInscriptions as Transaction[];

    // Map transaction hashes to inscription data
    this.pendingInscriptionData = new Map(this.pendingInscriptions.map((tx) => [tx.hash, this.getInscriptionData(tx)]));
    this.queuedInscriptionData = new Map(this.queuedInscriptions.map((tx) => [tx.hash, this.getInscriptionData(tx)]));

    // Generate SHA256 hashes of inscription data
    this.pendingInscriptionShas = new Map(this.pendingInscriptions.map((tx) => {
      const data = this.getInscriptionData(tx);
      const sha = createHash('sha256').update(data).digest('hex');
      return [tx.hash, sha];
    }));
    this.queuedInscriptionShas = new Map(this.queuedInscriptions.map((tx) => {
      const data = this.getInscriptionData(tx);
      const sha = createHash('sha256').update(data).digest('hex');
      return [tx.hash, sha];
    }));
  }

  /**
   * Checks if a transaction contains inscription data
   * @param tx Transaction to check
   * @returns true if transaction input starts with 'data:'
   */
  isPossibleInscription(tx: Transaction) {
    const { input } = tx;
    const data = hexToString(input);
    const isData = data.startsWith('data:');
    // console.log(isData);
    return isData;
  }

  /**
   * Extracts inscription data from a transaction
   * @param tx Transaction containing inscription
   * @returns Decoded inscription data as string
   */
  getInscriptionData(tx: Transaction) {
    const { input } = tx;
    const data = hexToString(input);
    return data;
  }
}

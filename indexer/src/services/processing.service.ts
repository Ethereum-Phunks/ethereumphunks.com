import { Injectable, Logger } from '@nestjs/common';

import { Web3Service } from '@/services/web3.service';
import { SupabaseService } from '@/services/supabase.service';
import { TelegramService } from '@/modules/notifs/services/telegram.service';
import { DiscordService } from '@/modules/notifs/services/discord.service';

import { BridgeProcessingService } from '@/modules/queue/services/bridge-processing.service';
import { BlockProcessingService } from '@/modules/queue/services/block-processing.service';

import { UtilityService } from '@/utils/utility.service';
import { TimeService } from '@/utils/time.service';

import { esip1Abi, esip2Abi } from '@/abi/EthscriptionsProtocol';

import etherPhunksMarketProxyAbi from '@/abi/EtherPhunksMarketProxy.json';
import pointsAbi from '@/abi/Points.json';
import bridgeMainnetAbi from '@/abi/EtherPhunksBridgeMainnet.json';

import * as esips from '@/constants/EthscriptionsProtocol';

import { bridgeAddressMainnet, l1Chain, l1Client, marketAddress, pointsAddress } from '@/constants/ethereum';

import { Ethscription, Event, PhunkSha } from '@/models/db';

import { DecodeEventLogReturnType, FormattedTransaction, Log, Transaction, TransactionReceipt, decodeEventLog, hexToString, zeroAddress } from 'viem';

import { mkdir, writeFile } from 'fs/promises';

import crypto from 'crypto';

import dotenv from 'dotenv';
dotenv.config();

const SEGMENT_SIZE = 64;

@Injectable()
export class ProcessingService {

  startTime: Date;

  constructor(
    private readonly blockSvc: BlockProcessingService,
    private readonly bridgeSvc: BridgeProcessingService,
    private readonly web3Svc: Web3Service,
    private readonly sbSvc: SupabaseService,
    private readonly utilSvc: UtilityService,
    private readonly timeSvc: TimeService,
    private readonly telegramSvc: TelegramService,
    private readonly discordSvc: DiscordService,
  ) {}

  // Method to start fetching and processing blocks from the network
  async startBackfill(startBlock: number): Promise<void> {
    const latestBlock = await this.web3Svc.getBlock();
    const latestBlockNum = Number(latestBlock.number);

    console.log({ startBlock, latestBlockNum })

    if (startBlock > latestBlockNum) throw new Error('RPC Error: Start block is greater than latest block');

    while (startBlock < latestBlockNum) {
      await this.addBlockToQueue(startBlock, new Date().getTime());
      startBlock++;
    }
  }

  /**
   * Starts polling for new blocks and adds them to the queue.
   *
   * @returns A promise that resolves when the polling is started.
   * @throws If an error occurs while polling.
   */
  async startPolling(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Watch for new blocks and add them to the queue
      const unwatch = l1Client.watchBlocks({
        // blockTag: 'safe',
        emitMissed: true,
        includeTransactions: false,
        onBlock: async (block) => {
          try {
            const blockNum = Number(block.number);
            const timestamp = new Date(Number(block.timestamp) * 1000).getTime();
            await this.addBlockToQueue(blockNum, timestamp);
          } catch (error) {
            unwatch();
            reject(error); // Reject the promise on error
          }
        },
        onError: (error) => {
          console.log(error);
          unwatch(); // Unwatch the blocks
          reject(error); // Reject the promise on error
        }
      });
    });
  }

  /**
   * Processes a block by retrieving its transactions, processing them, and adding the events to the database.
   * Optionally, updates the last block in the database.
   *
   * @param blockNum - The number of the block to process.
   * @param updateBlockDb - Whether to update the last block in the database. Default is true.
   * @returns A Promise that resolves when the block processing is complete.
   */
  async processBlock(blockNum: number, updateBlockDb = true): Promise<void> {
    const { txns, createdAt } = await this.web3Svc.getBlockTransactions(blockNum);

    // Log the block
    const timeAgo = this.timeSvc.howLongAgo(createdAt as any);
    Logger.log(`Processing block ${blockNum} (${l1Chain}) ➖  ${timeAgo}`);

    // Process the transactions & get the events
    const events = await this.processTransactions(txns, createdAt);
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
      Logger.debug(`Retrying block ${blockNum} (${l1Chain})`);
      await this.utilSvc.delay(5000);
      // Get the transactions from the block
      const { txns, createdAt } = await this.web3Svc.getBlockTransactions(blockNum);
      await this.processTransactions(txns, createdAt);
    } catch (error) {
      console.log(error);
      // Pause for 10 seconds
      await this.utilSvc.delay(5000);
      // Retry the block
      return this.retryBlock(blockNum);
    }
  }

  /**
   * Adds a block to the processing queue.
   *
   * @param blockNum - The block number to add to the queue.
   * @param blockTimestamp - The timestamp of the block to add to the queue.
   * @returns A Promise that resolves when the block is added to the queue.
   */
  async addBlockToQueue(blockNum: number, blockTimestamp: number): Promise<void> {
    await this.blockSvc.addBlockToQueue(blockNum, blockTimestamp);
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
        this.telegramSvc.sendMessage(`Error processing transaction: ${transaction.hash}`);
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

    const { input } = transaction;

    // Skip any transaction that failed
    if (receipt.status !== 'success') return;

    const events: Event[] = [];

    // Get the data from the transaction
    // Remove null bytes from the string
    const stringData = hexToString(input.toString() as `0x${string}`);
    const cleanedString = stringData.replace(/\x00/g, '');
    if (cleanedString.startsWith('data:')) return [];

    // DISABLED: All 10,000 have been ethscribed
    // Check if possible ethPhunk creation
    const possibleEthPhunk =
      cleanedString.startsWith('data:image/svg+xml,') ||
      cleanedString.startsWith('data:image/png;base64,');

    if (possibleEthPhunk) {
      const sha = crypto.createHash('sha256').update(cleanedString).digest('hex');

      // Check if the sha exists in the phunks sha table
      const phunkSha = await this.sbSvc.checkIsEthPhunk(sha);
      if (!phunkSha) return;

      // Check if its a duplicate (already been inscribed)
      const isDuplicate = await this.sbSvc.checkEthscriptionExistsBySha(sha);
      if (isDuplicate) return

      Logger.debug('Processing ethscription', transaction.hash);
      const event = await this.processEtherPhunkCreationEvent(transaction as Transaction, createdAt, phunkSha);
      return [event];
    }

    // Check if possible transfer
    const possibleTransfer = input.substring(2).length === SEGMENT_SIZE;
    if (possibleTransfer) {
      // console.log({ possibleTransfer });
      Logger.debug(`Processing transfer (${l1Chain})`, transaction.hash);
      const event = await this.processTransferEvent(
        input,
        transaction as Transaction,
        createdAt
      );
      if (event) events.push(event);
    }

    // Check if possible batch transfer
    const possibleBatchTransfer = input.substring(2).length % SEGMENT_SIZE === 0;
    if (!possibleTransfer && possibleBatchTransfer) {
      // console.log({ possibleBatchTransfer });
      const eventArr = await this.processEsip5(
        transaction as Transaction,
        createdAt
      );
      if (eventArr?.length) events.push(...eventArr);
    }

    // Filter logs for ethscription transfers (esip1)
    const esip1Transfers = receipt.logs.filter(
      (log: any) => log.topics[0] === esips.TransferEthscriptionSignature
    );
    if (esip1Transfers.length) {
      Logger.debug(
        `Processing marketplace event (esip1) (${l1Chain})`,
        transaction.hash
      );
      const eventArr = await this.processEsip1(
        esip1Transfers,
        transaction,
        createdAt
      );
      this.discordSvc.postMessage(eventArr);
      if (eventArr?.length) events.push(...eventArr);
    }

    // Filter logs for ethscription transfers (esip2)
    const esip2Transfers = receipt.logs.filter(
      (log: any) => log.topics[0] === esips.TransferEthscriptionForPreviousOwnerSignature
    );
    if (esip2Transfers.length) {
      Logger.debug(
        `Processing marketplace event (esip2) (${l1Chain})`,
        transaction.hash
      );
      const eventArr = await this.processEsip2(esip2Transfers, transaction, createdAt);
      this.discordSvc.postMessage(eventArr);
      if (eventArr?.length) events.push(...eventArr);
    }

    // Filter logs for EtherPhunk Marketplace events
    const marketplaceLogs = receipt.logs.filter(
      (log: any) => marketAddress.filter(
        (addr) => addr.toLowerCase() === log.address.toLowerCase()
      )?.length
    );
    if (marketplaceLogs.length) {
      Logger.debug(
        `Processing EtherPhunk Marketplace event (${l1Chain})`,
        transaction.hash
      );
      const eventArr = await this.processEtherPhunkMarketplaceEvents(
        marketplaceLogs,
        transaction,
        createdAt
      );

      // Check if there are any events
      // If there aer no events, it means either:
      // 1. The listing was not created by the previous owner
      // 2. The listing was not removed
      if (!eventArr?.length) return events;
      events.push(...eventArr);
    }

    const bridgeMainnetLogs = receipt.logs.filter(
      (log: any) =>  log.address.toLowerCase() === bridgeAddressMainnet.toLowerCase()
    );
    if (bridgeMainnetLogs.length) {
      Logger.debug(
        `Processing Points event (${l1Chain})`,
        transaction.hash
      );
      await this.processBridgeMainnetEvents(bridgeMainnetLogs);
      return events;
    }

    const pointsLogs = receipt.logs.filter(
      (log: any) => pointsAddress.toLowerCase() === log.address.toLowerCase()
    );
    if (pointsLogs.length) {
      Logger.debug(
        `Processing Points event (${l1Chain})`,
        transaction.hash
      );
      await this.processPointsEvent(pointsLogs);
    }

    return events;
  }


  /**
   * Processes the EtherPhunk creation event.
   *
   * @param txn - The transaction object.
   * @param createdAt - The creation date of the transaction.
   * @param phunkShaData - The PhunkSha data.
   * @returns The processed event object.
   */
  async processEtherPhunkCreationEvent(
    txn: Transaction,
    createdAt: Date,
    phunkShaData: PhunkSha,
  ): Promise<Event> {
    const { from, to, hash: hashId } = txn;

    // Add the ethereum phunk
    await this.sbSvc.addEthPhunk(txn, createdAt, phunkShaData);
    Logger.log('Added eth phunk', `${hashId.toLowerCase()}`);

    return {
      txId: txn.hash.toLowerCase() + txn.transactionIndex,
      type: 'created',
      hashId: hashId.toLowerCase(),
      from: from.toLowerCase(),
      to: (to || zeroAddress).toLowerCase(),
      blockHash: txn.blockHash.toLowerCase(),
      txIndex: txn.transactionIndex,
      txHash: (txn.hash).toLowerCase(),
      blockNumber: Number(txn.blockNumber),
      blockTimestamp: createdAt,
      value: BigInt(0).toString(),
    };
  }

  /**
   * Processes the bridge mainnet (L1) events.
   *
   * @param bridgeMainnetLogs - An array of bridge mainnet logs.
   * @returns A promise that resolves to void.
   */
  async processBridgeMainnetEvents(bridgeMainnetLogs: any[]): Promise<void> {
    for (const log of bridgeMainnetLogs) {
      const decoded = decodeEventLog({
        abi: bridgeMainnetAbi,
        data: log.data,
        topics: log.topics,
      });

      const { eventName } = decoded;
      const { args } = decoded as any;

      if (!eventName || !args) return;

      if (eventName === 'HashLocked') {
        const { hashId, prevOwner } = args;
        const locked = await this.sbSvc.lockEthscription(hashId);
        if (!locked) throw new Error('Failed to lock ethscription');

        // Bridge the ethscription
        this.bridgeSvc.addBridgeToQueue(hashId, prevOwner);

        // args
        // address prevOwner,
        // bytes32 hashId,
        // uint256 nonce,
        // uint256 value
      }

      if (eventName === 'HashUnlocked') {
        const { hashId, prevOwner } = args;
        const locked = await this.sbSvc.unlockEthscription(hashId);
        if (locked) throw new Error('Failed to unlock ethscription');

        // args
        // address prevOwner,
        // bytes32 hashId
      }
    }
  }

  /**
   * Processes the points event logs and updates the users' points.
   * @param pointsLogs - An array of points event logs.
   * @returns A Promise that resolves when the processing is complete.
   */
  async processPointsEvent(pointsLogs: any[]): Promise<void> {

    const usersToUpdate = new Set<`0x${string}`>();

    for (const log of pointsLogs) {
      const decoded = decodeEventLog({
        abi: pointsAbi,
        data: log.data,
        topics: log.topics,
      });

      const { eventName } = decoded;
      const { args } = decoded as any;

      if (!eventName || !args) return;
      if (eventName === 'PointsAdded') {
        const { user, amount } = args;
        usersToUpdate.add(user);
      }
    }

    for (const user of usersToUpdate) {
      await this.distributePoints(user);
    }
  }

  /**
   * Distributes points to a user from a given address.
   * @param fromAddress The address from which the points will be distributed.
   * @returns A Promise that resolves when the points are successfully distributed.
   */
  async distributePoints(fromAddress: `0x${string}`): Promise<void> {
    try {
      const points = await this.web3Svc.getPoints(fromAddress);
      await this.sbSvc.updateUserPoints(fromAddress, Number(points));
      Logger.log(`Updated user points to ${points}`, fromAddress);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Processes a calldata transfer event.
   *
   * @param hashId - The hash ID of the event.
   * @param txn - The transaction object.
   * @param createdAt - The creation date of the event.
   * @param index - The optional index of the event.
   * @returns A Promise that resolves to the processed event or null if the event is not valid.
   */
  async processTransferEvent(
    hashId: string,
    txn: Transaction,
    createdAt: Date,
    index?: number
  ): Promise<Event | null> {
    const ethscript: Ethscription = await this.sbSvc.checkEthscriptionExistsByHashId(hashId);
    if (!ethscript) return null;

    const { from, to } = txn;
    const isMatchedHashId = ethscript.hashId.toLowerCase() === hashId.toLowerCase();
    const transferrerIsOwner = ethscript.owner.toLowerCase() === txn.from.toLowerCase();

    if (!isMatchedHashId || !transferrerIsOwner) return null;

    // Update the eth phunk owner
    await this.sbSvc.updateEthscriptionOwner(hashId, ethscript.owner, txn.to);
    Logger.log('Updated ethscript owner (transfer event)', `Hash: ${ethscript.hashId} -- To: ${to.toLowerCase()}`);

    return {
      txId: txn.hash + (index || txn.transactionIndex),
      type: 'transfer',
      hashId: ethscript.hashId.toLowerCase(),
      from: from.toLowerCase(),
      to: (to || zeroAddress).toLowerCase(),
      blockHash: txn.blockHash,
      txIndex: txn.transactionIndex,
      txHash: txn.hash,
      blockNumber: Number(txn.blockNumber),
      blockTimestamp: createdAt,
      value: txn.value.toString(),
    };
  }

  /**
   * Processes a contract transfer event.
   *
   * @param txn - The transaction object.
   * @param createdAt - The creation date of the event.
   * @param from - The address of the sender.
   * @param to - The address of the recipient.
   * @param hashId - The hash ID of the event.
   * @param log - The log object.
   * @param value - The value of the transfer (optional).
   * @param prevOwner - The previous owner of the event (optional).
   * @returns A Promise that resolves to an Event object or null.
   */
  async processContractTransferEvent(
    txn: Transaction,
    createdAt: Date,
    from: string,
    to: string,
    hashId: string,
    log: Log,
    value?: bigint,
    prevOwner?: string,
  ): Promise<Event | null> {
    const ethscript: Ethscription = await this.sbSvc.checkEthscriptionExistsByHashId(hashId);
    if (!ethscript) return null;

    const isMatchedHashId = ethscript.hashId.toLowerCase() === hashId.toLowerCase();
    const transferrerIsOwner = ethscript.owner.toLowerCase() === from.toLowerCase();

    const samePrevOwner = (ethscript.prevOwner && prevOwner)
      ? ethscript.prevOwner.toLowerCase() === prevOwner.toLowerCase()
      : true;

    if (!isMatchedHashId || !transferrerIsOwner || !samePrevOwner) return null;

    // Update the eth phunk owner
    await this.sbSvc.updateEthscriptionOwner(ethscript.hashId, ethscript.owner, to);
    Logger.log('Updated ethscript owner (contract event)', `Hash: ${ethscript.hashId} -- To: ${to.toLowerCase()}`);

    return {
      txId: txn.hash + (log?.logIndex || txn.transactionIndex || new Date().getTime()),
      type: 'transfer',
      hashId: ethscript.hashId.toLowerCase(),
      from: from.toLowerCase(),
      to: (to || zeroAddress).toLowerCase(),
      blockHash: txn.blockHash,
      txIndex: txn.transactionIndex,
      txHash: txn.hash,
      blockNumber: Number(txn.blockNumber),
      blockTimestamp: createdAt,
      value: value?.toString(),
    };
  }

  /**
   * Processes ESIP1 transfers and returns the corresponding events.
   *
   * @param ethscriptionTransfers - An array of ESIP1 transfer logs.
   * @param transaction - The transaction associated with the transfers.
   * @param createdAt - The creation date of the transaction.
   * @returns An array of events.
   */
  async processEsip1(
    ethscriptionTransfers: any[],
    transaction: Transaction,
    createdAt: Date
  ): Promise<Event[]> {

    const events = [];
    for (const log of ethscriptionTransfers) {
      const decoded = decodeEventLog({
        abi: esip1Abi,
        data: log.data,
        topics: log.topics,
      });

      const sender = log.address;
      const recipient = decoded.args['recipient'];
      const hashId = decoded.args['id'] || decoded.args['ethscriptionId'];

      const event = await this.processContractTransferEvent(
        transaction,
        createdAt,
        sender,
        recipient,
        hashId,
        log,
        transaction.value,
        null,
      );
      if (event) events.push(event);
    }

    return events;
  }

  /**
   * Processes the ESIP2 events and returns an array of Event objects.
   *
   * @param previousOwnerTransfers - An array of previous owner transfers.
   * @param transaction - The transaction object.
   * @param createdAt - The creation date of the transaction.
   * @returns A promise that resolves to an array of Event objects.
   */
  async processEsip2(
    previousOwnerTransfers: any[],
    transaction: Transaction,
    createdAt: Date
  ): Promise<Event[]> {

    const events = [];
    for (const log of previousOwnerTransfers) {
      const decoded = decodeEventLog({
        abi: esip2Abi,
        data: log.data,
        topics: log.topics,
      });

      const sender = log.address;
      const prevOwner = decoded.args['previousOwner'];
      const recipient = decoded.args['recipient'];
      const hashId = decoded.args['id'] || decoded.args['ethscriptionId'];

      const event = await this.processContractTransferEvent(
        transaction,
        createdAt,
        sender,
        recipient,
        hashId,
        log,
        transaction.value,
        prevOwner
      );

      if (event) events.push(event);
    }

    return events;
  }

  /**
   * Processes an ESIP5 (batch calldata) transaction and returns the corresponding events.
   * @param txn - The transaction to process.
   * @param createdAt - The creation date of the transaction.
   * @returns A promise that resolves to an array of events.
   */
  async processEsip5(
    txn: Transaction,
    createdAt: Date
  ): Promise<Event[]> {
    const { input } = txn;
    const data = input.substring(2);
    if (data.length % SEGMENT_SIZE !== 0) return [];

    const allHashes = data.match(/.{1,64}/g).map((hash) => '0x' + hash);
    const validHashes = await this.web3Svc.getValidTransactions(allHashes);
    if (!validHashes.length) return [];

    const events = [];
    Logger.debug(`Processing batch transfer (${l1Chain})`, txn.hash);
    for (let i = 0; i < validHashes.length; i++) {
      try {
        const hashId = validHashes[i].toLowerCase();
        const event = await this.processTransferEvent(hashId, txn, createdAt, i);
        if (event) events.push(event);
      } catch (error) {
        console.log(error);
      }
    }
    return events;
  }

  /**
   * Processes the EtherPhunk marketplace contract events.
   *
   * @param marketplaceLogs - The array of marketplace logs.
   * @param transaction - The transaction object.
   * @param createdAt - The creation date of the events.
   * @returns A promise that resolves to an array of events.
   */
  async processEtherPhunkMarketplaceEvents(
    marketplaceLogs: any[],
    transaction: Transaction,
    createdAt: Date
  ): Promise<Event[]> {

    const events = [];
    for (const log of marketplaceLogs) {
      if (!marketAddress.includes(log.address?.toLowerCase())) continue;

      let decoded: DecodeEventLogReturnType;
      try {
        decoded = decodeEventLog({
          abi: etherPhunksMarketProxyAbi,
          data: log.data,
          topics: log.topics,
        });
      } catch (error) {
        console.log(error);
        continue;
      }

      const event = await this.processEtherPhunkMarketplaceEvent(
        transaction,
        createdAt,
        decoded,
        log
      );

      if (event) events.push(event);
    }

    return events;
  }

  /**
   * Processes an individual EtherPhunk marketplace event.
   *
   * @param txn - The transaction object.
   * @param createdAt - The timestamp when the event was created.
   * @param decoded - The decoded event log.
   * @param log - The log object.
   * @returns A promise that resolves to an Event object.
   */
  async processEtherPhunkMarketplaceEvent(
    txn: Transaction,
    createdAt: Date,
    decoded: DecodeEventLogReturnType,
    log: Log
  ): Promise<Event> {
    const { eventName } = decoded;
    const { args } = decoded as any;

    if (!eventName || !args) return;

    const hashId =
      args.id ||
      args.phunkId ||
      args.potentialEthscriptionId;

    if (!hashId) return;

    const phunk = await this.sbSvc.checkEthscriptionExistsByHashId(hashId);
    if (!phunk) return;

    if (eventName === 'PhunkBought') {
      const { phunkId: hashId, fromAddress, toAddress, value } = args;

      const removedListing = await this.sbSvc.removeListing(hashId);
      if (!removedListing) return;

      return {
        txId: txn.hash + log.logIndex,
        type: eventName,
        hashId: hashId.toLowerCase(),
        from: fromAddress.toLowerCase(),
        to: toAddress.toLowerCase(),
        blockHash: txn.blockHash,
        txIndex: txn.transactionIndex,
        txHash: txn.hash,
        blockNumber: Number(txn.blockNumber),
        blockTimestamp: createdAt,
        value: value.toString(),
      };
    }

    if (eventName === 'PhunkNoLongerForSale') {
      const { phunkId: hashId } = args;

      const removedListing = await this.sbSvc.removeListing(hashId);
      if (!removedListing) return;

      if (txn.from === phunk.prevOwner) {
        return {
          txId: txn.hash + log.logIndex,
          type: eventName,
          hashId: hashId.toLowerCase(),
          from: txn.from?.toLowerCase(),
          to: zeroAddress,
          blockHash: txn.blockHash,
          txIndex: txn.transactionIndex,
          txHash: txn.hash,
          blockNumber: Number(txn.blockNumber),
          blockTimestamp: createdAt,
          value: BigInt(0).toString(),
        };
      }
    }

    if (eventName === 'PhunkOffered') {
      const { phunkId: hashId, toAddress, minValue } = args;

      // We do this here because this event is emitted after
      // transfer of ownership. If the listing was NOT created
      // by the previous owner, we should ignore it.
      if (phunk.prevOwner && (phunk.prevOwner !== txn.from)) {

        // Write the failed listing to a file
        try { await mkdir('./failed'); } catch (error) {}
        await writeFile(`./failed/${hashId}.json`, JSON.stringify({ txn: txn.hash, phunk }));
        Logger.error('Listing not created by previous owner', `${hashId.toLowerCase()}`);

        // Since this listing will STILL overwrite existing listings
        // on the smart contract, we must delete it from the database
        await this.sbSvc.removeListing(hashId);
        return;
      }

      // console.log({ hashId, toAddress, minValue });

      await this.sbSvc.createListing(txn, createdAt, hashId, toAddress, minValue);
      return {
        txId: txn.hash + log.logIndex,
        type: eventName,
        hashId: hashId.toLowerCase(),
        from: txn.from?.toLowerCase(),
        to: toAddress?.toLowerCase(),
        blockHash: txn.blockHash,
        txIndex: txn.transactionIndex,
        txHash: txn.hash,
        blockNumber: Number(txn.blockNumber),
        blockTimestamp: createdAt,
        value: minValue.toString(),
      };
    }
  }
}

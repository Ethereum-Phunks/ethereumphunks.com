import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { SupabaseService } from '@/services/supabase.service';
import { DataService } from '@/services/data.service';
import { UtilityService } from '@/modules/shared/services/utility.service';
import { Web3Service } from '@/modules/shared/services/web3.service';

import { BridgeProcessingQueue } from '@/modules/queue/queues/bridge-processing.queue';

import { esip1Abi, esip2Abi } from '@/abi/EthscriptionsProtocol';
import * as esips from '@/constants/esips';

import { bridgeAbiL1, chain, marketAbiL1, marketAddressL1, pointsAbiL1, pointsAddressL1 } from '@/constants/ethereum';

import { AttributeItem, Ethscription, Event } from '@/models/db';

import { DecodeEventLogReturnType, Log, Transaction, TransactionReceipt, decodeEventLog, hexToString, zeroAddress } from 'viem';

import { mkdir, writeFile } from 'fs/promises';
import { createHash } from 'crypto';


@Injectable()
export class EthscriptionsService {

  constructor(
    @Optional() private readonly bridgeQueue: BridgeProcessingQueue,
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    @Inject('WEB3_SERVICE_L2') private readonly web3SvcL2: Web3Service,
    private readonly sbSvc: SupabaseService,
    private readonly dataSvc: DataService,
    private readonly utilitySvc: UtilityService
  ) {}

  async addEthscription(body: { hash: string, attributes: AttributeItem }): Promise<any> {

    let { hash, attributes } = body;

    const transaction = await this.web3SvcL1.getTransaction(hash as `0x${string}`)
    const block = await this.web3SvcL1.getBlock({ blockNumber: Number(transaction.blockNumber) });
    const timestamp = new Date(Number(block.timestamp) * 1000);

    const { input } = transaction;

    // Make sure its an ethscription
    const stringData = hexToString(input.toString() as `0x${string}`);
    const cleanedString = stringData.replace(/\x00/g, '');
    if (!cleanedString.startsWith('data:')) return [];

    // Create sha and check if it exists
    const sha = createHash('sha256').update(cleanedString).digest('hex');
    const [ existsLocal, existsGlobal ] = await Promise.all([
      this.sbSvc.checkEthscriptionExistsBySha(sha),
      this.dataSvc.getEthscriptionByHashId(hash)
    ]);

    // Only process ones that don't already exist locally
    if (existsLocal) return;

    // Only process ones that already exist globally (ethscriptions)
    if (!existsGlobal) return;

    // Set the sha
    attributes.sha = sha;

    // Mime type
    const base64Header = cleanedString.split(',')[0];
    const mimeType = base64Header.match(/data:([^;]*);?/)[1];

    // Create image buffer from data uri
    const imageBuffer = Buffer.from(cleanedString.split(',')[1], 'base64');

    // Upload image to storage bucket
    await this.sbSvc.uploadImage(sha, imageBuffer, mimeType);

    const event = await this.processEtherPhunkCreationEvent(transaction, timestamp, attributes);
    if (event) await this.sbSvc.addEvents([event]);
  }

  /**
   * Processes the ethscriptions for a given transaction.
   *
   * @param transaction - The transaction object.
   * @param receipt - The transaction receipt object.
   * @param createdAt - The creation date of the transaction.
   * @returns An array of events generated from the transaction.
   */
  async processEthscriptionsEvents(
    transaction: Transaction,
    receipt: TransactionReceipt,
    createdAt: Date
  ) {
    const { input } = transaction;
    const events: Event[] = [];

    // Get the data from the transaction
    // Remove null bytes from the string
    const stringData = hexToString(input.toString() as `0x${string}`);
    const cleanedString = stringData.replace(/\x00/g, '');

    // DISABLED: All 10,000 have been ethscribed
    if (cleanedString.startsWith('data:')) {
      // console.log({ cleanedString });
    }

    // Check if possible ethPhunk creation
    const possibleEthPhunk =
      cleanedString.startsWith('data:image/svg+xml,') ||
      cleanedString.startsWith('data:image/png;base64,');

    if (possibleEthPhunk) {
      const sha = createHash('sha256').update(cleanedString).digest('hex');
      console.log({ sha });

      // Check if the sha exists in the phunks sha table
      const phunkSha = await this.sbSvc.checkIsEthPhunk(sha);
      console.log({ phunkSha });
      if (!phunkSha) return;


      // Check if its a duplicate (already been inscribed)
      const isDuplicate = await this.sbSvc.checkEthscriptionExistsBySha(sha);
      if (isDuplicate) return

      Logger.debug(
        'Processing ethscription',
        transaction.hash
      );
      const event = await this.processEtherPhunkCreationEvent(transaction as Transaction, createdAt, phunkSha);
      return [event];
    }

    // Check if possible transfer
    const possibleTransfer = this.utilitySvc.possibleTransfer(input);
    if (possibleTransfer) {
      const event = await this.processTransferEvent(
        input,
        transaction as Transaction,
        createdAt
      );
      if (event) events.push(event);
    }

    // Check if possible batch transfer
    const possibleBatchTransfer = this.utilitySvc.possibleBatchTransfer(input);
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
        `Processing marketplace event (ESIP1)`,
        transaction.hash
      );
      const eventArr = await this.processEsip1(
        esip1Transfers,
        transaction,
        createdAt
      );
      if (eventArr?.length) events.push(...eventArr);
    }

    // Filter logs for ethscription transfers (esip2)
    const esip2Transfers = receipt.logs.filter(
      (log: any) => log.topics[0] === esips.TransferEthscriptionForPreviousOwnerSignature
    );
    if (esip2Transfers.length) {
      Logger.debug(
        `Processing marketplace event (ESIP2)`,
        transaction.hash
      );
      const eventArr = await this.processEsip2(esip2Transfers, transaction, createdAt);
      if (eventArr?.length) events.push(...eventArr);
    }

    // console.log(receipt);

    // Filter logs for EtherPhunk Marketplace events
    const marketplaceLogs = receipt.logs.filter(
      (log: any) => log.address.toLowerCase() === marketAddressL1.toLowerCase()
    );
    if (marketplaceLogs.length) {
      Logger.debug(
        `Processing EtherPhunk Marketplace event (L1)`,
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

    // const bridgeMainnetLogs = receipt.logs.filter(
    //   (log: any) => log.address.toLowerCase() === bridgeAddressL1.toLowerCase()
    // );
    // if (bridgeMainnetLogs.length) {
    //   Logger.debug(
    //     `Processing Points event (${chain})`,
    //     transaction.hash
    //   );
    //   await this.processBridgeMainnetEvents(bridgeMainnetLogs);
    //   return events;
    // }

    const pointsLogs = receipt.logs.filter(
      (log: any) => log.address.toLowerCase() === pointsAddressL1.toLowerCase()
    );
    if (pointsLogs.length) {
      Logger.debug(
        `Processing Points event (${chain})`,
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
    attributesData: AttributeItem,
  ): Promise<Event> {
    const { from, to, hash: hashId } = txn;

    // Add the ethereum phunk
    await this.sbSvc.addEthscription(txn, createdAt, attributesData);
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
        abi: bridgeAbiL1,
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
        this.bridgeQueue.addHashLockedToQueue(hashId, prevOwner);

        // args
        // address prevOwner,
        // bytes32 hashId,
        // uint256 nonce,
        // uint256 value
      }

      if (eventName === 'HashUnlocked') {
        const { hashId, prevOwner } = args;
        // const locked = await this.sbSvc.unlockEthscription(hashId);
        // if (locked) throw new Error('Failed to unlock ethscription');

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
        abi: pointsAbiL1,
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
  async distributePoints(
    fromAddress: `0x${string}`,
    layer: 'l1' | 'l2' = 'l1'
  ): Promise<void> {
    try {
      const points = layer === 'l1' ?
        await this.web3SvcL1.getPoints(fromAddress) :
        await this.web3SvcL2.getPoints(fromAddress);

      await this.sbSvc.updateUserPoints(fromAddress, Number(points));
      Logger.log(
        `Updated user points for ${points.toString()}`,
        fromAddress
      );
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
    // console.log({ethscript})
    if (!ethscript) return null;

    const { from, to } = txn;
    const isMatchedHashId = ethscript.hashId.toLowerCase() === hashId.toLowerCase();
    const transferrerIsOwner = ethscript.owner.toLowerCase() === txn.from.toLowerCase();

    // console.log({ isMatchedHashId, transferrerIsOwner, ethscript })

    if (!isMatchedHashId || !transferrerIsOwner) return null;

    Logger.debug(
      `Processing transfer (L1)`,
      txn.hash
    );

    // Update the eth phunk owner
    await this.sbSvc.updateEthscriptionOwner(hashId, ethscript.owner, txn.to);
    Logger.log(
      `Updated ethscript owner to ${txn.to} (transfer event)`,
      ethscript.hashId
    );

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

    // console.log({ isMatchedHashId, transferrerIsOwner, ethscript });

    const samePrevOwner = (ethscript.prevOwner && prevOwner)
      ? ethscript.prevOwner.toLowerCase() === prevOwner.toLowerCase()
      : true;

    if (!isMatchedHashId || !transferrerIsOwner || !samePrevOwner) return null;

    // Update the eth phunk owner
    await this.sbSvc.updateEthscriptionOwner(ethscript.hashId, ethscript.owner, to);
    Logger.log(
      `Updated ethscript owner to ${to} (contract event)`,
      ethscript.hashId
    );

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
   * Processes an ESIP5 (batch transfer) transaction and returns the corresponding events.
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
    if (!this.utilitySvc.possibleBatchTransfer(input)) return [];

    const allHashes = data.match(/.{1,64}/g).map((hash) => '0x' + hash);
    // console.log(allHashes.length);
    const validItems = await this.sbSvc.checkEthscriptionsExistsByHashIds(allHashes);

    if (!validItems?.length) return [];
    const validHashes = validItems.map((item) => item.hashId);

    const events = [];
    Logger.debug(
      `Processing batch transfer (L1)`,
      txn.hash
    );

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
      if (!marketAddressL1.includes(log.address?.toLowerCase())) continue;

      let decoded: DecodeEventLogReturnType;
      try {
        decoded = decodeEventLog({
          abi: marketAbiL1,
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
        Logger.error(
          'Listing not created by previous owner',
          hashId
        );

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

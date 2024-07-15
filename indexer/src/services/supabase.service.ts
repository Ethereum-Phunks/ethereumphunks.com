import { Injectable, Logger } from '@nestjs/common';

import { createClient } from '@supabase/supabase-js';

import { Transaction, hexToString, zeroAddress } from 'viem';
import { writeFile } from 'fs/promises';

import {
  Event,
  UserResponse,
  EventType,
  EventResponse,
  User,
  ListingResponse,
  Bid,
  BidResponse,
  EthscriptionResponse,
  Ethscription,
  AttributeItem,
  AttributesResponse,
} from '@/models/db';

import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, serviceRole);

@Injectable()
export class SupabaseService {
  suffix = process.env.CHAIN_ID === '1' ? '' : '_sepolia';

  async updateLastBlock(blockNumber: number, createdAt: Date): Promise<void> {
    const response = await supabase
      .from('blocks')
      .upsert({
        network: process.env.CHAIN_ID,
        blockNumber,
        createdAt,
      });

    const { error } = response;
    if (error) throw error;
  }

  async getLastBlock(network: number): Promise<any> {
    const response = await supabase
      .from('blocks')
      .select('*')
      .eq('network', network);

    const { data, error } = response;
    if (error) throw error;
    if (data?.length) return data[0]?.blockNumber - 10;
    return null;
  }

  async removeBid(hashId: string): Promise<void> {
    const response: ListingResponse = await supabase
      .from('bids' + this.suffix)
      .delete()
      .eq('hashId', hashId);
    const { error } = response;
    if (error) return Logger.error(error.details, error.message);
    Logger.log('Removed bid', hashId);
  }

  async createBid(
    txn: Transaction,
    createdAt: Date,
    hashId: string,
    fromAddress: string,
    value: bigint
  ): Promise<void> {
    const response: ListingResponse = await supabase
      .from('bids' + this.suffix)
      .upsert({
        createdAt,
        hashId,
        value: value.toString(),
        fromAddress: fromAddress.toLowerCase(),
        txHash: txn.hash.toLowerCase(),
      });

    const { error } = response;
    if (error) return Logger.error(error.details, error.message);
    Logger.log('Created bid', hashId);
  }

  async getBid(hashId: string): Promise<Bid> {
    const response: BidResponse = await supabase
      .from('bids' + this.suffix)
      .select('*')
      .eq('hashId', hashId);

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0] as Bid;
    return null;
  }

  async createListing(
    txn: Transaction,
    createdAt: Date,
    hashId: string,
    toAddress: string,
    minValue: bigint,
    l2: boolean = false
  ): Promise<void> {
    const response: ListingResponse = await supabase
      .from('listings' + this.suffix)
      .upsert({
        hashId,
        createdAt,
        txHash: txn.hash.toLowerCase(),
        listed: true,
        minValue: minValue.toString(),
        listedBy: txn.from.toLowerCase(),
        toAddress: toAddress.toLowerCase(),
        l2,
      });

    const { error } = response;
    if (error) return Logger.error(error.details, error.message);
    Logger.log(
      'Listing created',
      hashId
    );
  }

  async removeListing(hashId: string): Promise<boolean> {

    const listing = await this.getListing(hashId);
    if (!listing) return false;

    const response: ListingResponse = await supabase
      .from('listings' + this.suffix)
      .delete()
      .eq('hashId', hashId)

    const { data, error } = response;
    if (error) throw error;

    Logger.log(
      'Removed listing',
      hashId
    );
    return true;
  }

  async updateListing() {}

  ////////////////////////////////////////////////////////////////////////////////
  // Checks //////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async checkIsEthPhunk(sha: string): Promise<AttributeItem | null> {
    const response: AttributesResponse = await supabase
      .from('attributes')
      .select('*')
      .eq('sha', sha);

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0];
    return null;
  }

  async checkEthscriptionExistsBySha(sha: string): Promise<boolean> {
    const response: EthscriptionResponse = await supabase
      .from('ethscriptions' + this.suffix)
      .select('*')
      .eq('sha', sha);

    const { data, error } = response;

    if (error) throw error;
    if (!data?.length) return false;
    return true;
  }

  async checkEthscriptionExistsByHashId(hash: string): Promise<Ethscription> {
    const response: EthscriptionResponse = await supabase
      .from('ethscriptions' + this.suffix)
      .select('*')
      .eq('hashId', hash?.toLowerCase());

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0];
    return null;
  }

  async checkEthscriptionsExistsByHashIds(hashes: string[]): Promise<Ethscription[]> {
    if (!hashes.length) return null;

    // We check these in batches of 100
    const batchSize = 100;
    let results: Ethscription[] = [];

    for (let i = 0; i < hashes.length; i += batchSize) {
      const batch = hashes.slice(i, i + batchSize);

      const response: EthscriptionResponse = await supabase
        .from('ethscriptions' + this.suffix)
        .select('*')
        .in('hashId', batch.map((hash) => hash.toLowerCase()));

      const { data, error } = response;
      // console.log({ data, error });

      if (error) throw error;
      if (data?.length) results = results.concat(data);
    }

    return results.length ? results : null;
  }

  // async checkEthscriptionsExistsByHashIds(hashes: string[]): Promise<Ethscription[]> {
  //   if (!hashes.length) return null;

  //   const response: EthscriptionResponse = await supabase
  //     .from('ethscriptions' + this.suffix)
  //     .select('*')
  //     .in('hashId', hashes.map((hash) => hash.toLowerCase()));

  //   const { data, error } = response;

  //   if (error) throw error;
  //   if (data?.length) return data;
  //   return null;
  // }

  ////////////////////////////////////////////////////////////////////////////////
  // Storage /////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async uploadImage(
    sha: string,
    imageBuffer: Buffer,
    contentType: string
  ): Promise<{ path: string }> {
    const { data, error } = await supabase.storage
      .from('images')
      .upload(`${sha}.${contentType.split('/')[1]}`, imageBuffer, {
        contentType,
      });

    if (error) console.error('Error uploading image:', error);
    return data;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Adds ////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async addEthscription(
    txn: Transaction,
    createdAt: Date,
    attributesData: AttributeItem,
  ): Promise<void> {

    // Get or create the users
    if (txn.from.toLowerCase() === txn.to.toLowerCase()) {
      await this.getOrCreateUser(txn.from, createdAt);
    } else {
      await Promise.all([
        this.getOrCreateUser(txn.from, createdAt),
        this.getOrCreateUser(txn.to, createdAt)
      ]);
    }

    const { error }: EthscriptionResponse = await supabase
      .from('ethscriptions' + this.suffix)
      .insert([
        {
          createdAt,
          creator: txn.from.toLowerCase(),
          prevOwner: txn.from.toLowerCase(),
          owner: txn.to.toLowerCase(),
          hashId: txn.hash.toLowerCase(),
          sha: attributesData.sha,
          slug: attributesData.slug,
          tokenId: attributesData.tokenId,
        },
      ]);

    if (error) throw error.message;
    Logger.log('Ethscription created', txn.hash.toLowerCase());

    const { error: attributesError }: AttributesResponse = await supabase
      .from('attributes')
      .insert([attributesData]);

    if (attributesError) console.log(attributesError.message);
    Logger.log('Attributes created', txn.hash.toLowerCase());
  }

  async addEvent(
    txn: Transaction,
    from: string,
    to: string,
    hashId: string,
    type: EventType,
    createdAt: Date,
    value: bigint,
    logIndex: number
  ): Promise<void> {

    // Get or create the users
    if (from.toLowerCase() === to.toLowerCase()) await this.getOrCreateUser(from, createdAt);
    else {
      await Promise.all([
        this.getOrCreateUser(from, createdAt),
        this.getOrCreateUser(to, createdAt)
      ]);
    }

    const txId = `${txn.hash.toLowerCase()}-${logIndex}`;
    const response: EthscriptionResponse = await supabase
      .from('events' + this.suffix)
      .upsert({
        txId,
        blockTimestamp: createdAt,
        type,
        value: value.toString(),
        hashId: hashId.toLowerCase(),
        from: from.toLowerCase(),
        to: (to || zeroAddress).toLowerCase(),
        blockNumber: Number(txn.blockNumber),
        blockHash: txn.blockHash.toLowerCase(),
        txIndex: Number(txn.transactionIndex),
        txHash: txn.hash.toLowerCase(),
      }, {
        ignoreDuplicates: true,
      });

    const { error } = response;
    if (error) Logger.error(error.message, txn.hash.toLowerCase());
    Logger.log('Event created', txn.hash.toLowerCase());
  }

  async addEvents(events: Event[]): Promise<void> {

    events = events.map((event, i) => {
      event.txId = `${event.txHash.toLowerCase()}-${event.txIndex}-${i}`;
      event.from = event.from.toLowerCase();
      event.to = event.to.toLowerCase();
      event.txHash = event.txHash.toLowerCase();
      event.hashId = event.hashId.toLowerCase();
      return event;
    });

    const response: EventResponse = await supabase
      .from('events' + this.suffix)
      .upsert(events, {
        ignoreDuplicates: true,
      });

    const { error } = response;
    if (error) throw error.message;
    Logger.log(
      `${events.length} events added (L1)`,
      `Block ${events[0].blockNumber.toString()}`
    );
  }

  async getOrCreateUser(address: string, createdAt?: Date): Promise<User> {
    if (!address) return null;

    const response: UserResponse = await supabase
      .from('users' + this.suffix)
      .select('*')
      .eq('address', address.toLowerCase());

    const { data, error } = response;
    // console.log({ data, error });

    if (error) throw error;
    if (data.length) return data[0];

    const newUserResponse: UserResponse = await supabase
      .from('users' + this.suffix)
      .insert({
        address: address.toLowerCase(),
        createdAt: createdAt || new Date()
      })
      .select();

    const { data: newUser, error: newError } = newUserResponse;
    // console.log({ newUser, newError });

    if (newError) throw newError.message;
    Logger.log('User created', address);
    if (newUser?.length) return newUser[0];
  }

  async getCollectionBySlug(slug: string): Promise<any> {
    const response = await supabase
      .from('collections' + this.suffix)
      .select('*')
      .eq('slug', slug);

    const { data, error } = response;
    if (error) throw error;
    if (data?.length) return data[0];
    return null;
  }

  async getAttributesFromSha(sha: string): Promise<any> {
    const response = await supabase
      .from('attributes')
      .select('*')
      .eq('sha', sha);

    const { data, error } = response;
    if (error) throw error;
    if (data?.length) return data[0];
    return null;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Updates /////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async updateEthscriptionOwner(
    hashId: string,
    prevOwner: string,
    newOwner: string
  ): Promise<void> {

    // Get or create the users
    await this.getOrCreateUser(newOwner);

    const response: EthscriptionResponse = await supabase
      .from('ethscriptions' + this.suffix)
      .update({
        owner: newOwner.toLowerCase(),
        prevOwner: prevOwner.toLowerCase(),
      })
      .eq('hashId', hashId);

    const { error } = response;
    if (error) throw error;
  }

  async updateEvent(eventId: number, data: any): Promise<void> {
    const response: EventResponse = await supabase
      .from('events' + this.suffix)
      .update(data)
      .eq('txId', eventId);

    const { error } = response;
    if (error) throw error;
  }

  async updateUserPoints(address: string, points: number): Promise<void> {
    const response: UserResponse = await supabase
      .from('users' + this.suffix)
      .update({ points })
      .eq('address', address.toLowerCase());

    const { error } = response;
    if (error) throw error;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Auction House ///////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async createAuction(
    args: {
      hashId: string,
      owner: string,
      auctionId: bigint,
      startTime: bigint,
      endTime: bigint
    },
    createdAt: Date
  ): Promise<void> {
    const { data, error } = await supabase
      .from('auctions' + this.suffix)
      .upsert({
        auctionId: Number(args.auctionId),
        createdAt,
        hashId: args.hashId.toLowerCase(),
        prevOwner: args.owner.toLowerCase(),
        amount: '0',
        startTime: new Date(Number(args.startTime) * 1000),
        endTime: new Date(Number(args.endTime) * 1000),
        bidder: zeroAddress.toLowerCase(),
        settled: false,
      });

    if (error) throw error;
    Logger.log('Auction created', args.hashId);

    return data;
  }

  async createAuctionBid(
    args: {
      hashId: string,
      auctionId: bigint,
      sender: string,
      value: bigint,
      extended: boolean
    },
    txn: Transaction,
    createdAt: Date
  ): Promise<void> {
    const { data: auctionsData, error: auctionsError } = await supabase
      .from('auctions' + this.suffix)
      .update({
        amount: args.value.toString(),
        bidder: args.sender.toLowerCase()
      })
      .eq('auctionId', Number(args.auctionId));

    if (auctionsData) throw auctionsError;

    const { data: bidsData, error: bidsError } = await supabase
      .from('auctionBids' + this.suffix)
      .insert({
        auctionId: Number(args.auctionId),
        createdAt: createdAt,
        fromAddress: args.sender.toLowerCase(),
        amount: args.value.toString(),
        txHash: txn.hash.toLowerCase(),
      });

    if (bidsData) throw bidsError;
    Logger.log(`Bid created`, args.hashId);
  }

  async settleAuction(
    args: {
      hashId: string,
      auctionId: bigint,
      winner: string,
      amount: bigint
    }
  ): Promise<void> {
    const { data, error } = await supabase
      .from('auctions' + this.suffix)
      .update({
        settled: true,
      })
      .eq('hashId', args.hashId.toLowerCase());

    if (error) throw error;
    Logger.log(`Auction settled`, args.hashId);
  }

  async extendAuction(
    args: {
      hashId: string,
      auctionId: bigint,
      endTime: bigint
    }
  ): Promise<void> {
    const { data, error } = await supabase
      .from('auctions' + this.suffix)
      .update({
        endTime: new Date(Number(args.endTime) * 1000),
      })
      .eq('auctionId', Number(args.auctionId));

    if (error) throw error;
    Logger.log(`Auction extended`, args.hashId);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Gets ////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async getEthscriptionByTokenId(tokenId: string): Promise<Ethscription> {
    const response: EthscriptionResponse = await supabase
      .from('ethscriptions' + this.suffix)
      .select('*')
      .eq('tokenId', tokenId);

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0];
  }

  async getListing(hashId: string): Promise<any> {
    const response = await supabase
      .from('listings' + this.suffix)
      .select('*')
      .eq('hashId', hashId);

    const { data, error } = response;
    if (error) throw error;
    if (data?.length) return data[0];
    return null;
  }

  async getAllTransfers(): Promise<Event[]> {
    const response: EventResponse = await supabase
      .from('events' + this.suffix)
      .select('*')
      .eq('type', 'transfer');

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data;
  }

  async getAllEthPhunks(): Promise<void> {
    let allPhunks: any[] = [];
    const pageSize = 1000; // Max rows per request
    let hasMore = true;
    let page = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from('ethscriptions' + this.suffix)
        .select('hashId')
        .order('tokenId', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching data:', error);
        throw error;
      }

      if (data) {
        allPhunks = allPhunks.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    const cleanPhunks = allPhunks.map((phunk) => phunk.hashId);

    // const tree = StandardMerkleTree.of(cleanPhunks, ["bytes32"]);
    // console.log('Merkle Root:', tree.root);

    await writeFile('tree.json', JSON.stringify(cleanPhunks));
  }

  async getUnminted(): Promise<void> {
    let allPhunks: any[] = [];
    const pageSize = 1000; // Max rows per request
    let hasMore = true;
    let page = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from('phunks_sepolia')
        // .select('hashId')
        .select('phunkId')
        .order('phunkId', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching data:', error);
        throw error;
      }

      if (data) {
        allPhunks = allPhunks.concat(data);
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    const sorted = allPhunks.sort((a, b) => Number(a.phunkId) - Number(b.phunkId));
    let i = 0;
    let unminted = [];

    sorted.forEach((phunk) => {
        let currentId = Number(phunk.phunkId);
        while (i < currentId) {
            unminted.push(i);
            i++;
        }
        i = currentId + 1;
    });

    console.log(JSON.stringify(sorted));
    console.log(JSON.stringify(unminted));

    // const cleanPhunks = allPhunks.map((phunk) => phunk.hashId);

    // const tree = StandardMerkleTree.of(cleanPhunks, ["bytes32"]);
    // console.log('Merkle Root:', tree.root);

    // await writeFile('tree.json', JSON.stringify(cleanPhunks));
  }

  async getEventByHashId(hashId: string): Promise<Event> {
    const response: EventResponse = await supabase
      .from('events' + this.suffix)
      .select('*')
      .order('blockTimestamp', { ascending: false })
      .eq('hashId', hashId.toLowerCase());

    const { data, error } = response;

    if (error) throw error;
    if (data?.length) return data[0];
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Bridge //////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async lockEthscription(hashId: string): Promise<boolean> {
    const response: EthscriptionResponse = await supabase
      .from('ethscriptions' + this.suffix)
      .update({
        locked: true,
      })
      .eq('hashId', hashId.toLowerCase())
      .select();

    const { data, error } = response;
    if (error) throw error;
    return data[0].locked;
  }

  async unlockEthscription(hashId: string): Promise<boolean> {
    const response: EthscriptionResponse = await supabase
      .from('ethscriptions' + this.suffix)
      .update({
        locked: false,
      })
      .eq('hashId', hashId.toLowerCase())
      .select();

    const { data, error } = response;
    if (error) throw error;
    return data[0].locked;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // L2 //////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  async addNftL2(
    tokenId: number,
    owner: string,
    hashId: string,
  ): Promise<void> {
    const response: EventResponse = await supabase
      .from('nfts' + this.suffix)
      .upsert({
        tokenId,
        owner: owner.toLowerCase(),
        hashId: hashId.toLowerCase(),
      });

    const { error } = response;
    if (error) throw error;
  }

  async updateNftL2(tokenId: number, owner: string): Promise<void> {
    const response: EventResponse = await supabase
      .from('nfts' + this.suffix)
      .update({ owner: owner.toLowerCase() })
      .eq('tokenId', tokenId);

    const { error } = response;
    if (error) throw error;
  }

  async removeNftL2(tokenId: number, hashId: string): Promise<void> {
    const response: EventResponse = await supabase
      .from('nfts' + this.suffix)
      .delete()
      .eq('hashId', hashId)
      .eq('tokenId', tokenId);

    const { error } = response;
    if (error) throw error;
  }

  async addEventL2(event: any): Promise<void> {
    const response: EventResponse = await supabase
      .from('l2_events' + this.suffix)
      .upsert(event);

    const { error } = response;
    if (error) throw error;
  }

}

// 0x6ab3099fa660b0d2ac925b50d5e96410f3c7571c75f0ef88e01a6b8fe9df1bef

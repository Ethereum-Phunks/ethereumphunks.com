import { EventType } from './global-state';

export interface Account {
  id: string;
  phunks?: Phunk[];
}

export interface Auction {
  amount: string
  auctionId: number
  bidder: string | null
  createdAt: Date
  endTime: number
  hashId: string
  prevOwner: string | null
  settled: boolean
  startTime: number
  bids: Bid[] | null
}

export interface Phunk {
  slug: string
  hashId: string
  tokenId: number
  createdAt: Date
  owner: string
  prevOwner: string | null
  sha: string

  imageUri?: string | null
  creator?: string | null

  isEscrowed?: boolean;
  isBridged?: boolean;

  attributes?: Attribute[]
  listing?: Listing | null
  bid?: Bid | null

  auction?: Auction | null

  singleName?: string | null
  collectionName?: string | null
  supply?: number | null

  consensus?: boolean

  nft?: {
    owner: string
    tokenId: number
  }

  loading: boolean
}

export interface Bid {
  createdAt: Date
  fromAddress: string
  hashId: string
  value: string
  txHash?: string
}
export interface Event {
  blockHash: string
  blockNumber: number | null
  blockTimestamp: Date | null
  from: string
  hashId: string
  sha: string
  id: number
  to: string
  txHash: string
  txId: string
  txIndex: string | null
  value: string | null
  type: EventType | null

  slug?: string
  tokenId?: number | null
}
export interface Listing {
  createdAt: Date
  hashId: string
  listed: boolean
  listedBy: string
  minValue: string
  toAddress: string | null
  txHash?: string
}

export interface Sha {
  id: number
  phunkId: string | null
  sha: string | null
}

export interface User {
  address: string
  createdAt: Date
}

export interface Attribute {
  k: string;
  v: string;
}

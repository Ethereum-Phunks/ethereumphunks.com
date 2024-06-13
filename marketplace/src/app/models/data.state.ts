import { Event, Phunk } from './db';

export interface Collection {
  slug: string;
  singleName: string;
  supply: number;
  name?: string;
  description?: string;
  image?: string;
}

export interface CollectionWAssets {
  image: string;
  name: string;
  previews: Phunk[];
  slug: string;
  supply: number;
}

export interface DataState {
  usd: number | null;
  events: Event[] | null;
  singlePhunk: Phunk | null;
  userOpenBids: Phunk[];

  txHistory: any[] | null;
  leaderboard: any[] | null;
  collections: Collection[];
  collectionsWithAssets: CollectionWAssets[];
  activeCollection: Collection | null;
}

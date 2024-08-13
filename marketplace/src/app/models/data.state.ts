import { Event, Phunk } from './db';

export interface Collection {
  slug: string;
  singleName: string;
  supply: number;
  name?: string;
  description?: string;
  image?: string;
  stats: {
    sales: number;
    volume: number;
  };
  previews: Phunk[];
}

export interface DataState {
  usd: number | null;
  events: Event[] | null;
  singlePhunk: Phunk | null;
  userOpenBids: Phunk[];

  txHistory: any[] | null;
  leaderboard: any[] | null;
  collections: Collection[];
  activeCollection: Collection | null;
}

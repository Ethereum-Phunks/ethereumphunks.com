import { Event, Listing } from './db';

export interface EthscriptionEventData {
  events: Event[];
  removedListings: Partial<Listing['hashId']>[];
  newListings: Listing[];
}

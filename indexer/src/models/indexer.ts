import { Event, Listing } from '../modules/storage/models/db';

export interface EthscriptionEventData {
  events: Event[];
  removedListings: Partial<Listing['hashId']>[];
  newListings: Listing[];
}

import { Collection, Ethscription } from '@/models/db';

export interface NotificationMessage {
  title: string;
  message: string;
  link: string;
  imageBuffer: Buffer;
  filename: string;
}

export interface EthscriptionWithCollectionAndAttributes {
  ethscription: Ethscription,
  collection: Collection,
  attributes: {
    k: string,
    v: string,
    rarity: number,
  }[],
}

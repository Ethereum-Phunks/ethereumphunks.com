import { Collection, Ethscription, AttributeItem } from '@/modules/storage/models/db';

export interface NotificationMessage {
  title: string;
  message: string;
  link: string;
  imageBuffer: Buffer;
  filename: string;
}

export interface NotifItemData {
  ethscription: Ethscription;
  collection: Collection;
  attributes: NotifItemAttribute[];
}

export interface NotifItemAttribute {
  k: string;
  v: string;
  rarity: number;
}

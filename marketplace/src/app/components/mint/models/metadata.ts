export interface Attribute {
  trait_type: string;
  value: string;
}

export interface CollectionItem {
  name: string;
  image: string;
  attributes: Attribute[];
  collectionName: string;
  tokenId: number;
  sha: string;
}

export interface Collection {
  name: string;
  logo_image_uri: string;
  banner_image_uri: string;
  total_supply: number;
  slug: string;
  description: string;
  website_link: string;
  twitter_link: string;
  discord_link: string;
  background_color: string;
  collection_items: CollectionItem[];
}

export interface MintRequestResponse {
  slug: string,
  address: string,
  id: number,
  exists: boolean,
  pending: boolean,
  queued: boolean,
  metadata: CollectionItem,
}

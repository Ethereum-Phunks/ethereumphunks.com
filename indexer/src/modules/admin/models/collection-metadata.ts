export interface Attribute {
  trait_type: string;
  value: string;
}

export interface CollectionItem {
  id: string;
  index: number;
  sha: string;
  name: string;
  description: string;
  attributes: Attribute[];
}

export interface CollectionMetadata {
  name: string;
  logo_image: string | null;
  banner_image: string | null;
  total_supply: number;
  slug: string;
  description: string;
  website_url: string | null;
  twitter_url: string | null;
  discord_url: string | null;
  background_color: string | null;
  collection_items: CollectionItem[];
}

// Type for the entire metadata object
export type Metadata = {
  [key: string]: CollectionMetadata;
};

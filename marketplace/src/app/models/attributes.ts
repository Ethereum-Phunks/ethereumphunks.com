export interface Attribute {
  k: string;
  v: string;
}

export interface AttributeItem {
  [sha: string]: Attribute[];
}

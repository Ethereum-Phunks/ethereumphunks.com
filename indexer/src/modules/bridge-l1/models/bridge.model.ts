export interface SignatureBody {
  address: string;
  hashId: string;
  sha: string;
  signature: `0x${string}`;
  chainId: number;
}

export interface MagmaEtherPhunk {
  hashIdRef: `0x${string}`;
  preBridgeOwner: `0x${string}`;
  sha: string;
  blockCreatedMainnet: number;
  blockCreatedMagma: number;
  nonce: number;
  signature: `0x${string}`;
};

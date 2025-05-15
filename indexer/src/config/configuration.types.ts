export type AppConfig = {
  nodeEnv: string;
  mode: 'backfill' | 'poll';
  port: number;
  features: FeatureFlags;
  allowedOrigins: string[];
  bridgeBlockDelayL1: number;
  chain: ChainConfig;
  relay: RelayConfig;
  notifications: NotificationsConfig;
  api: ApiConfig;
  twitter?: TwitterConfig;
  supabase: SupabaseConfig;
};

export type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

export type FeatureFlags = {
  indexer: number;
  queue: number;
  discord: number;
  twitter: number;
  txPool: number;
  mint: number;
};

export type ChainConfig = {
  chainIdL1: number;
  chainIdL2: number;
  contracts: {
    market: {
      l1: `0x${string}`;
      l2: `0x${string}`;
    };
    points: {
      l1: `0x${string}`;
      l2: `0x${string}`;
    };
    bridge: {
      l1: `0x${string}`;
      l2: `0x${string}`;
    };
  };
  rpc: {
    l1: {
      primary: string;
      backup?: string;
    };
    l2: {
      primary: string;
      backup?: string;
    };
  };
};

export type RelayConfig = {
  l1: {
    address: `0x${string}`;
    privateKey: string;
  };
  l2: {
    address: `0x${string}`;
    privateKey: string;
  };
};

export type NotificationsConfig = {
  telegram?: {
    botToken: string;
  };
  discord?: {
    botToken: string;
  };
};

export type ApiConfig = {
  publicKey: string;
  privateKey: string;
};

export type TwitterConfig = {
  username: string;
  password: string;
  twoFactorSecret: string;
};

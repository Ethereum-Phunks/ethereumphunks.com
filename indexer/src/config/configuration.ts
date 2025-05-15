import { registerAs } from '@nestjs/config';
import Joi from 'joi';

import { AppConfig } from './configuration.types';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  MODE: Joi.string().valid('backfill', 'poll').required(),
  PORT: Joi.number().default(3069),
  ALLOWED_ORIGINS: Joi.string().required(),
  BRIDGE_BLOCK_DELAY_L1: Joi.number().default(10),
  CHAIN_ID: Joi.number().valid(1, 11155111).required(),

  INDEXER: Joi.number().valid(0, 1).default(1),
  QUEUE: Joi.number().valid(0, 1).default(1),
  DISCORD: Joi.number().valid(0, 1).default(0),
  TWITTER: Joi.number().valid(0, 1).default(0),
  TX_POOL: Joi.number().valid(0, 1).default(0),
  MINT: Joi.number().valid(0, 1).default(0),

  SUPABASE_URL: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

  // RPCs
  RPC_URL_L1: Joi.string().required(),
  RPC_URL_BACKUP_L1: Joi.string().optional(),

  RPC_URL_L2: Joi.string().required(),
  RPC_URL_BACKUP_L2: Joi.string().optional(),

  // Contract Addresses
  MARKET_ADDRESS_L1: Joi.string().required(),
  MARKET_ADDRESS_L2: Joi.string().required(),

  BRIDGE_ADDRESS_L1: Joi.string().required(),
  BRIDGE_ADDRESS_L2: Joi.string().required(),

  POINTS_ADDRESS_L1: Joi.string().required(),
  POINTS_ADDRESS_L2: Joi.string().required(),
  // Relayer
  RELAY_SIGNER_ADDRESS_L1: Joi.string().required(),
  RELAY_SIGNER_PK_L1: Joi.string().required(),

  RELAY_SIGNER_ADDRESS_L2: Joi.string().required(),
  RELAY_SIGNER_PK_L2: Joi.string().required(),

  // API Keys
  API_PRIVATE_KEY: Joi.string().required(),
  API_PUBLIC_KEY: Joi.string().required(),

  // Optional Notifications
  TELEGRAM_BOT_TOKEN: Joi.string().optional(),
  DISCORD_BOT_TOKEN: Joi.string().optional(),

  // Optional Twitter
  TWITTER_USERNAME: Joi.string().optional(),
  TWITTER_PASSWORD: Joi.string().optional(),
  TWITTER_TWO_FACTOR_SECRET: Joi.string().optional(),
});

export default registerAs('app', (): AppConfig => {
  const chainId = parseInt(process.env.CHAIN_ID, 10);
  const chainName = chainId === 1 ? 'mainnet' : 'sepolia';

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    mode: process.env.MODE as 'backfill' | 'poll',
    port: parseInt(process.env.PORT, 10) || 3069,
    allowedOrigins: process.env.ALLOWED_ORIGINS.split(','),
    bridgeBlockDelayL1: parseInt(process.env.BRIDGE_BLOCK_DELAY_L1, 10) || 10,

    supabase: {
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },

    features: {
      indexer: parseInt(process.env.INDEXER, 10) || 1,
      queue: parseInt(process.env.QUEUE, 10) || 1,
      discord: parseInt(process.env.DISCORD, 10) || 0,
      twitter: parseInt(process.env.TWITTER, 10) || 0,
      txPool: parseInt(process.env.TX_POOL, 10) || 0,
      mint: parseInt(process.env.MINT, 10) || 0,
    },

    chain: {
      chainIdL1: chainId,
      chainIdL2: chainId,
      contracts: {
        market: {
          l1: process.env.MARKET_ADDRESS_L1.toLowerCase(),
          l2: process.env.MARKET_ADDRESS_L2.toLowerCase(),
        },
        points: {
          l1: process.env.POINTS_ADDRESS_L1.toLowerCase(),
          l2: process.env.POINTS_ADDRESS_L2.toLowerCase(),
        },
        bridge: {
          l1: process.env.BRIDGE_ADDRESS_L1.toLowerCase(),
          l2: process.env.BRIDGE_ADDRESS_L2.toLowerCase(),
        },
      },
      rpc: {
        l1: {
          primary: process.env.RPC_URL_L1,
          backup: process.env.RPC_URL_BACKUP_L1,
        },
        l2: {
          primary: process.env.RPC_URL_L2,
          backup: process.env.RPC_URL_BACKUP_L2,
        },
      },
    },

    relayer: {
      l1: {
        address: process.env.RELAY_SIGNER_ADDRESS_L1,
        privateKey: process.env.RELAY_SIGNER_PK_L1,
      },
      l2: {
        address: process.env.RELAY_SIGNER_ADDRESS_L2,
        privateKey: process.env.RELAY_SIGNER_PK_L2,
      },
    },

    notifications: {
      ...(process.env.TELEGRAM_BOT_TOKEN && {
        telegram: {
          botToken: process.env.TELEGRAM_BOT_TOKEN,
        },
      }),
      ...(process.env.DISCORD_BOT_TOKEN && {
        discord: {
          botToken: process.env.DISCORD_BOT_TOKEN,
        },
      }),
    },

    api: {
      publicKey: process.env.API_PUBLIC_KEY,
      privateKey: process.env.API_PRIVATE_KEY,
    },

    ...(process.env.TWITTER_USERNAME && {
      twitter: {
        username: process.env.TWITTER_USERNAME,
        password: process.env.TWITTER_PASSWORD,
        twoFactorSecret: process.env.TWITTER_TWO_FACTOR_SECRET,
      },
    }),
  };
});

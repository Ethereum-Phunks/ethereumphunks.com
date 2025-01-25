import { createPublicClient, createWalletClient, fallback, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

import dotenv from 'dotenv';
dotenv.config();

import { magma } from './magma.chain';

import pointsL1 from '@/abi/PointsL1.json';

import bridgeL1 from '@/abi/EtherPhunksBridgeL1.json';
import bridgeL2 from '@/abi/EtherPhunksBridgeL2.json';

import marketL1 from '@/abi/EtherPhunksMarketL1.json';
import marketL2 from '@/abi/EtherPhunksNftMarket.json';

export const pointsAbiL1 = pointsL1;

export const bridgeAbiL1 = bridgeL1;
export const bridgeAbiL2 = bridgeL2;

export const marketAbiL1 = marketL1;
export const marketAbiL2 = marketL2;

export const chain: 'mainnet' | 'sepolia' =
  process.env.CHAIN_ID === '1' ? 'mainnet' : 'sepolia';

export const l2Chain: 'magma' = 'magma';

export const l1RpcURL: string =
  chain === 'mainnet'
    ? process.env.RPC_URL_MAINNET
    : process.env.RPC_URL_SEPOLIA;

export const l1RpcURL_BACKUP: string =
  chain === 'mainnet'
    ? process.env.RPC_URL_MAINNET_BACKUP
    : process.env.RPC_URL_SEPOLIA_BACKUP;

export const marketAddressL1: string =
  chain === 'mainnet'
    ? process.env.MARKET_ADDRESS_MAINNET_L1
    : process.env.MARKET_ADDRESS_SEPOLIA_L1

export const marketAddressL2: string =
  chain === 'mainnet'
    ? process.env.MARKET_ADDRESS_MAINNET_L2
    : process.env.MARKET_ADDRESS_SEPOLIA_L2

export const pointsAddressL1: string =
  chain === 'mainnet'
    ? process.env.POINTS_ADDRESS_MAINNET
    : process.env.POINTS_ADDRESS_SEPOLIA;

export const bridgeAddressL1: string =
  chain === 'mainnet'
    ? process.env.BRIDGE_ADDRESS_MAINNET_L1
    : process.env.BRIDGE_ADDRESS_SEPOLIA_L1;

export const bridgeAddressL2: string =
  chain === 'mainnet'
    ? process.env.BRIDGE_ADDRESS_MAINNET_L2
    : process.env.BRIDGE_ADDRESS_SEPOLIA_L2;

export const l1Client = createPublicClient({
  chain: chain === 'mainnet' ? mainnet : sepolia,
  transport: fallback([
    http(l1RpcURL),
    // http(l1RpcURL_BACKUP),
  ], {
    rank: false,
  }),
  batch: {
    multicall: true,
  },
});

export const l2Client = createPublicClient({
  chain: magma,
  transport: fallback([
    http(magma.rpcUrls.default.http[0]),
  ], {
    rank: false,
  }),
  batch: {
    multicall: true,
  },
});

export const l2WalletClient = createWalletClient({
  chain: magma,
  transport: http(magma.rpcUrls.default.http[0]),
  account: privateKeyToAccount(`0x${process.env.L2_RELAY_SIGNER_PK}`),
});

export const minterAddressL2 = l2WalletClient.account.address;

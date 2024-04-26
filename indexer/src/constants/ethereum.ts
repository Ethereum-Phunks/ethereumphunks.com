import { createPublicClient, createWalletClient, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { magma } from './magmaChain';
import { privateKeyToAccount } from 'viem/accounts';

import dotenv from 'dotenv';
dotenv.config();

export const l1Chain: 'mainnet' | 'sepolia' =
  process.env.CHAIN_ID === '1' ? 'mainnet' : 'sepolia';

export const l1RpcURL: string =
  l1Chain === 'mainnet'
    ? process.env.RPC_URL_MAINNET
    : process.env.RPC_URL_SEPOLIA;

export const marketAddress: string[] = JSON.parse(
  l1Chain === 'mainnet'
    ? process.env.MARKET_ADDRESS_MAINNET
    : process.env.MARKET_ADDRESS_SEPOLIA
).map((address: string) => address.toLowerCase());

export const pointsAddress: string =
  l1Chain === 'mainnet'
    ? process.env.POINTS_ADDRESS_MAINNET
    : process.env.POINTS_ADDRESS_SEPOLIA;

export const bridgeAddressMainnet: string =
  l1Chain === 'mainnet'
    ? process.env.BRIDGE_ADDRESS_MAINNET_L1
    : process.env.BRIDGE_ADDRESS_SEPOLIA_L1;

export const l1Client = createPublicClient({
  chain: l1Chain === 'mainnet' ? mainnet : sepolia,
  transport: http(l1RpcURL),
});

export const l2Client = createPublicClient({
  chain: magma,
  transport: http(magma.rpcUrls.default.http[0]),
});

export const l2WalletClient = createWalletClient({
  chain: magma,
  transport: http(magma.rpcUrls.default.http[0]),
  account: privateKeyToAccount(`0x${process.env.DATA_DEPLOYER_PK}`),
});

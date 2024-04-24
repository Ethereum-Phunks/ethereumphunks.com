import { Injectable, Logger } from '@nestjs/common';

import { FormattedTransaction, GetBlockReturnType, TransactionReceipt, createPublicClient, http } from 'viem';
import { sepolia, mainnet } from 'viem/chains';

import punkDataAbi from '@/abi/PunkData.json';
import pointsAbi from '@/abi/Points.json';
import bridgeAbi from '@/abi/EtherPhunksBridgeMainnet.json';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class Web3Service {

  chain: 'mainnet' | 'sepolia' = process.env.CHAIN_ID === '1' ? 'mainnet' : 'sepolia';
  rpcURL: string = this.chain === 'mainnet' ? process.env.RPC_URL_MAINNET : process.env.RPC_URL_SEPOLIA;

  marketAddress: string[] = JSON.parse(
    this.chain === 'mainnet' ? process.env.MARKET_ADDRESS_MAINNET : process.env.MARKET_ADDRESS_SEPOLIA
  ).map((address: string) => address.toLowerCase());

  pointsAddress: string = this.chain === 'mainnet' ? process.env.POINTS_ADDRESS_MAINNET : process.env.POINTS_ADDRESS_SEPOLIA;

  bridgeAddressMainnet: string = this.chain === 'mainnet' ? process.env.BRIDGE_ADDRESS_MAINNET_L1 : process.env.BRIDGE_ADDRESS_SEPOLIA_L1;

  public client = createPublicClient({
    chain: this.chain === 'mainnet' ? mainnet : sepolia,
    transport: http(this.rpcURL)
  });

  // Method to get transactions from a specific block
  async getBlockTransactions(n: number): Promise<{
    txns: { transaction: FormattedTransaction; receipt: TransactionReceipt; }[],
    createdAt: Date
  }> {
    const block = await this.client.getBlock({
      includeTransactions: true,
      blockNumber: BigInt(n),
    });

    const ts = Number(block.timestamp);
    const createdAt = new Date(ts * 1000);

    const txArray = block.transactions.filter((txn) => txn.input !== '0x');
    const txns = await Promise.all(
      txArray.map(async (tx) => {
        return {
          transaction: tx,
          receipt: await this.client.getTransactionReceipt({ hash: tx.hash }),
        };
      })
    );

    return { txns, createdAt };
  }

  async getTransaction(hash: `0x${string}`): Promise<any> {
    const transaction = await this.client.getTransaction({ hash });
    return transaction;
  }

  async getValidTransactions(hashes: string[]): Promise<any[]> {
    const transactions = await Promise.all(
      hashes.map(async (hash) => {
        return this.client.getTransaction({ hash: hash as `0x${string}` }).then((res) => {
          return res.hash;
        }).catch((e) => {
          return null;
        });
      })
    );
    return transactions.filter((tx) => tx);
  }

  async getTransactionReceipt(hash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = await this.client.getTransactionReceipt({ hash });
    return receipt;
  }

  async waitForTransaction(hash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = await this.client.waitForTransactionReceipt({ hash });
    return receipt;
  }

  async getBlock(n?: number): Promise<GetBlockReturnType> {
    if (n) return await this.client.getBlock({ blockNumber: BigInt(n), includeTransactions: false });
    return await this.client.getBlock({ includeTransactions: false });
  }

  waitNBlocks(blocks: number): Promise<void> {
    return new Promise(async (resolve) => {
      const currentBlock = await this.client.getBlockNumber();
      const targetBlock = currentBlock + BigInt(blocks);

      const unwatch = this.client.watchBlocks({
        onBlock: (block) => {
          Logger.debug(`${Number(targetBlock) - Number(block.number)} blocks remaining`, 'Bridge confirmations');
          if (Number(block.number) >= Number(targetBlock)) {
            unwatch();
            resolve();
          }
        },
      });
    });
  }

  ///////////////////////////////////////////////////////////////////////////////
  // EtherPhunks smart contract interactions ////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////

  async getPoints(address: `0x${string}`): Promise<number> {
    const points = await this.client.readContract({
      address: this.pointsAddress as `0x${string}`,
      abi: pointsAbi,
      functionName: 'points',
      args: [`${address}`],
    });
    return points as number;
  }

  async fetchNonce(address: string): Promise<bigint> {
    // return BigInt(0);
    const nonce = await this.client.readContract({
      address: this.bridgeAddressMainnet as `0x${string}`,
      abi: bridgeAbi,
      functionName: 'expectedNonce',
      args: [`${address}`],
    });
    return nonce as bigint;
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Punk data contract interactions ////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////

  async getPunkImage(tokenId: number): Promise<any> {
    const punkImage = await this.client.readContract({
      address: '0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2' as `0x${string}`,
      abi: punkDataAbi,
      functionName: 'punkImageSvg',
      args: [`${tokenId}`],
    });
    return punkImage as any;
  }

  async getPunkAttributes(tokenId: number): Promise<any> {
    const punkAttributes = await this.client.readContract({
      address: '0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2' as `0x${string}`,
      abi: punkDataAbi,
      functionName: 'punkAttributes',
      args: [`${tokenId}`],
    });
    return punkAttributes as any;
  }

  async getEnsFromAddress(address: string): Promise<string> {
    // return '';
    const ens = await this.client.getEnsName({ address: address as `0x${string}` });
    return ens;
  }
}

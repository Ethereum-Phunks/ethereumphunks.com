import { Injectable, Logger } from '@nestjs/common';

import { FormattedTransaction, GetBlockReturnType, GetTransactionReturnType, Transaction, TransactionReceipt, WriteContractParameters } from 'viem';

import { bridgeAbiL1, bridgeAddressL1, l1Client, l2Client, pointsAbiL1, pointsAddressL1 } from '@/constants/ethereum';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class Web3Service {

  client: typeof l1Client | typeof l2Client = l1Client;

  constructor(
    private readonly layer: 'l1' | 'l2'
  ) {
    if (layer === 'l2') this.client = l2Client;
  }

  /**
   * Retrieves the transactions of a specific block.
   * @param n - The block number.
   * @param chain - The chain to retrieve the block from.
   * @returns A promise that resolves to an object containing the transactions and the creation date of the block.
   */
  async getBlockTransactions(n: number): Promise<{
    txns: { transaction: FormattedTransaction; receipt: TransactionReceipt; }[],
    createdAt: Date,
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

  async getTransaction(hash: `0x${string}`): Promise<Transaction> {
    const transaction = await this.client.getTransaction({ hash });
    return transaction;
  }

  async getValidTransactions(hashes: string[]): Promise<string[]> {
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

  async waitForTransactionReceipt(hash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = await this.client.waitForTransactionReceipt({ hash });
    return receipt;
  }

  async getBlock(n?: number): Promise<GetBlockReturnType> {
    if (n) return await this.client.getBlock({ blockNumber: BigInt(n), includeTransactions: false });
    return await this.client.getBlock({ includeTransactions: false });
  }

  /**
   * Waits for a specified number of blocks to be mined.
   * @param blocks - The number of blocks to wait for.
   * @returns A promise that resolves when the specified number of blocks have been mined.
   */
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
    const points = await l1Client.readContract({
      address: pointsAddressL1 as `0x${string}`,
      abi: pointsAbiL1,
      functionName: 'points',
      args: [`${address}`],
    });
    return points as number;
  }

  async fetchNonce(address: string): Promise<bigint> {
    // return BigInt(0);
    const nonce = await l1Client.readContract({
      address: bridgeAddressL1 as `0x${string}`,
      abi: bridgeAbiL1,
      functionName: 'expectedNonce',
      args: [`${address}`],
    });
    return nonce as bigint;
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Punk data contract interactions ////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////

  async getPunkImage(tokenId: number): Promise<any> {
    const punkImage = await l1Client.readContract({
      address: '0x6b34e63787610422f723c0ad919f2e07ce976f20' as `0x${string}`,
      abi: [{
        "inputs": [{ "internalType": "uint16", "name": "index", "type": "uint16" }],
        "name": "punkImage",
        "outputs": [{ "internalType": "bytes", "name": "", "type": "bytes" }],
        "stateMutability": "view",
        "type": "function"
      }],
      functionName: 'punkImage',
      args: [tokenId],
    });
    return punkImage as any;
  }

  async getPunkAttributes(tokenId: number): Promise<any> {
    const punkAttributes = await l1Client.readContract({
      address: '0x6b34e63787610422f723c0ad919f2e07ce976f20' as `0x${string}`,
      abi: [{
        "inputs": [{ "internalType": "uint16", "name": "index", "type": "uint16" }],
        "name": "punkAttributes",
        "outputs": [{ "internalType": "string", "name": "text", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
      }],
      functionName: 'punkAttributes',
      args: [tokenId],
    });
    return punkAttributes as any;
  }

  async getEnsFromAddress(address: string): Promise<string | null> {
    try {
      return await l1Client.getEnsName({ address: address as `0x${string}` });
    } catch (e) {
      return null;
    }
  }

  ///////////////////////////////////////////////////////////////////////////////

  /**
   * Estimates the gas required to execute a write contract operation.
   *
   * @param request - The parameters for the write contract operation.
   * @returns A promise that resolves to the estimated gas value as a number.
   */
  async estimateContractGasL2(request: WriteContractParameters): Promise<number> {
    const gas = await l2Client.estimateContractGas(request);
    return Number(gas);
  }
}

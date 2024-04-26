import { Injectable, Logger } from '@nestjs/common';

import { FormattedTransaction, GetBlockReturnType, TransactionReceipt, WriteContractParameters } from 'viem';

import { bridgeAddressMainnet, l1Client, l2Client, pointsAddress } from '@/constants/ethereum';

import punkDataAbi from '@/abi/PunkData.json';
import pointsAbi from '@/abi/Points.json';
import bridgeAbi from '@/abi/EtherPhunksBridgeMainnet.json';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class Web3Service {

  /**
   * Retrieves the transactions of a specific block.
   * @param n - The block number.
   * @returns A promise that resolves to an object containing the transactions and the creation date of the block.
   */
  async getBlockTransactions(n: number): Promise<{
    txns: { transaction: FormattedTransaction; receipt: TransactionReceipt; }[],
    createdAt: Date
  }> {
    const block = await l1Client.getBlock({
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
          receipt: await l1Client.getTransactionReceipt({ hash: tx.hash }),
        };
      })
    );

    return { txns, createdAt };
  }

  async getTransaction(hash: `0x${string}`): Promise<any> {
    const transaction = await l1Client.getTransaction({ hash });
    return transaction;
  }

  async getValidTransactions(hashes: string[]): Promise<any[]> {
    const transactions = await Promise.all(
      hashes.map(async (hash) => {
        return l1Client.getTransaction({ hash: hash as `0x${string}` }).then((res) => {
          return res.hash;
        }).catch((e) => {
          return null;
        });
      })
    );
    return transactions.filter((tx) => tx);
  }

  async getTransactionReceipt(hash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = await l1Client.getTransactionReceipt({ hash });
    return receipt;
  }

  async waitForTransactionReceiptL1(hash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = await l1Client.waitForTransactionReceipt({ hash });
    return receipt;
  }

  async waitForTransactionReceiptL2(hash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = await l2Client.waitForTransactionReceipt({ hash });
    return receipt;
  }

  async getBlock(n?: number): Promise<GetBlockReturnType> {
    if (n) return await l1Client.getBlock({ blockNumber: BigInt(n), includeTransactions: false });
    return await l1Client.getBlock({ includeTransactions: false });
  }

  /**
   * Waits for a specified number of blocks to be mined.
   * @param blocks - The number of blocks to wait for.
   * @returns A promise that resolves when the specified number of blocks have been mined.
   */
  waitNBlocks(blocks: number): Promise<void> {
    return new Promise(async (resolve) => {
      const currentBlock = await l1Client.getBlockNumber();
      const targetBlock = currentBlock + BigInt(blocks);

      const unwatch = l1Client.watchBlocks({
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
      address: pointsAddress as `0x${string}`,
      abi: pointsAbi,
      functionName: 'points',
      args: [`${address}`],
    });
    return points as number;
  }

  async fetchNonce(address: string): Promise<bigint> {
    // return BigInt(0);
    const nonce = await l1Client.readContract({
      address: bridgeAddressMainnet as `0x${string}`,
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
    const punkImage = await l1Client.readContract({
      address: '0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2' as `0x${string}`,
      abi: punkDataAbi,
      functionName: 'punkImageSvg',
      args: [`${tokenId}`],
    });
    return punkImage as any;
  }

  async getPunkAttributes(tokenId: number): Promise<any> {
    const punkAttributes = await l1Client.readContract({
      address: '0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2' as `0x${string}`,
      abi: punkDataAbi,
      functionName: 'punkAttributes',
      args: [`${tokenId}`],
    });
    return punkAttributes as any;
  }

  async getEnsFromAddress(address: string): Promise<string> {
    // return '';
    const ens = await l1Client.getEnsName({ address: address as `0x${string}` });
    return ens;
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

import { Injectable, Logger } from '@nestjs/common';

import { Account, Chain, ParseAccount, PublicClient, RpcSchema, Transaction, TransactionReceipt, Transport, WriteContractParameters, getAddress, toHex } from 'viem';

import bridgeAbiL1 from '@/abi/EtherPhunksBridgeL1.json'
import pointsAbiL1 from '@/abi/PointsL1.json'

import { AppConfigService } from '@/config/config.service';
import { EvmService } from '@/modules/evm/evm.service';

interface GetBlockOptions {
  blockNumber?: number;
  blockHash?: string;
  includeTransactions?: boolean;
}

type GetBlockReturnType<T> = T & {
  transactions?: {transaction: Transaction, receipt: TransactionReceipt}[];
};

@Injectable()
export class Web3Service {

  layer: 'L1' | 'L2';
  client: PublicClient<Transport, Chain, ParseAccount<Account>, RpcSchema>;

  constructor(
    private readonly evmSvc: EvmService,
    private readonly configSvc: AppConfigService
  ) {}

  /**
   * Creates a new Web3Service instance for a specific layer.
   * @param layer - The layer to create the service for ('L1' or 'L2').
   * @returns A new Web3Service instance for the specified layer.
   */
  forLayer(layer: 'L1' | 'L2'): Web3Service {
    const service = new Web3Service(this.evmSvc, this.configSvc);
    service.layer = layer;
    service.client = layer === 'L1' ? this.evmSvc.publicClientL1 : this.evmSvc.publicClientL2;
    return service;
  }

  async getBlock({
    blockNumber,
    blockHash,
    includeTransactions
  }: GetBlockOptions | undefined): Promise<GetBlockReturnType<any>> {
    const config = {};

    if (blockNumber) config['blockNumber'] = BigInt(blockNumber);
    else if (blockHash) config['blockHash'] = blockHash as `0x${string}`;

    if (includeTransactions) config['includeTransactions'] = includeTransactions;

    const [block, receipts] = await Promise.all([
      this.client.getBlock(config),
      includeTransactions ? this.getBlockReceipts(config) : undefined,
    ]);

    const result: GetBlockReturnType<any> = { ...block };

    if (includeTransactions && receipts) {
      result.transactions = (block.transactions as any).map((tx: Transaction) => {
        const receipt = receipts.find((r) => r.transactionHash === tx.hash);
        return { transaction: tx, receipt };
      });
    }

    return result;
  }

  async getBlockReceipts(opts: GetBlockOptions): Promise<TransactionReceipt[]> {
    const params = [];

    if (opts.blockNumber) params.push(toHex(opts.blockNumber));
    else if (opts.blockHash) params.push(opts.blockHash);
    else params.push('latest');

    const receipts: any = await this.client.request({
      method: 'eth_getBlockReceipts',
      params: [...params],
      id: this.configSvc.chain.chainIdL1,
      jsonrpc: '2.0',
    });

    return receipts.map((rec) => {
      return {
        blockHash: rec.blockHash,
        blockNumber: BigInt(rec.blockNumber),
        contractAddress: rec.contractAddress,
        cumulativeGasUsed: BigInt(rec.cumulativeGasUsed),
        from: rec.from,
        gasUsed: BigInt(rec.gasUsed),
        logs: rec.logs,
        logsBloom: rec.logsBloom,
        status: rec.status === '0x1' ? 'success' : 'failure',
        to: rec.to,
        transactionHash: rec.transactionHash,
        transactionIndex: Number(rec.transactionIndex),
      };
    }) as TransactionReceipt[];
  }

  async getTransaction(hash: `0x${string}`): Promise<Transaction> {
    const transaction = await this.client.getTransaction({ hash });
    return transaction;
  }

  async getTransactionReceipt(hash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = await this.client.getTransactionReceipt({ hash });
    return receipt;
  }

  async waitForTransactionReceipt(hash: `0x${string}`): Promise<TransactionReceipt> {
    const receipt = await this.client.waitForTransactionReceipt({ hash });
    return receipt;
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

  /**
   * Retrieves the points for a given address.
   * This is only on L1.
   * @param address - The address to retrieve points for.
   * @returns A Promise that resolves to the points for the given address.
   */
  async getPoints(address: `0x${string}`): Promise<number> {
    const points = await this.evmSvc.publicClientL1.readContract({
      address: this.configSvc.contracts.points.l1 as `0x${string}`,
      abi: pointsAbiL1,
      functionName: 'points',
      args: [`${address}`],
    });
    return points as number;
  }

  /**
   * Fetches the nonce for a given address.
   * This is only on L1.
   * @param address - The address to fetch the nonce for.
   * @returns A Promise that resolves to the nonce for the given address.
   */
  async fetchNonce(address: string): Promise<bigint> {
    const nonce = await this.evmSvc.publicClientL1.readContract({
      address: this.configSvc.contracts.bridge.l1 as `0x${string}`,
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
    const punkImage = await this.evmSvc.publicClientL1.readContract({
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
    const punkAttributes = await this.evmSvc.publicClientL1.readContract({
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

  ///////////////////////////////////////////////////////////////////////////////
  // Utils //////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////

  /**
   * Retrieves the ENS name associated with the given address.
   * @param address - The Ethereum address.
   * @returns A Promise that resolves to the ENS name if found, or null if not found.
   */
  async getEnsFromAddress(address: string): Promise<string | null> {
    try {
      return await this.evmSvc.publicClientL1.getEnsName({ address: address as `0x${string}` });
    } catch (e) {
      return null;
    }
  }

  validateAddress(address: string): string {
    try {
      return getAddress(address);
    } catch (error) {
      console.log(error);
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
    const gas = await this.evmSvc.publicClientL2.estimateContractGas(request);
    return Number(gas);
  }
}

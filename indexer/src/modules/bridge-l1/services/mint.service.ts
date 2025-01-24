import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { WriteContractParameters, parseEventLogs } from 'viem';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { ImageUriService } from '@/modules/bridge-l1/services/image-uri.service';
import { SupabaseService } from '@/services/supabase.service';
import { Web3Service } from '@/modules/shared/services/web3.service';
import { UtilityService } from '@/modules/shared/services/utility.service';

import { bridgeAbiL2, l2Client, l2WalletClient } from '@/constants/ethereum';

@Injectable()
export class MintService {

  private mintQueue: { hashId: string; owner: string }[] = [];
  private isProcessing = false;

  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    @Inject('WEB3_SERVICE_L2') private readonly web3SvcL2: Web3Service,
    private readonly http: HttpService,
    private readonly sbSvc: SupabaseService,
    private readonly imageSvc: ImageUriService,
    private readonly utilSvc: UtilityService
  ) {}

  /**
   * Processes a Layer 2 mint request.
   *
   * @param hashId - The hash ID of the mint request.
   * @param owner - The owner of the minted token.
   * @returns A Promise that resolves when the mint request is processed.
   */
  async processLayer2Mint(
    hashId: string,
    owner: string
  ): Promise<void> {
    try {
      await this.web3SvcL1.waitNBlocks(Number(process.env.BRIDGE_L1_BLOCK_DELAY));
      await this.addMintRequest(hashId, owner);
    } catch (error) {
      console.error(error);
    }
  }

  async mintToken(request: WriteContractParameters) {
    try {
      const hash = await l2WalletClient.writeContract(request);
      const receipt = await this.web3SvcL2.waitForTransactionReceipt(hash);

      const logs = parseEventLogs({
        abi: bridgeAbiL2,
        logs: receipt.logs,
      });

      logs.forEach((log: any) => console.log(log.args));
    } catch (error) {
      console.error(error);
    }
  }

  async burnToken(request: WriteContractParameters) {
    try {
      const hash = await l2WalletClient.writeContract(request);
      const receipt = await this.web3SvcL2.waitForTransactionReceipt(hash);

      const logs = parseEventLogs({
        abi: bridgeAbiL2,
        logs: receipt.logs,
      });

      logs.forEach((log: any) => console.log(log.args));
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Creates a mint request that can be used to transact with the L2
   *
   * @param hashId - The hash ID of the transaction.
   * @param owner - The owner of the token.
   * @returns A promise that resolves to the write contract parameters for the mint request.
   */
  async createMintRequest(
    hashId: string,
    owner: string,
  ): Promise<WriteContractParameters> {
    const { slug, tokenId, sha } = await this.sbSvc.checkEthscriptionExistsByHashId(hashId);

    const [ { name, singleName }, { values } ] = await Promise.all([
      this.sbSvc.getCollectionBySlug(slug),
      this.sbSvc.getAttributesFromSha(sha)
    ]);

    const imageUri = await this.imageSvc.createImageUri(sha);
    const metadata = this.createMetadata(hashId, tokenId, name, singleName, imageUri, values);

    // console.log({ hashId, owner, tokenId });

    const { request } = await l2Client.simulateContract({
      account: l2WalletClient.account,
      address: process.env.BRIDGE_ADDRESS_SEPOLIA_L2 as `0x${string}`,
      abi: bridgeAbiL2,
      functionName: 'mintToken',
      args: [
        owner,
        tokenId,
        hashId,
        metadata
      ]
    });

    return request;
  }

  /**
   * Validates a token mint by retrieving the token URI associated with the given hash ID.
   * @param hashId - The hash ID of the token.
   * @returns A Promise that resolves to the response containing the token URI.
   */
  async validateTokenMint(hashId: string) {
    const { request } = await l2Client.simulateContract({
      account: l2WalletClient.account,
      address: process.env.BRIDGE_ADDRESS_L2 as `0x${string}`,
      abi: bridgeAbiL2,
      functionName: 'tokenURIByHashId',
      args: [hashId]
    });

    const response = await l2Client.readContract(request);
    return response;
  }

  /**
   * Creates on-chain metadata for the NFT minted to L2.
   * @param hashId - The hash ID of the token.
   * @param tokenId - The ID of the token.
   * @param name - The name of the token.
   * @param singleName - The single name of the token.
   * @param imageUri - The URI of the token's image.
   * @param attributes - The attributes of the token.
   * @returns The metadata in base64 format.
   */
  createMetadata(
    hashId: string,
    tokenId: number,
    name: string,
    singleName: string,
    imageUri: string,
    attributes: any
  ) {
    const metadataAttributes = [];

    // Add the attributes to the metadata
    // NOTE: The attributes are stored as an object with the key being the attribute name and the value being the attribute value. Some attributes are stored as an array of values so we must iterate over the array and add each value to the metadata as separate entries
    Object.keys(attributes).forEach((key) => {

      const isArray = Array.isArray(attributes[key]);
      if (isArray) {
        attributes[key].forEach((value: string) => {
          metadataAttributes.push({
            trait_type: this.utilSvc.toTitleCase(key),
            value: this.utilSvc.toTitleCase(value)
          });
        });
      } else {
        metadataAttributes.push({
          trait_type: this.utilSvc.toTitleCase(key),
          value: this.utilSvc.toTitleCase(attributes[key])
        });
      }
    });

    const marketPrefix = Number(process.env.CHAIN_ID) === 11155111 ? 'sepolia.' : '';

    const metadata = {
      name: `${singleName} #${tokenId}`,
      description: `${name} - ${singleName} #${tokenId}`,
      external_url: `https://${marketPrefix}etherphunks.eth.limo/#/details/${hashId}`,
      image: imageUri,
      attributes: [
        {
          trait_type: 'Hash ID',
          value: hashId
        },
        ...metadataAttributes
      ]
    };

    return 'data:application/json;base64,' + Buffer.from(JSON.stringify(metadata)).toString('base64');
  }

  /**
   * Fetches the L2 fees from the specified API endpoint.
   * @returns A promise that resolves to an object containing the fetched L2 fees.
   */
  async fetchL2Fees() {
    return await firstValueFrom(
      this.http.get('https://magmascan.org/api/v2/stats').pipe(
        map((response) => ({
          coin_price: response.data.coin_price,
          gas_prices: response.data.gas_prices,
          gas_price_updated_at: response.data.gas_price_updated_at
        })),
        catchError((error) => {
          console.error(error);
          return of(null);
        })
      )
    );
  }

  private async addMintRequest(hashId: string, owner: string) {
    this.mintQueue.push({ hashId, owner });
    if (!this.isProcessing) this.processNext();
  }

  private async processNext() {
    if (this.mintQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { hashId, owner } = this.mintQueue.shift();

    try {
      const request = await this.createMintRequest(hashId, owner);
      await this.mintToken(request);
    } catch (error) {
      console.error('Error processing mint request:', error);
    } finally {
      setTimeout(() => this.processNext(), 2000);
    }
  }
}

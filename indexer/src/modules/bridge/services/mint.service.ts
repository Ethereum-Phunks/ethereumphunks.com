import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { WriteContractParameters, createPublicClient, createWalletClient, hexToString, http, parseEventLogs } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { magma } from '@/constants/magmaChain';
import EtherPhunksTokenMagma from '@/abi/EtherPhunksTokenMagma.json';

import { ImageUriService } from '@/modules/bridge/services/image.service';
import { SupabaseService } from '@/services/supabase.service';
import { Web3Service } from '@/services/web3.service';

const walletClient = createWalletClient({
  chain: magma,
  transport: http(magma.rpcUrls.default.http[0]),
  account: privateKeyToAccount(`0x${process.env.DATA_DEPLOYER_PK}`),
});

const publicClient = createPublicClient({
  chain: magma,
  transport: http(magma.rpcUrls.default.http[0]),
});

@Injectable()
export class MintService {

  constructor(
    private readonly http: HttpService,
    private readonly sbSvc: SupabaseService,
    private readonly web3Svc: Web3Service,
    private imageSvc: ImageUriService
  ) {}

  async processLayer2Mint(
    hashId: string,
    owner: string
  ): Promise<void> {
    try {
      await this.web3Svc.waitNBlocks(10);
      const request = await this.createMintRequest(hashId, owner);
      await this.mintToken(request);
    } catch (error) {
      console.error(error);
    }
  }

  async mintToken(request: WriteContractParameters) {
    const hash = await walletClient.writeContract(request);
    console.log({ hash });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log({ receipt });

    const logs = parseEventLogs({
      abi: EtherPhunksTokenMagma,
      logs: receipt.logs,
    })

    logs.forEach((log: any) => {
      console.log(log.args);
    });
  }

  async createMintRequest(
    hashId: string,
    owner: string,
  ): Promise<WriteContractParameters> {
    const original = await this.web3Svc.getTransaction(hashId as `0x${string}`);
    const stringData = hexToString(original.input.toString() as `0x${string}`);

    const { slug, tokenId, sha } = await this.sbSvc.checkEthscriptionExistsByHashId(hashId);
    const { name, singleName } = await this.sbSvc.getCollectionBySlug(slug);
    const { values } = await this.sbSvc.getAttributesFromSha(sha);

    const imageUri = await this.imageSvc.createImageUri(sha);
    const metadata = this.createMetadata(hashId, tokenId, name, singleName, imageUri, values);

    console.log({ hashId, owner, tokenId, metadata });

    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: process.env.BRIDGE_ADDRESS_L2 as `0x${string}`,
      abi: EtherPhunksTokenMagma,
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

  async estimateContractGas(request: WriteContractParameters): Promise<number> {
    const gas = await publicClient.estimateContractGas(request);
    return Number(gas);
  }

  async validateTokenMint(hashId: string) {

    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: process.env.BRIDGE_ADDRESS_L2 as `0x${string}`,
      abi: EtherPhunksTokenMagma,
      functionName: 'tokenURIByHashId',
      args: [
        hashId
      ]
    });

    const response = await publicClient.readContract(request);

    console.log({ response });
  }

  createMetadata(
    hashId: string,
    tokenId: number,
    name: string,
    singleName: string,
    imageUri: string,
    attributes: any
  ) {
    const metadataAttributes = [];
    Object.keys(attributes).forEach((key) => {

      const isArray = Array.isArray(attributes[key]);
      if (isArray) {
        attributes[key].forEach((value: string) => {
          metadataAttributes.push({
            trait_type: this.toTitleCase(key),
            value: this.toTitleCase(value)
          });
        });
      } else {
        metadataAttributes.push({
          trait_type: this.toTitleCase(key),
          value: this.toTitleCase(attributes[key])
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

  toTitleCase(str: string) {
    return str?.split('-')?.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())?.join(' ');
  }

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
}

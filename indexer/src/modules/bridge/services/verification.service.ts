import { BadRequestException, Injectable } from '@nestjs/common';

import { encodePacked, formatEther, hashMessage, keccak256, recoverAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts'

import { SupabaseService } from '@/services/supabase.service';
import { Web3Service } from '@/services/web3.service';

import { NonceService } from '@/modules/bridge/services/nonce.service';
import { MintService } from '@/modules/bridge/services/mint.service';

import { SignatureBody } from '@/modules/bridge/models/bridge.model';

import dotenv from 'dotenv';
dotenv.config();

const prefix = process.env.CHAIN_ID === '1' ? '' : 'sepolia-';

@Injectable()
export class VerificationService {

  chain: 'mainnet' | 'sepolia' = process.env.CHAIN_ID === '1' ? 'mainnet' : 'sepolia';
  rpcURL: string = this.chain === 'mainnet' ? process.env.RPC_URL_MAINNET : process.env.RPC_URL_SEPOLIA;

  constructor(
    private readonly sbSvc: SupabaseService,
    private readonly nonceSvc: NonceService,
    private readonly web3Svc: Web3Service,
    private readonly mintSvc: MintService
  ) {}

  async verifySignature(body: SignatureBody) {

    const { address, hashId, sha, signature } = body;

    // Fetch the nonce for the user
    const userNonce = await this.nonceSvc.fetchUserNonce(address);
    const message = `Sign this message to verify ownership of the asset.\n\nAddress: ${address.toLowerCase()}\nEthscription ID: ${hashId}\nSHA: ${sha}\nNonce: ${userNonce}`;
    const messageHash = hashMessage(message);

    // Recover the signing address from the signature
    const signingAddress = await recoverAddress({
      hash: messageHash,
      signature
    });

    // Check if the signer is the same as the sender
    if (signingAddress.toLowerCase() !== address.toLowerCase())
      throw new BadRequestException('Signer does not match sender');

    const item = await this.sbSvc.checkEthscriptionExistsByHashId(hashId);

    // Check if the hashId exists
    if (!item)
      throw new BadRequestException(`HashId doesn't exist`);
    // Check if the owner is the same as the signer
    if (item.owner.toLowerCase() !== address.toLowerCase())
      throw new BadRequestException(`Signer doesn't match owner`);
    // Check if the sha matches
    if (item.sha !== sha)
      throw new BadRequestException(`SHA doesn't match`);

    // Get the gas estimate
    const gasEstimate = await this.estimateGas(hashId, address);
    // console.log({ gasEstimate });

    // get signature for contract verification
    const nonce = await this.web3Svc.fetchNonce(address);
    const contractSignature = await this.signMessage({
      prefix,
      hashId: hashId as `0x${string}`,
      owner: address as `0x${string}`,
      nonce,
    });

    return {
      signature: contractSignature,
      prefix,
      hashId,
      owner: item.owner,
      prevOwner: item.prevOwner,
      // gasEstimate
    };
  }

  async signMessage(
    data: {
      prefix: string,
      hashId: `0x${string}`,
      owner: `0x${string}`,
      nonce: bigint,
    }
  ): Promise<any> {
    // Define the message to sign for the smart contract verification
    const { prefix, hashId, nonce, owner } = data;

    const message = keccak256(
      encodePacked(
        ["bytes32", "uint256"],
        [hashId, nonce]
      )
    );

    const account = privateKeyToAccount('0x' + process.env.DATA_DEPLOYER_PK as `0x${string}`);
    const signature = await account.signMessage({ message: { raw: message as `0x${string}` } });

    const r = signature.substring(0, 66);
    const s = '0x' + signature.substring(66, 130);
    const v = signature.substring(130, 132);
    const vPadded = '0x' + v.padStart(64, '0');

    console.log({ r, s, v: vPadded, nonce, owner, hashId });

    return { r, s, v: vPadded };
  }

  async estimateGas(
    hashId: string,
    owner: string,
  ): Promise<number> {
    const request = await this.mintSvc.createMintRequest(hashId, owner);

    const [gasUsedWei, stats] = await Promise.all([
      this.mintSvc.estimateContractGas(request),
      this.mintSvc.fetchL2Fees()
    ]);

    // console.log({ gasUsedWei, stats });

    const usdValue = Number(stats.coin_price);
    const gasPriceWei = Number(stats.gas_prices.fast) * 1e9;
    const gasCost = BigInt(gasUsedWei) * BigInt(Math.round(gasPriceWei));
    const etherCost = formatEther(gasCost);

    console.log({ gasUsedWei, usdValue: usdValue * Number(etherCost) });

    return gasUsedWei;
  }
}

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '@/config/config.service';

import { Account, Chain, createPublicClient, createWalletClient, fallback, http, ParseAccount, PublicClient, RpcSchema, Transport, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, sepolia } from 'viem/chains';

import { magma } from './chains/magma.chain';

@Injectable()
export class EvmService {

  publicClientL1!: PublicClient<Transport, Chain, ParseAccount<Account>, RpcSchema>;
  publicClientL2!: PublicClient<Transport, Chain, ParseAccount<Account>, RpcSchema>;
  walletClientL2!: WalletClient;

  chains: Record<string, Record<number, Chain>> = {
    l1: {
      1: mainnet,
      11155111: sepolia,
    },
    l2: {
      6969696969: magma,
    }
  };

  constructor(
    private readonly configSvc: AppConfigService
  ) {
    this.publicClientL1 = this.createPublicClientL1();
    this.publicClientL2 = this.createPublicClientL2();
    this.walletClientL2 = this.createWalletClientL2();
  }

  private createPublicClientL1() {
    const chain = this.chains.l1[this.configSvc.chain.chainIdL1];
    return createPublicClient({
      chain,
      transport: fallback([
        http(this.configSvc.chain.rpc.l1.primary),
        // http(l1RpcURL_BACKUP),
      ], {
        rank: false,
      }),
      batch: {
        multicall: true,
      },
    })
  }

  private createPublicClientL2() {
    const chain = this.chains.l2[this.configSvc.chain.chainIdL2];
    return createPublicClient({
      chain,
      transport: fallback([
        http(this.configSvc.chain.rpc.l2.primary),
      ], {
        rank: false,
      }),
      batch: {
        multicall: true,
      },
    });
  }

  private createWalletClientL2() {
    const chain = this.chains.l2[this.configSvc.chain.chainIdL2];
    return createWalletClient({
      chain,
      transport: http(this.configSvc.chain.rpc.l2.primary),
      account: privateKeyToAccount(`0x${this.configSvc.relay.l2.privateKey}`),
    });
  }

}

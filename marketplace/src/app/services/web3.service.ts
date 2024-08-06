import { Injectable, NgZone } from '@angular/core';

import { Store } from '@ngrx/store';

import { environment } from 'src/environments/environment';

import { GlobalState } from '@/models/global-state';
import { Phunk } from '@/models/db';

import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';

// L1
import { EtherPhunksMarketABI } from '@/abi/EtherPhunksMarket';
import { PointsABI } from '@/abi/Points';

// L2
import { EtherPhunksNftMarketABI } from '@/abi/EtherPhunksNftMarket';
import { EtherPhunksBridgeL2ABI } from '@/abi/EtherPhunksBridgeL2';

import { reconnect, http, createConfig, Config, watchAccount, getPublicClient, getAccount, disconnect, getChainId, getWalletClient, GetWalletClientReturnType, GetAccountReturnType } from '@wagmi/core';
import { coinbaseWallet, walletConnect, injected } from '@wagmi/connectors';

import * as appStateActions from '@/state/actions/app-state.actions';

import { Chain, mainnet, sepolia } from 'viem/chains';
import { magma } from '@/constants/magmaChain';

import { Web3Modal } from '@web3modal/wagmi/dist/types/src/client';
import { createWeb3Modal } from '@web3modal/wagmi';

import { PublicClient, TransactionReceipt, WatchBlockNumberReturnType, WatchContractEventReturnType, createPublicClient, decodeFunctionData, formatEther, isAddress, keccak256, numberToHex, parseEther, stringToBytes, zeroAddress } from 'viem';

const marketAddress = environment.marketAddress;
const marketAddressL2 = environment.marketAddressL2;
const pointsAddress = environment.pointsAddress;
const bridgeAddressL2 = environment.bridgeAddressL2;

const projectId = 'd183619f342281fd3f3ff85716b6016a';

const metadata = {
  name: 'Ethereum Phunks',
  description: '',
  url: 'https://ethereumphunks.com',
  icons: []
};

const themeVariables = {
  '--w3m-font-family': 'Montserrat, sans-serif',
  '--w3m-accent': 'rgba(var(--highlight), 1)',
  '--w3m-z-index': 99999,
  '--w3m-border-radius-master': '0',
};

@Injectable({
  providedIn: 'root'
})

export class Web3Service {

  maxCooldown = 4;
  web3Connecting: boolean = false;
  connectedState!: Observable<any>;

  l1Client!: PublicClient;
  l2Client!: PublicClient;

  config!: Config;
  modal!: Web3Modal;

  globalConfig$ = this.store.select(state => state.appState.config).pipe(
    map((res) => ({
      ...res,
      maintenance: environment.production ? res.maintenance : false
    }))
  );

  constructor(
    private store: Store<GlobalState>,
    private ngZone: NgZone
  ) {
    const chains: [Chain, ...Chain[]] = environment.chainId === 1 ? [mainnet] : [sepolia, magma];

    this.l1Client = createPublicClient({
      chain: chains[0],
      transport: http(environment.rpcHttpProvider)
    });

    this.l2Client = createPublicClient({
      chain: chains[1],
      transport: http(chains[1]?.rpcUrls.default.http[0] || environment.magmaRpcHttpProvider)
    });

    this.config = createConfig({
      chains,
      transports: {
        [environment.chainId]: http(environment.rpcHttpProvider),
        6969696969: http(environment.magmaRpcHttpProvider)
      },
      connectors: [
        injected({ shimDisconnect: true }),
        walletConnect({ projectId, metadata, showQrModal: false }),
        coinbaseWallet({
          appName: metadata.name,
          appLogoUrl: metadata.icons[0]
        })
      ]
    });

    this.modal = createWeb3Modal({
      wagmiConfig: this.config,
      projectId,
      enableAnalytics: false,
      themeVariables,
    });

    this.createListeners();
    this.startBlockWatcher();
    this.startPointsWatcher();
  }

  async createListeners(): Promise<void> {

    this.connectedState = new Observable((observer) => watchAccount(this.config, {
      onChange: (account) => this.ngZone.run(() => observer.next(account))
    }));

    this.connectedState.pipe(
      tap((account: GetAccountReturnType) => {
        this.store.dispatch(appStateActions.setConnected({ connected: account.isConnected }));
        this.store.dispatch(appStateActions.setWalletAddress({ walletAddress: account.address }));
        // if (account.chainId !== environment.chainId) this.switchNetwork();
      }),
      catchError((err) => {
        this.disconnectWeb3();
        return of(err);
      }),
    ).subscribe();

    await reconnect(this.config);
  }

  blockWatcher!: WatchBlockNumberReturnType | undefined;
  startBlockWatcher(): void {
    if (this.blockWatcher) return;
    this.blockWatcher = this.l1Client.watchBlockNumber({
      emitOnBegin: true,
      onBlockNumber: (blockNumber) => {
        const currentBlock = Number(blockNumber);
        this.store.dispatch(appStateActions.setCurrentBlock({ currentBlock }));
      }
    });
  }

  pointsWatcher!: WatchContractEventReturnType | undefined;
  startPointsWatcher(): void {
    if (this.pointsWatcher) return;
    this.pointsWatcher = this.l1Client.watchContractEvent({
      address: pointsAddress as `0x${string}`,
      abi: PointsABI,
      onLogs: (logs) => {
        logs.forEach((log: any) => {
          if (log.eventName === 'PointsAdded') this.store.dispatch(appStateActions.pointsChanged({ log }));
          // TODO: Add event to smart contract
          if (log.eventName === 'MultiplierSet') {}
        });
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.modal.open();
    } catch (error) {
      console.log(error);
      this.disconnectWeb3();
    }
  }

  async disconnectWeb3(): Promise<void> {
    if (getAccount(this.config).isConnected) {
      await disconnect(this.config);
      this.store.dispatch(appStateActions.setWalletAddress({ walletAddress: '' }));
      this.store.dispatch(appStateActions.setConnected({ connected: false }));
    }
  }

  async switchNetwork(l: 'l1' | 'l2' = 'l1'): Promise<void> {
    const walletClient = await getWalletClient(this.config);
    const chainId = getChainId(this.config);

    if (l === 'l1') {
      console.log('switching chain', chainId, environment.chainId);
      if (chainId === environment.chainId) return;
      return await walletClient?.switchChain({ id: environment.chainId });
    } else if (l === 'l2') {
      if (chainId === magma.id) return;
      return await walletClient?.switchChain({ id: magma.id });
    }
  }

  async getActiveWalletClient(): Promise<GetWalletClientReturnType> {
    return await getWalletClient(this.config);
  }

  async checkHasWithdrawal(address: string): Promise<bigint> {
    const pendingWithdrawals = await this.readMarketContract('pendingWithdrawals', [address]);
    const pendingWithdrawalsV2 = await this.readMarketContract('pendingWithdrawalsV2', [address]);
    // console.log(pendingWithdrawals || BigInt(0)) + (pendingWithdrawalsV2 || BigInt(0));
    return (pendingWithdrawals || BigInt(0)) + (pendingWithdrawalsV2 || BigInt(0));
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // L1 CONTRACT METHODS ///////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async isInEscrow(tokenId: string): Promise<boolean> {
    const address = getAccount(this.config).address;
    if (!address) return false;

    const isInEscrow = await this.readMarketContract('userEthscriptionPossiblyStored', [address, tokenId]);
    return !!isInEscrow;
  }

  async sendEthscriptionToContract(tokenId: string): Promise<string | undefined> {
    const escrowed = await this.isInEscrow(tokenId);
    if (escrowed) throw new Error('Phunk already in escrow');
    return await this.transferPhunk(tokenId, marketAddress as `0x${string}`);
  }

  async withdrawPhunk(hashId: string): Promise<string | undefined> {
    const escrowed = await this.isInEscrow(hashId);
    if (!escrowed) throw new Error('Phunk not in escrow');
    return await this.writeMarketContract('withdrawPhunk', [hashId]);
  }

  async withdrawBatch(hashIds: string[]): Promise<string | undefined> {
    if (!hashIds.length) throw new Error('No phunks selected');
    return await this.writeMarketContract('withdrawBatchPhunks', [hashIds]);
  }

  async decodeInputData(data: string): Promise<any> {
    const decoded = decodeFunctionData({
      abi: EtherPhunksMarketABI,
      data: data as `0x${string}`,
    });
    return decoded;
  }

  async writeMarketContract(
    functionName: string,
    args: any[],
    value?: string
  ): Promise<string | undefined> {
    if (!functionName) return;
    await this.switchNetwork();

    const chainId = getChainId(this.config);
    const walletClient = await getWalletClient(this.config, { chainId });
    const publicClient = getPublicClient(this.config, { chainId });

    if (!publicClient) throw new Error('No public client');

    const alwaysOnFunctions = ['phunkNoLongerForSale', 'withdrawPhunk'];

    const [paused, { maintenance }] = await Promise.all([
      this.readMarketContract('paused', []),
      firstValueFrom(this.globalConfig$)
    ]);

    if (paused && (alwaysOnFunctions.indexOf(functionName) === -1)) throw new Error('Contract is paused');
    if (maintenance && (alwaysOnFunctions.indexOf(functionName) === -1)) throw new Error('In maintenance mode');

    const tx: any = {
      address: marketAddress as `0x${string}`,
      abi: EtherPhunksMarketABI,
      functionName,
      args,
      account: walletClient?.account?.address as `0x${string}`,
    };
    if (value) tx.value = value;

    const { request, result } = await publicClient.simulateContract(tx);

    console.log({result})

    return await walletClient?.writeContract(request);
  }

  async readMarketContract(functionName: any, args: (string | undefined)[]): Promise<any | null> {
    try {
      const call: any = await this.l1Client.readContract({
        address: marketAddress as `0x${string}`,
        abi: EtherPhunksMarketABI,
        functionName,
        args: args as any,
      });
      return call;
    } catch (error) {
      console.log({functionName, args, error});
      return null;
    }
  }

  async waitForTransaction(hash: string): Promise<TransactionReceipt> {
    const chainId = getChainId(this.config);
    const publicClient = getPublicClient(this.config, { chainId });
    if (!publicClient) throw new Error('No public client');
    const transaction = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
    return transaction;
  }

  async offerPhunkForSale(
    hashId: string,
    value: number,
    toAddress?: string | null,
    // revShare = 0
  ): Promise<string | undefined> {
    const weiValue = value * 1e18;
    if (toAddress) {
      if (!isAddress(toAddress)) throw new Error('Invalid address');
      return this.writeMarketContract(
        'offerPhunkForSaleToAddress',
        [hashId, weiValue, toAddress]
      );
    }

    return this.writeMarketContract(
      'offerPhunkForSale',
      [hashId, weiValue]
    );
  }

  async escrowAndOfferPhunkForSale(
    hashId: string,
    value: number,
    toAddress: string = zeroAddress,
    // revShare = 0
  ): Promise<string | undefined> {
    const weiValue = this.ethToWei(value);

    const sig = keccak256(stringToBytes('DEPOSIT_AND_LIST_SIGNATURE'));
    const bytes32Value = weiValue.toString(16).padStart(64, '0');
    toAddress = toAddress.toLowerCase().replace('0x', '').padStart(64, '0');
    // const revShareHex = numberToHex(revShare).replace('0x', '').padStart(64, '0');

    // console.log('revShareHex', revShareHex, Number(revShareHex));
    // console.log({ hashId, sig, bytes32Value, toAddress, revShare, revShareHex });

    return await this.batchTransferPhunks([hashId, sig, bytes32Value, toAddress], marketAddress);

    // return;
  }

  async batchOfferPhunkForSale(hashIds: string[], listPrices: number[]): Promise<string | undefined> {
    const weiValues = listPrices.map((price) => this.ethToWei(price));
    return this.writeMarketContract('batchOfferPhunkForSale', [hashIds, weiValues]);
  }

  async batchBuyPhunks(
    phunks: Phunk[]
  ): Promise<string | undefined> {

    const address = getAccount(this.config).address;

    const escrowAndListing = await this.fetchMultipleEscrowAndListing(phunks);

    const hashIds = [];
    const minSalePricesInWei = [];

    let total = BigInt(0);

    for (const [i, phunk] of phunks.entries()) {
      const hashId = phunk.hashId;
      const stored = escrowAndListing[hashId].stored;
      const listed = escrowAndListing[hashId][0];
      const listedBy = escrowAndListing[hashId][2];

      if (
        !phunk.listing ||
        !listed ||
        !stored ||
        listedBy.toLowerCase() !== phunk.prevOwner?.toLowerCase() ||
        phunk.prevOwner?.toLowerCase() === address?.toLowerCase()
      ) continue;

      hashIds.push(phunk.hashId);
      minSalePricesInWei.push(BigInt(phunk.listing.minValue));
      total += BigInt(phunk.listing.minValue);
    }

    if (!hashIds.length || !minSalePricesInWei.length) throw new Error('No phunks selected');

    return this.writeMarketContract(
      'batchBuyPhunk',
      [hashIds, minSalePricesInWei],
      total as any
    );
  }

  async phunkNoLongerForSale(hashId: string): Promise<string | undefined> {
    return this.writeMarketContract('phunkNoLongerForSale', [hashId]);
  }

  async transferPhunk(hashId: string, toAddress: string): Promise<string | undefined> {
    if (!hashId) throw new Error('No phunk selected');
    if (!toAddress) throw new Error('No address provided');

    await this.switchNetwork();

    const wallet = await getWalletClient(this.config);

    const req = await wallet.prepareTransactionRequest({
      chain: wallet.chain,
      account: getAccount(this.config).address as `0x${string}`,
      to: toAddress as `0x${string}`,
      value: BigInt(0),
      data: hashId as `0x${string}`,
    });

    console.log({req});

    return wallet?.sendTransaction(req);
  }

  async batchTransferPhunks(hashIds: string[], toAddress: string | null): Promise<string | undefined> {
    if (!hashIds.length) throw new Error('No phunks selected');
    if (!toAddress) throw new Error('No address provided');
    const hash = hashIds.map((res) => res.replace('0x', '')).join('');
    return await this.transferPhunk(`0x${hash}`, toAddress);
  }

  async lockPhunk(hexArr: string[]): Promise<string | undefined> {
    if (!hexArr.length) throw new Error('No phunk selected');
    await this.switchNetwork();

    const data = hexArr.map((res) => res.replace('0x', '')).join('');

    const wallet = await getWalletClient(this.config);

    const req = await wallet.prepareTransactionRequest({
      chain: wallet.chain,
      account: getAccount(this.config).address as `0x${string}`,
      to: environment.bridgeAddress as `0x${string}`,
      value: BigInt(1000000000000000),
      data: `0x${data}` as `0x${string}`,
    });

    console.log({req});

    return wallet?.sendTransaction(req);
  }

  async withdraw(): Promise<any> {
    const hash = await this.writeMarketContract('withdraw', []);
    const receipt = await this.waitForTransaction(hash!);
    return await this.checkHasWithdrawal(receipt.from);
  }

  async getUserPoints(address: string): Promise<number> {
    const points = await this.l1Client.readContract({
      address: pointsAddress as `0x${string}`,
      abi: PointsABI,
      functionName: 'points',
      args: [address as `0x${string}`],
    });
    return Number(points);
  }

  async getMultiplier(): Promise<any> {
    const multiplier = await this.l1Client.readContract({
      address: pointsAddress as `0x${string}`,
      abi: PointsABI,
      functionName: 'multiplier',
      args: [],
    });
    return multiplier;
  }

  /**
   * Fetches on-chain escrow and listing information for a given previous owner and hash ID.
   * @param prevOwner The previous owner's address.
   * @param hashId The hash ID of the item.
   * @returns A Promise that resolves to the escrow and listing information.
   */
  async fetchEscrowAndListing(prevOwner: string, hashId: string): Promise<any> {
    const contract = {
      address: marketAddress as `0x${string}`,
      abi: EtherPhunksMarketABI as any
    };

    const multicall = await this.l1Client.multicall({
      contracts: [{
        ...contract,
        functionName: 'userEthscriptionPossiblyStored',
        args: [prevOwner as `0x${string}`, hashId as `0x${string}`],
      },
      {
        ...contract,
        functionName: 'phunksOfferedForSale',
        args: [hashId as `0x${string}`],
      }]
    });
    return multicall;
  }

  /**
   * Fetches multiple on-chain escrow and listing information for an array of Phunks.
   * @param phunks - An array of Phunks for which to fetch the information.
   * @returns A Promise that resolves to an object containing the combined escrow and listing information.
   */
  async fetchMultipleEscrowAndListing(phunks: Phunk[]): Promise<any> {
    const contract = {
      address: marketAddress as `0x${string}`,
      abi: EtherPhunksMarketABI
    };

    const calls: any[] = [];
    for (const phunk of phunks) {
      calls.push({
        ...contract,
        functionName: 'userEthscriptionPossiblyStored',
        args: [phunk.prevOwner as `0x${string}`, phunk.hashId as `0x${string}`],
      });
      calls.push({
        ...contract,
        functionName: 'phunksOfferedForSale',
        args: [phunk.hashId as `0x${string}`],
      });
    }

    const res = await this.l1Client.multicall({ contracts: calls });

    // console.log({res})

    const combined: any = {};
    for (let i = 0; i < res.length; i += 2) {
      const hashId = (res[i + 1] as any).result[1];
      if (!hashId) continue;
      combined[hashId] = {
        stored: (res[i] as any).result,
        ...(res[i + 1] as any).result,
      };
    }
    return combined;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // L2 CONTRACT METHODS ///////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async phunksOfferedForSaleL2(hashId: string): Promise<any> {
    try {
      const tokenId = await this.readTokenContractL2('hashToToken', [hashId]);
      const offer = await this.readMarketContractL2('phunksOfferedForSale', [tokenId]);
      return offer;
    } catch (error) {
      console.log('phunksOfferedForSaleL2', {hashId, error});
      return null;
    }
  }

  async offerPhunkForSaleL2(
    hashId: string,
    value: number,
    address?: string,
    // revShare = 0
  ): Promise<string | undefined> {
    const tokenId = await this.readTokenContractL2('hashToToken', [hashId]);
    const weiValue = this.ethToWei(value);

    const isApproved = await this.readTokenContractL2(
      'isApprovedForAll',
      [getAccount(this.config).address, marketAddressL2]
    );

    if (!isApproved) {
      await this.writeTokenContractL2('setApprovalForAll', [marketAddressL2, true]);
    }

    if (address) {
      if (!isAddress(address)) throw new Error('Invalid address');
      return this.writeMarketContractL2('offerPhunkForSaleToAddress', [tokenId, weiValue, address]);
    } else {
      return this.writeMarketContractL2('offerPhunkForSale', [tokenId, weiValue]);
    }
  }

  async buyPhunkL2(hashId: string): Promise<string | undefined> {
    const tokenId = await this.readTokenContractL2('hashToToken', [hashId]);
    const offer = await this.readMarketContractL2('phunksOfferedForSale', [tokenId]);

    console.log({tokenId, offer});
    if (!offer[0]) throw new Error('Phunk not for sale');

    const value = offer[3];
    await this.switchNetwork('l2');
    return this.writeMarketContractL2('buyPhunk', [tokenId], value);
  }

  async phunkNoLongerForSaleL2(hashId: string): Promise<string | undefined> {
    const tokenId = await this.readTokenContractL2('hashToToken', [hashId]);
    return this.writeMarketContractL2('phunkNoLongerForSale', [tokenId]);
  }

  async writeMarketContractL2(
    functionName: string,
    args: any[],
    value?: string
  ): Promise<string | undefined> {
    if (!functionName) return;
    await this.switchNetwork('l2');

    const chainId = getChainId(this.config);
    const walletClient = await getWalletClient(this.config, { chainId });

    const paused = await this.readMarketContractL2('paused', []);
    const { maintenance } = await firstValueFrom(this.globalConfig$);

    if (paused) throw new Error('Contract is paused');
    if (maintenance) throw new Error('In maintenance mode');

    const tx: any = {
      address: marketAddressL2 as `0x${string}`,
      abi: EtherPhunksNftMarketABI,
      functionName,
      args,
      account: walletClient?.account?.address as `0x${string}`,
    };
    if (value) tx.value = value;

    const { request, result } = await this.l2Client.simulateContract(tx);
    return await walletClient?.writeContract(request);
  }

  async writeTokenContractL2(
    functionName: string,
    args: any[],
    value?: string
  ): Promise<string | undefined> {
    if (!functionName) return;
    await this.switchNetwork('l2');

    const chainId = getChainId(this.config);
    const walletClient = await getWalletClient(this.config, { chainId });

    const paused = await this.readMarketContractL2('paused', []);
    const { maintenance } = await firstValueFrom(this.globalConfig$);

    if (paused) throw new Error('Contract is paused');
    if (maintenance) throw new Error('In maintenance mode');

    const tx: any = {
      address: bridgeAddressL2 as `0x${string}`,
      abi: EtherPhunksBridgeL2ABI,
      functionName,
      args,
      account: walletClient?.account?.address as `0x${string}`,
    };
    if (value) tx.value = value;

    const { request, result } = await this.l2Client.simulateContract(tx);
    return await walletClient?.writeContract(request);
  }

  async readMarketContractL2(functionName: any, args: (string | undefined)[]): Promise<any> {
    // console.log('l2client', this.l2Client);
    if (!this.l2Client?.chain) return null;
    const call: any = await this.l2Client.readContract({
      address: marketAddressL2 as `0x${string}`,
      abi: EtherPhunksNftMarketABI,
      functionName,
      args: args as any,
    });
    // console.log('readMarketContractL2', {functionName, args, call});
    return call;
  }

  async readTokenContractL2(functionName: any, args: (string | undefined)[]): Promise<any> {
    // console.log('l2client', this.l2Client);
    if (!this.l2Client?.chain) return null;
    const call: any = await this.l2Client.readContract({
      address: bridgeAddressL2 as `0x${string}`,
      abi: EtherPhunksBridgeL2ABI,
      functionName,
      args: args as any,
    });
    // console.log('readTokenContractL2', {functionName, args, call});
    return call;
  }

  //////////////////////////////////
  // TXNS //////////////////////////
  //////////////////////////////////

  async getTransactionL1(hash: string): Promise<any> {
    const transaction = await this.l1Client.getTransaction({ hash: hash as `0x${string}` });
    return transaction;
  }

  async getTransactionReceiptL1(hash: string): Promise<TransactionReceipt | undefined> {
    const receipt = await this.l1Client.getTransactionReceipt({ hash: hash as `0x${string}` });
    return receipt;
  }

  pollReceipt(hash: string): Promise<TransactionReceipt> {
    let resolved = false;
    return new Promise(async (resolve, reject) => {
      while (!resolved) {
        // console.log('polling');
        try {
          const receipt = await this.waitForTransaction(hash);
          if (receipt) {
            resolved = true;
            resolve(receipt);
          }
        } catch (err) {
          console.log(err);
        }
      }
    });
  }

  //////////////////////////////////
  // UTILS /////////////////////////
  //////////////////////////////////

  async getCurrentAddress(): Promise<`0x${string}` | undefined> {
    const account = getAccount(this.config);
    return account.address;
  }

  async getCurrentBlockL1(): Promise<number> {
    const blockNum = await this.l1Client.getBlockNumber();
    return Number(blockNum);
  }

  ethToWei(eth: number): bigint {
    return parseEther(`${eth}`, 'wei');
  }

  weiToEth(wei: any): string {
    return formatEther(wei);
  }

  async verifyAddressOrEns(address: string | null): Promise<string | null> {
    try {
      if (!address) throw new Error('No address provided');

      address = address.toLowerCase();
      const isEns = address?.includes('.eth');
      const isAddress = this.verifyAddress(address);

      if (!isEns && !isAddress) throw new Error('Invalid Address');

      if (isEns) address = await this.getEnsOwner(address);
      else address = this.verifyAddress(address);

      if (!address) throw new Error('Invalid Address');
      return address;
    } catch (error) {
      console.log(error)
      return null;
    }
  }

  verifyAddress(address: string | null): string | null {
    if (!address) return null;
    const valid = isAddress(address);
    if (valid) return address.toLowerCase();
    return null;
  }

  async getEnsOwner(name: string) {
    return await this.l1Client.getEnsAddress({ name });
  }

  async getEnsFromAddress(address: string | null | undefined): Promise<string | null> {
    if (!address) return null;
    try {
      return await this.l1Client.getEnsName({ address: address as `0x${string}` });
    } catch (err) {
      return null;
    }
  }

  async getEnsAvatar(name: string): Promise<string | null> {
    if (!name) return null;
    return await this.l1Client.getEnsAvatar({ name });
  }
}

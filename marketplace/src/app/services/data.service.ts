import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Store } from '@ngrx/store';

import { Web3Service } from '@/services/web3.service';

import { filterData } from '@/constants/filterData';

import { EventType, GlobalState } from '@/models/global-state';
import { Attribute, Bid, Event, Listing, Phunk } from '@/models/db';

import { createClient } from '@supabase/supabase-js'

import { Observable, of, BehaviorSubject, from, forkJoin, firstValueFrom, EMPTY, fromEvent } from 'rxjs';
import { catchError, expand, map, reduce, switchMap, tap } from 'rxjs/operators';

import { NgForage } from 'ngforage';

import { environment } from 'src/environments/environment';

import * as dataStateActions from '@/state/actions/data-state.actions';
import * as appStateActions from '@/state/actions/app-state.actions';

import { MarketState } from '@/models/market.state';
import { DOCUMENT } from '@angular/common';

const supabaseUrl = environment.supabaseUrl;
const supabaseKey = environment.supabaseKey;
const supabase = createClient(supabaseUrl, supabaseKey);

@Injectable({
  providedIn: 'root'
})

export class DataService {

  public prefix: string = environment.chainId === 1 ? '' : '_sepolia';

  staticUrl = environment.staticUrl;
  escrowAddress = environment.marketAddress;

  private eventsData = new BehaviorSubject<Event[]>([]);
  eventsData$ = this.eventsData.asObservable();

  private currentFloor = new BehaviorSubject<number>(0);
  currentFloor$ = this.currentFloor.asObservable();

  filterData = filterData;

  attributes!: any;

  walletAddress$ = this.store.select(state => state.appState.walletAddress);

  constructor(
    private store: Store<GlobalState>,
    private http: HttpClient,
    private web3Svc: Web3Service,
    private ngForage: NgForage,
  ) {

    this.listenEvents();
    this.listenForBlocks();
    this.listenGlobalConfig();

    this.fetchUSDPrice();

    this.fetchStats().subscribe((res: any) => {
      // console.log('fetchStats', res);
    });

    // this.fetchUserEvents(
    //   '0xf1Aa941d56041d47a9a18e99609A047707Fe96c7',
    //   10,
    //   0
    // ).subscribe((res: any) => {
    //   console.log('fetchUserEvents', res);
    // });
  }

  listenEvents() {
    supabase
      .channel('events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events' + this.prefix
        },
        (payload) => {
          console.log({payload});
          if (!payload) return;
          this.store.dispatch(dataStateActions.dbEventTriggered({ payload }));
        },
      ).subscribe((status) => {
        console.log('Channel status:', status);
      });
  }

  listenGlobalConfig() {
    supabase
      .from('_global_config')
      .select('*')
      .eq('network', environment.chainId)
      .limit(1)
      .then(({ data, error }) => {
        if (error) return;
        this.store.dispatch(appStateActions.setGlobalConfig({ config: data[0] }));
      });

    supabase
      .channel('_global_config')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: '_global_config'
        },
        (payload) => {
          const config: any = payload.new;
          if (config.network !== environment.chainId) return;
          this.store.dispatch(appStateActions.setGlobalConfig({ config }));
        },
      ).subscribe();
  }

  listenForBlocks() {
    const blockQuery = supabase
      .from('blocks')
      .select('blockNumber')
      .eq('network', environment.chainId);

    blockQuery.then((res: any) => {
      const blockNumber = res.data[0]?.blockNumber || 0;
      this.store.dispatch(appStateActions.setIndexerBlock({ indexerBlock: blockNumber }));
    });

    // Temporary solution to stale app state. Supabase sucks at this.
    setInterval(() => {
      blockQuery.then((res: any) => {
        const blockNumber = res.data[0]?.blockNumber || 0;
        this.store.dispatch(appStateActions.setIndexerBlock({ indexerBlock: blockNumber }));
      });
    }, 20000);

    supabase
      .channel('blocks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocks'
        },
        (payload: any) => {
          if (payload.new.network !== environment.chainId) return;
          this.store.dispatch(appStateActions.setIndexerBlock({ indexerBlock: payload.new.blockNumber }));
        },
      ).subscribe();
  }

  getFloor(): number {
    return this.currentFloor.getValue();
  }

  getAttributes(slug: string): Observable<any> {
    return from(this.ngForage.getItem(`${slug}__attributes`)).pipe(
      switchMap((res: any) => {
        // console.log('getAttributes', res);
        if (res) return of(res);
        return this.http.get(`${environment.staticUrl}/data/${slug}_attributes.json`).pipe(
          tap((res: any) => this.ngForage.setItem(`${slug}__attributes`, res)),
        );
      }),
    );
  }

  addAttributes(slug: string | undefined, phunks: Phunk[]): Observable<Phunk[]> {
    if (!phunks.length) return of(phunks);
    if (!slug) return of(phunks);

    return this.getAttributes(slug).pipe(
      map((res: any) => {
        return phunks.map((item: Phunk) => ({
          ...item,
          attributes: item.sha ? res[item.sha] : [],
        }));
      }),
    );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // OWNED /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  fetchOwned(
    address: string,
    slug: string | undefined,
  ): Observable<Phunk[]> {
    // console.log('fetchOwned', {address, slug});

    if (!address) return of([]);
    address = address.toLowerCase();

    const query = supabase.rpc(
      'fetch_ethscriptions_owned_with_listings_and_bids' + this.prefix,
      { address, collection_slug: slug }
    );
    return from(query).pipe(
      // tap((res) => console.log('fetchOwned', res)),
      map((res: any) => res.data),
      map((res: any[]) => res.map((item: any) => {
        const ethscription = item.ethscription;
        // console.log('fetchOwned', ethscription);
        return {
          ...ethscription.phunk,
          listing: ethscription.listing ? ethscription.listing[0] : null,
          bid: ethscription.bid ? ethscription.bid[0] : null,
          isEscrowed:
            ethscription.phunk.owner === environment.marketAddress
            && ethscription.phunk.prevOwner === address,
          isBridged:
            ethscription.phunk.owner === environment.bridgeAddress
            && ethscription.phunk.prevOwner === address,
          attributes: [],
        };
      })),
      switchMap((res: any) => this.addAttributes(slug, res)),
    ) as Observable<Phunk[]>;
  }

  fetchMissedEvents(address: string, fromBlock: number): Observable<Event[]> {
    address = address.toLowerCase();

    const request = supabase
      .from('events' + this.prefix)
      .select(`
        *,
        ethscriptions${this.prefix}(tokenId,slug)
      `)
      .gte('blockNumber', fromBlock)
      .or(`from.eq.${address},to.eq.${address}`)
      .eq('type', 'PhunkBought');

    return from(request).pipe(
      map(res => res.data as any[]),
      map((res: any[]) => res.map((item: any) => {
        const collection = item[`ethscriptions${this.prefix}`];
        delete item[`ethscriptions${this.prefix}`];
        return {
          ...item,
          ...collection,
        };
      })),
      // tap((res) => console.log('fetchMissedEvents', res[0])),
    );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // MARKET DATA ///////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  fetchMarketData(slug: string): Observable<Phunk[]> {
    if (!slug) return of([]);
    return from(
      supabase.rpc(
        'fetch_ethscriptions_with_listings_and_bids' + this.prefix,
        { collection_slug: slug }
      )
    ).pipe(
      map((res: any) => res.data),
      map((res: any[]) => res.map((item: any) => {
        return {
          ...item.ethscription.ethscription,
          listing: item.ethscription.listing ? item.ethscription.listing[0] : null,
          bid: item.ethscription.bid ? item.ethscription.bid[0] : null,
        }
      })),
      switchMap((res: any) => this.addAttributes(slug, res)),
    ) as Observable<any>;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  fetchEvents(
    limit: number,
    type?: EventType,
    slug?: string,
  ): Observable<Event[]> {
    return from(supabase.rpc('fetch_events' + this.prefix, {
      p_limit: limit,
      p_type: type && type !== 'All' ? type : null,
      p_collection_slug: slug
    })).pipe(
      map((res: any) => {
        // console.log('fetchEvents', res);
        const result = res.data.map((tx: any) => {
          let type = tx.type;
          if (type === 'transfer') {
            if (tx.to?.toLowerCase() === environment.bridgeAddress) type = 'bridgeOut';
            if (tx.from?.toLowerCase() === environment.bridgeAddress) type = 'bridgeIn';
          }
          return { ...tx, type, } as Event;
        });
        return result;
      }),
      // tap((res) => console.log('fetchEvents', res)),
    );
  }

  fetchSingleTokenEvents(hashId: string): Observable<(Event & { [key: string]: string })[]> {
    const response = supabase
      .from('events' + this.prefix)
      .select(`
        *,
        ethscriptions${this.prefix}(tokenId,slug)
      `)
      .eq('hashId', hashId)
      .order('blockTimestamp', { ascending: false });

    return from(response).pipe(
      switchMap((res: any) => {
        if (!res.data.length) return this.fetchUnsupportedTokenEvents(hashId);
        return of(res.data);
      }),
      map((data: any) => {
        return data.map((tx: any) => {
          let type: EventType = tx.type;

          if (tx.type === 'transfer') {
            if (tx.to.toLowerCase() === environment.marketAddress) type = 'escrow';
            if (tx.to.toLowerCase() === environment.bridgeAddress) type = 'bridgeOut';
            if (tx.from.toLowerCase() === environment.bridgeAddress) type = 'bridgeIn';
          }

          return {
            ...tx,
            ...tx[`ethscriptions${this.prefix}`],
            type,
          };
        }) as (Event & { [key: string]: string })[];
      }),
    );
  }

  fetchUnsupportedTokenEvents(hashId: string): Observable<(Event & { [key: string]: string })[]> {
    const prefix = this.prefix.replace('_', '');

    // api-v2.ethscriptions.com
    // sepolia-api.ethscriptions.com
    return this.http.get<any>(`https://${prefix ? (prefix + '-') : ''}api.ethscriptions.com/api/ethscriptions/${hashId}`).pipe(
      map((res) => {

        const { valid_transfers } = res;
        // console.log('fetchUnsupportedTokenEvents', valid_transfers);

        const events = valid_transfers
        .sort((a: any, b: any) => a.timestamp > b.timestamp ? -1 : 1)
        .map((tx: any, i: number) => {
          const e: Event = {
            blockHash: tx.block_hash,
            blockNumber: tx.block_number,
            blockTimestamp: new Date(tx.timestamp),
            from: tx.from,
            to: tx.to,
            hashId,
            sha: tx.sha,
            id: tx.id,
            txHash: tx.transaction_hash,
            txId: tx.transaction_hash + '-' + tx.overall_order_number + '-' + tx.transaction_index,
            txIndex: tx.transaction_index,
            type: i === valid_transfers.length - 1 ? 'created' : 'transfer',
            value: tx.sale_price,
          };
          return { ...e, ...tx } as (Event & { [key: string]: string });
        });

        return events;
      }),
    );
  }

  fetchUserEvents(
    address: string,
    limit: number,
    fromBlock?: number
  ): Observable<any> {

    const query = supabase
    .rpc(
      `fetch_user_events_sepolia`,
      { p_limit: limit, p_address: address.toLowerCase() }
    );

    return from(query).pipe(
      map((res: any) => res.data),
    );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // TOP SALES /////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  fetchTopSales(limit: number): Observable<any> {
    return of([]);
    // return this.apollo.watchQuery({
    //   query: GET_TOP_SALES,
    //   variables: {
    //     skip: 0,
    //     limit: limit,
    //   },
    //   pollInterval: 5000,
    // }).valueChanges.pipe(
    //   map((result: any) => result.data.events as any[]),
    // );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // SINGLE PHUNK //////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async getHashIdFromTokenId(tokenId: string): Promise<string | null> {
    const query = supabase
      .from('ethscriptions' + this.prefix)
      .select('hashId')
      .eq('tokenId', tokenId);

    const res = await query;
    if (res?.data?.length) return res.data[0]?.hashId;
    return null;
  }

  fetchSinglePhunk(tokenId: string): Observable<Phunk> {

    let query = supabase
      .from('ethscriptions' + this.prefix)
      .select(`
        hashId,
        sha,
        tokenId,
        createdAt,
        owner,
        prevOwner,
        collections${this.prefix}(singleName,slug,name,supply),
        nfts${this.prefix}(hashId,tokenId,owner)
      `)
      .limit(1);

    return from(
      tokenId.startsWith('0x') ? of(tokenId) : this.getHashIdFromTokenId(tokenId)
    ).pipe(
      switchMap((hashId: string | null) => {
        if (hashId) query = query.eq('hashId', hashId)
        return from(query);
      }),
      map((res: any) => (res.data?.length ? res.data[0] : { tokenId })),
      map((phunk: any) => {

        const collection = phunk[`collections${this.prefix}`];
        const collectionName = collection?.name;

        const nft = phunk[`nfts${this.prefix}`]?.[0];
        if (nft) delete nft?.hashId;

        delete phunk[`nfts${this.prefix}`];
        delete phunk[`collections${this.prefix}`];

        const newPhunk = { ...phunk, ...collection, collectionName, nft } as Phunk;
        newPhunk.isEscrowed = phunk?.owner === environment.marketAddress;
        newPhunk.isBridged = phunk?.owner === environment.bridgeAddress;
        newPhunk.isSupported = !!collection;
        newPhunk.attributes = [];

        return newPhunk;
      }),
      switchMap((res: Phunk) => forkJoin([
        this.addAttributes(res.slug, [res]),
        from(this.getListingFromHashId(res.hashId)),
        this.checkConsensus([res]),
      ])),
      map(([[res], listing, [consensus]]) => {
        return {
          ...res,
          listing: listing?.listedBy.toLowerCase() === res.prevOwner?.toLowerCase() ? listing : null,
          consensus: consensus?.consensus,
          attributes: [ ...(res.attributes || []) ].sort((a: Attribute, b: Attribute) => {
            if (a.k === "Sex") return -1;
            if (b.k === "Sex") return 1;
            return 0;
          }),
        };
      }),
    );
  }

  fetchUnsupportedItem(hashId: string): Observable<Phunk> {
    const prefix = this.prefix.replace('_', '');

    const baseUrl = `https://${prefix ? (prefix + '-') : ''}api-v2.ethscriptions.com`;

    // api-v2.ethscriptions.com
    // sepolia-api.ethscriptions.com
    return this.http.get<any>(`${baseUrl}/ethscriptions/${hashId}`).pipe(
      // tap((res) => console.log('fetchUnsupportedItem', res)),
      map((res: any) => {
        const { result } = res;
        const item: Phunk = {
          slug: '',
          hashId: result.transaction_hash,
          tokenId: result.ethscription_number,
          createdAt: new Date(+result.block_timestamp * 1000),
          owner: result.current_owner,
          prevOwner: result.previous_owner,
          sha: result.content_sha?.replace('0x', ''),
          loading: false,

          imageUri: result.attachment_path ? `${baseUrl}${result.attachment_path}` : result.content_uri,
          creator: result.creator,

          singleName: 'Ethscription',
          collectionName: 'Ethscriptions',
        };

        return item;
      }),
      catchError((err) => {
        console.log('fetchUnsupportedItem', err);
        return of({
          slug: '',
          hashId,
          tokenId: -1,
          createdAt: new Date(),
          owner: '',
          prevOwner: '',
          sha: '',
          loading: false,
          singleName: 'Ethscription',
          collectionName: 'Ethscriptions',
        } as Phunk);
      }),
    );


    // slug: string
    // hashId: string
    // tokenId: number
    // createdAt: Date
    // owner: string
    // prevOwner: string | null
    // sha: string

    // creator?: string | null
    // data?: string | null

    // isEscrowed?: boolean;
    // isBridged?: boolean;

    // attributes?: Attribute[]
    // listing?: Listing | null
    // bid?: Bid | null

    // auction?: Auction | null

    // singleName?: string | null
    // collectionName?: string | null
    // supply?: number | null

    // consensus?: boolean

    // nft?: {
    //   owner: string
    //   tokenId: number
    // }

    // loading: boolean
  }

  async getListingFromHashId(hashId: string | undefined): Promise<Listing | null> {
    if (!hashId) return null;

    try {

      const [ callL1, callL2 ] = await Promise.all([
        this.web3Svc.readMarketContract('phunksOfferedForSale', [hashId]),
        this.web3Svc.phunksOfferedForSaleL2(hashId),
      ]);

      const offer = callL1[0] ? callL1 : callL2;
      if (!offer?.[0]) return null;

      const listing = {
        createdAt: new Date(),
        hashId: offer[1],
        minValue: offer[3].toString(),
        listedBy: offer[2],
        toAddress: offer[4],
        listed: offer[0],
      };

      return listing;
    } catch (error) {
      console.log('getListingFromHashId', error);
      return null;
    }
  }

  async checkConsensus(phunks: Phunk[]): Promise<Phunk[]> {
    if (!phunks.length) return [];

    const prefix = this.prefix.replace('_', '');

    const hashIds = phunks.map((item: Phunk) => item.hashId);
    let params: any = new HttpParams().set('consensus', 'true');
    for (let i = 0; i < hashIds.length; i++) {
      params = params.append('transaction_hash[]', hashIds[i]);
    }

    const fetchPage = (key?: string): Observable<any> => {
      if (key) {
        params = params.set('page_key', key);
      }
      return this.http.get<any>(`https://ethscriptions-api${prefix ? ('-' + prefix) : ''}.flooredape.io/ethscriptions`, { params }).pipe(
        // tap((res: any) => { if (res) console.log('checkConsensus', res); }),
      );
    };

    return await firstValueFrom(
      fetchPage().pipe(
        // Use expand to recursively call fetchPage until there's no more data
        expand((res: any) => res.pagination.has_more ? fetchPage(res.pagination.page_key) : EMPTY),
        reduce((acc: any, res) => res ? [...acc, ...res.result] : acc, []),
        // Map the final result to your structure
        map((res: any) => res.map((item: any) => {
          const phunk = phunks.find(p => p.hashId === item.transaction_hash);
          const consensus = !!phunk && phunk.owner === item.current_owner && (phunk.prevOwner === item.previous_owner || !phunk.prevOwner);
          return { ...phunk, consensus };
        })),
        catchError((err) => {
          console.log('checkConsensus', err);
          return of(phunks);
        })
      )
    );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // CHECKS ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  addressesAreHolders(addresses: string[]): Observable<any> {
    if (!addresses.length) return of([]);

    const query = supabase
      .rpc('addresses_are_holders_sepolia', { addresses });

    return from(query).pipe(
      // tap((res) => console.log(res)),
      map((res: any) => res.data),
    );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // COLLECTIONS ///////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  fetchCollections(): Observable<any[]> {
    const query = supabase
      .from('collections' + this.prefix)
      .select('*')
      .order('id', { ascending: false })
      .eq('active', true);

    return from(query).pipe(
      map((res: any) => res.data),
      // tap((res) => console.log('fetchCollections', res)),
    );
  }

  fetchCollectionsWithAssets(limit: number = 10): Observable<any[]> {
    const query = supabase
      .rpc(
        'fetch_collections_with_previews' + this.prefix,
        { preview_limit: limit }
      );

    return from(query).pipe(
      map((res: any) => res.data.map((item: any) => ({ ...item.ethscription }))),
      // tap((res) => console.log('fetchCollectionsWithAssets', res)),
    );
  }

  fetchStats(): Observable<any> {

    const query = supabase
      .rpc(`get_total_volume_sepolia`);

    return from(query).pipe(
      map((res: any) => res.data[0]),
    )
  }

  fetchAllWithPagination(
    slug: string = 'ethereum-phunks',
    fromNum: number,
    toNum: number,
    filters?: any,
  ): Observable<MarketState['activeMarketRouteData']> {

    return from(
      supabase.rpc(`fetch_all_with_pagination${this.prefix}`, {
        p_slug: slug,
        p_from_num: fromNum,
        p_to_num: toNum,
        p_filters: filters,
      })
    ).pipe(
      // tap((res) => console.log('fetchAllWithPagination', {slug, fromNum, toNum, filters, res})),
      switchMap((res: any) => {
        if (res.error) throw res.error;
        return this.getAttributes(slug).pipe(
          map((attributes) => {
            const data = res.data;
            return {
              data: data.data.map((item: Phunk) => ({
                ...item,
                attributes: attributes[item.sha],
              } as Phunk)),
              total: data.total_count
            }
          }),
        )
      }),
      catchError((err) => {
        // console.log('fetchAllWithPagination', err);
        return of({ data: [], total: 0 });
      })
    );

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // AUCTIONS //////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // async fetchAuctions(hashId: string): Promise<any> {
  //   let query = supabase
  //     .from('auctions' + this.prefix)
  //     .select('*')
  //     .eq('hashId', hashId)


  //   return from(query).pipe(map((res: any) => {
  //     console.log('fetchSinglePhunk', res);
  //     return res.data[0] || { phunkId };
  //   }));
  // }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // USD ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  fetchUSDPrice() {
    this.http.get('https://min-api.cryptocompare.com/data/price', {
      params: {
        fsym: 'ETH',
        tsyms: 'USD'
      }
    }).pipe(
      map((res: any) => res?.USD || 0),
      tap((res) => this.store.dispatch(dataStateActions.setUsd({ usd: res }))),
    ).subscribe();
  }

  fetchProofs(hashId: string): Observable<any> {
    return this.http.get(`http://localhost:3000/merkle-proofs`, {
      params: {
        leaf: hashId
      },
      responseType: 'text'
    });
  }

  fetchLeaderboard(): Observable<any> {
    return from(from(supabase.rpc('fetch_leaderboard' + this.prefix))).pipe(
      map((res: any) => res.data),
    );
  }
}

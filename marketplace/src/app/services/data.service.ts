import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Store } from '@ngrx/store';

import { Web3Service } from '@/services/web3.service';

import { EventType, GlobalState } from '@/models/global-state';
import { Attribute, Bid, Event, Listing, Phunk } from '@/models/db';

import { createClient, RealtimePostgresUpdatePayload, RealtimePostgresInsertPayload } from '@supabase/supabase-js'

import { Observable, of, BehaviorSubject, from, forkJoin, firstValueFrom, EMPTY, timer, merge, filter } from 'rxjs';
import { catchError, expand, map, reduce, switchMap, takeWhile, tap } from 'rxjs/operators';

import { NgForage } from 'ngforage';

import { environment } from 'src/environments/environment';

import * as dataStateActions from '@/state/actions/data-state.actions';
import * as appStateActions from '@/state/actions/app-state.actions';

import { MarketState } from '@/models/market.state';
import { DBComment, CommentWithReplies } from '@/models/comment';

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

  walletAddress$ = this.store.select(state => state.appState.walletAddress);

  constructor(
    @Inject(Web3Service) private web3Svc: Web3Service,
    private store: Store<GlobalState>,
    private http: HttpClient,
    private ngForage: NgForage,
  ) {
    // Initialize listeners and data fetching
    this.listenEvents();
    this.listenForBlocks();
    this.fetchUSDPrice();
  }

  /**
   * Sets up real-time listener for events from Supabase
   */
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
          if (!payload) return;
          this.store.dispatch(dataStateActions.dbEventTriggered({ payload }));
        },
      ).subscribe();
  }

  /**
   * Sets up real-time listener for global config changes
   */
  listenGlobalConfig(): Observable<any> {
    const initial$ = from(
      supabase
        .from('_global_config')
        .select('*')
        .eq('network', environment.chainId)
        .limit(1)
    ).pipe(
      map(({ data }) => data?.[0])
    );

    const changes$ = new Observable(subscriber => {
      const channel = supabase
        .channel('_global_config')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: '_global_config',
            filter: `network=eq.${environment.chainId}`
          },
          payload => subscriber.next((payload as any).new)
        )
        .subscribe();

      return () => channel.unsubscribe();
    });

    return merge(initial$, changes$).pipe(
      filter(config => !!config),
      tap((config) => {
        console.log('listenGlobalConfig', config);
      })
    );
  }

  /**
   * Sets up real-time listener for new blocks
   */
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

  /**
   * Gets current floor price
   */
  getFloor(): number {
    return this.currentFloor.getValue();
  }

  /**
   * Fetches attributes for a collection
   * @param slug Collection slug
   */
  getAttributes(slug: string): Observable<any> {
    return from(this.ngForage.getItem(`${slug}__attributes`)).pipe(
      switchMap((res: any) => {
        if (res) return of(res);
        return this.http.get(`${environment.staticUrl}/data/${slug}_attributes.json`).pipe(
          tap((res: any) => this.ngForage.setItem(`${slug}__attributes`, res)),
        );
      }),
    );
  }

  /**
   * Adds attributes to an array of Phunks
   * @param slug Collection slug
   * @param phunks Array of Phunks to add attributes to
   */
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

  /**
   * Fetches Phunks owned by an address
   * @param address Owner address
   * @param slug Collection slug
   */
  fetchOwned(
    address: string,
    slug: string | undefined,
  ): Observable<Phunk[]> {
    if (!address) return of([]);
    address = address.toLowerCase();

    const query = supabase.rpc(
      'fetch_ethscriptions_owned_with_listings_and_bids' + this.prefix,
      { address, collection_slug: slug }
    );
    return from(query).pipe(
      map((res: any) => res.data),
      map((res: any[]) => res.map((item: any) => {
        const ethscription = item.ethscription;
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

  /**
   * Fetches missed events for an address from a specific block
   * @param address User address
   * @param fromBlock Starting block number
   */
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
    );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // MARKET DATA ///////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Fetches market data for a collection
   * @param slug Collection slug
   */
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

  /**
   * Fetches events with optional filters
   * @param limit Number of events to fetch
   * @param type Event type filter
   * @param slug Collection slug filter
   */
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
    );
  }

  /**
   * Fetches events for a single token
   * @param hashId Token hash ID
   */
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

  /**
   * Fetches events for an unsupported token from Ethscriptions API
   * @param hashId Token hash ID
   */
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

  /**
   * Fetches events for a specific user
   * @param address User address
   * @param limit Number of events to fetch
   * @param fromBlock Starting block number
   */
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

  /**
   * Fetches top sales
   * @param limit Number of sales to fetch
   */
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

  /**
   * Gets hash ID from token ID
   * @param tokenId Token ID
   */
  async getHashIdFromTokenId(tokenId: string): Promise<string | null> {
    const query = supabase
      .from('ethscriptions' + this.prefix)
      .select('hashId')
      .eq('tokenId', tokenId);

    const res = await query;
    if (res?.data?.length) return res.data[0]?.hashId;
    return null;
  }

  /**
   * Fetches data for a single Phunk
   * @param tokenId Token ID
   */
  fetchSinglePhunk(tokenId: string): Observable<Phunk> {
    if (!tokenId) return of({} as Phunk);

    const fetch = () => {
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
          // console.log(res.attributes);
          const phunk = {
            ...res,
            listing: listing?.listedBy.toLowerCase() === res.prevOwner?.toLowerCase() ? listing : null,
            consensus: consensus?.consensus,
            attributes: [ ...(res.attributes || []) ]
              // .filter((a: Attribute) => typeof a.v !== 'number')
              .sort((a: Attribute, b: Attribute) => {
                if (a.k === "Sex" || a.k === "Type") return -1;
                if (b.k === "Sex" || b.k === "Type") return 1;
                return 0;
            }),
          };

          return phunk;
        }),
      );
    };

    return timer(0, 5000).pipe(
      switchMap(() => fetch()),
      takeWhile((phunk) => !phunk?.consensus, true)
    );
  }

  /**
   * Fetches data for an unsupported item
   * @param hashId Token hash ID
   */
  fetchUnsupportedItem(hashId: string): Observable<Phunk> {
    const prefix = this.prefix.replace('_', '');

    const baseUrl = `https://${prefix ? (prefix + '-') : ''}api-v2.ethscriptions.com`;

    return this.http.get<any>(`${baseUrl}/ethscriptions/${hashId}`).pipe(
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
  }

  /**
   * Gets listing data for a token
   * @param hashId Token hash ID
   */
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
      return null;
    }
  }

  /**
   * Checks consensus status for Phunks
   * @param phunks Array of Phunks to check
   */
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
      return this.http.get<any>(`https://ethscriptions-api${prefix ? ('-' + prefix) : ''}.flooredape.io/ethscriptions`, { params });
    };

    return await firstValueFrom(
      fetchPage().pipe(
        expand((res: any) => res.pagination.has_more ? fetchPage(res.pagination.page_key) : EMPTY),
        reduce((acc: any, res) => res ? [...acc, ...res.result] : acc, []),
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

  /**
   * Checks if addresses are holders
   * @param addresses Array of addresses to check
   */
  addressesAreHolders(addresses: string[]): Observable<any> {
    if (!addresses.length) return of([]);

    const query = supabase
      .rpc('addresses_are_holders_sepolia', { addresses });

    return from(query).pipe(
      map((res: any) => res.data),
    );
  }

  /**
   * Checks if an address is banned
   * @param address Address to check
   */
  async checkIsBanned(address: string): Promise<boolean> {
    if (environment.chainId === 1) return false;
    if (!address) return false;

    const { data, error } = await supabase
      .from('buyBans' + this.prefix)
      .select('*')
      .eq('id', address.toLowerCase());

    if (!data) return false;
    return data?.length > 0;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // COLLECTIONS ///////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Fetches collections with preview data
   * @param previewLimit Number of preview items per collection
   */
  fetchCollections(onlyDisabled = false): Observable<any[]> {
    // const devMode = environment.production === false;

    let query = supabase
      .from('collections' + this.prefix)
      .select('*')
      .order('id', { ascending: false });

    query = query.eq('active', onlyDisabled ? false : true);

    let params: any = {
      preview_limit: 20,
      show_inactive: onlyDisabled,
    };

    const queryWithPrevs = supabase
      .rpc(
        'fetch_collections_with_previews' + this.prefix,
        params
      );

    return from(query).pipe(
      // tap((res) => console.log('fetchCollections', res)),
      switchMap((res) => {
        return from(queryWithPrevs).pipe(
          // tap((withPrevs) => console.log('fetchCollections withPrevs', withPrevs)),
          map((withPrevs) => {
            const collections = res.data as any[];
            const withPreviews = withPrevs.data.map((item: any) => item.ethscription);

            for (let i = 0; i < collections.length; i++) {
              collections[i].previews = withPreviews.find((p: any) => p.slug === collections[i].slug)?.previews;
            }

            return collections.sort((a, b) => a.id - b.id);
          })
        )
      }),
    );
  }

  /**
   * Fetches disabled collections
   */
  fetchDisabledCollections(): Observable<any[]> {
    return this.fetchCollections(true).pipe(
      // tap((collections) => console.log('fetchDisabledCollections', collections)),
    );
  }

  /**
   * Fetches stats for a collection
   * @param slug Collection slug
   * @param days Number of days to fetch stats for
   */
  fetchStats(slug: string, days: number = 1000): Observable<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = supabase
      .rpc(
        `get_total_volume${this.prefix}`,
        { start_date: startDate, end_date: endDate, slug_filter: slug }
      );

    const queryTopSales = supabase
      .rpc(
        `fetch_top_sales${this.prefix}`,
        { p_slug: slug, p_limit: 100 }
      );

    return forkJoin([from(query), from(queryTopSales)]).pipe(
      map(([res, topSales]) => ({
        totalVolume: res.data[0],
        topSales: topSales.data,
      })),
      // tap((res) => console.log('fetchStats', res)),
    );
  }

  /**
   * Fetches paginated data with filters
   * @param slug Collection slug
   * @param fromNum Starting number
   * @param toNum Ending number
   * @param filters Optional filters
   */
  fetchAllWithPagination(
    slug: string,
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
        return of({ data: [], total: 0 });
      })
    );
  }

  fetchMintProgress(slug: string): Observable<any> {
    const subject = new BehaviorSubject<number>(0);

    // Initial fetch
    supabase
      .from('ethscriptions' + this.prefix)
      .select('*')
      .eq('slug', slug)
      .then((res: any) => {
        subject.next(res.data.length);
      });

    // Subscribe to realtime changes
    supabase
      .channel('ethscriptions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ethscriptions' + this.prefix,
          filter: `slug=eq.${slug}`
        },
        () => {
          // When change occurs, refetch count
          supabase
            .from('ethscriptions' + this.prefix)
            .select('*')
            .eq('slug', slug)
            .then((res: any) => {
              subject.next(res.data.length);
            });
        }
      )
      .subscribe();

    return subject.asObservable();
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

  /**
   * Fetches current USD price of ETH
   */
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

  /**
   * Fetches merkle proofs for a token
   * @param hashId Token hash ID
   */
  fetchProofs(hashId: string): Observable<any> {
    return this.http.get(`http://localhost:3000/merkle-proofs`, {
      params: {
        leaf: hashId
      },
      responseType: 'text'
    });
  }

  /**
   * Fetches leaderboard data
   */
  fetchLeaderboard(): Observable<any> {
    return from(from(supabase.rpc('fetch_leaderboard' + this.prefix))).pipe(
      map((res: any) => res.data),
    );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // COMMENTS //////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  async fetchComments(rootTopic: string): Promise<CommentWithReplies[]> {
    if (!rootTopic) return [];

    // Helper function to fetch comments for a given topic
    const fetchReplies = async (topic: string): Promise<CommentWithReplies[]> => {
      const { data, error } = await supabase
        .from('comments' + this.prefix)
        .select('*')
        .eq('topic', topic.toLowerCase())
        // .eq('deleted', false)
        .order('createdAt', { ascending: false });

      if (error || !data) return [];

      // For each comment, recursively fetch its replies
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const replies = await fetchReplies(comment.id);
          return {
            ...comment,
            replies: replies.length > 0 ? replies : undefined
          };
        })
      );

      return commentsWithReplies;
    };

    // Start fetching from the root topic
    return await fetchReplies(rootTopic.toLowerCase());
  }

  /**
   * Fetches comment changes for a given topic
   * @param topics Array of topics to fetch changes for
   */
  getCommentChanges(topics: string[]): Observable<void> {
    // console.log('getCommentChanges', topics);
    const table = 'comments' + this.prefix;

    const isInserted = (payload: RealtimePostgresInsertPayload<{
      [key: string]: any;
    }>, topics: string[]) => {
      const topic = payload.new.topic || payload.new.id;
      return topics.includes(topic);
    };

    const isUpdated = (payload: RealtimePostgresUpdatePayload<{
      [key: string]: any;
    }>, topics: string[]) => {
      const topic = payload.new.topic || payload.new.id;
      return topics.includes(topic);
    };

    return new Observable(subscriber => {
      const subscription = supabase
        .channel('comments')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table },
          (payload) => {
            if (isInserted(payload, topics)) subscriber.next();
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table },
          (payload) => {
            if (isUpdated(payload, topics)) subscriber.next();
          }
        )
        .subscribe();

      return () => subscription.unsubscribe();
    });
  }

  async getUserAvatar(address: string): Promise<string> {
    const { data, error } = await supabase
      .from('ethscriptions' + this.prefix)
      .select('*')
      .eq('owner', address.toLowerCase())
      .limit(1);

    if (error) return '';
    return data[0].sha;
  }
}

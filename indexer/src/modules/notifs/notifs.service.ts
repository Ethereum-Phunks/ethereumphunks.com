import { Inject, Injectable } from '@nestjs/common';

import { Collection, Ethscription, Event } from '@/models/db';
import { EthscriptionWithCollectionAndAttributes, NotificationMessage } from './models/message.model';

import { rarityData } from './constants/collections';

import { ImageService } from './services/image.service';
import { DiscordService } from './services/discord.service';
import { Web3Service } from '../shared/services/web3.service';
import { TwitterService } from './services/twitter.service';

import { createClient } from '@supabase/supabase-js';
import { formatUnits } from 'viem';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, serviceRole);
const suffix = process.env.CHAIN_ID === '1' ? '' : '_sepolia';

/**
 * Service for handling notifications about marketPlace sales
 */
@Injectable()
export class NotifsService {

  /** Current ETH/USD price */
  usdPrice: number = 0;

  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3Svc: Web3Service,
    private readonly imgSvc: ImageService,
    private readonly twitterSvc: TwitterService,
    private readonly discordSvc: DiscordService,
  ) {

    // Subscribe to Phunk sale events from Supabase
    supabase
      .channel(`sales${suffix}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: `events${suffix}`,
        filter: 'type=eq.PhunkBought'
      }, payload => {
        this.handleNotification(payload.new as Event);

        // console.log(payload.new);
      })
      .subscribe()

    // Fetch USD price every 10 minutes
    this.fetchUSDPrice().then(price => {
      this.usdPrice = price;
      setInterval(async () => {
        this.usdPrice = await this.fetchUSDPrice();
      }, 10 * 60 * 1000);
    });
  }

  /**
   * Handles notification for a specific hash ID
   * Sends based on last sale of hash ID
   * @param hashId The transaction hash ID
   */
  async handleNotificationFromHashId(hashId: string) {
    const response = supabase
      .from(`events${suffix}`)
      .select('*')
      .eq('type', 'PhunkBought')
      .eq('hashId', hashId)
      .order('blockTimestamp', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await response;

    await this.handleNotification(data);
  }

  /**
   * Processes notifications for Phunk sale events
   * @param phunkBoughtEvent The sale event data
   */
  async handleNotification(phunkBoughtEvent: Event): Promise<void> {
    const message = await this.createMessage(phunkBoughtEvent);
    if (!message) return;

    await this.twitterSvc.sendTweet(message);
    await this.discordSvc.postMessage(message);
  }

  /**
   * Creates a notification message for a Phunk sale event
   * @param event The sale event data
   * @returns Formatted notification message object
   */
  async createMessage(event: Event): Promise<NotificationMessage> {
    const chainId = Number(process.env.CHAIN_ID);
    const baseUrl = chainId === 1 ? 'https://etherphunks.eth.limo' : 'https://sepolia.etherphunks.eth.limo';

    const data = await this.getEthscriptionWithCollectionAndAttributes(event.hashId);
    if (!data.collection.notifications) return;

    const imageBuffer = await this.imgSvc.generateImage(data);

    const weiValue = BigInt(event.value);
    if (!weiValue) return;

    const value = formatUnits(weiValue, 18);
    const filename = `${new Date().getTime().toString()}.png`;

    const [fromAddress, toAddress] = await Promise.all([
      this.formatAddress(event.from),
      this.formatAddress(event.to)
    ]);

    const title = `${data.collection.singleName} #${data.ethscription.tokenId} was flipped`;
    const message = `From: ${fromAddress}\nTo: ${toAddress}\n\nFor: ${value} ETH ($${this.formatCash(Number(value) * this.usdPrice)})`;
    const link = `${baseUrl}/details/${data.ethscription.hashId}`;

    return {
      title,
      message,
      link,
      imageBuffer,
      filename,
    };
  }

  /**
   * Retrieves full Ethscription data including collection and attributes
   * @param hashId The Ethscription hash ID
   * @returns Ethscription data with collection and attributes
   * !FIXME: Update to use new attributes!
   */
  async getEthscriptionWithCollectionAndAttributes(hashId: string): Promise<EthscriptionWithCollectionAndAttributes> {
    const response = supabase
      .from(`ethscriptions${suffix}`)
      .select(`
        *,
        collections${suffix}!inner(
          name,
          singleName,
          notifications
        ),
        attributes!inner(
          values
        )
      `)
      .eq('hashId', hashId)
      .limit(1)
      .single();

    const { data } = await response;

    const result = {
      ethscription: data,
      collection: data[`collections${suffix}`],
      attributes: Object.keys(data.attributes.values)?.map((key: string) => {
        const k = key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        const v = Array.isArray(data.attributes.values[key])
          ? data.attributes.values[key].map(val => val?.replaceAll('-', ' ').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())).join(', ')
          : data.attributes.values[key]?.replaceAll('-', ' ').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        return {
          k,
          v,
          rarity: rarityData[data.slug][v],
        };
      }).sort((a, b) => (a.rarity || Infinity) - (b.rarity || Infinity)),
    };

    delete result.ethscription[`collections${suffix}`];
    return result;
  }

  /**
   * Fetches current ETH/USD price from CoinGecko API
   * @returns Current ETH price in USD
   */
  async fetchUSDPrice(): Promise<number> {
    const url = `https://api.coingecko.com/api/v3/simple/price`;

    const params = new URLSearchParams({
      ids: 'ethereum',
      vs_currencies: 'usd',
    });

    try {
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.ethereum.usd;
    } catch (error) {
      console.log(error);
      return 0;
    }
  }

  /**
   * Formats an Ethereum address, using ENS name if available
   * @param address The Ethereum address
   * @returns Formatted address or ENS name
   */
  async formatAddress(address: string): Promise<string> {
    let fmatAddress = await this.web3Svc.getEnsFromAddress(address);
    if (!fmatAddress) fmatAddress = address.slice(0, 6) + '...' + address.slice(-4);
    return fmatAddress;
  }

  /**
   * Formats a number into a human-readable currency string with K/M/B/T suffixes
   * @param n The number to format
   * @param decimals Number of decimal places (default 2)
   * @returns Formatted currency string
   */
  formatCash(n: number, decimals: number = 2): string {
    if (n === 0) return '0';
    if (n < 1) return n.toFixed(2) + '';
    if (n < 1e3) return n.toFixed(decimals) + '';
    if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
    return 0 + '';
  };
}

import { Injectable } from '@nestjs/common';

import { Collection, Ethscription, Event } from '@/models/db';

import { DiscordService } from './services/discord.service';

import { createClient } from '@supabase/supabase-js';

import { ImageService } from './services/image.service';
import { writeFile } from 'fs/promises';

import { rarityData } from './constants/collections';

import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
const supabase = createClient(supabaseUrl, serviceRole);
const suffix = process.env.CHAIN_ID === '1' ? '' : '_sepolia';

@Injectable()
export class NotifsService {

  usdPrice: number = 0;

  constructor(
    private readonly discordSvc: DiscordService,
    private readonly imgSvc: ImageService,
  ) {

    supabase
      .channel(`sales${suffix}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: `events${suffix}`,
        filter: 'type=eq.PhunkBought'
      }, payload => {
        this.handleNotificationsFromEvents(payload.new as Event);
      })
      .subscribe()

    // fetch USD price every 10 minutes
    this.fetchUSDPrice().then(price => {
      this.usdPrice = price;
      setInterval(async () => {
        this.usdPrice = await this.fetchUSDPrice();
      }, 10 * 60 * 1000);
    });
  }

  async handleNotificationFromHashId(hashId: string) {
    const response = supabase
      .from(`events${suffix}`)
      .select('*')
      .eq('type', 'PhunkBought')
      .eq('hashId', hashId)
      .limit(1)
      .single();

    const { data, error } = await response;

    await this.handleNotificationsFromEvents(data);
  }

  async getEthscription(hashId: string): Promise<{
    ethscription: Ethscription,
    collection: Collection,
    attributes: {
      k: string,
      v: string,
      rarity: number,
    }[],
  }> {
    const response = supabase
      .from(`ethscriptions${suffix}`)
      .select(`
        *,
        collections${suffix}!inner(
          name,
          singleName
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

  async handleNotificationsFromEvents(phunkBoughtEvent: Event): Promise<void> {
    const ethscription = await this.getEthscription(phunkBoughtEvent.hashId);
    const imageBuffer = await this.imgSvc.generateImage(ethscription);
    await writeFile(`temp/${phunkBoughtEvent.hashId}.png`, imageBuffer);
    await this.discordSvc.postMessage({ ...ethscription, event: phunkBoughtEvent, usdPrice: this.usdPrice }, imageBuffer);
  }

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
}

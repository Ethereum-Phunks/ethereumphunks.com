import { Inject, Injectable, Logger } from '@nestjs/common';

import { ImageService } from '@/modules/notifs/services/image.service';
import { Web3Service } from '@/modules/shared/services/web3.service';

import { SupabaseService } from '@/services/supabase.service';
import { Ethscription, Event, Collection } from '@/models/db';

import { AttachmentBuilder, Client, codeBlock, EmbedBuilder, Events, GatewayIntentBits, TextChannel } from 'discord.js';

import { formatUnits } from 'viem';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class DiscordService {

  private client: Client;

  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3Svc: Web3Service,
    private readonly imgSvc: ImageService,
    private readonly sbSvc: SupabaseService,
  ) {}

  // Initialize the bot
  initializeBot(): Promise<void> {
    if (this.client) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

      this.client.on(Events.ClientReady, (readyClient) => {
        Logger.debug('Discord bot initialized.', readyClient.user.tag);
        resolve();
      });

      this.client.login(process.env.DISCORD_BOT_TOKEN);
    })
  }

  async postMessage(data: {
    ethscription: Ethscription,
    collection: Collection,
    event: Event,
    usdPrice: number
  }, imageBuffer: Buffer): Promise<void> {
    if (Number(process.env.DISCORD)) await this.initializeBot();

    const weiValue = BigInt(data.event.value);
    if (!weiValue) return;

    const value = formatUnits(weiValue, 18);
    const filename = new Date().getTime().toString();

    const chainId = Number(process.env.CHAIN_ID);
    const channel = this.client.channels.cache.get(chainId === 1 ? '1202621714127912994' : '1227387575723888722') as TextChannel;
    // const channel = this.client.channels.cache.get('1311779467064119357') as TextChannel;

    const attachment = new AttachmentBuilder(imageBuffer, { name: `${filename}.png` });

    const baseUrl = chainId === 1 ? 'https://etherphunks.eth.limo' : 'https://sepolia.etherphunks.eth.limo';

    const [fromAddress, toAddress] = await Promise.all([
      this.formatAddress(data.event.from),
      this.formatAddress(data.event.to)
    ]);

    const title = `${data.collection.singleName} #${data.ethscription.tokenId} was flipped`;
    const description = `From: ${fromAddress}\nTo: ${toAddress}\n\nFor: ${value} ETH ($${this.formatCash(Number(value) * data.usdPrice)})`;
    const link = `${baseUrl}/details/${data.ethscription.hashId}`;

    const exampleEmbed = new EmbedBuilder()
      .setColor(0xC3FF00)
      .setTitle(title)
      .setURL(link)
      .setDescription(codeBlock(description))
      .setImage(`attachment://${filename}.png`)
      // .setTimestamp()
      .setFooter({ text: 'Be Phree. Be Phunky. 👍' });

    await channel.send({ embeds: [exampleEmbed], files: [attachment] });
  }

  async formatAddress(address: string): Promise<string> {
    let fmatAddress = await this.web3Svc.getEnsFromAddress(address);
    if (!fmatAddress) fmatAddress = address.slice(0, 6) + '...' + address.slice(-4);
    return fmatAddress;
  }

  formatCash(n: number, decimals: number = 2): string {
    if (n === 0) return '0';
    if (n < 1) return n.toFixed(2) + '';
    if (n < 1e3) return n.toFixed(decimals) + '';
    // if (n < 1e3) return String(n);
    if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
    return 0 + '';
  };
}

// # https://discord.com/api/oauth2/authorize?client_id=1226779608406294588&permissions=2147485696&scope=bot%20applications.commands

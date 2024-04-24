import { Injectable, Logger } from '@nestjs/common';

import { ImageService } from '@/modules/notifs/services/image.service';
import { Web3Service } from '@/services/web3.service';

import { SupabaseService } from '@/services/supabase.service';
import { Event } from '@/models/db';

import { AttachmentBuilder, Client, EmbedBuilder, Events, GatewayIntentBits, TextChannel } from 'discord.js';

import { formatUnits } from 'viem';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class DiscordService {

  private client: Client;

  constructor(
    private readonly imgSvc: ImageService,
    private readonly sbSvc: SupabaseService,
    private readonly web3Svc: Web3Service,
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

  async postMessage(events: Event[]): Promise<void> {
    if (Number(process.env.DISCORD)) await this.initializeBot();

    const hashIds = events.map(e => e.hashId);
    if (!hashIds.length) return;

    const items = await this.sbSvc.checkEthscriptionsExistsByHashIds(hashIds);
    const imageBuffer = await this.imgSvc.generateImage(items);

    const weiValue = BigInt(events[0].value);
    if (!weiValue) return;

    const value = formatUnits(weiValue, 18);
    const filename = new Date().getTime().toString();

    const chainId = Number(process.env.CHAIN_ID);

    const channel = this.client.channels.cache.get(chainId === 1 ? '1202621714127912994' : '1227387575723888722') as TextChannel;

    const attachment = new AttachmentBuilder(imageBuffer, { name: `${filename}.png` });

    let fmatAddress = await this.web3Svc.getEnsFromAddress(items[0].owner);
    if (!fmatAddress) fmatAddress = items[0].owner.slice(0, 6) + '...' + items[0].owner.slice(-4);
    const description = `By ${fmatAddress}\nFor ${value} ETH`;

    const single = items.length === 1;
    const count = items.length;
    const title = `${single ? '' : count} Phunk${single ? (' #' + items[0].tokenId + ' was') : 's were'} flipped`;
    const link = single ? `https://${chainId === 1 ? 'etherphunks.eth.limo' : 'sepolia.ethereumphunks.com'}/#/details/${items[0].tokenId}` : `https://${chainId === 1 ? 'etherphunks.eth.limo' : 'sepolia.ethereumphunks.com'}`;

    const exampleEmbed = new EmbedBuilder()
      .setColor(0xC3FF00)
      .setTitle(title)
      .setURL(link)
      .setDescription(description)
      .setImage(`attachment://${filename}.png`)
      // .setTimestamp()
      .setFooter({ text: 'Be Phree. Be Phunky. 👍' });

    await channel.send({ embeds: [exampleEmbed], files: [attachment] });
  }

}

// # https://discord.com/api/oauth2/authorize?client_id=1226779608406294588&permissions=2147485696&scope=bot%20applications.commands

import { HttpException, HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { StorageService } from '@/modules/storage/storage.service';
import { Web3Service } from '@/modules/shared/services/web3.service';
import { DataService } from '@/modules/shared/services/data.service';

import { Collection } from '@/modules/storage/models/db';
import { CollectionMetadata } from './models/collection-metadata';

import { mkdir, readFile, writeFile } from 'fs/promises';
import { fromHex } from 'viem';

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AdminService implements OnModuleInit {

  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    private readonly dbSvc: StorageService,
    private readonly dataSvc: DataService,
  ) {}

  async onModuleInit() {
    // this.indexNewCollection('mfpurrs');
    // this.createAndUploadCollectionImages('mfpurrs');
  }

  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>//
  // GENERATE A COLLECTION METADATA FILE //
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>//

  /**
   * Generates a JSON file containing formatted metadata from a collection
   * This is a requirement to run any of the functions in this file
   * @param slug - The slug of the collection
   * @param metadataUrl - The URL of the metadata file
   */
  async generateNewCollectionMetadata(slug: string, metadataUrl: string): Promise<CollectionMetadata> {

    const metadata = await fetch(metadataUrl);
    const metadataJson = await metadata.json();

    // We only do this if the logo image is a hex string
    const logoImageHex = metadataJson.logo_image_uri.split('/').find(part => part.startsWith('0x'));
    const { input: logoTxInput } = await this.web3SvcL1.getTransaction(logoImageHex as `0x${string}`);
    const logoImage = fromHex(logoTxInput, 'string');

    const collectionMetadata: CollectionMetadata = {
      name: metadataJson.name,
      logo_image: logoImage,
      banner_image: metadataJson.banner_image_uri,
      total_supply: metadataJson.total_supply,
      slug,
      description: metadataJson.description,
      website_url: metadataJson.website_link,
      twitter_url: metadataJson.twitter_link,
      discord_url: metadataJson.discord_link,
      background_color: metadataJson.background_color,
      collection_items: [],
    };

    for (let i = 0; i < metadataJson.collection_items.length; i++) {
      Logger.log(`Processing item ${i} of ${metadataJson.collection_items.length}`);

      const item = metadataJson.collection_items[i];
      const { input: txInput } = await this.web3SvcL1.getTransaction(item.ethscription_id as `0x${string}`);
      const image = fromHex(txInput, 'string');
      const sha256 = crypto.createHash('sha256').update(image).digest('hex');

      // These should be adjusted based on input file
      const newItem = {
        id: item.ethscription_id,
        index: item.item_index + 1,
        sha: sha256,
        name: item.name,
        description: item.description,
        attributes: item.item_attributes,
      };

      collectionMetadata.collection_items.push(newItem);
    }

    await mkdir('./metadata', { recursive: true });
    await writeFile(`./metadata/${slug}.json`, JSON.stringify(collectionMetadata, null, 2));

    Logger.log(`Metadata generated for ${slug}`);

    return collectionMetadata;
  }

  /**
   * Generates a JSON file containing formatted metadata from the database
   * This is a requirement to run any of the functions in this file
   * @param slug - The slug of the collection
   */
  async generateCollectionMetadataFromDB(slug: string): Promise<CollectionMetadata> {
    const collection = await this.dbSvc.fetchCollection(slug);
    if (!collection) throw new Error('Collection not found');

    const collectionAttributes = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public/data/${slug}_attributes.json`)
    const collectionAttributesData = await collectionAttributes.json();

    const collectionMetadata = {
      name: collection.name,
      logo_image: collection.image,
      banner_image: collection.posterHashId,
      total_supply: collection.supply,
      slug: collection.slug,
      description: collection.description,
      website_url: collection.website,
      twitter_url: `https://x.com/${collection.twitter}`,
      discord_url: collection.discord,
      background_color: collection.defaultBackground ? `#${collection.defaultBackground}` : `#C3FF00`,
      collection_items: [],
    };

    const collectionItems = await this.dbSvc.fetchAllEthscriptions(slug);
    for (const item of collectionItems) {
      const attributes = collectionAttributesData[item.sha];
      if (!attributes) {
        console.log('No attributes found for', item.hashId);
      }

      const itemMetadata = {
        id: item.hashId,
        index: item.tokenId,
        sha: item.sha,
        name: attributes?.find((attr: any) => attr.k === 'Name')?.v || `${collection.singleName} #${item.tokenId}`,
        description: attributes?.find((attr: any) => attr.k === 'Description')?.v || '',
        attributes: attributes?.map((attr: any) => {
          if (attr.k === 'Name') return null;
          if (attr.k === 'Description') return null;

          return {
            trait_type: attr.k,
            value: attr.v,
          };
        }).filter((attr: any) => !!attr),
      };

      collectionMetadata.collection_items.push(itemMetadata);
    }

    await mkdir('./metadata', { recursive: true });
    await writeFile(`./metadata/${slug}.json`, JSON.stringify(collectionMetadata, null, 2));

    Logger.log(`Metadata generated for ${slug}`);

    return collectionMetadata;
  }

  /**
   * Adds a collection to the database collection table
   * This is a requirement to display the collection on the marketplace
   * @param slug - The slug of the collection
   * @param singleName - The single name of the collection
   */
  async createCollectionInDB(slug: string, singleName: string) {
    const metadata = await this.getMetadata(slug);

    const collection = {
      slug,
      name: metadata.name,
      singleName,
      description: metadata.description,
      image: metadata.logo_image,
      posterHashId: null,
      supply: metadata.total_supply,
      website: metadata.website_url,
      twitter: metadata.twitter_url,
      discord: metadata.discord_url,
      defaultBackground: metadata.background_color,
      standalone: true,
      active: false,
    } as Collection;

    try {
      await this.dbSvc.createCollection(collection);
    } catch(error) {
      Logger.error('Error adding collection to db', error);
      throw new Error('Error adding collection to db');
    }
  }

  /**
   * Adds attributes to the database attributes_new table
   * This is a requirement for indexing collection items
   * @param slug - The slug of the collection
   */
  async addAttributesToDb(slug: string) {
    const metadata = await this.getMetadata(slug);
    const items = metadata.collection_items;

    const finalAttributes = [];

    for (const item of items) {
      const attributes = item.attributes;
      const sha = item.sha;
      const tokenId = item.index;

      const values = attributes?.reduce((acc: any, attr: any) => {
        const { trait_type, value } = attr;
        if (acc[trait_type]) {
          if (Array.isArray(acc[trait_type])) {
            acc[trait_type].push(value);
          } else {
            acc[trait_type] = [acc[trait_type], value];
          }
        } else {
          acc[trait_type] = value;
        }

        return acc;
      }, {});

      finalAttributes.push({
        slug,
        sha,
        values,
        tokenId,
      });
    }
    await this.dbSvc.addAttributesNew(finalAttributes);
  }

  /**
   * Generates an attributes file for a collection and uploads it to the data bucket
   * This is a requirement for filtering on the marketplace
   * @param slug - The slug of the collection
   */
  async generateAttributesFiltersAndUpload(slug: string) {
    const metadata = await this.getMetadata(slug);

    const formattedAttributes: any = {};

    for (const item of metadata.collection_items) {
      formattedAttributes[item.sha] = [];
      item.attributes.forEach((attribute) => {
        formattedAttributes[item.sha].push({
          k: attribute.trait_type,
          v: attribute.value,
        });
      });
    }

    const attributesFile = Buffer.from(JSON.stringify(formattedAttributes));
    await this.dbSvc.uploadAttributesFile(slug, attributesFile);
  }

  /**
   * Creates and uploads images for all Dystophunks
   * Processes each item's image data and triggers upload to storage
   * This is a requirement for displaying images on the marketplace
   * @param slug - The slug of the collection
   */
  async createAndUploadCollectionImages(slug: string) {
    const metadata = await this.getMetadata(slug);

    for (const item of metadata.collection_items) {
      const { input } = await this.web3SvcL1.getTransaction(item.id as `0x${string}`);
      const imageDataCleaned = fromHex(input, 'string');
      const sha256 = crypto.createHash('sha256').update(imageDataCleaned).digest('hex');
      const image = Buffer.from(imageDataCleaned.split(',')[1], 'base64');
      const extension = imageDataCleaned.split(',')[0].split('/')[1].split(';')[0];

      await this.dbSvc.uploadImage(image, sha256, extension, slug);
    }
  }

  /**
   * Indexes a new collection
   * @param slug - The slug of the collection
   */
  async indexNewCollection(slug: string) {
    let metadata: string;
    try {
      metadata = await readFile(`./metadata/${slug}.json`, 'utf8');
    } catch (error) {
      Logger.error(`The collection "${slug}" does not have a metadata file`);
      return;
    }

    const collection = JSON.parse(metadata);
    for (let i = 0; i < collection.collection_items.length; i++) {
      await this.reIndexEthscriptionItemAndTransfers(collection.collection_items[i].id);
      if (i > 1) break;
    }
  }

  /**
   * Re-indexes an ethscription item and its transfers
   * @param hashId - The hash ID of the ethscription item
   */
  async reIndexEthscriptionItemAndTransfers(hashId: string) {
    const ethscription = await this.dataSvc.getEthscriptionByHashId(hashId);
    const transfers = ethscription.ethscription_transfers;

    for (const transfer of transfers) {
      await fetch(`https://relay.ethereumphunks.com/admin/reindex-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.API_KEY
        },
        body: JSON.stringify({ hash: transfer.transaction_hash })
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Checks the consensus of an existing collection
   * @param slug - The slug of the collection
   */
  async checkCollectionConsensus(slug: string) {
    const ethscriptions = await this.dbSvc.fetchAllEthscriptions(slug);

    const noConsensus = [];
    const errors = [];

    for (let idx = 0; idx < ethscriptions.length; idx++) {
      const ethscription = ethscriptions[idx];
      const { hashId } = ethscription;

      try {
        const { creator, owner, prevOwner } = await this.dbSvc.checkEthscriptionExistsByHashId(hashId);

        const {
          creator: consensusCreator,
          current_owner: consensusOwner,
          previous_owner: consensusPrevOwner
        } = await this.dataSvc.getEthscriptionByHashId(hashId);

        if (
          consensusCreator !== creator ||
          consensusOwner !== owner ||
          consensusPrevOwner !== prevOwner
        ) {
          Logger.error('No consensus', hashId);
          noConsensus.push(hashId);
        }

        Logger.log(`Checked ${idx} ethscriptions`);
      } catch(error) {
        Logger.error('Error', error);
        errors.push(hashId);
      }
    }

    Logger.log(`No consensus for ${noConsensus.length} ethscriptions`);
    await mkdir('./consensus', { recursive: true });
    await writeFile(`./consensus/${slug}_no_consensus.json`, JSON.stringify(noConsensus));
    await writeFile(`./consensus/${slug}_errors.json`, JSON.stringify(errors));
  }

  /**
   * Retrieves the metadata for a collection
   * @param slug - The slug of the collection
   * @returns The metadata for the collection
   */
  private async getMetadata(slug: string) {
    try {
      return JSON.parse(await readFile(`./metadata/${slug}.json`, 'utf8'));
    } catch (error) {
      throw new HttpException(`The collection '${slug}' does not have a metadata file. Generate one with /admin/generate-collection-metadata.`, HttpStatus.BAD_REQUEST);
    }
  }
}

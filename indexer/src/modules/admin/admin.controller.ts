import { Body, Controller, HttpException, HttpStatus, Post } from "@nestjs/common";

import { AdminService } from './admin.service';
import { ProcessingService } from '@/services/processing.service';

@Controller('admin')
export class AdminController {

  constructor(
    private readonly adminSvc: AdminService,
    private readonly processingSvc: ProcessingService,
  ) {}

  @Post('has-access')
  async hasAccess(@Body() body: { address: `0x${string}` }): Promise<boolean> {
    return true;
  }

  /**
   * Reindexes a specific block.
   *
   * @param body - The request body containing the block number.
    * @returns A promise that resolves to the result of re-indexing the block.
   */
  @Post('reindex-block')
  async reindexBlock(@Body() body: { blockNumber: number }): Promise<void> {
    return await this.processingSvc.processBlock(body.blockNumber, false);
  }

  @Post('reindex-transaction')
  async reindexTransaction(@Body() body: { hash: `0x${string}` }): Promise<void> {
    return await this.processingSvc.processSingleTransaction(body.hash);
  }

  /**
   * Generates collection metadata
   * @param slug - The slug of the collection
   * @param metadataUrl - The URL of the metadata file
   */
  @Post('generate-collection-metadata')
  async createCollection(@Body() body: { slug: string, metadataUrl: string }) {
    const { slug, metadataUrl } = body;

    if (!slug) {
      throw new HttpException('Slug is required', HttpStatus.BAD_REQUEST);
    }

    if (!metadataUrl) {
      return this.adminSvc.generateCollectionMetadataFromDB(slug);
    }

    return this.adminSvc.generateNewCollectionMetadata(slug, metadataUrl);
  }

  /**
   * Creates a new collection in the database
   * @param slug - The slug of the collection
   * @param singleName - The single name of the collection
   */
  @Post('create-collection')
  async createCollectionInDB(@Body() body: { slug: string, singleName: string }) {
    const { slug, singleName } = body;

    if (!slug || !singleName) {
      throw new HttpException('Slug and single name are required', HttpStatus.BAD_REQUEST);
    }

    return this.adminSvc.createCollectionInDB(slug, singleName);
  }

  /**
   * Adds attributes to the database attributes_new table
   * This is a requirement for indexing collection items
   * @param slug - The slug of the collection
   */
  @Post('add-attributes')
  async addAttributes(@Body() body: { slug: string }) {
    const { slug } = body;

    if (!slug) {
      throw new HttpException('Slug is required', HttpStatus.BAD_REQUEST);
    }

    return this.adminSvc.addAttributesToDb(slug);
  }

  /**
   * Generates and uploads attributes filters for a collection
   * @param slug - The slug of the collection
   */
  @Post('add-filters')
  async addFilters(@Body() body: { slug: string }) {
    const { slug } = body;

    if (!slug) {
      throw new HttpException('Slug is required', HttpStatus.BAD_REQUEST);
    }

    return this.adminSvc.generateAttributesFiltersAndUpload(slug);
  }

  /**
   * Creates and uploads images for all Dystophunks
   * Processes each item's image data and triggers upload to storage
   * This is a requirement for displaying images on the marketplace
   * @param slug - The slug of the collection
   */
  @Post('create-collection-images')
  async createCollectionImages(@Body() body: { slug: string }) {
    const { slug } = body;

    if (!slug) {
      throw new HttpException('Slug is required', HttpStatus.BAD_REQUEST);
    }

    return this.adminSvc.createAndUploadCollectionImages(slug);
  }

  /**
   * Indexes a new collection
   * @param slug - The slug of the collection
   */
  @Post('index-collection')
  async indexCollection(@Body() body: { slug: string }) {
    const { slug } = body;

    if (!slug) {
      throw new HttpException('Slug is required', HttpStatus.BAD_REQUEST);
    }

    return this.adminSvc.indexNewCollection(slug);
  }

  /**
   * Re-indexes an ethscription item and its transfers
   * @param hashId - The hash ID of the ethscription item
   */
  @Post('reindex-ethscription')
  async reindexEthscription(@Body() body: { hashId: string }) {
    const { hashId } = body;

    if (!hashId) {
      throw new HttpException('Hash ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.adminSvc.reIndexEthscriptionItemAndTransfers(hashId);
  }
}

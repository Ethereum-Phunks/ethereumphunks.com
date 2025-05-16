// nestjs controller
import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';

import { AppConfigService } from '@/config/config.service';
import { Web3Service } from '@/modules/shared/services/web3.service';

import { EthscriptionsMintService } from './ethscriptions-mint.service';

import dotenv from 'dotenv';
dotenv.config();

@Controller('mint')
export class EthscriptionsMintController {
  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    private readonly mintService: EthscriptionsMintService,
    private readonly configSvc: AppConfigService
  ) {}

  /**
   * Get a random mint item for a given slug and address
   * @param slug - The slug of the collection to mint from
   * @param address - The address of the user to mint from
   * @returns A promise resolving to the mint item
   */
  @Get('random')
  async getRandom(
    @Query('slug') slug: string,
    @Query('address') address: string,
  ) {
    if (!this.configSvc.features.mint) {
      throw new BadRequestException('Minting is disabled');
    }

    const validatedAddress = this.web3SvcL1.validateAddress(address);
    if (!validatedAddress) {
      throw new BadRequestException('Invalid address');
    }

    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    return this.mintService.validateMint(slug, address);
  }
}

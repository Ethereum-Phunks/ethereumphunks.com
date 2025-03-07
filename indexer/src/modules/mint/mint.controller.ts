// nestjs controller
import { BadRequestException, Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';

import { MintService } from './mint.service';
import { Web3Service } from '../shared/services/web3.service';

import { AddressThrottlerGuard } from './guards/address-throttle.guard';

import dotenv from 'dotenv';
dotenv.config();

@Controller('mint')
export class MintController {
  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    private readonly mintService: MintService,
  ) {}

  /**
   * Get a random mint item for a given slug and address
   * @param slug - The slug of the collection to mint from
   * @param address - The address of the user to mint from
   * @returns A promise resolving to the mint item
   */
  @Get('random')
  @UseGuards(AddressThrottlerGuard)
  @Throttle({ address: { limit: 60, ttl: seconds(60) } })
  async getRandom(
    @Query('slug') slug: string,
    @Query('address') address: string,
  ) {
    if (!Number(process.env.MINT)) {
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

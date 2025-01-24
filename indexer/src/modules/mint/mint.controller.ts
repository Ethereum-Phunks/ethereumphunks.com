// nestjs controller
import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';

import { MintService } from './mint.service';
import { Web3Service } from '../shared/services/web3.service';

@Controller('mint')
export class MintController {
  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    private readonly mintService: MintService,
  ) {}

  @Get('random')
  async getRandom(
    @Query('slug') slug: string,
    @Query('address') address: string,
  ) {
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

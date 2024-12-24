// nestjs controller
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';

import { MintService } from './mint.service';

@Controller('mint')
export class MintController {
  constructor(
    private readonly mintService: MintService,
  ) {}

  @Get('random')
  async getRandom(
    @Query('slug') slug: string,
    @Query('address') address: string,
  ) {

    if (!slug || !address) {
      throw new BadRequestException('Both slug and address are required');
    }

    return this.mintService.validateMint(slug, address);
  }
}

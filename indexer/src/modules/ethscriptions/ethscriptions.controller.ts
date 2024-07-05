import { Body, Controller, Post } from '@nestjs/common';

import { AttributeItem } from '@/models/db';

import { EthscriptionsService } from './ethscriptions.service';

@Controller('ethscriptions')
export class EthscriptionsController {

  constructor(
    private readonly ethsSvc: EthscriptionsService
  ) {}

  @Post('add')
  async addEthscriptionByTransactionHash(
    @Body() body: { hash: string, attributes: AttributeItem }
  ): Promise<void> {

    const { hash, attributes } = body;
    const res = await this.ethsSvc.addEthscription(body);

    // const res = await this.ethsSvc.addEthscriptionByTransactionHash(body.hash);
    // console.log('addEthscriptionByTransactionHash', res);

  }
}

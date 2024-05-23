import { Controller, Get, Param } from '@nestjs/common';

import { GenerateService } from './services/generate.service';

@Controller('card')
export class CardController {

  constructor(
    private readonly genSvc: GenerateService
  ) {}

  /**
   * Retrieves a card based on the provided tokenId.
   *
   * @param tokenId - The unique identifier of the card.
   * @returns A Promise that resolves to void.
   */
  @Get(':tokenId')
  async getCard(@Param('tokenId') tokenId: string): Promise<void> {
    console.log('getCard', tokenId);
    return await this.genSvc.createCard(tokenId);
  }
}

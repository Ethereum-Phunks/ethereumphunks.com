import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { NonceService } from '@/modules/bridge-l1/services/nonce.service';
import { VerificationService } from '@/modules/bridge-l1/services/verification.service';
import { SignatureBody } from '@/modules/bridge-l1/models/bridge.model';

@Controller()
export class BridgeController {

  constructor(
    private readonly veriSvc: VerificationService,
    private readonly nonceSvc: NonceService
  ) {}

  /**
   * Generates a temporary nonce for the given address.
   * @param query - The query object containing the address.
   * @returns A promise that resolves to the generated nonce.
   */
  @Get('generate-nonce')
  generateNonce(@Query() query: { address: string }): Promise<string> {
    return this.nonceSvc.generateNonce(query.address);
  }

  /**
   * Verifies the signature of an asset ownership and returns a signature
   * @param body - The body object containing the signature.
   * @returns A promise that resolves to signature to send to the contract
   * with some other data for the users transaction.
   */
  @Post('bridge-phunk')
  bridgePhunk(@Body() body: SignatureBody): Promise<any> {
    return this.veriSvc.verifySignature(body);
  }
}

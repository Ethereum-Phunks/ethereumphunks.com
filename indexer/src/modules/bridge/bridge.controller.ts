import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { NonceService } from '@/modules/bridge/services/nonce.service';
import { VerificationService } from '@/modules/bridge/services/verification.service';
import { SignatureBody } from '@/modules/bridge/models/bridge.model';

@Controller()
export class BridgeController {

  constructor(
    private readonly veriSvc: VerificationService,
    private readonly nonceSvc: NonceService
  ) {}

  @Get('generate-nonce')
  getMerkleRoot(@Query() query: { address: string }): Promise<string> {
    return this.nonceSvc.generateNonce(query.address);
  }

  @Post('bridge-phunk')
  bridgePhunk(@Body() body: SignatureBody): Promise<any> {
    return this.veriSvc.verifySignature(body);
  }
}

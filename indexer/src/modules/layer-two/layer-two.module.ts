import { Module } from '@nestjs/common';

import { ProcessingServiceL2 } from './services/processing/processing.service';

@Module({
  imports: [],
  providers: [
    ProcessingServiceL2,
  ],
  exports: [],
})
export class LayerTwoModule {}

import { OnModuleInit } from '@nestjs/common';

import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';

import { Server } from 'socket.io';

import { TxpoolService, TxPoolState } from './txpool.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TxPoolGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly txPoolService: TxpoolService,
  ) {}

  onModuleInit() {
    this.server.on('connection', (socket) => {
      // console.log('Client connected:', socket.id);

      const currentState = this.txPoolService.getCurrentState();
      const pendingShas = Object.fromEntries(currentState.pendingInscriptionShas);
      socket.emit('pendingInscriptionShas', pendingShas);

      socket.on('disconnect', () => {
        // console.log('Client disconnected:', socket.id);
      });
    });
  }

  @OnEvent('txpool.update')
  handleTxPoolUpdate(state: TxPoolState) {
    // Convert Map to Object for serialization
    const pendingShas = Object.fromEntries(state.pendingInscriptionShas);
    this.server.emit('pendingInscriptionShas', pendingShas);
  }
}

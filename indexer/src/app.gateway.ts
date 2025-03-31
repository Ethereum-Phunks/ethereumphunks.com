import { Logger } from '@nestjs/common';

import { Server, Socket } from 'socket.io';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { CustomLogger } from '@/modules/shared/services/logger.service';

import { chain } from '@/constants/ethereum';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS,
    methods: ['GET']
  }
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  constructor(
    private readonly logger: CustomLogger,
  ) {
  }

  afterInit(server: Server) {
    Logger.debug('Socket Server Initialized', 'AppGateway');

    if (!this.server) return;

    this.logger.singleLog$.subscribe((logItem) => {
      if (logItem) this.server.emit(`log_${chain}`, logItem);
    });

    this.logger.logCollection$.subscribe((logItems) => {
      if (logItems?.length) this.server.emit(`logs_${chain}`, logItems);
    });
  }

  handleConnection(client: Socket, ...args: any[]) {
    Logger.verbose(client.id, 'Client connected');
    client.emit(`logs_${chain}`, this.logger.getLogs());
  }

  handleDisconnect(client: Socket, ...args: any[]) {
    Logger.verbose(client.id, 'Client disconnected');
  }

  // @SubscribeMessage('logs')
  // handleLogs(
  //   @MessageBody() data: string,
  //   @ConnectedSocket() client: Socket
  // ) {
  //   console.log('Received event:', data);
  //   // return this.logger.logCollection

  //   client.emit('marketStats', marketStats);
  // }
}

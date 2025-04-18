import { Logger } from '@nestjs/common';

import { Server, Socket } from 'socket.io';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { CustomLogger } from '@/modules/shared/services/logger.service';
import { StorageService } from '@/modules/storage/storage.service';

import { chain } from '@/constants/ethereum';
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
      callback(null, allowedOrigins.includes(origin) ? origin : false);
    },
    methods: ['GET']
  }
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  constructor(
    private readonly logger: CustomLogger,
    private readonly storageService: StorageService
  ) {}

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

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: { id: string, message: string },
    @ConnectedSocket() client: Socket
  ) {
    const { id, message } = data;
    this.storageService.setConnectedAccounts(JSON.parse(message));
  }
}

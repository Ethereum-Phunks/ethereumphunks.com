import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { Client, Conversation } from '@xmtp/browser-sdk';

import { Observable } from 'rxjs';

import { GlobalState } from '@/models/global-state';

import { Web3Service } from './web3.service';
import { UtilService } from './util.service';

/**
 * Service for handling XMTP messaging functionality
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService {

  /** Encoding used for storing XMTP keys */
  ENCODING: any = 'binary';

  /** XMTP client instance */
  client!: Client;

  /** XMTP client configuration options */
  clientOptions: any = {
    env: 'dev',
  };

  constructor(
    private store: Store<GlobalState>,
    private web3Svc: Web3Service,
    private utilSvc: UtilService
  ) {}

  /**
   * Signs in to XMTP using the connected wallet
   * @returns Promise resolving to boolean indicating success
   */
  async signInToXmtp(): Promise<boolean> {
    try {
      const walletClient = await this.web3Svc.getActiveWalletClient();
      if (!walletClient?.account?.address) {
        throw new Error('No wallet address found');
      }

      const signer = {
        type: "EOA" as const,
        getIdentifier: () => ({
          identifierKind: "Ethereum",
          identifier: walletClient.account.address.toLowerCase()
        }),
        signMessage: async (message: string) => {
          const signature = await walletClient.signMessage({
            message
          });
          return new Uint8Array(Buffer.from(signature.slice(2), 'hex'));
        }
      };

      const dbEncryptionKey = window.crypto.getRandomValues(new Uint8Array(32));

      this.client = await Client.create(signer as any, {
        dbEncryptionKey
      });

      if (this.client) {
        return true;
      }
    } catch (error) {
      console.error('Error signing in to XMTP', error);
    }

    return false;
  }

  /**
   * Reconnects to XMTP using stored keys for an address
   * @param address Wallet address to reconnect
   * @returns Promise resolving to boolean indicating success
   */
  async reconnectXmtp(address: string): Promise<boolean> {
    // console.time('reconnectXmtp');
    // let keys = this.loadKeys(address);
    // if (!keys) {
    //   console.timeEnd('reconnectXmtp');
    //   return false;
    // }

    // this.client = await Client.create(null, {
    //   ...this.clientOptions,
    //   privateKeyOverride: keys
    // });

    // this.streamAllMessages();

    // if (this.client) {
    //   console.timeEnd('reconnectXmtp');
    //   return true;
    // }
    // console.timeEnd('reconnectXmtp');
    return false;
  }

  /**
   * Creates a new conversation with a user
   * @param userAddress Address to start conversation with
   * @returns Promise resolving to the created Conversation
   */
  async createConversationWithUser(userAddress: string): Promise<Conversation> {
    return {} as Conversation;
    // if (!this.client) await this.signInToXmtp();
    // const conversation = await this.client.conversations.newConversation(userAddress);
    // return conversation;
  }

  /**
   * Gets all messages from a conversation
   * @param conversation Conversation to get messages from
   * @returns Promise resolving to array of messages
   */
  async getChatMessagesFromConversation(conversation: Conversation): Promise<any> {
    return [];
    // console.time(`getChatMessagesFromConversation:${conversation.peerAddress}`);
    // const messages = await conversation.messages();
    // console.timeEnd(`getChatMessagesFromConversation:${conversation.peerAddress}`);
    // console.log(`Fetched messages for ${conversation.peerAddress}:`, messages.length);
    // return messages;
  }

  /**
   * Checks if a user can be messaged via XMTP
   * @param userAddress Address to check
   * @returns Promise resolving to boolean indicating if user can be messaged
   */
  async checkCanMessageUser(userAddress: string): Promise<boolean> {
    return false;
    // const canMessage = await this.client.canMessage(userAddress);
    // return canMessage;
  }

  /**
   * Gets all contacts
   * @returns Promise resolving to contacts list
   */
  async getContacts(): Promise<any> {
    return [];
    // return this.client.contacts;
  }

  /**
   * Sends a message in a conversation
   * @param conversation Conversation to send message in
   * @param message Message content to send
   */
  async sendMessageToConversation(
    conversation: Conversation,
    message: string | null
  ): Promise<void> {
    return;
    // if (!message) return;
    // const preparedMsg = await conversation.prepareMessage(message);

    // try {
    //   preparedMsg.send();
    // } catch (e) {
    //   console.error(e);
    // }
  }

  /**
   * Sends a message to a user
   * @param user Address to send message to
   * @param message Message content to send
   */
  async sendMessage(
    user: string,
    message: string | null
  ) {
    return;
    // if (!message) return;
    // if (!this.client) await this.signInToXmtp();

    // const conversations = await this.getConversations();
    // const conversation = conversations.filter(
    //   (conv) => conv.peerAddress.toLowerCase() === user.toLowerCase()
    // )[0];

    // await this.sendMessageToConversation(conversation, message);
  }

  /**
   * Streams messages from a conversation
   * @param conversation Conversation to stream messages from
   * @returns Observable of messages
   */
  streamMessages(conversation: Conversation): Observable<any> {
    return new Observable();
    // return new Observable(subscriber => {
    //   (async () => {
    //     console.time(`streamMessages:${conversation.peerAddress}`);
    //     let count = 0;
    //     for await (const message of await conversation.streamMessages()) {
    //       subscriber.next(message);
    //       count++;
    //     }
    //     console.timeEnd(`streamMessages:${conversation.peerAddress}`);
    //     console.log(`streamMessages processed messages for ${conversation.peerAddress}:`, count);
    //   })().catch(err => subscriber.error(err));
    //   return () => {
    //     // Teardown logic here
    //   };
    // });
  }

  /**
   * Gets all conversations
   * @returns Promise resolving to array of conversations
   */
  async getConversations(): Promise<Conversation[]> {
    return [];
    // if (!this.client) await this.signInToXmtp();
    // console.time('getConversations');
    // const conversations = await this.client.conversations.list();
    // console.timeEnd('getConversations');
    // console.log('Fetched conversations:', conversations.length);
    // return conversations;
  }

  /**
   * Streams all incoming messages and creates notifications
   */
  async streamAllMessages() {
    return;
    // console.time('streamAllMessages');
    // let count = 0;
    // for await (const message of await this.client.conversations.streamAllMessages()) {
    //   if (message.senderAddress === this.client.address) continue;

    //   const isOld = new Date(message.sent).getTime() < (new Date().getTime() - 10000);
    //   if (isOld) continue;

    //   let notification: Notification = {
    //     id: this.utilSvc.createIdFromString(message.id),
    //     timestamp: new Date(message.sent).getTime(),
    //     type: 'chat',
    //     function: 'chatMessage',
    //     chatAddress: message.senderAddress,
    //   };

    //   this.store.dispatch(upsertNotification({ notification }));
    //   count++;
    // }
    // console.timeEnd('streamAllMessages');
    // console.log('streamAllMessages processed messages:', count);
  }

  /**
   * Checks if XMTP keys exist for an address
   * @param address Address to check for keys
   * @returns Boolean indicating if keys exist
   */
  keysExist(address: string): boolean {
    return !!this.loadKeys(address);
  }

  // DEV ONLY ========================================== //
  // Utility functions for storing keys in local storage //

  /**
   * Gets current environment
   */
  private getEnv = (): "dev" | "production" | "local" => {
    return "production";
  };

  /**
   * Builds local storage key for storing XMTP keys
   * @param walletAddress Address to build key for
   */
  private buildLocalStorageKey = (walletAddress: string) => {
    walletAddress = walletAddress.toLowerCase();
    return walletAddress ? `xmtp:${this.getEnv()}:keys:${walletAddress}` : "";
  }

  /**
   * Loads XMTP keys from storage for an address
   * @param walletAddress Address to load keys for
   */
  private loadKeys = (walletAddress: string): Uint8Array | null => {
    walletAddress = walletAddress.toLowerCase();
    const val = sessionStorage.getItem(this.buildLocalStorageKey(walletAddress));
    return val ? Buffer.from(val, this.ENCODING) : null;
  };

  /**
   * Stores XMTP keys for an address
   * @param walletAddress Address to store keys for
   * @param keys Keys to store
   */
  private storeKeys = (walletAddress: string, keys: Uint8Array) => {
    walletAddress = walletAddress.toLowerCase();
    sessionStorage.setItem(
      this.buildLocalStorageKey(walletAddress),
      Buffer.from(keys).toString(this.ENCODING),
    );
  };

  /**
   * Removes stored XMTP keys for an address
   * @param walletAddress Address to remove keys for
   */
  private wipeKeys = (walletAddress: string) => {
    walletAddress = walletAddress.toLowerCase();
    // This will clear the conversation cache + the private keys
    sessionStorage.removeItem(this.buildLocalStorageKey(walletAddress));
  };
}

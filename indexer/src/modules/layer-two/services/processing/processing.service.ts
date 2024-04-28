// import { bridgeAbiL2, l2Client, minterAddressL2 } from '@/constants/ethereum';
// import { BridgeProcessingService } from '@/modules/queue/services/bridge-processing.service';
// import { Web3Service } from '@/services/web3.service';
import { Injectable } from '@nestjs/common';

import { parseEventLogs } from 'viem';

@Injectable()
export class ProcessingServiceL2 {

  constructor(
    // private readonly web3Svc: Web3Service,
    // private readonly bridgeSvc: BridgeProcessingService,
  ) {

    // l2Client.getContractEvents({
    //   abi: bridgeAbiL2,
    //   address: process.env.BRIDGE_ADDRESS_SEPOLIA_L2 as `0x${string}`,
    //   fromBlock: BigInt(355290),
    //   toBlock: 'latest',
    // }).then((events) => {

    //   const string = JSON.stringify(events, (_, v) => typeof v === 'bigint' ? v.toString() : v);
    //   writeFile('events.json', string);
    // });

    // readFile('events.json').then((data) => {
    //   const events = JSON.parse(data.toString());

    //   events.forEach((event) => {
    //     console.log(event);
    //   });

    // });
    // this.test();
  }

  // async test() {
  //   const receipt = await l2Client.getTransactionReceipt({
  //     hash: '0xbb51f1c9ce92f05e0a97c7ae1850b56d5e111a00b2b5a51c045df88f11d36e17' as `0x${string}`
  //   });

  //   const isMinterRole = receipt.from.toLowerCase() === minterAddressL2.toLowerCase();
  //   const logs: any = parseEventLogs({
  //     abi: bridgeAbiL2,
  //     logs: receipt.logs,
  //   });

  //   logs.forEach(async (log) => {
  //     if (log.eventName === 'BridgedIn') {
  //       if (!isMinterRole) throw new Error('Not a minter');
  //       // Validate the bridge IN
  //       await this.processBridgedInEvent(log);
  //     }

  //     if (log.eventName === 'BridgedOut') {
  //       // Validate the bridge OUT
  //       await this.processBridgedOutEvent(log);
  //     }
  //   });
  // }

  // async processTransfers() {

  // }

  // async processBridgedInEvent(log: any) {
  //   const { args } = log;
  //   console.log({ log, args });
  // }

  // async processBridgedOutEvent(log: any) {
  //   const { args } = log;
  //   const { receiver, tokenId, hashId } = args;
  //   // await this.bridgeSvc.addBridgedOutToQueue(hashId, receiver);
  // }
}

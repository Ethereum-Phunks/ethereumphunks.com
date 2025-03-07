import { Injectable } from '@nestjs/common';

const SEGMENT_SIZE = 64;

@Injectable()
export class UtilityService {

  /**
   * Delays the execution for the specified number of milliseconds.
   * @param ms - The number of milliseconds to delay.
   * @returns A promise that resolves after the specified delay.
   */
  public async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Converts a data URL to a Buffer.
   * @param dataURL - The data URL to convert.
   * @returns The Buffer representation of the data URL.
   */
  public dataURLtoBuffer(dataURL: string): Buffer {
    const base64String = dataURL.split(',')[1];
    const buffer = Buffer.from(base64String, 'base64');
    return buffer;
  }

  /**
   * Converts a string to title case.
   * @param str - The string to convert.
   * @returns The title case representation of the string.
   */
  public toTitleCase(str: string) {
    return str?.split('-')?.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())?.join(' ');
  }

  shorten(
    addressOrHashId: string,
    length: number = 6
  ): string {
    return `${addressOrHashId.slice(0, length + 2)}...${addressOrHashId.slice(-length)}`;
  }

  /**
   * Checks if the input string represents a possible single transfer transaction.
   * A single transfer has an input length (minus 0x prefix) equal to SEGMENT_SIZE.
   * @param input - The transaction input string to check
   * @returns True if the input matches single transfer format, false otherwise
   */
  possibleTransfer(input: string) {
    const possibleTransfer = input.substring(2).length === SEGMENT_SIZE;
    return possibleTransfer;
  }

  /**
   * Checks if the input string represents a possible batch transfer transaction.
   * A batch transfer has an input length (minus 0x prefix) that is evenly divisible by SEGMENT_SIZE.
   * @param input - The transaction input string to check
   * @returns True if the input matches batch transfer format, false otherwise
   */
  possibleBatchTransfer(input: string) {
    const possibleTransfer = input.substring(2).length % SEGMENT_SIZE === 0;
    return possibleTransfer;
  }
}

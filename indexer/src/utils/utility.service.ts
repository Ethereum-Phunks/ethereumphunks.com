import { Injectable } from '@nestjs/common';

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
}

import { Injectable } from '@angular/core';

import { v5 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  /**
   * Creates a UUID from a string
   * @param str String to create UUID from
   * @returns UUID
   */
  createIdFromString(str: string): string {
    return v5(str, v5.URL);
  }

  /**
   * Converts a Uint8Array to a base64 string
   * @param arr Uint8Array to convert
   * @returns Base64 encoded string
   */
  uint8ArrayToBase64(arr: Uint8Array): string {
    return btoa(String.fromCharCode(...arr));
  }

  /**
   * Converts a base64 string to a Uint8Array
   * @param base64 Base64 string to convert
   * @returns Uint8Array of decoded data
   */
  base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array([...atob(base64)].map(char => char.charCodeAt(0)));
  }
}

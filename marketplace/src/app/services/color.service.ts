import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ColorService {

  /**
   * Converts RGBA color values to a hex string
   * @param r Red value (0-255)
   * @param g Green value (0-255)
   * @param b Blue value (0-255)
   * @param a Alpha value (0-255)
   * @returns Hex string of the color
   */
  public rgbaToHex(r: number, g: number, b: number, a: number): string {
    const toHex = (value: number) => {
      const hex = value.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  }
}

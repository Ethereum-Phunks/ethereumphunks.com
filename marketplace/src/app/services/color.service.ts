import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ColorService {


  public rgbaToHex(r: number, g: number, b: number, a: number): string {
    const toHex = (value: number) => {
      const hex = value.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  }
}

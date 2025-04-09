import { Pipe, PipeTransform } from '@angular/core';
import { Attribute } from '@/models/attributes';

/**
 * Pipe that transforms an Attribute object into query parameters
 *
 * Takes an Attribute with key (k) and value (v) properties and converts it into
 * an object that can be used as query parameters in a URL.
 *
 * @example
 * // Input attribute: { k: 'Type', v: 'Alien' }
 * // Usage in template: [queryParams]="attribute | queryParams"
 * // Output: { "Type": "Alien" }
 */
@Pipe({
  standalone: true,
  name: 'queryParams',
})
export class QueryParamsPipe implements PipeTransform {
  /**
   * Transforms an Attribute into query parameters
   * @param value - The Attribute object to transform
   * @returns An object containing the key-value pair as query parameters
   */
  transform(value: Attribute) {
    const params: { [key: string]: string } = {};
    if (value.k && value.v) {
      params[value.k] = value.v;
    }
    return params;
  }
}

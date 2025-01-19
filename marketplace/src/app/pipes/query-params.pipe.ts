import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'queryParams'
})
export class QueryParamsPipe implements PipeTransform {

  transform(value: any): any {
    return this.getItemQueryParams(value);
  }

  getItemQueryParams(item: any): any {
    if (!item) return;
    return { [item.k.replace(/ /g, '-').toLowerCase()]: item.v.replace(/ /g, '-').toLowerCase() };
  }
}

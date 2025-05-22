import { Injectable } from '@angular/core';
import { createInstance } from 'localforage';

import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private storage: LocalForage = createInstance({
    name: 'ethereum-phunks',
    version: Number(environment.version.split('.').join('')),
  });

  private permanentStorage: LocalForage = createInstance({
    name: 'ethereum-phunks-permanent',
  });

  async getItem<T>(key: string, permanent: boolean = false): Promise<T | null> {
    return await (permanent ? this.permanentStorage : this.storage).getItem(permanent ? key : `${key}:${environment.version}`);
  }

  async setItem<T>(key: string, value: T, permanent: boolean = false): Promise<T> {
    return await (permanent ? this.permanentStorage : this.storage).setItem(permanent ? key : `${key}:${environment.version}`, value);
  }

  async removeItem(key: string, permanent: boolean = false): Promise<void> {
    return await (permanent ? this.permanentStorage : this.storage).removeItem(permanent ? key : `${key}:${environment.version}`);
  }

  async clear(permanent: boolean = false): Promise<void> {
    return await (permanent ? this.permanentStorage : this.storage).clear();
  }
}

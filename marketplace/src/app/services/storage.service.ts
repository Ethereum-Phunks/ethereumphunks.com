import { Injectable } from '@angular/core';
import { createInstance } from 'localforage';

import { environment } from '@/../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private storage: LocalForage = createInstance({
    name: 'ethereum-phunks',
    version: Number(environment.version.split('.').join('')),
  });

  async getItem<T>(key: string): Promise<T | null> {
    return await this.storage.getItem(`${key}:${environment.version}`);
  }

  async setItem<T>(key: string, value: T): Promise<T> {
    return await this.storage.setItem(`${key}:${environment.version}`, value);
  }

  async removeItem(key: string): Promise<void> {
    return await this.storage.removeItem(`${key}:${environment.version}`);
  }

  async clear(): Promise<void> {
    return await this.storage.clear();
  }
}

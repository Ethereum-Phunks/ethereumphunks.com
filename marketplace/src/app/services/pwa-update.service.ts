import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  constructor(private swUpdate: SwUpdate) {
    if (swUpdate.isEnabled) {
      // Check for updates every 5 minutes
      interval(5 * 60 * 1000).subscribe(() => swUpdate.checkForUpdate());

      // Handle available updates
      swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          // Prompt user to update
          // if (confirm('A new version is available. Would you like to update?')) {
          //   window.location.reload();
          // }
        }
      });

      // Handle unrecoverable state
      swUpdate.unrecoverable.subscribe(event => {
        alert('An error occurred that we cannot recover from:\n' + event.reason +
              '\n\nPlease reload the page.');
      });
    }
  }

  public async checkForUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      return Promise.resolve();
    }
    await this.swUpdate.checkForUpdate();
  }
}

import { Component, input, effect, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LazyLoadImageModule } from 'ng-lazyload-image';

import { Web3Service } from '@/services/web3.service';
import { DataService } from '@/services/data.service';

import { environment } from 'src/environments/environment';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    LazyLoadImageModule,
  ],
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss']
})
export class AvatarComponent {

  address = input.required<string>();
  src = model<string>('');

  constructor(
    private web3Svc: Web3Service,
    private dataSvc: DataService
  ) {
    effect(async () => {
      let avatar = await this.web3Svc.getEnsAvatar(this.address());
      if (avatar) {
        this.src.set(avatar);
        return;
      }

      avatar = await this.dataSvc.getUserAvatar(this.address());
      if (avatar) {
        this.src.set(`${environment.staticUrl}/static/images/${avatar}`);
        return;
      }
    })
  }

}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LazyLoadImageModule } from 'ng-lazyload-image';

import { PhunkImageComponent } from '../phunk-image/phunk-image.component';

import { Phunk } from '@/models/db';

@Component({
  selector: 'app-phunk-billboard',
  standalone: true,
  imports: [
    CommonModule,
    LazyLoadImageModule,
    RouterModule,

    PhunkImageComponent
  ],
  templateUrl: './phunk-billboard.component.html',
  styleUrls: ['./phunk-billboard.component.scss']
})

export class PhunkBillboardComponent {

  @Input() phunk!: Phunk | null;

}


import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from '@/app.component';

import { config } from '@/app.config';

import { environment } from './environments/environment';

if (environment.production) enableProdMode();
bootstrapApplication(AppComponent, config).catch(err => console.error(err));

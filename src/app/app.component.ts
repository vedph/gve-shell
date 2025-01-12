import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { EnvService } from '@myrmidon/ngx-tools';

import { SettingsService } from '../../projects/myrmidon/gve-core/src/public-api';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    NgeMonacoModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public version?: string;

  constructor(settings: SettingsService, env: EnvService) {
    this.version = env.get('version') || '';
    settings.keyPrefix = 'gve-shell-';

    settings.set('svg-editor', 'https://editor.method.ac/');
    settings.set(
      'graphviz-editor',
      'https://dreampuf.github.io/GraphvizOnline?engine=dot#CODE'
    );
  }
}

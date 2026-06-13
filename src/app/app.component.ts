import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { RouterModule, RouterOutlet } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

import { EnvService } from '@myrmidon/ngx-tools';
import { ThemeToggleComponent } from '@myrmidon/ngx-mat-tools';

import { SettingsService } from '@myrmidon/gve-core';

@Component({
  selector: 'app-root',
  imports: [
    RouterModule,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    ThemeToggleComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public readonly version = signal<string | undefined>(undefined);

  constructor(settings: SettingsService, env: EnvService) {
    this.version.set(env.get('version') || '');
    settings.keyPrefix = 'gve-shell-';

    // settings.set('svg-editor', 'https://editor.method.ac/');
    // settings.set(
    //   'graphviz-editor',
    //   'https://dreampuf.github.io/GraphvizOnline?engine=dot#CODE'
    // );
  }
}

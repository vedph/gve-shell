import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { RouterOutlet, RouterLink } from '@angular/router';

import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';

import { EnvService } from '@myrmidon/ngx-tools';
import { ThemeToggleComponent } from '@myrmidon/ngx-mat-tools';

import { SettingsService } from '@myrmidon/gve-core';

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    MatButton,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatToolbar,
    RouterOutlet,
    ThemeToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public readonly version = signal<string | undefined>(undefined);

  constructor() {
    const settings = inject(SettingsService);
    const env = inject(EnvService);
    this.version.set(env.get('version') || '');
    settings.keyPrefix = 'gve-shell-';

    // settings.set('svg-editor', 'https://editor.method.ac/');
    // settings.set(
    //   'graphviz-editor',
    //   'https://dreampuf.github.io/GraphvizOnline?engine=dot#CODE'
    // );
  }
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { GveAnimationTween } from '@myrmidon/gve-snapshot-view';

import { AnimationTweenComponent } from '../../../../projects/myrmidon/gve-core/src/public-api';

@Component({
  selector: 'app-animation-tween-demo',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AnimationTweenComponent,
  ],
  templateUrl: './animation-tween-demo.component.html',
  styleUrl: './animation-tween-demo.component.scss',
})
export class AnimationTweenDemoComponent {
  public tween: GveAnimationTween;
  public elementIds = ['alpha', 'beta', 'gamma'];

  constructor() {
    this.tween = {
      type: 'to',
      label: 'alpha',
      note: 'This is a sample tween',
      selector: '#alpha',
      vars: '{ duration: 2, ease: "elastic" }',
    };
  }

  public onTweenChange(tween?: GveAnimationTween) {
    this.tween = tween!;
  }
}

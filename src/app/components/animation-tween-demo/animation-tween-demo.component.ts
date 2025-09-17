import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { GveAnimationTween } from '@myrmidon/gve-snapshot-view';

import { AnimationTweenComponent } from '@myrmidon/gve-core';

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
  public readonly elementIds = ['alpha', 'beta', 'gamma'];
  public readonly tween = signal<GveAnimationTween>({
    type: 'to',
    label: 'alpha',
    note: 'This is a sample tween',
    selector: '#alpha',
    vars: '{ "duration": 2, "ease": "elastic" }',
  });

  public onTweenChange(tween: GveAnimationTween) {
    this.tween.set(tween);
  }
}

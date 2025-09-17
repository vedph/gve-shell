import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { GveAnimationTimeline } from '@myrmidon/gve-snapshot-view';

import { AnimationTimelineSetComponent } from '@myrmidon/gve-core';

@Component({
  selector: 'app-animation-timeline-set-demo',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AnimationTimelineSetComponent,
  ],
  templateUrl: './animation-timeline-set-demo.component.html',
  styleUrl: './animation-timeline-set-demo.component.scss',
})
export class AnimationTimelineSetDemoComponent {
  public readonly tags = ['v1', 'v2', 'v3'];
  public readonly elementIds = ['a', 'b', 'c', 'd'];
  public readonly timelines = signal<GveAnimationTimeline[]>([
    {
      tag: 'v1',
      tweens: [
        {
          label: 'alpha',
          type: 'to',
          selector: '#a',
          vars: '{ "duration": 2, "ease": "elastic" }',
        },
        {
          label: 'beta',
          type: 'to',
          selector: '#b',
          vars: '{ "duration": 1 }',
        },
      ],
    },
  ]);

  public onTimelinesChange(timelines: GveAnimationTimeline[]) {
    this.timelines.set(timelines);
  }
}

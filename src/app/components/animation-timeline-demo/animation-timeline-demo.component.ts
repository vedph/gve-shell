import { Component, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { GveAnimationTimeline } from '@myrmidon/gve-snapshot-view';

import { AnimationTimelineComponent } from '@myrmidon/gve-core';

@Component({
  selector: 'app-animation-timeline-demo',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AnimationTimelineComponent,
  ],
  templateUrl: './animation-timeline-demo.component.html',
  styleUrl: './animation-timeline-demo.component.scss',
})
export class AnimationTimelineDemoComponent {
  public readonly timeline = signal<GveAnimationTimeline>({
    tag: 'timeline',
    tweens: [
      {
        label: 'A',
        type: 'to',
        selector: '#a',
        vars: '{ "duration": 2, "ease": "elastic" }',
      },
      {
        label: 'B',
        type: 'to',
        selector: '#b',
        vars: '{ "duration": 1 }',
      },
    ],
  });

  public onTimelineChange(timeline: GveAnimationTimeline) {
    this.timeline.set(timeline);
  }
}

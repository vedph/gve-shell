import { Component, input, model, output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { deepCopy } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { GveAnimationTimeline } from '@myrmidon/gve-snapshot-view';

import { AnimationTimelineComponent } from '../animation-timeline/animation-timeline.component';

/**
 * 🔑 `gve-animation-timeline-set`
 *
 * A component to edit a set of animation timelines.
 * Used by the `gve-snapshot-editor` component.
 *
 * - ▶️ `timelines` (`GveAnimationTimeline[]`): the animation timelines to edit.
 * - ▶️ `elementIds` (`string[]`): the IDs of the elements that can be selected by the tween.
 * - ▶️ `tags` (`string[]`): the tags that can be used by the timeline.
 * - 🔥 `timelinesChange` (`GveAnimationTimeline[]`): emitted when the timelines are changed.
 * - 🔥 `timelinesCancel` (`void`): emitted when the timeline editing is canceled.
 */
@Component({
  selector: 'gve-animation-timeline-set',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    AnimationTimelineComponent,
  ],
  templateUrl: './animation-timeline-set.component.html',
  styleUrl: './animation-timeline-set.component.css',
})
export class AnimationTimelineSetComponent {
  /**
   * The animation timelines to edit.
   */
  public readonly timelines = model<GveAnimationTimeline[]>([]);

  /**
   * The IDs of the elements that can be selected by the tween.
   * This list is used to allow the user to select an element from a dropdown.
   */
  public readonly elementIds = input<string[] | undefined>();

  /**
   * The tags that can be used by the timeline.
   */
  public readonly tags = input<string[]>([]);

  /**
   * Emitted when the timeline editing is canceled.
   */
  public readonly timelinesCancel = output();

  public readonly editedTimeline = signal<GveAnimationTimeline | undefined>(
    undefined
  );
  public readonly editedIndex = signal<number>(-1);

  constructor(private _dialogService: DialogService) {}

  public closeTimeline(): void {
    this.editedTimeline.set(undefined);
    this.editedIndex.set(-1);
  }

  public newTimeline(): void {
    this.editedTimeline.set({
      tag: '',
      tweens: [],
    });
    this.editedIndex.set(-1);
  }

  public editTimeline(index: number): void {
    this.editedTimeline.set(deepCopy(this.timelines()[index]));
    this.editedIndex.set(index);
  }

  public onTimelineChange(timeline: GveAnimationTimeline): void {
    const timelines = [...this.timelines()];
    if (this.editedIndex() === -1) {
      timelines.push(timeline);
    } else {
      timelines.splice(this.editedIndex(), 1, timeline);
    }

    // sort timelines by tag
    timelines.sort((a, b) => a.tag.localeCompare(b.tag));
    this.timelines.set(timelines);

    this.closeTimeline();
  }

  public deleteTimeline(index: number): void {
    this._dialogService
      .confirm('Confirm Deletion', `Delete ${this.timelines()[index].tag}?`)
      .subscribe((yes) => {
        if (yes) {
          const timelines = [...this.timelines()];
          timelines.splice(index, 1);
          this.timelines.set(timelines);
        }
      });
  }
}

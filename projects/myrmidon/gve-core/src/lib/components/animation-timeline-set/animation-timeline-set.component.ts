
import { Component, effect, input, model, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    AnimationTimelineComponent
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
   * Emitted when the timelines are changed.
   */
  public readonly timelinesChange = output<GveAnimationTimeline[]>();

  /**
   * Emitted when the timeline editing is canceled.
   */
  public readonly timelinesCancel = output();

  public editedTimeline?: GveAnimationTimeline;
  public set: FormControl<GveAnimationTimeline[]>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder, private _dialogService: DialogService) {
    this.set = formBuilder.control<GveAnimationTimeline[]>([], {
      nonNullable: true,
    });
    this.form = formBuilder.group({
      sets: this.set,
    });

    effect(() => {
      this.updateForm(this.timelines());
    });
  }

  private updateForm(animations?: GveAnimationTimeline[] | null): void {
    if (!animations?.length) {
      this.form.reset();
    } else {
      this.set.setValue(animations);
      this.set.markAsPristine();
    }
  }

  public closeTimeline(): void {
    this.editedTimeline = undefined;
  }

  public newTimeline(): void {
    this.editedTimeline = {
      tag: '',
      tweens: [],
    };
  }

  public editTimeline(index: number): void {
    this.editedTimeline = this.timelines()[index];
  }

  public onTimelineChange(timeline?: GveAnimationTimeline | null): void {
    const timelines = [...this.set.value];
    const i = timelines.findIndex((t) => t.tag === timeline!.tag);
    if (i === -1) {
      timelines.push(timeline!);
    } else {
      timelines[i] = timeline!;
    }
    this.closeTimeline();

    // sort timelines by tag
    timelines.sort((a, b) => a.tag.localeCompare(b.tag));
    this.set.setValue(timelines);
    this.set.markAsDirty();
    this.set.updateValueAndValidity();

    this.timelines.set(this.set.value);
    this.timelinesChange.emit(this.timelines()!);
  }

  public deleteTimeline(index: number): void {
    this._dialogService
      .confirm('Confirm Deletion', `Delete ${this.set.value[index].tag}?`)
      .subscribe((yes) => {
        if (yes) {
          const timelines = [...this.set.value];
          timelines.splice(index, 1);
          this.set.setValue(timelines);
          this.set.markAsDirty();
          this.set.updateValueAndValidity();
          this.timelines.set(this.set.value);
          this.timelinesChange.emit(this.timelines()!);
        }
      });
  }
}

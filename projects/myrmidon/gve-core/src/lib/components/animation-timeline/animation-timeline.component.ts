import { Component, effect, input, model, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
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

import { NgxToolsValidators } from '@myrmidon/ngx-tools';
import {
  GveAnimationTimeline,
  GveAnimationTween,
} from '@myrmidon/gve-snapshot-view';

import { AnimationTweenComponent } from '../animation-tween/animation-tween.component';

/**
 * 🔑 `gve-animation-timeline`
 *
 * A component to edit an animation timeline.
 * Used by the `gve-animation-timeline-set` component.
 *
 * - ▶️ `timeline` (`GveAnimationTimeline`): the animation timeline to edit.
 * - ▶️ `elementIds` (`string[]`): the IDs of the elements that can be selected
 * by the tween.
 * - ▶️ `tags` (`string[]`): the tags that can be used by the timeline.
 * - 🔥 `timelineChange` (`GveAnimationTimeline`): emitted when the timeline
 * is changed.
 * - 🔥 `timelineCancel` (`void`): emitted when the timeline editing is canceled.
 */
@Component({
  selector: 'gve-animation-timeline',
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
    AnimationTweenComponent
],
  templateUrl: './animation-timeline.component.html',
  styleUrl: './animation-timeline.component.css',
})
export class AnimationTimelineComponent {
  /**
   * The animation timeline to edit.
   */
  public readonly timeline = model<GveAnimationTimeline | undefined>();

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
   * Emitted when the timeline is changed.
   */
  public readonly timelineChange = output<GveAnimationTimeline>();

  /**
   * Emitted when the timeline editing is canceled.
   */
  public readonly timelineCancel = output();

  public tag: FormControl<string>;
  public tweens: FormControl<GveAnimationTween[]>;
  public vars: FormControl<string | null>;
  public form: FormGroup;

  public editedTweenIndex = -1;
  public editedTween?: GveAnimationTween;

  constructor(formBuilder: FormBuilder) {
    this.tag = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    });
    this.tweens = formBuilder.control([], {
      nonNullable: true,
      validators: NgxToolsValidators.strictMinLengthValidator(1),
    });
    this.vars = formBuilder.control(null, this.jsonValidator);

    this.form = formBuilder.group({
      tag: this.tag,
      tweens: this.tweens,
      vars: this.vars,
    });

    // when the timeline changes, update the form
    effect(() => {
      this.updateForm(this.timeline());
    });
  }

  private jsonValidator(
    control: AbstractControl
  ): { [key: string]: any } | null {
    if (!control.value) {
      return null;
    }
    try {
      JSON.parse(control.value);
      return null;
    } catch (e) {
      return { json: true };
    }
  }

  private updateForm(timeline?: GveAnimationTimeline) {
    if (!timeline) {
      this.form.reset();
      return;
    }
    this.tag.setValue(timeline.tag);
    this.tweens.setValue(timeline.tweens);
    this.vars.setValue(timeline.vars || null);
    this.form.markAsPristine();
  }

  public addTween(): void {
    this.editedTweenIndex = -1;
    this.editedTween = {
      label: 'tween #' + (this.tweens.value.length + 1),
      type: 'to',
      selector: '',
    };
  }

  public editTween(index: number): void {
    this.editedTweenIndex = index;
    this.editedTween = this.tweens.value[index];
  }

  public deleteTween(index: number): void {
    this.tweens.setValue(this.tweens.value.filter((_, i) => i !== index));
    this.tweens.markAsDirty();
    this.tweens.updateValueAndValidity();
  }

  public closeTween(): void {
    this.editedTween = undefined;
    this.editedTweenIndex = -1;
  }

  public saveTween(tween?: GveAnimationTween): void {
    if (this.editedTweenIndex === -1) {
      this.tweens.setValue([...this.tweens.value, tween!]);
    } else {
      this.tweens.setValue(
        this.tweens.value.map((t, index) =>
          index === this.editedTweenIndex ? tween! : t
        )
      );
    }
    this.tweens.markAsDirty();
    this.tweens.updateValueAndValidity();
    this.closeTween();
  }

  public moveTweenUp(index: number): void {
    if (index < 1) {
      return;
    }
    const tweens = [...this.tweens.value];
    const tmp = tweens[index];
    tweens[index] = tweens[index - 1];
    tweens[index - 1] = tmp;

    this.tweens.setValue(tweens);
    this.tweens.markAsDirty();
    this.tweens.updateValueAndValidity();
  }

  public moveTweenDown(index: number): void {
    if (index >= this.tweens.value.length - 1) {
      return;
    }
    const tweens = [...this.tweens.value];
    const tmp = tweens[index];
    tweens[index] = tweens[index + 1];
    tweens[index + 1] = tmp;

    this.tweens.setValue(tweens);
    this.tweens.markAsDirty();
    this.tweens.updateValueAndValidity();
  }

  private getTimeline(): GveAnimationTimeline {
    return {
      tag: this.tag.value || '',
      tweens: this.tweens.value,
      vars: this.vars.value || undefined,
    };
  }

  public close(): void {
    this.timelineCancel.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.timeline.set(this.getTimeline());
    this.timelineChange.emit(this.timeline()!);
    this.form.markAsPristine();
  }
}

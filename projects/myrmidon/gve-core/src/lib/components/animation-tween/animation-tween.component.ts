import {
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GveAnimationTween, TweenType } from '@myrmidon/gve-snapshot-view';

/**
 * 🔑 `gve-animation-tween`
 *
 * A component to edit an animation tween.
 * Used by the `gve-animation-timeline` component.
 *
 * - ▶️ `tween` (`GveAnimationTween`): the tween to edit.
 * - ▶️ `elementIds` (`string[]`): the IDs of the elements that can be selected by the tween.
 * - 🔥 `tweenChange` (`GveAnimationTween`): emitted when the tween is changed.
 * - 🔥 `tweenCancel` (`void`): emitted when the user cancels the edit.
 */
@Component({
  selector: 'gve-animation-tween',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  templateUrl: './animation-tween.component.html',
  styleUrl: './animation-tween.component.css',
})
export class AnimationTweenComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  /**
   * The tween to edit.
   */
  public readonly tween = model<GveAnimationTween | undefined>();

  /**
   * The IDs of the elements that can be selected by the tween.
   * This list is used to allow the user to select an element from a dropdown.
   */
  public readonly elementIds = input<string[] | undefined>();

  /**
   * Emitted when the tween is changed.
   */
  public readonly tweenChange = output<GveAnimationTween>();

  /**
   * Emitted when the user cancels the edit.
   */
  public readonly tweenCancel = output();

  public types = ['to', 'from', 'fromTo', 'set'];

  public label: FormControl<string>;
  public note: FormControl<string | null>;
  public type: FormControl<TweenType>;
  public selector: FormControl<string>;
  public vars: FormControl<string>;
  public vars2: FormControl<string | null>;
  public position: FormControl<string | null>;
  public form: FormGroup;

  public elementId: FormControl<string | null>;

  constructor(formBuilder: FormBuilder) {
    this.label = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    });
    this.note = formBuilder.control(null);
    this.type = formBuilder.control('to', { nonNullable: true });
    this.selector = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    });
    this.vars = formBuilder.control('{}', {
      nonNullable: true,
      validators: [Validators.required, this.jsonValidator],
    });
    this.vars2 = formBuilder.control(null, this.jsonValidator);
    this.position = formBuilder.control(null, Validators.maxLength(100));
    this.form = formBuilder.group({
      label: this.label,
      note: this.note,
      type: this.type,
      selector: this.selector,
      vars: this.vars,
      vars2: this.vars2,
      position: this.position,
    });

    this.elementId = formBuilder.control(null);

    effect(() => {
      this.updateForm(this.tween());
    });
  }

  public ngOnInit(): void {
    // set selector when elementId changes
    this._sub = this.elementId.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((elementId) => {
        if (elementId) {
          this.selector.setValue('#' + elementId);
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onVarsChange(vars: string): void {
    this.vars.setValue(vars);
    this.vars.markAsDirty();
    this.vars.updateValueAndValidity();
  }

  public onVars2Change(vars: string): void {
    this.vars2.setValue(vars);
    this.vars2.markAsDirty();
    this.vars2.updateValueAndValidity();
  }

  public close(): void {
    this.tweenCancel.emit();
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

  private updateForm(tween?: GveAnimationTween): void {
    if (!tween) {
      this.form.reset();
      return;
    }
    this.label.setValue(tween.label);
    this.note.setValue(tween.note || null);
    this.type.setValue(tween.type);
    this.selector.setValue(tween.selector);
    this.vars.setValue(tween.vars || '{}');
    this.vars2.setValue(tween.vars2 || null);
    this.position.setValue(tween.position || null);
    this.form.markAsPristine();
  }

  private getTween(): GveAnimationTween {
    return {
      label: this.label.value,
      note: this.note.value?.trim() || undefined,
      type: this.type.value,
      selector: this.selector.value.trim(),
      vars: this.vars.value,
      vars2: this.vars2.value || undefined,
      position: this.position.value?.trim() || undefined,
    };
  }

  public openUrl(url: string): void {
    window.open(url, '_blank');
  }

  public save(): void {
    if (!this.form.valid) {
      return;
    }
    this.tween.set(this.getTween());
    this.tweenChange.emit(this.tween()!);
  }
}

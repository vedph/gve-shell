import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  Feature,
  FeatureSetPolicy,
  LabeledId,
  OperationFeature,
} from '../../models';

/**
 * Features map. This is used for features from closed sets,
 * and lists the possible values for each feature.
 * The key is the feature name, and the value is an array of
 * labeled IDs representing the allowed values for that feature.
 */
export interface FeatureMap {
  [key: string]: LabeledId[];
}

/**
 * 🔑 `gve-feature-editor`
 *
 * Component for editing a single feature, whose model is a name=value
 * pair, plus a set policy value which defines the desired behavior
 * when adding that feature to a set.
 * Used by `gve-feature-set-editor`.
 *
 * - ▶️ `feature` (`Feature`): the feature to edit.
 * - ▶️ `featNames` (`LabeledId[]`): the list of feature names to display
 * in the _name_ selection. This is used when you have a closed list of
 * features. Each item in the list is an object with _id_ and _label_
 * properties.
 * - ▶️ `featValues` (`FeatureMap`): the feature values map. When
 * specified and the user selects a feature name present in the map keys,
 * the corresponding values will be used to populate the value selection.
 * - 🔥 `featureChange` (`Feature`): emitted when feature has changed.
 * - 🔥 `featureCancel`: emitted when the user cancels the feature editing.
 */
@Component({
  selector: 'gve-feature-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './feature-editor.component.html',
  styleUrl: './feature-editor.component.css',
})
export class FeatureEditorComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _frozen?: boolean;

  @ViewChild('nameCtl') nameControl?: ElementRef;

  /**
   * The list of feature names to display in the name selection.
   * This is used when you have a closed list of features.
   */
  public readonly featNames = input<LabeledId[] | undefined>();

  /**
   * The feature values map. When specified and the user selects a feature
   * name present in the map keys, the corresponding values will be used
   * to populate the value selection.
   */
  public readonly featValues = input<FeatureMap | undefined>();

  /**
   * The feature to edit.
   */
  public readonly feature = model<Feature | OperationFeature | undefined>();

  /**
   * True if the feature is a variant operation feature, which has
   * additional properties like negation, global, and short-lived.
   */
  public readonly isVar = input(false);

  /**
   * Event emitted when the user cancels the feature editing.
   */
  public readonly featureCancel = output();

  public readonly nameIds = signal<LabeledId[] | undefined>(undefined);

  public name: FormControl<string>;
  public value: FormControl<string>;
  public setPolicy: FormControl<FeatureSetPolicy>;
  // var feature controls
  public isNegated: FormControl<boolean>;
  public isGlobal: FormControl<boolean>;
  public isShortLived: FormControl<boolean>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.name = formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(50)],
      nonNullable: true,
    });
    this.value = formBuilder.control('', {
      validators: [Validators.maxLength(5000)],
      nonNullable: true,
    });
    this.setPolicy = formBuilder.control(FeatureSetPolicy.multiple, {
      nonNullable: true,
    });
    this.isNegated = formBuilder.control(false, { nonNullable: true });
    this.isGlobal = formBuilder.control(false, { nonNullable: true });
    this.isShortLived = formBuilder.control(false, { nonNullable: true });
    this.form = formBuilder.group({
      name: this.name,
      value: this.value,
      setPolicy: this.setPolicy,
      isNegated: this.isNegated,
      isGlobal: this.isGlobal,
      isShortLived: this.isShortLived,
    });

    // when feature changes, update the form
    effect(() => {
      this.updateForm(this.feature());
      setTimeout(() => {
        this.nameControl?.nativeElement?.focus();
        this.nameIds.set(
          this.getLabeledIdsFor(this.name.value, this.featValues())
        );
      }, 500);
    });
  }

  public ngOnInit(): void {
    // whenever the name changes, update the value selection
    this._sub = this.name.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((name) => {
        if (!this._frozen && this.featNames()?.length) {
          this.value.reset();
          this.nameIds.set(this.getLabeledIdsFor(name, this.featValues()));
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private getLabeledIdsFor(
    id?: string,
    featValues?: FeatureMap
  ): LabeledId[] | undefined {
    if (!id) {
      return undefined;
    }
    console.log('getLabeledIdsFor', id, featValues);
    return featValues ? featValues![id] : undefined;
  }

  private updateForm(feature?: OperationFeature): void {
    if (!feature) {
      this.form.reset();
    } else {
      this._frozen = true;
      this.name.setValue(feature.name);
      this.value.setValue(feature.value);
      this.setPolicy.setValue(feature.setPolicy || FeatureSetPolicy.multiple);
      this.isNegated.setValue(feature.isNegated || false);
      this.isGlobal.setValue(feature.isGlobal || false);
      this.isShortLived.setValue(feature.isShortLived || false);
      this._frozen = false;
    }
  }

  public cancel(): void {
    this.featureCancel.emit();
  }

  public save(): void {
    if (!this.form.valid) {
      return;
    }
    this.feature.set(
      this.isVar()
        ? {
            name: this.name.value.trim(),
            value: this.value.value.trim(),
            setPolicy: this.setPolicy.value,
            isNegated: this.isNegated.value,
            isGlobal: this.isGlobal.value,
            isShortLived: this.isShortLived.value,
          }
        : {
            name: this.name.value.trim(),
            value: this.value.value.trim(),
            setPolicy: this.setPolicy.value,
          }
    );
  }
}

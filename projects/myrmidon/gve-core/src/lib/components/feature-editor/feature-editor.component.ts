import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Subscription, debounceTime } from 'rxjs';

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
import { SearchableSelectComponent } from '../searchable-select/searchable-select.component';

/**
 * Features map. This is used for features from closed sets,
 * and lists the possible values for each feature.
 * The key is the feature name's ID, and the value is an array of
 * labeled IDs representing the allowed values for that feature.
 */
export interface FeatureMap {
  [key: string]: LabeledId[];
}

/**
 * Feature properties map. This is used to preset properties like set policy,
 * negation, global, and short-lived for specific features without hardcoding
 * that logic in the component. The key is the feature name's ID, and the
 * value is an object containing the properties to preset for that feature.
 */
export interface FeaturePropMap {
  [key: string]: {
    setPolicy: FeatureSetPolicy;
    isNegated?: boolean;
    isGlobal?: boolean;
    isShortLived?: boolean;
  };
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
 * - ▶️ `multiValuedFeatureIds` (`string[]`): the IDs of the features that are
 * multi-valued. Used to determine if the current feature being edited should
 * display multi-value controls.
 * - ▶️ `isVar`: true if the feature is a variant operation feature, which
 * has additional properties like negation, global, and short-lived.
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
    SearchableSelectComponent,
  ],
  templateUrl: './feature-editor.component.html',
  styleUrl: './feature-editor.component.css',
})
export class FeatureEditorComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

  public readonly nameControl = viewChild<
    SearchableSelectComponent | ElementRef<HTMLInputElement>
  >('nameCtl');

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
   * The feature properties map. When specified and the user selects a
   * feature name present in the map keys, the corresponding properties
   * will be used to populate the form controls for set policy, negation,
   * global, and short-lived. This allows presetting these properties
   * for specific features without hardcoding that logic in the component.
   */
  public readonly featProps = input<FeaturePropMap | undefined>();

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
   * The IDs of the features that are multi-valued. Used to determine
   * if the current feature being edited should display multi-value controls.
   */
  public readonly multiValuedFeatureIds = input<string[] | undefined>([
    'r_hints',
  ]);

  /**
   * Event emitted when the user cancels the feature editing.
   */
  public readonly featureCancel = output();

  /**
   * The allowed value IDs for the currently selected feature name.
   * Set synchronously in updateForm (on feature load) and in the
   * name.valueChanges subscription (on user interaction).
   */
  public readonly nameIds = signal<LabeledId[] | undefined>(undefined);

  /**
   * Tracks the current feature name. Updated synchronously in updateForm
   * and in the name.valueChanges subscription so that isMultiValued stays
   * in sync regardless of whether the change was programmatic or user-driven.
   */
  private readonly _currentName = signal<string>('');

  public name: FormControl<string>;
  public value: FormControl<string>;
  public valuePrefix: FormControl<string>;
  public selectedValue: FormControl<string>;
  public setPolicy: FormControl<FeatureSetPolicy>;
  // var feature controls
  public isNegated: FormControl<boolean>;
  public isGlobal: FormControl<boolean>;
  public isShortLived: FormControl<boolean>;
  public form: FormGroup;

  /**
   * Computed signal that determines if the current feature is multi-valued.
   * Automatically updates when either _currentName or multiValuedFeatureIds
   * changes.
   */
  public readonly isMultiValued = computed(() => {
    const ids = this.multiValuedFeatureIds();
    const name = this._currentName();
    return !!ids && !!name && ids.includes(name);
  });

  constructor(formBuilder: FormBuilder) {
    this.name = formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(50)],
      nonNullable: true,
    });
    this.value = formBuilder.control('', {
      validators: [Validators.maxLength(5000)],
      nonNullable: true,
    });
    this.valuePrefix = formBuilder.control('', {
      validators: [(c) => (c.value && !c.value.endsWith(':') ? { noColon: true } : null)],
      nonNullable: true,
    });
    this.selectedValue = formBuilder.control('', {
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
      valuePrefix: this.valuePrefix,
      selectedValue: this.selectedValue,
      setPolicy: this.setPolicy,
      isNegated: this.isNegated,
      isGlobal: this.isGlobal,
      isShortLived: this.isShortLived,
    });

    // When the feature input changes, repopulate the form atomically.
    // featValues is read via untracked() so changes to it do not retrigger
    // this effect and accidentally overwrite in-progress user edits.
    effect(() => {
      this.updateForm(this.feature());
      // nameCtl may still point at the just-unmounted branch's element
      // for one tick after an unrelated input (e.g. featNames) flips
      // which branch is rendered, so guard the call, not just the ref.
      setTimeout(() => this.focusName(), 0);
    });
  }

  public ngOnInit(): void {
    // Respond to user-initiated name changes only.
    // updateForm uses { emitEvent: false } so programmatic loads never
    // reach this subscription, eliminating the race that caused value.reset()
    // to fire after a 300 ms debounce and wipe the just-loaded value.
    // No distinctUntilChanged here: programmatic loads do not emit, so the
    // last emitted name may be stale, and the user re-picking it after a
    // load must still refresh the value IDs.
    this._sub = this.name.valueChanges
      .pipe(debounceTime(300))
      .subscribe((name) => {
        this._currentName.set(name);
        this.nameIds.set(this.getLabeledIdsFor(name, this.featValues()));
        // Reset value only when preset names are in use; for free-text names
        // the value is independent and must not be cleared.
        if (this.featNames()?.length) {
          this.value.reset();
          this.valuePrefix.reset();
          // Apply featProps presets for the selected name if available.
          const props = this.featProps();
          if (props && name && props[name]) {
            const preset = props[name];
            this.setPolicy.setValue(preset.setPolicy);
            if (preset.isNegated !== undefined) {
              this.isNegated.setValue(preset.isNegated);
            }
            if (preset.isGlobal !== undefined) {
              this.isGlobal.setValue(preset.isGlobal);
            }
            if (preset.isShortLived !== undefined) {
              this.isShortLived.setValue(preset.isShortLived);
            }
          }
        }
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private focusName(): void {
    const ctl = this.nameControl();
    if (ctl instanceof ElementRef) {
      ctl.nativeElement.focus?.();
    } else {
      ctl?.focus?.();
    }
  }

  private getLabeledIdsFor(
    id?: string,
    featValues?: FeatureMap,
  ): LabeledId[] | undefined {
    if (!id) {
      return undefined;
    }
    return featValues ? featValues[id] : undefined;
  }

  private updateForm(feature?: OperationFeature): void {
    if (!feature) {
      this._currentName.set('');
      this.nameIds.set(undefined);
      this.form.reset();
    } else {
      // Read featValues outside the reactive context so that changes to
      // featValues alone do not re-trigger the parent effect and overwrite
      // any in-progress user edits.
      const featValues = untracked(() => this.featValues());

      // Update derived signals first so the template can resolve the correct
      // control type (select vs text) before Angular renders.
      this._currentName.set(feature.name);
      this.nameIds.set(this.getLabeledIdsFor(feature.name, featValues));

      // Use emitEvent: false to suppress valueChanges events.
      // This prevents the name.valueChanges subscription (which resets the
      // value control) from firing during a programmatic load.
      this.name.setValue(feature.name, { emitEvent: false });

      // For closed value sets, split the stored value into prefix (up to and
      // including the first ':') and the base value after it.
      const ids = this.getLabeledIdsFor(feature.name, featValues);
      if (ids?.length) {
        const colonIdx = feature.value.indexOf(':');
        if (colonIdx >= 0) {
          this.valuePrefix.setValue(feature.value.substring(0, colonIdx + 1), { emitEvent: false });
          this.value.setValue(feature.value.substring(colonIdx + 1), { emitEvent: false });
        } else {
          this.valuePrefix.setValue('', { emitEvent: false });
          this.value.setValue(feature.value, { emitEvent: false });
        }
      } else {
        this.valuePrefix.setValue('', { emitEvent: false });
        this.value.setValue(feature.value, { emitEvent: false });
      }
      this.setPolicy.setValue(feature.setPolicy || FeatureSetPolicy.multiple);
      this.isNegated.setValue(feature.isNegated || false);
      this.isGlobal.setValue(feature.isGlobal || false);
      this.isShortLived.setValue(feature.isShortLived || false);
    }
  }

  public addValueToComposite(): void {
    if (!this.selectedValue.value) {
      return;
    }
    const currentValue = this.value.value.trim();
    const newValue = this.selectedValue.value.trim();
    if (currentValue) {
      this.value.setValue(currentValue + ' ' + newValue);
    } else {
      this.value.setValue(newValue);
    }
    this.selectedValue.reset();
    this.value.markAsDirty();
  }

  public cancel(): void {
    this.featureCancel.emit();
  }

  public save(): void {
    if (!this.form.valid) {
      return;
    }
    const prefix = this.nameIds()?.length ? this.valuePrefix.value.trim() : '';
    const value = prefix + this.value.value.trim();
    this.feature.set(
      this.isVar()
        ? {
            name: this.name.value.trim(),
            value,
            setPolicy: this.setPolicy.value,
            isNegated: this.isNegated.value,
            isGlobal: this.isGlobal.value,
            isShortLived: this.isShortLived.value,
          }
        : {
            name: this.name.value.trim(),
            value,
            setPolicy: this.setPolicy.value,
          },
    );
  }
}

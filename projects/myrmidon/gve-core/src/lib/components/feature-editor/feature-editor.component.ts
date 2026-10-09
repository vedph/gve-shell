import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  linkedSignal,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { form, FormField, required, validate } from '@angular/forms/signals';

import { filter, map, pairwise } from 'rxjs';

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
import { softMaxLength } from '../../validators/signal-validators';
import { debounceUntilDestroyed } from '../../utils/debounce-until-destroyed';

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
 * The editable shape behind the feature form.
 */
interface FeatureControls {
  name: string;
  value: string;
  valuePrefix: string;
  selectedValue: string;
  setPolicy: FeatureSetPolicy;
  // var feature controls
  isNegated: boolean;
  isGlobal: boolean;
  isShortLived: boolean;
}

/**
 * Get the allowed value IDs for the feature with the specified name.
 */
function getLabeledIdsFor(
  id?: string,
  featValues?: FeatureMap,
): LabeledId[] | undefined {
  if (!id) {
    return undefined;
  }
  return featValues ? featValues[id] : undefined;
}

/**
 * Bound feature -> editable draft.
 *
 * @param feature The feature.
 * @param featValues The feature values map, used to tell whether the value
 * belongs to a closed set, so that its prefix must be split from it.
 */
function toDraft(
  feature: OperationFeature | undefined,
  featValues: FeatureMap | undefined,
): FeatureControls {
  if (!feature) {
    return {
      name: '',
      value: '',
      valuePrefix: '',
      selectedValue: '',
      setPolicy: FeatureSetPolicy.multiple,
      isNegated: false,
      isGlobal: false,
      isShortLived: false,
    };
  }

  // for closed value sets, split the stored value into prefix (up to and
  // including the first ':') and the base value after it
  let valuePrefix = '';
  let value = feature.value;
  if (getLabeledIdsFor(feature.name, featValues)?.length) {
    const colonIdx = feature.value.indexOf(':');
    if (colonIdx >= 0) {
      valuePrefix = feature.value.substring(0, colonIdx + 1);
      value = feature.value.substring(colonIdx + 1);
    }
  }

  return {
    name: feature.name,
    value,
    valuePrefix,
    selectedValue: '',
    setPolicy: feature.setPolicy || FeatureSetPolicy.multiple,
    isNegated: feature.isNegated || false,
    isGlobal: feature.isGlobal || false,
    isShortLived: feature.isShortLived || false,
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
    FormField,
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
export class FeatureEditorComponent {
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
   * Derived from a newly bound feature, and set after a user-initiated
   * name change. featValues is read untracked, so that its changes alone
   * do not alter the controls of a feature being edited.
   */
  public readonly nameIds = linkedSignal<LabeledId[] | undefined>(() =>
    getLabeledIdsFor(
      this.feature()?.name,
      untracked(() => this.featValues()),
    ),
  );

  /**
   * The current feature name, derived from a newly bound feature, and set
   * after a user-initiated name change, so that isMultiValued stays in sync
   * regardless of whether the change was programmatic or user-driven.
   */
  private readonly _currentName = linkedSignal(
    () => this.feature()?.name ?? '',
  );

  /**
   * The editable draft, rebuilt from the bound feature whenever it changes
   * (including the echo of our own save: the feature is saved only with an
   * explicit action). featValues is read untracked so that its changes
   * alone do not overwrite in-progress user edits.
   */
  private readonly _draft = linkedSignal(() =>
    toDraft(
      this.feature(),
      untracked(() => this.featValues()),
    ),
  );

  public readonly form = form(this._draft, (path) => {
    required(path.name);
    softMaxLength(path.name, 50);
    softMaxLength(path.value, 5000);
    validate(path.valuePrefix, ({ value }) =>
      value() && !value().endsWith(':') ? { kind: 'noColon' } : undefined,
    );
  });

  /**
   * True when the edited feature can be saved.
   */
  public readonly canSave = computed(
    () => this.form().valid() && this.form().dirty(),
  );

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

  constructor() {
    // When the feature input changes, the draft is rebuilt from it:
    // reset the interaction state and focus the name.
    effect(() => {
      this.feature();
      untracked(() => this.form().reset());
      // nameCtl may still point at the just-unmounted branch's element
      // for one tick after an unrelated input (e.g. featNames) flips
      // which branch is rendered, so guard the call, not just the ref.
      setTimeout(() => this.focusName(), 0);
    });

    // Respond to user-initiated name changes only. Each name is paired
    // with the feature bound at that time: when the feature changed too,
    // the name comes from loading a feature (or from the echo of our own
    // save), and must not reset the just-loaded value. No
    // distinctUntilChanged here: the user re-picking the last picked name
    // after a load must still refresh the value IDs.
    toObservable(
      computed(() => ({
        name: this.form.name().value(),
        feature: this.feature(),
      })),
    )
      .pipe(
        pairwise(),
        filter(([prev, curr]) => prev.feature === curr.feature),
        map(([, curr]) => curr.name),
        debounceUntilDestroyed(300),
      )
      .subscribe((name) => this.onUserNameChange(name));
  }

  private onUserNameChange(name: string): void {
    this._currentName.set(name);
    this.nameIds.set(getLabeledIdsFor(name, this.featValues()));

    // Reset value only when preset names are in use; for free-text names
    // the value is independent and must not be cleared.
    if (!this.featNames()?.length) {
      return;
    }
    this.form.value().reset('');
    this.form.valuePrefix().reset('');

    // Apply featProps presets for the selected name if available.
    const preset = name ? this.featProps()?.[name] : undefined;
    if (preset) {
      this.form.setPolicy().value.set(preset.setPolicy);
      if (preset.isNegated !== undefined) {
        this.form.isNegated().value.set(preset.isNegated);
      }
      if (preset.isGlobal !== undefined) {
        this.form.isGlobal().value.set(preset.isGlobal);
      }
      if (preset.isShortLived !== undefined) {
        this.form.isShortLived().value.set(preset.isShortLived);
      }
    }
  }

  private focusName(): void {
    const ctl = this.nameControl();
    if (ctl instanceof ElementRef) {
      ctl.nativeElement.focus?.();
    } else {
      ctl?.focus?.();
    }
  }

  public addValueToComposite(): void {
    const selectedValue = this.form.selectedValue().value();
    if (!selectedValue) {
      return;
    }
    const currentValue = this.form.value().value().trim();
    const newValue = selectedValue.trim();
    this.form
      .value()
      .value.set(currentValue ? currentValue + ' ' + newValue : newValue);
    this.form.selectedValue().reset('');
    this.form.value().markAsDirty();
  }

  public cancel(): void {
    this.featureCancel.emit();
  }

  /**
   * Handle Enter in a single-line input: accept the changes when they can
   * be saved, like the implicit form submission this component used to
   * rely on.
   */
  public onEnter(event: Event): void {
    // never let Enter reach an implicit submission of an outer form
    event.preventDefault();
    if (this.canSave()) {
      this.save();
    }
  }

  public save(): void {
    if (!this.form().valid()) {
      return;
    }
    const v = this._draft();
    const prefix = this.nameIds()?.length ? v.valuePrefix.trim() : '';
    const value = prefix + v.value.trim();
    this.feature.set(
      this.isVar()
        ? {
            name: v.name.trim(),
            value,
            setPolicy: v.setPolicy,
            isNegated: v.isNegated,
            isGlobal: v.isGlobal,
            isShortLived: v.isShortLived,
          }
        : {
            name: v.name.trim(),
            value,
            setPolicy: v.setPolicy,
          },
    );
  }
}

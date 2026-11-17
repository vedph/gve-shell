import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { debounce, form, FormField } from '@angular/forms/signals';

import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import {
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';

import { FlatLookupPipe } from '@myrmidon/ngx-tools';
import {
  FeatureSetPolicy,
  LabeledId,
  Feature,
  OperationFeature,
} from '../../models';

import {
  FeatureEditorComponent,
  FeatureMap,
  FeaturePropMap,
} from '../feature-editor/feature-editor.component';
import {
  featuresToClipboardText,
  mergePastedFeatures,
  parseClipboardFeatures,
} from '../../utils/feature-clipboard';

/**
 * 🔑 `gve-feature-set-editor`
 *
 * Component for editing a set of features. It shows a list of features,
 * allowing to edit each of them or adding new ones. Optionally you can
 * specify a list of feature names and values to use in the selection.
 * Used by base text editor and chain operation editor components.
 *
 * - ▶️ `featNames` (`LabeledId[]`): the list of feature names to display
 * in the _name_ selection. This is used when you have a closed list of features.
 * - ▶️ `featValues` (`FeatureMap`): the feature values map. When specified
 * and the user selects a feature name present in the map keys, the corresponding
 * values will be used to populate the value selection.
 * - ▶️ `filterThreshold` (`number`): the threshold at which the features filter
 * should become visible. If set to 0, the filter is always visible; if set to -1,
 * it is always invisible; otherwise, it gets visible when the number of features
 * is equal to or greater than the threshold. Default is 5.
 * - ▶️ `features` (`Feature[]`): the features to edit.
 * - ▶️ `multiValuedFeatureIds` (`string[]`): the IDs of the features that are
 * multi-valued. If a feature being edited is in this list, the feature editor
 * will allow adding multiple values to it.
 * - ▶️ `isVar`: true if the feature is a variant operation feature, which
 * has additional properties like negation, global, and short-lived.
 * - ▶️ `batchMode`: true to enable batch mode, where users edit features
 * without the component firing change events until they click the "Save" button,
 * and close the editor without saving by clicking the "Close" button.
 * - ▶️ `addFeatureShortcut`: the label of the keyboard shortcut handled by
 * the parent component to add a new feature, if any, shown in the add button
 * tooltip.
 * - 🔥 `close`: emitted when the user clicks the close button.
 *
 * Features are listed sorted by name, as they are an unordered set. Users can
 * select features and copy them to the clipboard, and paste features copied
 * in this way: each pasted feature is added according to its set policy
 * (multiple: appended; single: replacing all the features with its name;
 * single first: the first pasted with a name replaces all the features with
 * that name, the next ones are appended).
 * - 🔥 `featuresChange` (`Feature[]`): emitted when features have changed.
 */
@Component({
  selector: 'gve-feature-set-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatButton,
    MatIconButton,
    MatCheckbox,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatLabel,
    MatSuffix,
    MatIcon,
    MatInput,
    MatTooltip,
    FlatLookupPipe,
    FeatureEditorComponent,
  ],
  templateUrl: './feature-set-editor.component.html',
  styleUrl: './feature-set-editor.component.css',
})
export class FeatureSetEditorComponent {
  public readonly POLICIES = ['M', 'S', 'SF'];

  /**
   * True if the feature is a variant operation feature, which has
   * additional properties like negation, global, and short-lived.
   */
  public readonly isVar = input(true);

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
   * The threshold at which the features filter should become visible.
   * If set to 0, the filter is always visible; if set to -1, it is always
   * invisible; otherwise, it gets visible when the number of features
   * is greater than or equal to the threshold. Default is 5.
   */
  public readonly filterThreshold = input(5);

  /**
   * The IDs of the features that are multi-valued. If a feature being
   * edited is in this list, the feature editor will allow adding multiple
   * values to it.
   */
  public readonly multiValuedFeatureIds = input<string[] | undefined>([
    'r_hints',
  ]);

  /**
   * True to enable batch mode, where users edit features
   * without the component firing change events until they click the "Save" button,
   * and close the editor without saving by clicking the "Close" button.
   */
  public readonly batchMode = input(false);

  /**
   * The label of the keyboard shortcut handled by the parent component to
   * add a new feature, if any. This is just shown in the add button tooltip.
   */
  public readonly addFeatureShortcut = input<string | undefined>();

  /**
   * Emitted when the user clicks the close button.
   */
  public readonly close = output();

  /**
   * The features to edit.
   */
  public readonly features = model<Feature[] | OperationFeature[]>([]);

  public readonly editedFeature = signal<
    Feature | OperationFeature | undefined
  >(undefined);
  public readonly editedFeatureIndex = signal<number>(-1);

  // In batch mode, mutations accumulate here until the user clicks OK.
  public readonly draftFeatures = signal<Feature[] | OperationFeature[]>([]);

  // Active source: draft in batch mode, model signal otherwise.
  public readonly workingFeatures = computed<Feature[] | OperationFeature[]>(
    () => (this.batchMode() ? this.draftFeatures() : this.features()),
  );

  // Show Close/OK buttons only in batch mode.
  public readonly hasCloseButton = computed(() => this.batchMode());

  /**
   * The features name filter.
   */
  private readonly _filter = signal('');

  /**
   * The filter field. User input reaches the filter debounced.
   */
  public readonly filter = form(this._filter, (path) => debounce(path, 300));

  /**
   * The working features matching the filter, if any, sorted by name
   * (features are an unordered set). The sort is stable, so features with
   * the same name keep their relative order.
   */
  public readonly filteredFeatures = computed<(Feature | OperationFeature)[]>(
    () => {
      const name = this._filter().toLowerCase();
      const features: (Feature | OperationFeature)[] = this.workingFeatures();
      return (
        name
          ? features.filter((feature) =>
              feature.name.toLowerCase().includes(name),
            )
          : [...features]
      ).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
    },
  );

  // the features selected for copy, by reference
  private readonly _selected = signal<ReadonlySet<Feature | OperationFeature>>(
    new Set(),
  );

  /**
   * The selected features still in the working features, in their order.
   */
  public readonly selectedFeatures = computed<(Feature | OperationFeature)[]>(
    () => {
      const selected = this._selected();
      return (this.workingFeatures() as (Feature | OperationFeature)[]).filter(
        (f) => selected.has(f),
      );
    },
  );

  /**
   * True when all the listed features are selected.
   */
  public readonly allSelected = computed(() => {
    const listed = this.filteredFeatures();
    const selected = this._selected();
    return listed.length > 0 && listed.every((f) => selected.has(f));
  });

  private readonly _snackbar = inject(MatSnackBar);

  constructor() {
    // Sync draft from the model input whenever features or batchMode changes.
    effect(() => {
      if (this.batchMode()) {
        this.draftFeatures.set([...this.features()]);
      }
    });
  }

  public addFeature(): void {
    this.editedFeature.set({
      name: '',
      value: '',
      setPolicy: FeatureSetPolicy.multiple,
    });
    this.editedFeatureIndex.set(-1);
  }

  public editFeature(feature: Feature | OperationFeature): void {
    this.editedFeature.set(structuredClone(feature));
    this.editedFeatureIndex.set(this.workingFeatures().indexOf(feature));
  }

  public deleteFeature(feature: Feature | OperationFeature): void {
    const source = this.workingFeatures();
    const index = source.indexOf(feature);
    if (index < 0) {
      return;
    }
    const features = [...source];
    features.splice(index, 1);

    // keep the edited feature index in sync with the list
    const editedIndex = this.editedFeatureIndex();
    if (editedIndex === index) {
      this.onFeatureCancel();
    } else if (editedIndex > index) {
      this.editedFeatureIndex.set(editedIndex - 1);
    }

    if (this.batchMode()) {
      this.draftFeatures.set(features);
    } else {
      this.features.set(features);
    }
  }

  /**
   * True if the specified feature is selected for copy.
   */
  public isSelected(feature: Feature | OperationFeature): boolean {
    return this._selected().has(feature);
  }

  /**
   * Toggle the selection of the specified feature.
   */
  public toggleSelected(feature: Feature | OperationFeature): void {
    const selected = new Set(this._selected());
    if (!selected.delete(feature)) {
      selected.add(feature);
    }
    this._selected.set(selected);
  }

  /**
   * Select all the listed features, or deselect them when all are selected.
   */
  public toggleAllSelected(): void {
    const selected = new Set(this._selected());
    const listed = this.filteredFeatures();
    if (this.allSelected()) {
      listed.forEach((f) => selected.delete(f));
    } else {
      listed.forEach((f) => selected.add(f));
    }
    this._selected.set(selected);
  }

  /**
   * Copy the selected features to the clipboard.
   */
  public async copySelected(): Promise<void> {
    const features = this.selectedFeatures();
    if (!features.length) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        featuresToClipboardText(structuredClone(features)),
      );
      this._snackbar.open(
        features.length === 1
          ? '1 feature copied'
          : `${features.length} features copied`,
        'OK',
        { duration: 3000 },
      );
    } catch (error) {
      console.error('Error copying features', error);
      this._snackbar.open('Error copying features', 'OK');
    }
  }

  /**
   * Paste the features copied to the clipboard, merging them with the
   * existing features according to their set policy.
   */
  public async paste(): Promise<void> {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch (error) {
      console.error('Error reading clipboard', error);
      this._snackbar.open('Error reading features from clipboard', 'OK');
      return;
    }
    const pasted = parseClipboardFeatures(text, this.isVar());
    if (!pasted) {
      this._snackbar.open('No copied features found in clipboard', 'OK', {
        duration: 3000,
      });
      return;
    }

    const working = this.workingFeatures() as (Feature | OperationFeature)[];
    const merged = mergePastedFeatures(working, pasted);

    // keep the edited feature index in sync, if it is still there
    const editedIndex = this.editedFeatureIndex();
    if (editedIndex > -1) {
      const index = merged.indexOf(working[editedIndex]);
      if (index > -1) {
        this.editedFeatureIndex.set(index);
      } else {
        this.onFeatureCancel();
      }
    }

    if (this.batchMode()) {
      this.draftFeatures.set(merged);
    } else {
      this.features.set(merged);
    }
    this._snackbar.open(
      pasted.length === 1
        ? '1 feature pasted'
        : `${pasted.length} features pasted`,
      'OK',
      { duration: 3000 },
    );
  }

  public isFeatureMultiValued(feature?: Feature | OperationFeature): boolean {
    if (!feature || !this.multiValuedFeatureIds()) {
      return false;
    }
    return this.multiValuedFeatureIds()!.includes(feature.name);
  }

  public onFeatureChange(feature?: Feature | OperationFeature): void {
    if (!feature) {
      return;
    }
    const editedIndex = this.editedFeatureIndex();
    const features: (Feature | OperationFeature)[] = [];

    // copy all the features, replacing the edited one (if any) in place,
    // and dropping the other features with the same name when either
    // of them has a single set policy
    this.workingFeatures().forEach((f, i) => {
      if (i === editedIndex) {
        features.push(feature);
      } else if (
        f.name !== feature.name ||
        (feature.setPolicy !== FeatureSetPolicy.single &&
          f.setPolicy !== FeatureSetPolicy.single)
      ) {
        features.push(f);
      }
    });
    if (editedIndex === -1) {
      features.push(feature);
    }

    this.onFeatureCancel();
    if (this.batchMode()) {
      this.draftFeatures.set(features);
    } else {
      this.features.set(features);
    }
  }

  /**
   * True if the specified feature is the one being edited.
   */
  public isEdited(feature: Feature | OperationFeature): boolean {
    const index = this.editedFeatureIndex();
    return index > -1 && this.workingFeatures()[index] === feature;
  }

  public onFeatureCancel(): void {
    this.editedFeature.set(undefined);
    this.editedFeatureIndex.set(-1);
  }

  public onOk(): void {
    this.features.set(this.draftFeatures());
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { debounce, form, FormField } from '@angular/forms/signals';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

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
 * - 🔥 `close`: emitted when the user clicks the close button.
 * - 🔥 `featuresChange` (`Feature[]`): emitted when features have changed.
 */
@Component({
  selector: 'gve-feature-set-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
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
   * The working features matching the filter, if any.
   */
  public readonly filteredFeatures = computed<Feature[] | OperationFeature[]>(
    () => {
      const name = this._filter().toLowerCase();
      const features = this.workingFeatures();
      return name
        ? features.filter((feature) =>
            feature.name.toLowerCase().includes(name),
          )
        : features;
    },
  );

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

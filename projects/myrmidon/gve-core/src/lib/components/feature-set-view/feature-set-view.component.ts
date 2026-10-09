import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
} from '@angular/core';
import { debounce, form, FormField } from '@angular/forms/signals';

import { MatIconButton } from '@angular/material/button';
import {
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

import { FlatLookupPipe } from '@myrmidon/ngx-tools';
import {
  Feature,
  LabeledId,
  OperationFeature,
} from '../../models';

import { FeatureMap } from '../feature-editor/feature-editor.component';

/**
 * 🔑 `gve-feature-set-view`
 *
 * A component to display a list of features.
 * Used by the chain result view component.
 *
 * - ▶️ `features` (`Feature[]`): the features to display.
 * - ▶️ `featNames` (`LabeledId[]`): the list of feature names to display
 * in the _name_ selection. This is used when you have a closed list of features.
 * - ▶️ `featValues` (`FeatureMap`): the feature values map. When specified
 * and the user selects a feature name present in the map keys, the corresponding
 * values will be used to populate the value selection.
 * - ▶️ `filterThreshold` (`number`): the threshold at which the features filter
 * should become visible. If set to 0, the filter is always visible; if set to -1,
 * it is always invisible; otherwise, it gets visible when the number of features
 * is greater than the threshold. Default is 5.
 */
@Component({
  selector: 'gve-feature-set-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatSuffix,
    MatIcon,
    MatInput,
    FlatLookupPipe,
  ],
  templateUrl: './feature-set-view.component.html',
  styleUrl: './feature-set-view.component.css',
})
export class FeatureSetViewComponent {
  /**
   * The features.
   */
  public readonly features = input<Feature[] | OperationFeature[]>([]);

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
   * The threshold at which the features filter should become visible.
   * If set to 0, the filter is always visible; if set to -1, it is always
   * invisible; otherwise, it gets visible when the number of features
   * is greater than the threshold. Default is 5.
   */
  public readonly filterThreshold = input(5);

  /**
   * The features name filter, cleared whenever the features change.
   */
  private readonly _filter = linkedSignal({
    source: this.features,
    computation: () => '',
  });

  /**
   * The filter field. User input reaches the filter debounced.
   */
  public readonly filter = form(this._filter, (path) => debounce(path, 300));

  /**
   * The features matching the filter, if any.
   */
  public readonly filteredFeatures = computed<Feature[] | OperationFeature[]>(
    () => {
      const name = this._filter().toLowerCase();
      return name
        ? this.features().filter((feature) =>
            feature.name.toLowerCase().includes(name),
          )
        : this.features();
    },
  );
}

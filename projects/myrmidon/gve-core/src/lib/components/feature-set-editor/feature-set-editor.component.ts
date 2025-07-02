
import {
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { FlatLookupPipe } from '@myrmidon/ngx-tools';
import {
  FeatureSetPolicy,
  LabeledId,
  Feature,
  OperationFeature,
} from '@myrmidon/gve-snapshot-view';
import {
  FeatureEditorComponent,
  FeatureMap,
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
 * - ▶️ `isVar`: true if the feature is a variant operation feature, which
 * has additional properties like negation, global, and short-lived.
 * - 🔥 `featuresChange` (`Feature[]`): emitted when features have changed.
 */
@Component({
  selector: 'gve-feature-set-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    FlatLookupPipe,
    FeatureEditorComponent
],
  templateUrl: './feature-set-editor.component.html',
  styleUrl: './feature-set-editor.component.css',
})
export class FeatureSetEditorComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  private _editedFeatureIndex: number;

  public POLICIES = ['M', 'S', 'SF'];

  /**
   * True if the features are variable features.
   */
  public readonly isVar = input(false);

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
   * is greater than or equal to the threshold. Default is 5.
   */
  public readonly filterThreshold = input(5);

  /**
   * The features to edit.
   */
  public readonly features = model<Feature[] | OperationFeature[]>([]);

  /**
   * Emitted when the features change.
   */
  public readonly featuresChange = output<Feature[] | OperationFeature[]>();

  public editedFeature?: Feature | OperationFeature;

  // filter
  public filter: FormControl<string | null>;
  public filteredFeatures: Feature[] | OperationFeature[];

  constructor(formBuilder: FormBuilder) {
    this.filteredFeatures = [];
    this.filter = formBuilder.control<string | null>(null);
    this._editedFeatureIndex = -1;

    // when features change, apply the filter
    effect(() => {
      this.applyFeatureFilter(this.features(), this.filter.value);
    });
  }

  private applyFeatureFilter(
    features: Feature[] | OperationFeature[],
    name?: string | null
  ): void {
    this.filteredFeatures =
      features.filter((feature) => {
        return !name || feature.name.toLowerCase().includes(name.toLowerCase());
      }) || [];
  }

  public ngOnInit(): void {
    // when the filter changes, apply the filter
    this._sub = this.filter.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe((value) => {
        this.applyFeatureFilter(this.features(), value);
      });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public addFeature(): void {
    this.editedFeature = {
      name: '',
      value: '',
      setPolicy: FeatureSetPolicy.multiple,
    };
    this._editedFeatureIndex = -1;
  }

  public editFeature(feature: Feature | OperationFeature): void {
    this.editedFeature = feature;
    this._editedFeatureIndex = this.features().indexOf(feature);
  }

  public deleteFeature(feature: Feature | OperationFeature): void {
    const index = this.features().indexOf(feature);
    if (index < 0) {
      return;
    }
    const features = [...this.features()];
    features.splice(index, 1);
    this.features.set(features);
    this.featuresChange.emit(this.features());
  }

  public onFeatureChange(feature?: Feature | OperationFeature): void {
    if (!feature) {
      return;
    }
    const features = [...this.features()];

    for (let i = features.length - 1; i >= 0; i--) {
      if (features[i].name === feature.name) {
        if (
          feature.setPolicy === FeatureSetPolicy.single ||
          features[i].setPolicy === FeatureSetPolicy.single
        ) {
          features.splice(i, 1);
        }
      }
    }

    if (this._editedFeatureIndex === -1) {
      features.push(feature);
    } else {
      features.splice(this._editedFeatureIndex, 1, feature);
    }

    this.onFeatureCancel();
    this.features.set(features);
    this.featuresChange.emit(this.features()!);
  }

  public onFeatureCancel(): void {
    this.editedFeature = undefined;
    this._editedFeatureIndex = -1;
  }
}

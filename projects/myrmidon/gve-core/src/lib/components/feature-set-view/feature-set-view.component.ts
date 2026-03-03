import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';

import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

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
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FlatLookupPipe,
  ],
  templateUrl: './feature-set-view.component.html',
  styleUrl: './feature-set-view.component.css',
})
export class FeatureSetViewComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;

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

  public readonly filteredFeatures = signal<Feature[] | OperationFeature[]>([]);

  // filter
  public filter: FormControl<string | null>;

  constructor(formBuilder: FormBuilder) {
    this.filter = formBuilder.control(null);

    // when features change, reset the filter and apply it
    effect(() => {
      const features = this.features();
      this.filter.reset();
      this.applyFeatureFilter();
    });
  }

  private applyFeatureFilter(name?: string | null): void {
    this.filteredFeatures.set(
      this.features().filter((feature) => {
        return !name || feature.name.toLowerCase().includes(name.toLowerCase());
      })
    );
  }

  public ngOnInit(): void {
    this._sub = this.filter.valueChanges
      .pipe(distinctUntilChanged(), debounceTime(300))
      .subscribe((value) => {
        this.applyFeatureFilter(value);
      });
    this.applyFeatureFilter();
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }
}

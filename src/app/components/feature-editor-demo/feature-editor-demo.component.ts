import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { JsonPipe } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';

import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';

import { Feature, LabeledId } from '@myrmidon/gve-core';

import {
  FeatureEditorComponent,
  FeatureMap,
} from '@myrmidon/gve-core';

@Component({
  selector: 'app-feature-editor-demo',
  imports: [
    JsonPipe,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCheckbox,
    FormField,
    FeatureEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-editor-demo.component.html',
  styleUrl: './feature-editor-demo.component.scss',
})
export class FeatureEditorDemoComponent {
  public readonly presets = form(
    signal({ hasFeatNames: false, hasFeatValues: false }),
  );

  public readonly featNames = computed<LabeledId[] | undefined>(() =>
    this.presets.hasFeatNames().value()
      ? [
          {
            id: 'clr',
            label: 'color',
          },
          {
            id: 'sz',
            label: 'size',
          },
        ]
      : undefined,
  );
  public readonly featValues = computed<FeatureMap | undefined>(() =>
    this.presets.hasFeatValues().value()
      ? {
          clr: [
            {
              id: 'r',
              label: 'red',
            },
            {
              id: 'g',
              label: 'green',
            },
            {
              id: 'b',
              label: 'blue',
            },
          ],
        }
      : undefined,
  );
  public readonly feature = signal<Feature | undefined>({
    name: 'color',
    value: 'red',
    setPolicy: 0,
  });

  public onFeatureChange(feature?: Feature): void {
    this.feature.set(feature);
  }
}

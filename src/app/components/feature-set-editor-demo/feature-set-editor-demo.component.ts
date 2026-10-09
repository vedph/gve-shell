import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, min } from '@angular/forms/signals';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Feature, LabeledId } from '@myrmidon/gve-core';
import { FeatureMap, FeatureSetEditorComponent } from '@myrmidon/gve-core';

@Component({
  selector: 'app-feature-set-editor-demo',
  imports: [
    CommonModule,
    FormField,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    FeatureSetEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-set-editor-demo.component.html',
  styleUrl: './feature-set-editor-demo.component.scss',
})
export class FeatureSetEditorDemoComponent {
  public readonly presets = form(
    signal({ filterThreshold: 5 as number | null }),
    (path) => min(path.filterThreshold, -1),
  );

  public readonly featNames = signal<LabeledId[] | undefined>([
    {
      id: 'clr',
      label: 'color',
    },
    {
      id: 'clrs',
      label: 'colors',
    },
    {
      id: 'sz',
      label: 'size',
    },
  ]);
  public readonly featValues = signal<FeatureMap | undefined>({
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
    clrs: [
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
      {
        id: 'y',
        label: 'yellow',
      },
    ],
  });
  public readonly features = signal<Feature[]>([
    {
      name: 'clr',
      value: 'red',
      setPolicy: 0,
    },
  ]);
  public readonly multiValuedFeatureIds = signal<string[]>(['clrs']);

  public onFeaturesChange(features: Feature[]): void {
    this.features.set(features);
  }
}

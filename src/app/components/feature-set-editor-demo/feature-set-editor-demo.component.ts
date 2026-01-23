import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';

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
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    FeatureSetEditorComponent,
  ],
  templateUrl: './feature-set-editor-demo.component.html',
  styleUrl: './feature-set-editor-demo.component.scss',
})
export class FeatureSetEditorDemoComponent {
  public filterThreshold: FormControl<number>;

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

  constructor(formBuilder: FormBuilder) {
    this.filterThreshold = formBuilder.control(5, { nonNullable: true });
  }

  public onFeaturesChange(features: Feature[]): void {
    this.features.set(features);
  }
}

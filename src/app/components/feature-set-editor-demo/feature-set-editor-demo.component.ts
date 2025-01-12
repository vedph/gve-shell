import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Feature, LabeledId } from '@myrmidon/gve-snapshot-view';
import {
  FeatureMap,
  FeatureSetEditorComponent,
} from '../../../../projects/myrmidon/gve-core/src/public-api';

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
export class FeatureSetEditorDemoComponent implements OnInit, OnDestroy {
  private _subs: Subscription[];
  public hasFeatNames: FormControl;
  public hasFeatValues: FormControl;
  public filterThreshold: FormControl;

  public featNames?: LabeledId[];
  public featValues?: FeatureMap;
  public features: Feature[];

  constructor(formBuilder: FormBuilder) {
    this.hasFeatNames = formBuilder.control(false);
    this.hasFeatValues = formBuilder.control(false);
    this.filterThreshold = formBuilder.control(5);
    this.features = [
      {
        name: 'color',
        value: 'red',
        setPolicy: 0,
      },
    ];
    this._subs = [];
  }

  public ngOnInit(): void {
    this._subs.push(
      this.hasFeatNames.valueChanges.subscribe((value: boolean) => {
        if (value) {
          this.featNames = [
            {
              id: 'clr',
              label: 'color',
            },
            {
              id: 'sz',
              label: 'size',
            },
          ];
        } else {
          this.featNames = undefined;
        }
      })
    );

    this.hasFeatValues.valueChanges.subscribe((value: boolean) => {
      if (value) {
        this.featValues = {
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
        };
      } else {
        this.featValues = undefined;
      }
    });
  }

  public ngOnDestroy(): void {
    this._subs.forEach((sub: Subscription) => sub.unsubscribe());
  }

  public onFeaturesChange(features: Feature[]): void {
    this.features = features;
  }
}

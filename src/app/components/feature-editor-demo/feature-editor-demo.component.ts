import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';

import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { Feature, LabeledId } from '@myrmidon/gve-core';

import {
  FeatureEditorComponent,
  FeatureMap,
} from '@myrmidon/gve-core';

@Component({
  selector: 'app-feature-editor-demo',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    FeatureEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-editor-demo.component.html',
  styleUrl: './feature-editor-demo.component.scss',
})
export class FeatureEditorDemoComponent implements OnInit, OnDestroy {
  private _subs: Subscription[];

  public hasFeatNames: FormControl;
  public hasFeatValues: FormControl;

  public readonly featNames = signal<LabeledId[] | undefined>(undefined);
  public readonly featValues = signal<FeatureMap | undefined>(undefined);
  public readonly feature = signal<Feature | undefined>(undefined);

  constructor(formBuilder: FormBuilder) {
    this.hasFeatNames = formBuilder.control(false);
    this.hasFeatValues = formBuilder.control(false);
    this.feature.set({
      name: 'color',
      value: 'red',
      setPolicy: 0,
    });
    this._subs = [];
  }

  public ngOnInit(): void {
    this._subs.push(
      this.hasFeatNames.valueChanges.subscribe((value: boolean) => {
        if (value) {
          this.featNames.set([
            {
              id: 'clr',
              label: 'color',
            },
            {
              id: 'sz',
              label: 'size',
            },
          ]);
        } else {
          this.featNames.set(undefined);
        }
      })
    );

    this.hasFeatValues.valueChanges.subscribe((value: boolean) => {
      if (value) {
        this.featValues.set({
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
        });
      } else {
        this.featValues.set(undefined);
      }
    });
  }

  public ngOnDestroy(): void {
    this._subs.forEach((sub: Subscription) => sub.unsubscribe());
  }

  public onFeatureChange(feature?: Feature): void {
    this.feature.set(feature);
  }
}

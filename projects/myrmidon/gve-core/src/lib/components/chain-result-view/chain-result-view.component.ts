import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  input,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import {
  CharNode,
  Feature,
  OperationFeature,
} from '@myrmidon/gve-snapshot-view';

import { FeatureSetViewComponent } from '../feature-set-view/feature-set-view.component';
import { StepsMapComponent } from '../steps-map/steps-map.component';
import {
  BaseTextViewComponent,
  VarBaseTextRange,
} from '../base-text-view/base-text-view.component';
import {
  ChainOperationContextStep,
  CharChainResult,
} from '../../services/gve-api.service';
import { BaseTextCharEvent } from '../base-text-char/base-text-char.component';

/**
 * 🔑 `gve-chain-result-view`
 *
 * Component to display a chain result. This provides a version picker
 * by staged version or simple step, and shows the selected step's text
 * and features, plus a steps map. User can pick a step from both the
 * pickers or the map.
 * Used by the `gve-snapshot-editor` component.
 *
 * - ▶️ `result` (`CharChainResult`): the result to display.
 * - 🔥 `stepPick` (`ChainOperationContextStep`): emitted when a
 * result's step is picked by the user.
 */
@Component({
  selector: 'gve-chain-result-view',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    FeatureSetViewComponent,
    StepsMapComponent,
    BaseTextViewComponent,
  ],
  templateUrl: './chain-result-view.component.html',
  styleUrl: './chain-result-view.component.css',
})
export class ChainResultViewComponent implements OnInit, OnDestroy {
  private _subs?: Subscription[];

  /**
   * The result to display.
   */
  public readonly result = input<CharChainResult | undefined>();

  /**
   * The index of the initial step to display after the result is set.
   * If the index is negative, it is counted from the end of the steps.
   */
  public readonly initialStepIndex = input<number | undefined>();

  /**
   * Emitted when a result's step is picked by the user.
   */
  public readonly stepPick = output<ChainOperationContextStep>();

  public versionTags: string[] = [];
  public tags: string[] = [];
  public versionTag: FormControl<string | null>;
  public tag: FormControl<string | null>;
  public step?: ChainOperationContextStep;
  public selection?: string;
  public selectionFeatures: OperationFeature[] = [];

  constructor(formBuilder: FormBuilder) {
    // bind callback methods
    this.getCharColor = this.getCharColor.bind(this);
    // this.getCharBorderColor = this.getCharBorderColor.bind(this);

    this.versionTag = formBuilder.control<string | null>(null);
    this.tag = formBuilder.control<string | null>(null);

    // when result changes, update the form
    effect(() => {
      this.updateForm(this.result());
      // select the initial step if set
      this.selectInitialStep(this.initialStepIndex());
    });

    // when initialStepIndex changes, update the selected step
    effect(() => {
      this.selectInitialStep(this.initialStepIndex());
    });
  }

  public ngOnInit(): void {
    this._subs = [
      // whenever the staged version tag changes, update the tag
      this.versionTag.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(200))
        .subscribe((value) => {
          this.tag.setValue(this.getTagFromVersion(value) || null);
        }),

      // whenever the tag changes, update the step
      this.tag.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(200))
        .subscribe((value) => {
          this.selectionFeatures = [];
          this.step = this.result()?.steps.find(
            (step) => step.outputTag === value
          );
          if (this.step) {
            this.stepPick.emit(this.step!);
          }
        }),
    ];
  }

  public getCharColor(node: CharNode): string | null {
    //return this.step?.refNodeIds.includes(node.id) ? 'orange' : null;
    const features = this.getNodeFeatures(node.id);
    return features?.some(
      (f) => f.name === '$seg-out' || f.name === '$seg2-out'
    )
      ? 'orange'
      : null;
  }

  // public getCharBorderColor(node: CharNode): string | null {
  //   const features = this.getNodeFeatures(node.id);
  //   return features?.some((f) => f.name === '$seg-in' || f.name === '$seg2-in')
  //     ? 'green'
  //     : null;
  // }

  private selectInitialStep(initialStepIndex?: number): void {
    if (initialStepIndex !== undefined && this.result()?.steps) {
      this.step =
        this.result()!.steps[
          initialStepIndex < 0
            ? this.result()!.steps.length + initialStepIndex
            : initialStepIndex
        ];
    } else {
      this.step = undefined;
    }
  }

  public ngOnDestroy(): void {
    this._subs?.forEach((sub) => sub.unsubscribe());
  }

  private updateVersionTags(): void {
    if (!this.result()) {
      this.versionTags = [];
      return;
    }

    // extract version tags from result steps features named 'version'
    const tags = new Set<string>();
    for (const step of this.result()!.steps) {
      for (const feature of step.featureSet.features) {
        if (feature.name === 'version') {
          tags.add(feature.value);
        }
      }
    }
    this.versionTags = Array.from(tags).sort();
  }

  private getTagFromVersion(version?: string | null): string | undefined {
    if (!this.result() || !version) {
      return undefined;
    }
    for (const step of this.result()!.steps) {
      for (const feature of step.featureSet.features) {
        if (feature.name === 'version' && feature.value === version) {
          return step.outputTag;
        }
      }
    }
    return undefined;
  }

  private updateForm(result?: CharChainResult): void {
    this.selectionFeatures = [];

    if (!result) {
      this.step = undefined;
      this.selection = undefined;
      this.tags = [];
      this.versionTags = [];
    } else {
      this.tags = result.chainTags.filter((t) => t.length > 0 && t !== 'v0');
      this.updateVersionTags();
    }
  }

  private getNodeFeatures(id: number): Feature[] {
    if (!this.step) {
      return [];
    }
    return (
      this.step.featureSet.nodeFeatures[this.step.outputTag + '_' + id] || []
    );
  }

  private findNode(id: number): CharNode | null {
    if (!this.step) {
      return null;
    }
    for (let key of Object.keys(this.result()!.taggedNodes)) {
      const node = this.result()!.taggedNodes[key].find((n) => n.id === id);
      if (node) {
        return node;
      }
    }
    return null;
  }

  public onTextCharPick(event: BaseTextCharEvent): void {
    const features = this.getNodeFeatures(event.char.id);
    const node = this.findNode(event.char.id)!;
    this.selection = `${event.char.label} (${node.sourceTag})`;
    this.selectionFeatures = [...features];
  }

  public onTextRangePick(range: VarBaseTextRange): void {
    if (range.run === 1) {
      // already handled by onStepCharPick
      return;
    }
    this.selection = range.at + '×' + range.run;
    const end = range.at + range.run;

    const features: Feature[] = [];
    const tagNodes = this.result()!.taggedNodes[this.tag.value!];

    for (let node of tagNodes) {
      // if in range, intersect features
      if (node.id >= range.at && node.id < end) {
        const nodeFeatures = this.getNodeFeatures(node.id);

        if (node.id === range.at) {
          for (let f of nodeFeatures) {
            features.push(f);
          }
        } else {
          // features = intersection of features and charFeatures
          features.splice(
            0,
            features.length,
            ...features.filter((f) =>
              nodeFeatures.some((cf) => cf.name === f.name)
            )
          );
        }
      }
    }

    this.selectionFeatures = features;
  }

  public onStepChange(step?: ChainOperationContextStep): void {
    this.selectionFeatures = [];
    if (step) {
      // setting the tag will trigger the step change
      this.tag.setValue(step.outputTag);
    }
  }
}

import {
  AfterViewInit,
  Component,
  effect,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
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
} from '../../models';

import { FeatureSetViewComponent } from '../feature-set-view/feature-set-view.component';
import { StepsMapComponent } from '../steps-map/steps-map.component';
import {
  BaseTextViewComponent,
  BaseTextRange,
} from '../base-text-view/base-text-view.component';
import {
  ChainOperationContextStep,
  CharChainResult,
} from '../../services/gve-api.service';
import { BaseTextCharEvent } from '../base-text-char/base-text-char.component';
import { MatTooltip } from "@angular/material/tooltip";

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
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    FeatureSetViewComponent,
    StepsMapComponent,
    BaseTextViewComponent,
    MatTooltip
],
  templateUrl: './chain-result-view.component.html',
  styleUrl: './chain-result-view.component.css',
})
export class ChainResultViewComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  private _subs?: Subscription[];
  // track if we've already performed step selection
  private _stepSelectionDone = signal(false);
  // track if component view is initialized
  private _viewInitialized = signal(false);

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

  public readonly versionTags = signal<string[]>([]);
  public readonly tags = signal<string[]>([]);
  public readonly step = signal<ChainOperationContextStep | undefined>(
    undefined
  );
  public readonly selection = signal<string | undefined>(undefined);
  public readonly selectionFeatures = signal<OperationFeature[]>([]);
  public readonly selectionRange = signal<BaseTextRange | undefined>(
    undefined
  );

  /**
   * True to disable range picking. For instance the snapshot editor,
   * which uses rangePick to set the edited operation's range, disables
   * this when no operation is being edited.
   */
  public readonly disabledRangePick = input<boolean>(true);

  /**
   * Emitted when a range is picked.
   */
  public readonly rangePick = output<BaseTextRange>();

  public versionTag: FormControl<string | null>;
  public tag: FormControl<string | null>;

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

    // when either the result or initialStepIndex changes, try to select a step
    effect(() => {
      // only proceed if we haven't already done selection and view is ready
      if (!this._stepSelectionDone() && this._viewInitialized()) {
        const currentResult = this.result();
        const currentIndex = this.initialStepIndex();

        // if we have both pieces of data needed for selection, do it
        if (currentResult?.steps?.length && currentIndex !== undefined) {
          this.doInitialStepSelection(currentResult, currentIndex);
          this._stepSelectionDone.set(true);
        }
      }
    });
  }

  private doInitialStepSelection(
    result: CharChainResult,
    initialStepIndex: number
  ): void {
    // calculate the effective index (handling negative indices)
    const effectiveIndex =
      initialStepIndex < 0
        ? result.steps.length + initialStepIndex
        : initialStepIndex;

    // ensure the index is valid
    if (effectiveIndex >= 0 && effectiveIndex < result.steps.length) {
      const targetStep = result.steps[effectiveIndex];

      // if we have a tag control (which we do based on your code)
      if (targetStep.outputTag) {
        // using the tag control ensures all the necessary updates happen
        this.tag.setValue(targetStep.outputTag);
      }
    }
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
          this.selectionFeatures.set([]); // reset selection features
          this.step.set(
            this.result()?.steps.find((step) => step.outputTag === value)
          );
          if (this.step()) {
            this.stepPick.emit(this.step()!);
          }
        }),
    ];
  }

  public ngAfterViewInit(): void {
    // signal that view is ready for initial selection
    setTimeout(() => {
      this._viewInitialized.set(true);
    });
  }

  public getCharColor(node: CharNode): string | null {
    const features = this.getNodeFeatures(node.id);
    return features?.some(
      (f) => f.name === '$seg-out' || f.name === '$seg2-out'
    )
      ? 'orange'
      : null;
  }

  private selectInitialStep(initialStepIndex?: number): void {
    if (initialStepIndex !== undefined && this.result()?.steps) {
      this.step.set(
        this.result()!.steps[
          initialStepIndex < 0
            ? this.result()!.steps.length + initialStepIndex
            : initialStepIndex
        ]
      );
    } else {
      this.step.set(undefined);
    }
  }

  public ngOnDestroy(): void {
    this._subs?.forEach((sub) => sub.unsubscribe());
  }

  private updateVersionTags(): void {
    if (!this.result()) {
      this.versionTags.set([]);
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
    this.versionTags.set(Array.from(tags).sort());
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
    this.selectionFeatures.set([]);

    if (!result) {
      this.step.set(undefined);
      this.selection.set(undefined);
      this.tags.set([]);
      this.versionTags.set([]);
    } else {
      this.tags.set(result.chainTags.filter((t) => t.length > 0 && t !== 'v0'));
      this.updateVersionTags();
    }

    // reset step selection tracking when result changes
    this._stepSelectionDone.set(false);
  }

  private getNodeFeatures(id: number): Feature[] {
    if (!this.step()) {
      return [];
    }
    return (
      this.step()!.featureSet.nodeFeatures[this.step()!.outputTag + '_' + id] ||
      []
    );
  }

  private findNode(id: number): CharNode | null {
    if (!this.step()) {
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
    this.selection.set(`${event.char.label} (${node.sourceTag})`);
    this.selectionFeatures.set([...features]);

    this.selectionRange.set({ at: event.char.id, run: 1 });
  }

  public onTextRangePick(range: BaseTextRange): void {
    if (range.run === 1) {
      // already handled by onStepCharPick
      return;
    }
    this.selection.set(range.at + '×' + range.run);
    this.selectionRange.set(range);
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

    this.selectionFeatures.set(features);
  }

  public onStepChange(step?: ChainOperationContextStep): void {
    this.selectionFeatures.set([]);
    if (step) {
      // setting the tag will trigger the step change
      this.tag.setValue(step.outputTag);
    }
  }

  public pickRange(): void {
    if (this.selectionRange()) {
      this.rangePick.emit(this.selectionRange()!);
    }
  }
}

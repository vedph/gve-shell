import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { distinctUntilChanged, skip } from 'rxjs';

import { MatIconButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSelect } from '@angular/material/select';

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
import { debounceUntilDestroyed } from '../../utils/debounce-until-destroyed';
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
    FormField,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatIcon,
    MatSelect,
    MatOption,
    FeatureSetViewComponent,
    StepsMapComponent,
    BaseTextViewComponent,
    MatTooltip,
  ],
  templateUrl: './chain-result-view.component.html',
  styleUrl: './chain-result-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChainResultViewComponent implements AfterViewInit {
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
   * Ordered nodes for the current step's version, resolved from
   * `result.versionNodeIds` and `result.nodes`.
   */
  public readonly stepNodes = computed<CharNode[]>(() => {
    const result = this.result();
    const step = this.step();
    if (!result || !step) {
      return [];
    }
    const ids = result.versionNodeIds[step.outputTag] ?? [];
    const nodeMap = new Map(result.nodes.map((n) => [n.id, n]));
    return ids.map((id) => nodeMap.get(id)!).filter(Boolean);
  });

  /**
   * Global features for the current step's output version.
   */
  public readonly stepGlobalFeatures = computed<OperationFeature[]>(() => {
    const result = this.result();
    const step = this.step();
    if (!result || !step) {
      return [];
    }
    return result.globalFeatures[step.outputTag] ?? [];
  });

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

  /**
   * The version pickers: the staged version tag, and the step's tag.
   */
  public readonly form = form(
    signal<{ versionTag: string | null; tag: string | null }>({
      versionTag: null,
      tag: null,
    }),
  );

  constructor() {
    // bind callback methods
    this.getCharColor = this.getCharColor.bind(this);
    // this.getCharBorderColor = this.getCharBorderColor.bind(this);

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

    // Changes of the pickers, like valueChanges: skip(1) drops the initial
    // value emitted by toObservable, so only actual changes are handled.

    // whenever the staged version tag changes, update the tag
    toObservable(this.form.versionTag().value)
      .pipe(skip(1), distinctUntilChanged(), debounceUntilDestroyed(200))
      .subscribe((value) => {
        this.form.tag().value.set(this.getTagFromVersion(value) || null);
      });

    // whenever the tag changes, update the step
    toObservable(this.form.tag().value)
      .pipe(skip(1), distinctUntilChanged(), debounceUntilDestroyed(200))
      .subscribe((value) => {
        this.selectionFeatures.set([]); // reset selection features
        this.step.set(
          this.result()?.steps.find((step) => step.outputTag === value)
        );
        if (this.step()) {
          this.stepPick.emit(this.step()!);
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
        this.form.tag().value.set(targetStep.outputTag);
      }
    }
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

  private updateVersionTags(): void {
    if (!this.result()) {
      this.versionTags.set([]);
      return;
    }

    // extract version labels from global features named 'version'
    const tags = new Set<string>();
    for (const features of Object.values(this.result()!.globalFeatures)) {
      for (const feature of features) {
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
    for (const [tag, features] of Object.entries(
      this.result()!.globalFeatures
    )) {
      if (features.some((f) => f.name === 'version' && f.value === version)) {
        return tag;
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
    const result = this.result();
    const step = this.step();
    if (!result || !step) {
      return [];
    }
    const node = result.nodes.find((n) => n.id === id);
    return node?.features?.[step.outputTag] ?? [];
  }

  private findNode(id: number): CharNode | null {
    return this.result()?.nodes.find((n) => n.id === id) ?? null;
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
      // already handled by onTextCharPick
      return;
    }
    this.selection.set(range.at + '×' + range.run);
    this.selectionRange.set(range);

    // the range refers to the displayed text of the current step, i.e. it
    // starts from the node with ID=at and spans run nodes in version order;
    // node IDs in a version are not necessarily contiguous
    const nodes = this.stepNodes();
    const start = nodes.findIndex((n) => n.id === range.at);
    if (start === -1) {
      this.selectionFeatures.set([]);
      return;
    }

    // features = intersection (by name) of the features of all the nodes
    let features: Feature[] = [...this.getNodeFeatures(range.at)];
    for (const node of nodes.slice(start + 1, start + range.run)) {
      const nodeFeatures = this.getNodeFeatures(node.id);
      features = features.filter((f) =>
        nodeFeatures.some((cf) => cf.name === f.name)
      );
    }

    this.selectionFeatures.set(features);
  }

  public onStepChange(step?: ChainOperationContextStep): void {
    this.selectionFeatures.set([]);
    if (step) {
      // setting the tag will trigger the step change
      this.form.tag().value.set(step.outputTag);
    }
  }

  public pickRange(): void {
    if (this.selectionRange()) {
      this.rangePick.emit(this.selectionRange()!);
    }
  }
}

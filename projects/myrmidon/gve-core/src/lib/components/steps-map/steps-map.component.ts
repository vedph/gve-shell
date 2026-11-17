import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import { MatIconButton } from '@angular/material/button';
import { MatRipple } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';

import { ChainOperationContextStep } from '../../services/gve-api.service';
import { getUnknownInputStepIndexes } from '../../utils/step-tags';

/**
 * 🔑 `gve-steps-map`
 *
 * A map of steps in a chain operation context. This shows the list of
 * steps in the execution of a set of operations, and allows the user to
 * pick a step to view.
 *
 * Used by the `gve-chain-result-view` component.
 *
 * - ▶️ `steps` (`ChainOperationContextStep[]`): the steps to display.
 * - ▶️ `selectedStep` (`ChainOperationContextStep`): the step that is
 * currently selected.
 * - ▶️ `textFontSize` (`string`): the font size of the steps text.
 * - 🔥 `selectedStepChange` (`ChainOperationContextStep`): emitted when
 * the selectd step has been changed by the user. This is not emitted
 * when the selected step is changed programmatically, unless this is
 * the first time the steps are set. In that case, the last step is
 * automatically selected.
 */
@Component({
  selector: 'gve-steps-map',
  imports: [
    MatIconButton,
    MatIcon,
    MatRipple,
    MatTooltip,
  ],
  templateUrl: './steps-map.component.html',
  styleUrl: './steps-map.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepsMapComponent implements AfterViewInit {
  private _snackBar = inject(MatSnackBar);

  // track view initialization
  private _viewInitialized = signal(false);
  // track whether we've processed the steps/selection
  private _selectionProcessed = signal(false);

  /**
   * The text lines of each step, in the order of steps. These are not keyed
   * by output tag, as several steps may share the same output tag (when
   * an operation outputs again to its input version).
   */
  public readonly lines = computed<string[][]>(() =>
    (this.steps() || []).map((s) => s.result?.split('\n') || []),
  );

  /**
   * The indexes of the steps whose input version does not exist at their
   * point of the chain.
   */
  public readonly unknownInput = computed(() =>
    getUnknownInputStepIndexes(this.steps()),
  );

  /**
   * The steps to display.
   */
  public readonly steps = input<ChainOperationContextStep[]>([]);

  /**
   * The step that is currently selected.
   */
  public readonly selectedStep = model<ChainOperationContextStep | undefined>();

  /**
   * The font size of the steps text.
   */
  public readonly textFontSize = input('0.8em');

  constructor() {
    // reset selection processing when steps change
    effect(() => {
      this.steps();
      this._selectionProcessed.set(false);
    });

    // handle synchronization between steps and selectedStep
    effect(() => {
      // only proceed if view is initialized and we haven't processed selection yet
      if (this._viewInitialized() && !this._selectionProcessed()) {
        const currentSteps = this.steps();
        const currentSelectedStep = this.selectedStep();

        // if we have steps, handle selection
        if (currentSteps && currentSteps.length > 0) {
          if (currentSelectedStep) {
            // if we have both inputs, verify selection is valid
            this.validateAndSetSelection(currentSelectedStep);
          } else {
            // auto-select last step if no selection provided
            this.selectedStep.set(currentSteps[currentSteps.length - 1]);
          }

          // mark as processed
          this._selectionProcessed.set(true);
        }
      }
    });
  }

  private validateAndSetSelection(step: ChainOperationContextStep): void {
    const currentSteps = this.steps();

    // the selected step might come from previous steps (e.g. a former
    // execution result): map it to its counterpart among the current steps,
    // which are distinct objects, matching the operation too, as output
    // tags are not unique across steps; else default to the last step
    const match = currentSteps.includes(step)
      ? step
      : (currentSteps.find(
          (s) =>
            s.outputTag === step.outputTag &&
            s.operation?.id === step.operation?.id,
        ) ??
        currentSteps.find((s) => s.outputTag === step.outputTag) ??
        currentSteps[currentSteps.length - 1]);
    this.selectedStep.set(match);
  }

  public ngAfterViewInit(): void {
    // signal that view is ready for selection processing
    setTimeout(() => {
      this._viewInitialized.set(true);
    });
  }

  public onStepClick(step: ChainOperationContextStep) {
    this.selectedStep.set(step);
  }

  public copyText(step: ChainOperationContextStep, event: MouseEvent): void {
    event.stopPropagation();
    const text = step.result || '';
    navigator.clipboard.writeText(text).then(() => {
      this._snackBar.open(`Copied ${step.outputTag}`, undefined, {
        duration: 2000,
      });
    });
  }
}

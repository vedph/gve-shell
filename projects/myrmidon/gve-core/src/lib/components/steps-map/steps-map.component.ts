import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ChainOperationContextStep } from '../../services/gve-api.service';

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
  imports: [MatButtonModule, MatIconModule, MatRippleModule, MatTooltipModule],
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

  // the lines of each version text, keyed under the output tag
  public readonly lines = signal<{ [key: string]: string[] }>({});

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
    // handle steps updates
    effect(() => {
      const currentSteps = this.steps();
      if (currentSteps && currentSteps.length > 0) {
        this.updateLines(currentSteps);
      } else {
        this.lines.set({});
      }

      // reset selection processing when steps change
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

    // check if the selected step exists in the steps array
    const stepExists = currentSteps.some((s) => s.outputTag === step.outputTag);

    if (stepExists) {
      // valid selection, keep it
      this.selectedStep.set(step);
    } else {
      // invalid selection, default to last step
      const lastStep = currentSteps[currentSteps.length - 1];
      this.selectedStep.set(lastStep);
    }
  }

  public ngAfterViewInit(): void {
    // signal that view is ready for selection processing
    setTimeout(() => {
      this._viewInitialized.set(true);
    });
  }

  private updateLines(steps: ChainOperationContextStep[] | undefined) {
    if (!steps) {
      this.lines.set({});
      return;
    }

    const lines: { [key: string]: string[] } = {};
    for (let i = 0; i < steps.length; i++) {
      const step = this.steps()![i];
      lines[step.outputTag] = step.result?.split('\n') || [];
    }
    this.lines.set(lines);
  }

  public onStepClick(step: ChainOperationContextStep) {
    this.selectedStep.set(step);
  }

  public copyText(step: ChainOperationContextStep, event: MouseEvent): void {
    event.stopPropagation();
    const text = (this.lines()[step.outputTag] ?? []).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this._snackBar.open(`Copied ${step.outputTag}`, undefined, {
        duration: 2000,
      });
    });
  }
}

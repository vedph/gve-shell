import { CommonModule } from '@angular/common';
import { Component, effect, input, model, output } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
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
  imports: [CommonModule, MatButtonModule, MatRippleModule, MatTooltipModule],
  templateUrl: './steps-map.component.html',
  styleUrl: './steps-map.component.css',
})
export class StepsMapComponent {
  // the lines of each version text, keyed under the output tag
  public lines: { [key: string]: string[] } = {};

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

  /**
   * Emitted when the selected step has changed by user, or when
   * the steps are set for the first time.
   */
  public selectedStepChange = output<ChainOperationContextStep | undefined>();

  constructor() {
    // when the steps change, update lines and selected step
    effect(() => {
      const steps = this.steps();
      const first = steps === undefined;

      if (first && (steps as ChainOperationContextStep[]).length) {
        this.selectedStep.set(
          steps[(steps as ChainOperationContextStep[]).length - 1]
        );
        this.updateLines(steps);
        this.selectedStepChange.emit(this.selectedStep()!);
      } else {
        this.selectedStep.set(undefined);
        this.selectedStepChange.emit(undefined);
        this.updateLines(steps);
      }
    });
  }

  private updateLines(steps: ChainOperationContextStep[] | undefined) {
    if (!steps) {
      this.lines = {};
      return;
    }

    for (let i = 0; i < steps.length; i++) {
      const step = this.steps()![i];
      this.lines[step.outputTag] = step.result?.split('\n') || [];
    }
  }

  public onStepClick(step: ChainOperationContextStep) {
    this.selectedStep.set(step);
    this.selectedStepChange.emit(this.selectedStep()!);
  }
}

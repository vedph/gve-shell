import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatSnackBar } from '@angular/material/snack-bar';

import { StepsMapComponent } from './steps-map.component';
import { ChainOperationContextStep } from '../../services/gve-api.service';
import { OperationType } from '../../models';

const step = (
  inputTag: string,
  outputTag: string,
  result?: string,
): ChainOperationContextStep => ({
  operation: { id: outputTag, type: OperationType.annotate, at: 1, run: 1 },
  inputTag,
  outputTag,
  result,
  refNodeIds: [],
});

const STEPS = [step('v0', 'v1', 'ab\ncd'), step('v1', 'v2', 'xy')];

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('StepsMapComponent', () => {
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackBar = { open: vi.fn() };
  });

  async function setup(inputs: Record<string, unknown> = {}) {
    const result = await render(StepsMapComponent, {
      inputs,
      providers: [{ provide: MatSnackBar, useValue: snackBar }],
    });
    // let the view init timeout and the selection effect run
    await wait();
    await result.fixture.whenStable();
    const selections: (ChainOperationContextStep | undefined)[] = [];
    result.fixture.componentInstance.selectedStep.subscribe((s) =>
      selections.push(s),
    );
    return { ...result, c: result.fixture.componentInstance, selections };
  }

  it('should render nothing without steps', async () => {
    const { container, c } = await setup();
    expect(container.querySelectorAll('.step')).toHaveLength(0);
    expect(c.lines()).toEqual({});
  });

  it('should render steps with their text lines', async () => {
    const { container, c } = await setup({ steps: STEPS, textFontSize: '2em' });
    const steps = container.querySelectorAll('.step');
    expect(steps).toHaveLength(2);
    expect(steps[0].querySelector('.tag')).toHaveTextContent('v0 ▶ v1');
    const lines = Array.from(steps[0].querySelectorAll('.line')).map(
      (l) => l.textContent,
    );
    expect(lines).toEqual(['ab', 'cd']);
    expect((steps[0].querySelector('.text') as HTMLElement).style.fontSize).toBe(
      '2em',
    );
    expect(c.lines()).toEqual({ v1: ['ab', 'cd'], v2: ['xy'] });
  });

  it('should use no lines for steps without result', async () => {
    const { c } = await setup({ steps: [step('v0', 'v1')] });
    expect(c.lines()).toEqual({ v1: [] });
  });

  it('should auto-select the last step after view init', async () => {
    const { c, fixture, container } = await setup({ steps: STEPS });
    await wait();
    await fixture.whenStable();
    expect(c.selectedStep()).toBe(STEPS[1]);
    expect(container.querySelectorAll('.step')[1]).toHaveClass('selected');
  });

  it('should keep a valid selected step', async () => {
    const { c } = await setup({ steps: STEPS, selectedStep: STEPS[0] });
    await wait();
    expect(c.selectedStep()).toBe(STEPS[0]);
  });

  it('should replace an invalid selected step with the last one', async () => {
    const { c } = await setup({
      steps: STEPS,
      selectedStep: step('v0', 'zz'),
    });
    await wait();
    expect(c.selectedStep()).toBe(STEPS[1]);
  });

  it('should select a step on click', async () => {
    const { container, selections } = await setup({ steps: STEPS });
    await wait();
    await userEvent.click(container.querySelectorAll('.step')[0]);
    expect(selections.at(-1)).toBe(STEPS[0]);
  });

  it('should reprocess selection when steps change', async () => {
    const { c, fixture } = await setup({ steps: STEPS });
    await wait();
    const newSteps = [step('v0', 'v1', 'q')];
    fixture.componentRef.setInput('steps', newSteps);
    await fixture.whenStable();
    expect(c.lines()).toEqual({ v1: ['q'] });
    // the current selection (v2) is not valid anymore
    expect(c.selectedStep()).toBe(newSteps[0]);
  });

  it('should clear lines when steps are cleared', async () => {
    const { c, fixture } = await setup({ steps: STEPS });
    fixture.componentRef.setInput('steps', []);
    await fixture.whenStable();
    expect(c.lines()).toEqual({});
  });

  it('should copy step text without selecting the step', async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, 'writeText');
    const { selections } = await setup({ steps: STEPS });
    await wait();
    const count = selections.length;
    await user.click(screen.getAllByRole('button', { name: 'Copy text' })[0]);
    await wait();
    expect(write).toHaveBeenCalledWith('ab\ncd');
    expect(snackBar.open).toHaveBeenCalledWith('Copied v1', undefined, {
      duration: 2000,
    });
    expect(selections.length).toBe(count);
  });
});

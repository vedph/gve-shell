import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { ChainResultViewComponent } from './chain-result-view.component';
import {
  ChainOperationContextStep,
  CharChainResult,
} from '../../services/gve-api.service';
import { BaseTextRange } from '../base-text-view/base-text-view.component';
import { Feature, OperationType } from '../../models';

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
// longer than the tag change debounce time
const DEBOUNCE = 250;

const feat = (name: string, value = '1'): Feature => ({
  name,
  value,
  setPolicy: 0,
});

/**
 * Base text "abc" (IDs 1-3). v1 replaces b with X (ID 4), v2 annotates.
 * So v1 and v2 have node IDs [1,4,3].
 */
function getResult(): CharChainResult {
  return {
    steps: [
      {
        operation: { id: 'o1', type: OperationType.replace, at: 2, run: 1 },
        inputTag: 'v0',
        outputTag: 'v1',
        result: 'aXc',
        refNodeIds: [],
      },
      {
        operation: { id: 'o2', type: OperationType.annotate, at: 1, run: 3 },
        inputTag: 'v1',
        outputTag: 'v2',
        result: 'aXc',
        refNodeIds: [],
      },
    ],
    chainDump: '',
    chainTags: ['', 'v0', 'v1', 'v2'],
    nodes: [
      {
        id: 1,
        label: 'a',
        data: 'a',
        sourceTag: 'v0',
        features: {
          v1: [feat('$seg-out')],
          v2: [feat('f'), feat('g'), feat('h')],
        },
      },
      { id: 2, label: 'b', data: 'b', sourceTag: 'v0', features: null },
      {
        id: 3,
        label: 'c',
        data: 'c',
        sourceTag: 'v0',
        features: { v2: [feat('h')] },
      },
      {
        id: 4,
        label: 'X',
        data: 'X',
        sourceTag: 'v1',
        features: { v2: [feat('f'), feat('h')] },
      },
    ],
    versionNodeIds: { v0: [1, 2, 3], v1: [1, 4, 3], v2: [1, 4, 3] },
    globalFeatures: {
      v0: [],
      v1: [feat('version', 'draft')],
      v2: [feat('version', 'final'), feat('g', 'x')],
    },
  };
}

async function setup(inputs: Record<string, unknown> = {}) {
  const stepPick = vi.fn<(s: ChainOperationContextStep) => void>();
  const rangePick = vi.fn<(r: BaseTextRange) => void>();
  const result = await render(ChainResultViewComponent, {
    inputs,
    on: { stepPick, rangePick },
  });
  return {
    ...result,
    c: result.fixture.componentInstance,
    stepPick,
    rangePick,
    settle: async () => {
      await wait(DEBOUNCE);
      await result.fixture.whenStable();
    },
  };
}

describe('ChainResultViewComponent', () => {
  it('should render nothing without result', async () => {
    const { container } = await setup();
    expect(container.querySelector('#container')).toBeNull();
  });

  it('should set tags and version tags from the result', async () => {
    const { c } = await setup({ result: getResult() });
    expect(c.tags()).toEqual(['v1', 'v2']);
    expect(c.versionTags()).toEqual(['draft', 'final']);
  });

  it('should select the initial step by negative index', async () => {
    const result = getResult();
    const { c, stepPick, settle } = await setup({
      result,
      initialStepIndex: -1,
    });
    expect(c.step()).toBe(result.steps[1]);
    await settle();
    expect(c.form.tag().value()).toBe('v2');
    expect(stepPick).toHaveBeenCalledWith(result.steps[1]);
  });

  it('should select the initial step by positive index', async () => {
    const result = getResult();
    const { c, settle } = await setup({ result, initialStepIndex: 0 });
    await settle();
    expect(c.step()).toBe(result.steps[0]);
    expect(c.form.tag().value()).toBe('v1');
  });

  it('should select the last step from the map without initial index', async () => {
    const result = getResult();
    const { c, settle } = await setup({ result });
    expect(c.step()).toBeUndefined();
    await settle();
    // the steps map auto-selects the last step
    expect(c.step()).toBe(result.steps[1]);
  });

  it('should ignore an out of range initial step', async () => {
    const result = getResult();
    const { c, settle } = await setup({ result, initialStepIndex: 5 });
    expect(c.step()).toBeUndefined();
    await settle();
    // only the steps map auto-selection applies
    expect(c.step()).toBe(result.steps[1]);
  });

  it('should render the step text in version order with global features', async () => {
    const { container, c, settle } = await setup({
      result: getResult(),
      initialStepIndex: -1,
    });
    await settle();
    expect(c.stepNodes().map((n) => n.id)).toEqual([1, 4, 3]);
    const labels = Array.from(container.querySelectorAll('#c-label')).map(
      (e) => e.textContent!.trim(),
    );
    expect(labels).toEqual(['a', 'X', 'c']);
    expect(c.stepGlobalFeatures()).toEqual([
      feat('version', 'final'),
      feat('g', 'x'),
    ]);
    expect(container.querySelector('#g-feats')).toHaveTextContent('v2');
  });

  it('should reset when the result is cleared', async () => {
    const { c, fixture, container } = await setup({
      result: getResult(),
      initialStepIndex: -1,
    });
    fixture.componentRef.setInput('result', undefined);
    await fixture.whenStable();
    expect(c.step()).toBeUndefined();
    expect(c.tags()).toEqual([]);
    expect(c.versionTags()).toEqual([]);
    expect(c.stepNodes()).toEqual([]);
    expect(c.stepGlobalFeatures()).toEqual([]);
    expect(container.querySelector('#container')).toBeNull();
  });

  it('should pick a step by tag', async () => {
    const result = getResult();
    const { c, stepPick, settle } = await setup({ result });
    await settle();
    c.form.tag().value.set('v1');
    await settle();
    expect(c.step()).toBe(result.steps[0]);
    expect(stepPick).toHaveBeenCalledWith(result.steps[0]);
  });

  it('should pick a step by staged version', async () => {
    const result = getResult();
    const { c, settle } = await setup({ result });
    await settle();
    c.form.versionTag().value.set('draft');
    await settle();
    await settle();
    expect(c.form.tag().value()).toBe('v1');
    expect(c.step()).toBe(result.steps[0]);
    c.form.versionTag().value.set(null);
    await settle();
    await settle();
    expect(c.form.tag().value()).toBeNull();
    expect(c.step()).toBeUndefined();
  });

  it('should ignore an unknown staged version', async () => {
    const { c, settle } = await setup({ result: getResult() });
    await settle();
    c.form.versionTag().value.set('nope');
    await settle();
    expect(c.form.tag().value()).toBeNull();
  });

  it('should pick a step from the steps map', async () => {
    const result = getResult();
    const { c, container, settle } = await setup({
      result,
      initialStepIndex: -1,
    });
    await settle();
    await userEvent.click(container.querySelectorAll('.step')[0]);
    await settle();
    expect(c.step()).toBe(result.steps[0]);
    // an undefined step is ignored
    c.onStepChange(undefined);
    expect(c.form.tag().value()).toBe('v1');
  });

  it('should color chars with segment features', async () => {
    const { c, settle } = await setup({
      result: getResult(),
      initialStepIndex: 0,
    });
    await settle();
    expect(c.getCharColor({ id: 1, label: 'a', data: 'a' })).toBe('orange');
    expect(c.getCharColor({ id: 4, label: 'X', data: 'X' })).toBeNull();
  });

  it('should show the features of a picked char', async () => {
    const user = userEvent.setup();
    const { c, container, settle } = await setup({
      result: getResult(),
      initialStepIndex: -1,
    });
    await settle();
    const chars = container.querySelectorAll('gve-base-text-char #container');
    await user.click(chars[1]);
    expect(c.selection()).toBe('X (v1)');
    expect(c.selectionFeatures()).toEqual([feat('f'), feat('h')]);
    expect(c.selectionRange()).toEqual({ at: 4, run: 1 });
    expect(container.querySelector('#n-feats')).toHaveTextContent('X (v1)');
  });

  it('should intersect the features of a picked range in version order', async () => {
    const { c, settle } = await setup({
      result: getResult(),
      initialStepIndex: -1,
    });
    await settle();
    // a (ID 1) + X (ID 4): IDs are not contiguous in v2
    c.onTextRangePick({ at: 1, run: 2 });
    expect(c.selection()).toBe('1×2');
    expect(c.selectionFeatures()).toEqual([feat('f'), feat('h')]);
    // a + X + c
    c.onTextRangePick({ at: 1, run: 3 });
    expect(c.selectionFeatures()).toEqual([feat('h')]);
    // X + c
    c.onTextRangePick({ at: 4, run: 2 });
    expect(c.selectionFeatures()).toEqual([feat('h')]);
  });

  it('should use the current step even if picked by initial index only', async () => {
    const { c } = await setup({
      result: getResult(),
      initialStepIndex: -1,
    });
    // tag control not yet set (before the view init timeout)
    expect(c.form.tag().value()).toBeNull();
    c.onTextRangePick({ at: 1, run: 2 });
    expect(c.selectionFeatures()).toEqual([feat('f'), feat('h')]);
  });

  it('should ignore single-char range picks and unknown ranges', async () => {
    const { c, settle } = await setup({
      result: getResult(),
      initialStepIndex: -1,
    });
    await settle();
    c.onTextRangePick({ at: 1, run: 1 });
    expect(c.selection()).toBeUndefined();
    c.onTextRangePick({ at: 2, run: 2 });
    expect(c.selectionFeatures()).toEqual([]);
  });

  it('should emit the picked range when enabled', async () => {
    const user = userEvent.setup();
    const { c, rangePick, fixture, settle } = await setup({
      result: getResult(),
      initialStepIndex: -1,
    });
    await settle();
    // nothing selected: no-op
    c.pickRange();
    expect(rangePick).not.toHaveBeenCalled();

    c.onTextRangePick({ at: 1, run: 2 });
    await fixture.whenStable();
    // disabled by default
    expect(
      screen.queryByRole('button', {
        name: 'Pick this range for the edited operation',
      }),
    ).toBeNull();
    fixture.componentRef.setInput('disabledRangePick', false);
    await fixture.whenStable();
    await user.click(
      screen.getByRole('button', {
        name: 'Pick this range for the edited operation',
      }),
    );
    expect(rangePick).toHaveBeenCalledWith({ at: 1, run: 2 });
  });
});

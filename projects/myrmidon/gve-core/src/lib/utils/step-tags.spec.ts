import { describe, expect, it } from 'vitest';

import { getUnknownInputStepIndexes } from './step-tags';
import { ChainOperationContextStep } from '../services/gve-api.service';
import { OperationType } from '../models';

const step = (inputTag: string, outputTag: string): ChainOperationContextStep => ({
  operation: { id: outputTag, type: OperationType.annotate, at: 1, run: 1 },
  inputTag,
  outputTag,
  refNodeIds: [],
});

describe('getUnknownInputStepIndexes', () => {
  it('should return nothing without steps', () => {
    expect(getUnknownInputStepIndexes(undefined).size).toBe(0);
    expect(getUnknownInputStepIndexes([]).size).toBe(0);
  });

  it('should accept a linear chain', () => {
    const steps = [step('v0', 'v1'), step('v1', 'v2'), step('v2', 'v3')];
    expect([...getUnknownInputStepIndexes(steps)]).toEqual([]);
  });

  it('should accept branches and repeated output tags', () => {
    const steps = [step('v0', 'A'), step('v0', 'v1'), step('A', 'A')];
    expect([...getUnknownInputStepIndexes(steps)]).toEqual([]);
  });

  it('should flag a step whose input tag is unknown', () => {
    const steps = [step('v0', 'v1'), step('nope', 'nope')];
    expect([...getUnknownInputStepIndexes(steps)]).toEqual([1]);
  });

  it('should flag a step referring to a version produced later', () => {
    // A is produced by the last step, e.g. after moving it down
    const steps = [step('A', 'A'), step('v0', 'A')];
    expect([...getUnknownInputStepIndexes(steps)]).toEqual([0]);
  });

  it('should flag the steps depending on an invalid step', () => {
    const steps = [step('x', 'y'), step('y', 'z'), step('v0', 'v1')];
    expect([...getUnknownInputStepIndexes(steps)]).toEqual([0, 1]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  featuresToClipboardText,
  mergePastedFeatures,
  parseClipboardFeatures,
} from './feature-clipboard';
import { Feature, FeatureSetPolicy, OperationFeature } from '../models';

const M = FeatureSetPolicy.multiple;
const S = FeatureSetPolicy.single;
const SF = FeatureSetPolicy.singleFirst;
const f = (name: string, value: string, setPolicy = M): Feature => ({
  name,
  value,
  setPolicy,
});
const pairs = (features: Feature[]) => features.map((x) => `${x.name}=${x.value}`);

describe('mergePastedFeatures', () => {
  const existing = [f('a', '1'), f('b', '1'), f('a', '2')];

  it('should append multiple features, allowing duplicates', () => {
    const merged = mergePastedFeatures(existing, [f('a', '1'), f('c', '1')]);
    expect(pairs(merged)).toEqual(['a=1', 'b=1', 'a=2', 'a=1', 'c=1']);
  });

  it('should replace all the features with the name of a single feature', () => {
    const merged = mergePastedFeatures(existing, [f('a', '9', S)]);
    expect(pairs(merged)).toEqual(['b=1', 'a=9']);
  });

  it('should not allow duplicates of single features in the pasted ones', () => {
    const merged = mergePastedFeatures(existing, [f('a', '8', S), f('a', '9', S)]);
    expect(pairs(merged)).toEqual(['b=1', 'a=9']);
  });

  it('should replace on the first single-first feature and append the others', () => {
    const merged = mergePastedFeatures(existing, [
      f('a', '8', SF),
      f('a', '9', SF),
      f('b', '5', SF),
    ]);
    expect(pairs(merged)).toEqual(['a=8', 'a=9', 'b=5']);
  });

  it('should not change the existing array', () => {
    const copy = [...existing];
    mergePastedFeatures(existing, [f('a', '9', S)]);
    expect(existing).toEqual(copy);
  });
});

describe('parseClipboardFeatures', () => {
  const features: OperationFeature[] = [
    { name: 'a', value: 'say "hi"', setPolicy: S, isNegated: true },
    { name: 'b', value: '', setPolicy: SF, isGlobal: true, isShortLived: true },
  ];

  it('should round-trip features', () => {
    const text = featuresToClipboardText(features);
    expect(parseClipboardFeatures(text, true)).toEqual(features);
  });

  it('should drop variant flags when not pasting into variant features', () => {
    const text = featuresToClipboardText(features);
    expect(parseClipboardFeatures(text, false)).toEqual([
      { name: 'a', value: 'say "hi"', setPolicy: S },
      { name: 'b', value: '', setPolicy: SF },
    ]);
  });

  it('should default an unknown set policy to multiple', () => {
    expect(parseClipboardFeatures('[{"name":"a","value":"1","setPolicy":7}]', true))
      .toEqual([{ name: 'a', value: '1', setPolicy: M }]);
  });

  it('should reject anything else', () => {
    for (const text of [
      '',
      'hello',
      '{}',
      '[]',
      '[1]',
      '[{"value":"1"}]',
      '[{"name":"","value":"1"}]',
      '[{"name":"a","value":1}]',
    ]) {
      expect(parseClipboardFeatures(text, true)).toBeNull();
    }
  });
});

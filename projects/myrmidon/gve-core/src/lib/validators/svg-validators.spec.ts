import { describe, expect, it } from 'vitest';
import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import { SvgValidators } from './svg-validators';

describe('SvgValidators.getRootGError', () => {
  const validate = (value: string | null) => SvgValidators.getRootGError(value);

  it('should accept an empty value', () => {
    expect(validate(null)).toBeNull();
    expect(validate('')).toBeNull();
  });

  it('should accept an svg with a single g child', () => {
    expect(validate('<svg><g><rect/></g></svg>')).toBeNull();
  });

  it('should accept whitespace around the single g child', () => {
    expect(validate('<svg>\n  <g>\n    <rect/>\n  </g>\n</svg>')).toBeNull();
  });

  it('should accept nested g elements inside the root g', () => {
    expect(validate('<svg><g><g id="a"/><g id="b"/></g></svg>')).toBeNull();
  });

  it('should accept a non-svg root element', () => {
    expect(validate('<g><rect/></g>')).toBeNull();
  });

  it('should reject an svg with two g children', () => {
    expect(validate('<svg><g/><g/></svg>')).toBe('svgInvalidRoot');
  });

  it('should reject an svg without g', () => {
    expect(validate('<svg><rect/></svg>')).toBe('svgInvalidRoot');
  });

  it('should reject an svg with a g plus another element', () => {
    expect(validate('<svg><g/><rect/></svg>')).toBe('svgInvalidRoot');
  });

  it('should reject malformed XML', () => {
    expect(validate('<svg><g></svg>')).toBe('svgInvalid');
  });
});

describe('SvgValidators.rootG', () => {
  const svgForm = (value: string) =>
    form(signal({ svg: value }), (p) => SvgValidators.rootG(p.svg), {
      injector: TestBed.inject(Injector),
    });

  it('should be valid for a single g child', () => {
    expect(svgForm('<svg><g/></svg>').svg().valid()).toBe(true);
  });

  it('should report the error kind', () => {
    const f = svgForm('<svg><g/><g/></svg>');
    expect(f.svg().getError('svgInvalidRoot')).toBeTruthy();
    f.svg().value.set('<svg><g></svg>');
    expect(f.svg().getError('svgInvalid')).toBeTruthy();
    f.svg().value.set('');
    expect(f.svg().valid()).toBe(true);
  });
});

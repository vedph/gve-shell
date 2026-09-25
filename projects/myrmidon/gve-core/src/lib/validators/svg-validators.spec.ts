import { describe, expect, it } from 'vitest';
import { FormControl } from '@angular/forms';

import { SvgValidators } from './svg-validators';

describe('SvgValidators.rootGValidator', () => {
  const validate = (value: string | null) =>
    SvgValidators.rootGValidator()(new FormControl(value));

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
    expect(validate('<svg><g/><g/></svg>')).toEqual({
      svgInvalidRoot: { value: '<svg><g/><g/></svg>' },
    });
  });

  it('should reject an svg without g', () => {
    expect(validate('<svg><rect/></svg>')).toHaveProperty('svgInvalidRoot');
  });

  it('should reject an svg with a g plus another element', () => {
    expect(validate('<svg><g/><rect/></svg>')).toHaveProperty(
      'svgInvalidRoot',
    );
  });

  it('should reject malformed XML', () => {
    expect(validate('<svg><g></svg>')).toHaveProperty('svgInvalid');
  });
});

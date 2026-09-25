import { AbstractControl, ValidatorFn } from '@angular/forms';

/**
 * Validators for SVG.
 */
export class SvgValidators {
  /**
   * Validator for a valid SVG `g` root element in GVE.
   */
  static rootGValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null;
      }
      const parser = new DOMParser();
      let error = null;
      let svgRoot;

      try {
        const doc = parser.parseFromString(control.value, 'image/svg+xml');
        // DOMParser does not throw on malformed XML: it returns a document
        // containing a parsererror element instead
        if (doc.getElementsByTagName('parsererror').length) {
          error = { svgInvalid: { value: control.value } };
        } else {
          svgRoot =
            doc.documentElement.nodeName === 'svg'
              ? doc.documentElement
              : null;
        }
      } catch (e) {
        error = { svgInvalid: { value: control.value } };
      }

      if (!error && svgRoot) {
        // the svg root must have a single g element child (whitespace
        // and nested elements inside g are allowed)
        const children = Array.from(svgRoot.children);
        if (children.length !== 1 || children[0].nodeName !== 'g') {
          error = { svgInvalidRoot: { value: control.value } };
        }
      }

      return error;
    };
  }
}

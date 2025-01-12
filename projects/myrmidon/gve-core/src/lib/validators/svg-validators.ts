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
        svgRoot =
          doc.documentElement.nodeName === 'svg' ? doc.documentElement : null;
      } catch (e) {
        error = { svgInvalid: { value: control.value } };
      }

      if (!error && svgRoot) {
        const gElements = svgRoot.getElementsByTagName('g');
        if (gElements.length !== 1 || svgRoot.childNodes.length > 1) {
          error = { svgInvalidRoot: { value: control.value } };
        }
      }

      return error;
    };
  }
}

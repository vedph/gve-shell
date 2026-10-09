import {
  PathKind,
  SchemaPath,
  SchemaPathRules,
  validate,
} from '@angular/forms/signals';

/**
 * Validators for SVG.
 */
export class SvgValidators {
  /**
   * Get the error kind for the specified SVG code, which must be either
   * empty, or have a single `g` child under its `svg` root element.
   *
   * @param svg The SVG code.
   * @returns `svgInvalid` for malformed XML, `svgInvalidRoot` for an `svg`
   * root element not having a single `g` child, or null if valid.
   */
  public static getRootGError(
    svg: string | null | undefined,
  ): 'svgInvalid' | 'svgInvalidRoot' | null {
    if (!svg) {
      return null;
    }
    let svgRoot;

    try {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      // DOMParser does not throw on malformed XML: it returns a document
      // containing a parsererror element instead
      if (doc.getElementsByTagName('parsererror').length) {
        return 'svgInvalid';
      }
      svgRoot =
        doc.documentElement.nodeName === 'svg' ? doc.documentElement : null;
    } catch {
      return 'svgInvalid';
    }

    if (svgRoot) {
      // the svg root must have a single g element child (whitespace
      // and nested elements inside g are allowed)
      const children = Array.from(svgRoot.children);
      if (children.length !== 1 || children[0].nodeName !== 'g') {
        return 'svgInvalidRoot';
      }
    }
    return null;
  }

  /**
   * Signal forms rule for a valid SVG `g` root element in GVE. The error
   * kind is either `svgInvalid` or `svgInvalidRoot`
   * (see {@link SvgValidators.getRootGError}).
   *
   * @param path The path of the string field to validate.
   */
  public static rootG<TPathKind extends PathKind = PathKind.Root>(
    path: SchemaPath<string, SchemaPathRules.Supported, TPathKind>,
  ): void {
    validate(path, ({ value }) => {
      const kind = SvgValidators.getRootGError(value());
      return kind ? { kind } : undefined;
    });
  }
}

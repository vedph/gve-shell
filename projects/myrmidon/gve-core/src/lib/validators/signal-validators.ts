import {
  maxLengthError,
  PathKind,
  requiredError,
  SchemaPath,
  SchemaPathRules,
  validate,
} from '@angular/forms/signals';

/**
 * Like the signal forms `maxLength` rule, producing the same `maxLength`
 * error, but without exposing the max length as field metadata.
 *
 * The built-in rule publishes its limit as metadata, which `[formField]`
 * binds to the native `maxlength` attribute: the browser then silently
 * truncates typed or pasted text at the limit, so the "too long" error can
 * never show, and long pasted texts are cut without notice. This rule keeps
 * the reactive forms `Validators.maxLength` behavior instead: the text is
 * accepted as entered, and flagged as invalid.
 *
 * @param path The path of the string field to validate.
 * @param max The maximum allowed length.
 */
export function softMaxLength<TPathKind extends PathKind = PathKind.Root>(
  path: SchemaPath<string, SchemaPathRules.Supported, TPathKind>,
  max: number,
): void {
  validate(path, ({ value }) =>
    value().length > max ? maxLengthError(max) : undefined,
  );
}

/**
 * Require an array field to have at least one item, producing a `required`
 * error otherwise. This matches reactive forms `Validators.required`, which
 * treats an empty array as empty, while the signal forms `required` rule
 * accepts it.
 *
 * @param path The path of the array field to validate.
 */
export function requiredArray<
  TItem,
  TPathKind extends PathKind = PathKind.Root,
>(
  path: SchemaPath<TItem[], SchemaPathRules.Supported, TPathKind>,
): void {
  validate(path, ({ value }) =>
    value().length ? undefined : requiredError(),
  );
}

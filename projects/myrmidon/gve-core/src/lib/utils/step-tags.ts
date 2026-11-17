import { ChainOperationContextStep } from '../services/gve-api.service';

/**
 * The tag of the base text version.
 */
export const BASE_TEXT_TAG = 'v0';

/**
 * Get the indexes of the steps whose input tag refers to a version which
 * does not exist at their point of the chain, i.e. which is neither the
 * base text (v0) nor the output of a preceding valid step. This typically
 * happens when an explicit input tag refers to a version produced by an
 * operation which was later moved after it, or deleted. The backend does
 * not reject such steps: it just outputs an empty text to the unknown tag,
 * so that their text (and that of any step depending on them) is empty.
 *
 * @param steps The execution steps, in their order.
 * @returns The set of the indexes of the steps with an unknown input tag.
 */
export function getUnknownInputStepIndexes(
  steps: ChainOperationContextStep[] | undefined,
): Set<number> {
  const unknown = new Set<number>();
  if (!steps?.length) {
    return unknown;
  }
  const known = new Set<string>([BASE_TEXT_TAG]);
  steps.forEach((step, i) => {
    if (known.has(step.inputTag)) {
      known.add(step.outputTag);
    } else {
      // the output of an invalid step is not a valid version either
      unknown.add(i);
    }
  });
  return unknown;
}

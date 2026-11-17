import { Feature, FeatureSetPolicy, OperationFeature } from '../models';

/**
 * Merge the specified pasted features into the existing ones, according to
 * the set policy of each pasted feature:
 * - multiple: the feature is just appended (duplicates are allowed);
 * - single: the feature replaces all the features with the same name,
 * either existing or pasted before it (no duplicates are allowed);
 * - single first: the first pasted feature with a given name replaces all
 * the existing features with that name; the next ones with the same name
 * are appended.
 *
 * @param existing The existing features.
 * @param pasted The pasted features, in their order.
 * @returns A new array with the merged features.
 */
export function mergePastedFeatures<T extends Feature>(
  existing: T[],
  pasted: T[],
): T[] {
  let result = [...existing];
  // names already replaced by a single-first pasted feature
  const replacedNames = new Set<string>();

  for (const feature of pasted) {
    switch (feature.setPolicy) {
      case FeatureSetPolicy.single:
        result = result.filter((f) => f.name !== feature.name);
        break;
      case FeatureSetPolicy.singleFirst:
        if (!replacedNames.has(feature.name)) {
          result = result.filter((f) => f.name !== feature.name);
          replacedNames.add(feature.name);
        }
        break;
    }
    result.push(feature);
  }
  return result;
}

/**
 * Serialize the specified features for the clipboard, as JSON.
 */
export function featuresToClipboardText(features: Feature[]): string {
  return JSON.stringify(features, null, 2);
}

/**
 * Parse the features copied into the clipboard by
 * {@link featuresToClipboardText}.
 *
 * @param text The clipboard text.
 * @param isVar True to keep the variant operation flags (negated, global,
 * short-lived), false to drop them, as when pasting into a set of plain
 * features.
 * @returns The features, or null when the text is not a non-empty JSON
 * array of features.
 */
export function parseClipboardFeatures(
  text: string,
  isVar: boolean,
): OperationFeature[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(data) || !data.length) {
    return null;
  }

  const features: OperationFeature[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') {
      return null;
    }
    const f = item as Record<string, unknown>;
    if (typeof f['name'] !== 'string' || !f['name'] || typeof f['value'] !== 'string') {
      return null;
    }
    const policy = f['setPolicy'];
    const feature: OperationFeature = {
      name: f['name'],
      value: f['value'],
      setPolicy:
        policy === FeatureSetPolicy.single || policy === FeatureSetPolicy.singleFirst
          ? policy
          : FeatureSetPolicy.multiple,
    };
    if (isVar) {
      if (f['isNegated'] === true) feature.isNegated = true;
      if (f['isGlobal'] === true) feature.isGlobal = true;
      if (f['isShortLived'] === true) feature.isShortLived = true;
    }
    features.push(feature);
  }
  return features;
}

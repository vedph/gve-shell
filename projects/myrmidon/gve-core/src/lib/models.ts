import { MatDialogConfig } from "@angular/material/dialog";

//#region From GVE SNAPSHOT CORE
/**
 * A labeled ID. This can be used when a feature is from a closed set,
 * and you want to provide localized or human-readable labels for the
 * possible values.
 */
export interface LabeledId {
  id: string;
  label: string;
}

/**
 * A generic tree node.
 */
export interface TreeNode<T> {
  label: string;
  payload?: T;
  parent?: TreeNode<T>;
  children?: TreeNode<T>[];
  isExpanded?: boolean;
}

/**
 * Generic name=value feature.
 */
export interface Feature {
  name: string;
  value: string;
  setPolicy: FeatureSetPolicy;
}

/**
 * Operation feature set policy.
 */
export enum FeatureSetPolicy {
  multiple = 0,
  single,
  singleFirst,
}

/**
 * Operation feature.
 */
export interface OperationFeature extends Feature {
  isNegated?: boolean;
  isGlobal?: boolean;
  isShortLived?: boolean;
}

/**
 * Source about a text variant. This is typically used when
 * variants come from different witnesses.
 */
export interface OperationSource {
  id: string;
  type: string;
  rank?: number;
  note?: string;
}

/**
 * Generic metadata about a text variant generation operation.
 */
export interface OperationMetadata {
  type: OperationType;
  id: string;
  rank?: number;
  groupId?: string;
  features?: OperationFeature[];
  sources?: OperationSource[];
}

/**
 * Type of a text operation.
 */
export enum OperationType {
  replace = 0,
  delete,
  addBefore,
  addAfter,
  moveBefore,
  moveAfter,
  swap,
  annotate,
}

/**
 * Metadata of a char-based chain operation.
 */
export interface CharChainOperation extends OperationMetadata {
  at: number;
  atAsIndex?: boolean;
  // to is for move and swap only
  to?: number;
  toAsIndex?: boolean;
  inputTag?: string;
  outputTag?: string;
  run: number;
  toRun?: number;
  value?: string;
  // from DTO
  noTraceFeautures?: boolean;
  dsl?: string;
}

/**
 * A single character node in an operation execution result.
 */
export interface CharNode {
  id: number;
  index: number;
  label: string;
  data: string;
  sourceTag?: string;
  features?: Feature[];
}

/**
 * A text snapshot, including the base text and the operations that
 * have been applied to it.
 */
export interface Snapshot {
  text: string | CharNode[];
  operations: CharChainOperation[];
}
//#endregion

/**
 * API call result wrapper.
 */
export interface ResultWrapper<T> {
  result?: T;
  error?: string;
}

/**
 * PayloadMatDialogConfig is a MatDialogConfig with a payload, used
 * to pass data of type T to a dialog.
 */
export interface PayloadMatDialogConfig<T> extends MatDialogConfig {
  payload?: T;
}

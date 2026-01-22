import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, catchError } from 'rxjs';

import { ErrorService, EnvService } from '@myrmidon/ngx-tools';

import { CharChainOperation, CharNode, OperationFeature, ResultWrapper } from '../models';

/**
 * Execution step of a char-based chain operation.
 */
export interface ChainOperationContextStep {
  /**
   * The operation that was executed.
   */
  operation: CharChainOperation;
  /**
   * The input version tag.
   */
  inputTag: string;
  /**
   * The output version tag.
   */
  outputTag: string;
  /**
   * The string synthetically representing the resulting text
   * version.
   */
  result?: string;
  /**
   * The features emitted up to the executed operation.
   * These are the features of the text as a whole, and
   * those belonging to specific nodes, each keyed under
   * a string built with `v` + output version tag + `_`
   * + node ID (e.g. `v1_2` for node with ID 2 at version 1).
   */
  featureSet: {
    features: OperationFeature[];
    nodeFeatures: Record<string, OperationFeature[]>;
  };
  /**
   * The reference node IDs of the operation which was
   * executed.
   */
  refNodeIds: number[];
}

/**
 * Result of execution of a char-based chain.
 */
export interface CharChainResult {
  /**
   * The base text, as an array of character nodes or string.
   * This is not returned by the API, but can be supplied
   * by the caller for rendering purposes.
   */
  text?: CharNode[] | string;
  /**
   * The execution steps of the chain.
   */
  steps: ChainOperationContextStep[];
  /**
   * The chain dump, which is the text representation of the chain.
   */
  chainDump: string;
  /**
   * The list of all unique tags in the chain.
   */
  chainTags: string[];
  /**
   * The sets of nodes in their order, for each version tag.
   * These nodes are collected by following the path defined
   * by the set of links of each version tag; so each of the
   * sets contains only the nodes used at that step to build
   * the text version, with their features up to that stage.
   */
  taggedNodes: { [key: string]: CharNode[] };
}

/**
 * The input and output tags of a char-based chain operation.
 */
export interface ChainOperationTags {
  inputTag: string;
  outputTag: string;
}

/**
 * The node of a character-based chain, used for diagnostic
 * or demonstration purposes.
 */
export interface CharChainNode {
  id: number;
  label: string;
  data: string;
  sourceTag?: string;
}

/**
 * The link of a character-based chain, used for diagnostic
 * or demonstration purposes.
 */
export interface CharChainLink {
  tag: string;
  sourceId: number;
  targetId: number;
}

/**
 * The character-based chain, as resulting from running operations
 * on a base text, used for diagnostic or demonstration purposes.
 */
export interface CharChain {
  nodes: CharChainNode[];
  links: CharChainLink[];
}

/**
 * Service to interact with the GVE API.
 */
@Injectable({
  providedIn: 'root',
})
export class GveApiService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService,
  ) {}

  /**
   * Parse the specified text into operations. Each operation is a line
   * of the text.
   * @param text The text to parse.
   * @returns The operations.
   */
  public parseOperations(
    text: string,
  ): Observable<ResultWrapper<CharChainOperation[]>> {
    return this._http
      .post<ResultWrapper<CharChainOperation[]>>(
        `${this._env.get('apiUrl')}text/operations/parse`,
        {
          text,
        },
      )
      .pipe(catchError(this._error.handleError));
  }

  /**
   * Run operations on the specified text.
   *
   * @param text The base text.
   * @param operations The operations to run.
   * @returns Result wrapper.
   */
  public runOperations(
    text: CharNode[],
    operations: CharChainOperation[],
  ): Observable<ResultWrapper<CharChainResult>> {
    return this._http
      .post<ResultWrapper<CharChainResult>>(
        `${this._env.get('apiUrl')}text/operations/run`,
        {
          text,
          operations,
        },
      )
      .pipe(catchError(this._error.handleError));
  }

  /**
   * Get the input and output tags for the given operations.
   *
   * @param operations The operations.
   * @returns Result wrapper.
   */
  public getTags(
    operations: CharChainOperation[],
  ): Observable<ResultWrapper<string[]>> {
    return this._http
      .post<ResultWrapper<string[]>>(
        `${this._env.get('apiUrl')}text/operations/tags`,
        {
          operations,
        },
      )
      .pipe(catchError(this._error.handleError));
  }

  /**
   * Get the chain corresponding to the operations run on the
   * specified text. This is used for diagnostic or demonstration
   * purposes.
   *
   * @param text The base text.
   * @param operations The operations to run.
   * @returns Result wrapper.
   */
  public getChain(
    text: CharNode[],
    operations: CharChainOperation[],
  ): Observable<ResultWrapper<CharChain>> {
    return this._http
      .post<ResultWrapper<CharChain>>(
        `${this._env.get('apiUrl')}text/operations/run/chain`,
        {
          text,
          operations,
        },
      )
      .pipe(catchError(this._error.handleError));
  }
}

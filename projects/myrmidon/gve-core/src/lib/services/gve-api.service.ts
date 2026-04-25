import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, catchError } from 'rxjs';

import { ErrorService, EnvService } from '@myrmidon/ngx-tools';

import {
  CharChainOperation,
  CharNode,
  OperationFeature,
  ResultWrapper,
} from '../models';

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
   * All nodes in the chain regardless of version, including deleted
   * nodes. Each node's `features` is keyed by version tag; the value
   * is the list of features for that node at that version. `features`
   * is `null` when the node has no features in any version.
   */
  nodes: CharNode[];
  /**
   * For each version tag (including v0), the ordered sequence of node
   * IDs that make up that version's text. Use together with `nodes`
   * (looked up by `id`) to reconstruct any version.
   */
  versionNodeIds: { [tag: string]: number[] };
  /**
   * For each version tag (including v0), the accumulated global
   * (chain-level) features at the end of that version.
   * The v0 entry is always an empty array.
   */
  globalFeatures: { [tag: string]: OperationFeature[] };
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
   * Get the DSL representation of the given operations.
   * @param operations The operations.
   * @returns Result wrapper.
   */
  public getDsl(
    operations: CharChainOperation[],
  ): Observable<ResultWrapper<string[]>> {
    return this._http
      .post<ResultWrapper<string[]>>(
        `${this._env.get('apiUrl')}text/operations/dsl`,
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

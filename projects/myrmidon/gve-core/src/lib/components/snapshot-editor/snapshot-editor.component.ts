import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { customAlphabet } from 'nanoid';

import { deepCopy, FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  CharChainOperation,
  CharDecoration,
  CharNode,
  DEFAULT_SVG_BASE_TEXT_OPTIONS,
  Feature,
  GveAnimationTimeline,
  GveVisualEvent,
  Snapshot,
  SnapshotViewComponent,
  SnapshotViewData,
  SnapshotViewRenderEvent,
  SnapshotViewService,
} from '@myrmidon/gve-snapshot-view';

import {
  BaseTextViewComponent,
  VarBaseTextRange,
} from '../base-text-view/base-text-view.component';
import {
  ChainOperationEditorComponent,
  FeatureDefinitions,
} from '../chain-operation-editor/chain-operation-editor.component';
import {
  ChainOperationContextStep,
  CharChain,
  CharChainResult,
  GveApiService,
} from '../../services/gve-api.service';
import { ChainResultViewComponent } from '../chain-result-view/chain-result-view.component';
import { LnHeightsEditorComponent } from '../ln-heights-editor/ln-heights-editor.component';
import { AnimationTimelineSetComponent } from '../animation-timeline-set/animation-timeline-set.component';
import { BatchOperationEditorComponent } from '../batch-operation-editor/batch-operation-editor.component';
import { SnapshotTextEditorComponent } from '../snapshot-text-editor/snapshot-text-editor.component';
import { ChainViewComponent } from '../chain-view/chain-view.component';

// default snapshot view title
const VIEW_TITLE = 'preview';

// suffix for IDs of SVG elements to be made transparent at first rendition
const SVG_TRANSP_SUFFIX = '_t';

/**
 * 🔑 `gve-snapshot-editor`
 *
 * A component to edit a text snapshot. This is the top level component in the GVE core
 * library.
 *
 * - ▶️ `snapshot` (`Snapshot`): the snapshot to edit.
 * - ▶️ `batchOps` (`string`): the batch operations text to set for the editor.
 * - ▶️ `noSave` (`boolean`): true to disable saving.
 * - 🔥 `snapshotChange` (`Snapshot`): emitted when the user saves the edited snapshot.
 * - 🔥 `snapshotCancel` (`void`): emitted when the user cancels the snapshot editing.
 */
@Component({
  selector: 'gve-snapshot-editor',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSliderModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule,
    ChainOperationEditorComponent,
    ChainResultViewComponent,
    BaseTextViewComponent,
    LnHeightsEditorComponent,
    AnimationTimelineSetComponent,
    FlatLookupPipe,
    ChainViewComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './snapshot-editor.component.html',
  styleUrl: './snapshot-editor.component.css',
})
export class SnapshotEditorComponent {
  private readonly _nanoid = customAlphabet('1234567890abcdef', 10);
  private _renderer?: SnapshotViewService;
  private _previewing?: boolean;
  private _transparentIds?: string[];
  private _stepPickFrozen?: boolean;
  private _handlingOver?: boolean;
  private _lastOverId?: string;

  @ViewChild('snapshotView', { static: false })
  public snapshotView?: ElementRef<SnapshotViewComponent>;

  /**
   * The snapshot to edit.
   */
  public readonly snapshot = model<Snapshot | undefined>();

  /**
   * The batch operations text to set for the editor.
   */
  public readonly batchOps = input<string | undefined>();

  /**
   * True to disable saving.
   */
  public readonly noSave = input<boolean | undefined>();

  /**
   * True to enable debug mode for view rendition.
   */
  public readonly debug = input<boolean | undefined>();

  /**
   * True to not show character decoration according to the trace
   * features in nodes.
   */
  public readonly noDecoration = input<boolean | undefined>();

  /**
   * Definitions for features, including names and values.
   */
  public readonly featureDefs = input<FeatureDefinitions | undefined>();

  /**
   * Definitions for element features, including names and values.
   */
  public readonly elementFeatureDefs = input<FeatureDefinitions | undefined>();

  /**
   * Definitions for diplomatic features, including names and values.
   */
  public readonly diplomaticFeatureDefs = input<
    FeatureDefinitions | undefined
  >();

  /**
   * Emitted when the user cancels the snapshot editing.
   */
  public readonly snapshotCancel = output();

  // general
  public width: FormControl<number>;
  public height: FormControl<number>;
  public style: FormControl<string | null>;
  // base text
  public baseText: FormControl<CharNode[]>;
  public offsetX: FormControl<number>;
  public offsetY: FormControl<number>;
  public lineHeightOffset: FormControl<number>;
  public lnHeights: FormControl<Record<number, number> | null>;
  public charSpacingOffset: FormControl<number>;
  public spcWidthOffset: FormControl<number>;
  public textStyle: FormControl<string | null>;
  // operations
  public operations: FormControl<CharChainOperation[]>;
  public opStyle: FormControl<string | null>;
  public form: FormGroup;
  // image and defs
  public imageUrl: FormControl<string | null>;
  public imageOpacity: FormControl<number>;
  public imageX: FormControl<number>;
  public imageY: FormControl<number>;
  public imageWidth: FormControl<number>;
  public imageHeight: FormControl<number>;
  public defs: FormControl<string | null>;
  // timelines
  public timelines: FormControl<GveAnimationTimeline[]>;

  public readonly showChain: FormControl<boolean> = new FormControl<boolean>(
    false,
    { nonNullable: true }
  );
  public readonly featDetails: FormControl<boolean> = new FormControl<boolean>(
    false,
    { nonNullable: true }
  );

  public readonly chain = signal<CharChain | undefined>(undefined);

  // list of operations output tags
  public readonly opTags = signal<string[]>([]);
  // list of operation diplomatic.g element IDs
  public readonly opElementIds = signal<string[]>([]);
  // the currently picked base text range
  public readonly textRange = signal<VarBaseTextRange | undefined>(undefined);
  // the lines count for the current base text
  public readonly lineCount = signal<number>(0);
  // the currently edited operation
  public readonly editedOp = signal<CharChainOperation | undefined>(undefined);
  public readonly editedOpIndex = signal<number>(-1);

  public readonly busy = signal<boolean>(false);

  public readonly opTypeMap = {
    0: 'replace',
    1: 'delete',
    2: 'add-before',
    3: 'add-after',
    4: 'move-before',
    5: 'move-after',
    6: 'swap',
    7: 'annotate',
  };

  // snapshot view data
  public viewTitle = VIEW_TITLE;
  public viewData?: SnapshotViewData;
  public visualInfo?: string;
  public rulers = true;

  // operations execution result
  public result?: CharChainResult;
  public resultOperationId?: string;
  public initialStepIndex = -1;

  constructor(
    formBuilder: FormBuilder,
    private _api: GveApiService,
    private _dialog: MatDialog,
    private _dialogService: DialogService,
    private _snackbar: MatSnackBar
  ) {
    // general
    this.width = new FormControl<number>(800, { nonNullable: true });
    this.height = new FormControl<number>(600, { nonNullable: true });
    this.style = new FormControl<string | null>(null);
    // base text
    this.baseText = new FormControl<CharNode[]>([], {
      nonNullable: true,
      validators: [Validators.required],
    });
    this.offsetX = new FormControl<number>(0, { nonNullable: true });
    this.offsetY = new FormControl<number>(0, { nonNullable: true });
    this.lineHeightOffset = new FormControl<number>(
      DEFAULT_SVG_BASE_TEXT_OPTIONS.lineHeightOffset,
      { nonNullable: true }
    );
    this.lnHeights = new FormControl<Record<number, number> | null>(null);
    this.charSpacingOffset = new FormControl<number>(0, { nonNullable: true });
    this.spcWidthOffset = new FormControl<number>(0, { nonNullable: true });
    this.textStyle = new FormControl<string | null>(null);

    // operations
    this.operations = new FormControl<CharChainOperation[]>([], {
      nonNullable: true,
    });
    this.opStyle = new FormControl<string | null>(null);
    // image
    this.imageUrl = new FormControl<string | null>(null);
    this.imageOpacity = new FormControl<number>(1, { nonNullable: true });
    this.imageX = new FormControl<number>(0, { nonNullable: true });
    this.imageY = new FormControl<number>(0, { nonNullable: true });
    this.imageWidth = new FormControl<number>(0, { nonNullable: true });
    this.imageHeight = new FormControl<number>(0, { nonNullable: true });
    this.defs = new FormControl<string | null>(null);

    // timelines
    this.timelines = new FormControl<GveAnimationTimeline[]>([], {
      nonNullable: true,
    });

    // form
    this.form = formBuilder.group({
      width: this.width,
      height: this.height,
      style: this.style,
      baseText: this.baseText,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      lineHeightOffset: this.lineHeightOffset,
      lnHeights: this.lnHeights,
      charSpacingOffset: this.charSpacingOffset,
      spcWidthOffset: this.spcWidthOffset,
      textStyle: this.textStyle,
      operations: this.operations,
      opStyle: this.opStyle,
      // image
      imageUrl: this.imageUrl,
      imageOpacity: this.imageOpacity,
      imageX: this.imageX,
      imageY: this.imageY,
      imageWidth: this.imageWidth,
      imageHeight: this.imageHeight,
      defs: this.defs,
      // timelines
      timelines: this.timelines,
    });

    // when snapshot changes, update the form
    effect(() => {
      this.updateForm(this.snapshot());
      setTimeout(() => {
        this.runToLast();
      }, 0);
    });
  }

  /**
   * Set the view data for the snapshot view.
   *
   * @param snapshot The optional snapshot data to use. If not provided,
   * a snapshot will be created from the form data.
   * @param title The optional title to set for the view.
   */
  private setViewData(snapshot?: Snapshot, title = VIEW_TITLE): void {
    console.log('set view data');

    // get the snapshot to use
    if (!snapshot) {
      snapshot = this.getSnapshot();
    }

    // update view data
    this.viewTitle = title;
    this.visualInfo = undefined;
    this.viewData = {
      snapshot: snapshot,
      options: {
        debug: this.debug(),
        delayedRender: true,
        showRulers: true,
        showGrid: true,
        panZoom: true,
        transparentIds: this._transparentIds,
      },
    };

    console.log('view data: ', this.viewData);
  }

  private updateForm(snapshot: Snapshot | undefined) {
    this._transparentIds = undefined;
    this.initialStepIndex = -1;

    if (!snapshot) {
      this.form.reset();
    } else {
      this.width.setValue(snapshot.size.width);
      this.height.setValue(snapshot.size.height);
      this.style.setValue(snapshot.style || null);
      this.imageUrl.setValue(snapshot.image?.url || null);
      this.imageOpacity.setValue(snapshot.image?.opacity || 0);
      this.imageX.setValue(snapshot.image?.canvas?.x || 0);
      this.imageY.setValue(snapshot.image?.canvas?.y || 0);
      this.imageWidth.setValue(snapshot.image?.canvas?.width || 0);
      this.imageHeight.setValue(snapshot.image?.canvas?.height || 0);
      this.defs.setValue(snapshot.defs || null);
      if (Array.isArray(snapshot.text)) {
        this.baseText.setValue(snapshot.text);
      } else {
        this.baseText.setValue(
          SnapshotViewService.stringToBaseChars(snapshot.text)
        );
      }
      this.offsetX.setValue(snapshot.textOptions?.offset?.x || 0);
      this.offsetY.setValue(snapshot.textOptions?.offset?.y || 0);
      this.lineHeightOffset.setValue(snapshot.textOptions?.lineHeightOffset);
      this.lnHeights.setValue(snapshot.textOptions?.minLineHeights || null);
      this.charSpacingOffset.setValue(snapshot.textOptions?.charSpacingOffset);
      this.spcWidthOffset.setValue(snapshot.textOptions?.spcWidthOffset);
      this.textStyle.setValue(snapshot.textStyle || null);
      this.operations.setValue(snapshot.operations);
      this.opStyle.setValue(snapshot.opStyle || null);
      // timelines
      const timelines: GveAnimationTimeline[] = [];
      if (snapshot.timelines) {
        for (let tag in snapshot.timelines) {
          timelines.push(snapshot.timelines[tag]);
        }
      }
      this.timelines.setValue(timelines);
    }
    this.updateLineCount(this.baseText.value);
    this.updateOpLists();

    this.form.markAsPristine();
  }

  // #region base text
  public inputBaseText(): void {
    if (this.busy()) {
      return;
    }

    const dialogRef = this._dialog.open(SnapshotTextEditorComponent, {
      data: { payload: { text: this.baseText.value } },
      width: '80%',
    });

    dialogRef.afterClosed().subscribe((text: CharNode[]) => {
      if (text?.length) {
        // update the form control and reset the current text range
        this.baseText.setValue(text);
        this.baseText.updateValueAndValidity();
        this.baseText.markAsDirty();
        this.textRange.set(undefined);

        // update the line count
        this.updateLineCount(text);

        // remove all operations and update the view data
        this.removeAllOperations();

        // remove all timelines
        this.timelines.reset();
      }
    });
  }

  /**
   * Update the line count based on the received text.
   * @param text The text to use for counting lines.
   */
  private updateLineCount(text: CharNode[]) {
    if (!text.length) {
      this.lineCount.set(0);
    } else {
      this.lineCount.set(text.filter((c) => c.data === '\n').length + 1);
    }
  }

  /**
   * Handle the event fired by the base text editor to pick a text range.
   * @param range The picked range.
   */
  public onRangePick(range?: VarBaseTextRange) {
    this.textRange.set(range);
  }
  // #endregion

  // #region operations
  /**
   * Update the lists of operation output tags and element IDs by collecting
   * all the operation tags and the IDs of the elements in their diplomatic.g
   * SVG code if any.
   */
  private updateOpLists() {
    const tags = new Set<string>();
    const ids = new Set<string>();

    let n = 0;
    for (const op of this.operations.value) {
      // output tag
      n++;
      tags.add(op.outputTag || `v${n}`);

      // element IDs
      if (op.diplomatics?.g) {
        this.parseSvgIds(op.diplomatics.g)?.forEach((id) => ids.add(id));
      }
    }

    this.opTags.set([...tags]);
    this.opElementIds.set([...ids]);
  }

  /**
   * Edit a new operation.
   */
  public editNewOperation() {
    // create a new operation and edit it
    this.editedOp.set({
      id: this._nanoid(),
      type: 0,
      at: this.textRange()?.at || 0,
      run: this.textRange()?.run || 1,
    });
    this.editedOpIndex.set(-1);
  }

  /**
   * Edit (a copy of) the operation at the specified index.
   * @param index The operation index.
   */
  public editOperation(index: number) {
    this.editedOpIndex.set(index);
    this.editedOp.set(deepCopy(this.operations.value[index]));
  }

  /**
   * Close the currently edited operation.
   */
  private closeEditedOperation() {
    this.editedOpIndex.set(-1);
    this.editedOp.set(undefined);
  }

  /**
   * Handle the event fired by the operation editor to cancel
   * the current operation edits.
   */
  public onOperationCancel() {
    this.closeEditedOperation();
  }

  /**
   * Handle the event fired by the operation editor to change
   * the currently edited operation, or add a new one if that
   * was a new operation.
   * @param op The changed operation.
   */
  public onOperationChange(op?: CharChainOperation | null) {
    if (!op) {
      return;
    }
    console.log('operation change');
    const operations = [...this.operations.value];

    // replace or add the operation
    let i = this.editedOpIndex();
    if (this.editedOpIndex() > -1) {
      operations.splice(this.editedOpIndex(), 1, op);
    } else {
      operations.push(op);
      i = operations.length - 1;
    }

    // update the operations form control
    this.operations.setValue(operations);
    this.operations.markAsDirty();
    this.operations.updateValueAndValidity();

    // update the operation lists
    this.updateOpLists();

    // run to the edited operation
    this.runTo(i);

    // close the edited operation
    this.closeEditedOperation();
  }

  /**
   * Delete the operation at the specified index.
   * @param index The index of the operation to delete.
   */
  public deleteOperation(index: number) {
    this._dialogService
      .confirm(
        'Confirm Deletion',
        `Delete operation "${this.operations.value[index].id}"?`
      )
      .subscribe((yes: boolean) => {
        if (yes) {
          // close the edited operation if it is the one being deleted
          if (this.editedOpIndex() === index) {
            this.closeEditedOperation();
          }
          // reset the result operation ID if it is the one being deleted
          if (this.resultOperationId === this.operations.value[index].id) {
            this.resultOperationId = undefined;
          }
          // delete the operation and update the form control
          const operations = [...this.operations.value];
          operations.splice(index, 1);
          this.operations.setValue(operations);
          this.operations.markAsDirty();
          this.operations.updateValueAndValidity();

          // update the operation lists
          this.updateOpLists();

          // update the view data
          setTimeout(() => {
            this.runToLast();
          }, 0);
        }
      });
  }

  /**
   * Parse the operations from their text and append them to the current
   * snapshot operations.
   */
  public parseOperations() {
    if (this.busy()) {
      return;
    }

    const dialogRef = this._dialog.open(BatchOperationEditorComponent, {
      data: { preset: this.batchOps },
    });

    dialogRef.afterClosed().subscribe((batchOps: CharChainOperation[]) => {
      if (batchOps) {
        const operations = [...this.operations.value];
        operations.push(...batchOps);
        this.operations.setValue(operations);
        this.operations.markAsDirty();
        this.operations.updateValueAndValidity();
        // update the operation lists
        this.updateOpLists();
        // update the view data
        setTimeout(() => {
          this.runToLast();
        }, 0);
      }
    });
  }

  /**
   * Remove all the operations, close the edited operation and update the view data.
   */
  private removeAllOperations(): void {
    this.resultOperationId = undefined;
    this.closeEditedOperation();
    this.operations.reset();
    this.operations.markAsDirty();
    this.operations.updateValueAndValidity();
    this.opTags.set([]);
    this.opElementIds.set([]);
    this.setViewData();
    this.result = undefined;
  }

  /**
   * Remove all the operations.
   */
  public clearOperations(): void {
    this._dialogService
      .confirm('Confirm', 'Remove all operations?')
      .subscribe((yes: boolean) => {
        if (yes) {
          this.removeAllOperations();
        }
      });
  }

  /**
   * Parse all the id attributes from the received SVG code and
   * return them as an array.
   *
   * @param svg The SVG content to parse or undefined.
   * @returns Array of IDs found in the SVG content or undefined.
   */
  private parseSvgIds(svg?: string): string[] | undefined {
    if (!svg) {
      return undefined;
    }

    const regex = /<[^>]+\bid=(["'])(.*?)\1/g;
    const ids: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(svg)) !== null) {
      ids.push(match[2]);
    }

    return ids;
  }

  private getTransparentIds(g?: string): string[] | undefined {
    if (!g) {
      return undefined;
    }
    return this.parseSvgIds(g)?.filter((id) => id.endsWith(SVG_TRANSP_SUFFIX));
  }

  /**
   * Supply operation nodes to the snapshot text nodes. An execution result is
   * a compact object, so that to build a snapshot accumulating all the nodes
   * and their features up to the last executed operation, we need to start
   * with the base text nodes, and then examine each execution step in the
   * result. Each step contains only those nodes used by the version of the
   * text corresponding to its stage. Among them, some are new nodes, and some
   * are base text nodes. Also, the step contains the full set of features
   * current at its time, both for the text as a whole and for each node.
   * This method accumulates the nodes and their features up to the specified
   * step, updating the features of the nodes already present in the snapshot
   * text nodes, and adding the new nodes.
   *
   * @param snapshot The snapshot to supply the nodes to.
   * @param result The operations execution result.
   * @param tag The output tag of the operation to supply the nodes from.
   */
  private supplyOpNodes(
    snapshot: Snapshot,
    result: CharChainResult,
    tag: string
  ): void {
    // get the original nodes from the snapshot base text
    const nodes = snapshot.text as CharNode[];

    // find the max ID in the original nodes, so that any ID greater than it
    // belongs to new nodes
    const maxOriginalId = nodes.reduce((max, n) => Math.max(max, n.id), 0);
    const stepIndex = result.steps.findIndex((s) => s.outputTag === tag);

    // for each step up to the specified one, add the nodes introduced by the step
    // and update the features from each step node that is already present
    for (let i = 0; i <= stepIndex; i++) {
      // get the nodes of the step
      const stepNodes = result.taggedNodes[result.steps[i].outputTag];

      for (const stepNode of stepNodes) {
        // if the node was added, add it
        if (
          stepNode.id > maxOriginalId &&
          !nodes.find((n) => n.id === stepNode.id)
        ) {
          nodes.push(stepNode);
        } else {
          // if the node was already in the original nodes, update its features
          const existing = nodes.findIndex((n) => n.id === stepNode.id);
          if (existing > -1) {
            nodes[existing].features = stepNode.features;
          }
        }
      }
    }

    // update the snapshot text nodes
    snapshot.text = nodes;
  }

  /**
   * Run the operations up to the specified index (included).
   * This is called when:
   * - a preview is requested by the operation editor.
   * - the currently edited operation is saved.
   * - the user picks a step in the chain result view.
   * - runToLast is called, which happens when:
   *   - setting the snapshot.
   *   - parsing a batch of operations.
   *   - deleting an operation.
   *
   * @param index The index of the operation to run to.
   * @param lastOperation The operation to use in place of the existing
   * operation in the snapshot at index. This is used when previewing
   * the edited operation from within the operation editor.
   * @returns A promise that resolves to the execution result.
   */
  public runTo(index: number, lastOperation?: CharChainOperation): void {
    if (this.busy()) {
      return;
    }
    console.log('run to: ' + index);

    // get the snapshot to run operations on
    const snapshot = this.getSnapshot();
    if (!snapshot.text) {
      return;
    }

    // remove from the snapshot the operations past the specified index,
    // also replacing the last operation when this was received as a parameter
    if (lastOperation) {
      snapshot.operations = snapshot.operations.slice(0, index);
      snapshot.operations.push(lastOperation);
    } else {
      lastOperation = snapshot.operations[index];
      snapshot.operations = snapshot.operations.slice(0, index + 1);
    }

    // update result operation ID
    this.resultOperationId = snapshot.operations[index].id;

    // extract the IDs from the last operation's diplomatics and filter
    // them so that only the ones ending with _t are kept. By convention,
    // all the IDs ending with this suffix are to be made invisible at
    // their first rendition (opacity=0). An animation will then make
    // them visible.
    this._transparentIds = this.getTransparentIds(
      snapshot.operations[index].diplomatics?.g
    );

    // run the operations
    this.busy.set(true);
    this.initialStepIndex = index;
    this._api
      .runOperations(snapshot.text as CharNode[], snapshot.operations)
      .subscribe({
        next: (wrapper) => {
          // handle operation (non-fatal) error or result
          if (wrapper.error) {
            this._snackbar.open(wrapper.error, 'OK');
            return;
          }

          // set the result
          console.log('result:', wrapper.result);
          this.result = wrapper.result;

          // supply the last operation output tag from its result step if not set
          if (!lastOperation.outputTag) {
            const step = wrapper.result!.steps.find(
              (s) => s.operation.id === lastOperation.id
            );
            lastOperation.outputTag = step!.outputTag;
          }

          // update the snapshot text nodes with those introduced by operations
          this.supplyOpNodes(
            snapshot,
            wrapper.result!,
            lastOperation.outputTag
          );

          // update the view data
          this.setViewData(snapshot, lastOperation!.outputTag);

          // play animation if any
          const tl = this.timelines.value.find(
            (t) => t.tag === lastOperation!.outputTag
          );
          if (tl) {
            // play the timeline
            setTimeout(() => {
              this.playTimeline(tl);
            }, 0);
          }

          // get the chain model if requested
          if (this.showChain.value) {
            this.getChainAt(index);
          }
        },
        error: (error) => {
          console.error(error);
          this._transparentIds = undefined;
          this._snackbar.open('Error running operations', 'OK');
        },
        complete: () => {
          this.busy.set(false);
        },
      });
  }

  /**
   * Run the operations up to the last operation if any, updating the
   * execution result. The execution result is always the result from
   * all the operations, as users must be able to browse across its steps.
   */
  public runToLast(): void {
    if (this.operations.value.length) {
      this.runTo(this.operations.value.length - 1);
    } else {
      this.setViewData();
      this.result = undefined;
    }
  }

  public getChainAt(index: number, lastOperation?: CharChainOperation): void {
    // get the snapshot to run operations on
    const snapshot = this.getSnapshot();
    if (!snapshot.text) {
      return;
    }

    // remove from the snapshot the operations past the specified index,
    // also replacing the last operation when this was received as a parameter
    if (lastOperation) {
      snapshot.operations = snapshot.operations.slice(0, index);
      snapshot.operations.push(lastOperation);
    } else {
      lastOperation = snapshot.operations[index];
      snapshot.operations = snapshot.operations.slice(0, index + 1);
    }
    this.busy.set(true);
    this._api
      .getChain(snapshot.text as CharNode[], snapshot.operations)
      .subscribe({
        next: (wrapper) => {
          // handle operation (non-fatal) error or result
          if (wrapper.error) {
            this._snackbar.open(wrapper.error, 'OK');
            this.chain.set(undefined);
          } else {
            this.chain.set(wrapper.result);
          }
        },
        error: (error) => {
          console.error(error);
          this._transparentIds = undefined;
          this._snackbar.open('Error running operations', 'OK');
        },
        complete: () => {
          this.busy.set(false);
        },
      });
  }

  /**
   * Update the snapshot view by running the operations up to the
   * currently edited operation if any.
   *
   * @param operation The operation being previewed.
   */
  public onOperationPreview(operation: CharChainOperation): void {
    // no multiple previews or previewing a new operation
    if (this._previewing || this.editedOpIndex() < 0) {
      return;
    }
    this._previewing = true;
    setTimeout(() => {
      this.runTo(this.editedOpIndex(), operation);
      this._previewing = false;
    }, 0);
  }
  // #endregion

  private playTimeline(tl: GveAnimationTimeline): void {
    const shadowRoot = this.snapshotView?.nativeElement?.shadowRoot;
    if (tl && shadowRoot) {
      console.log('play timeline', tl);
      this._renderer?.playTimeline(tl, undefined, shadowRoot);
    } else {
      if (!this.snapshotView) {
        console.warn('no snapshotView for timeline');
      } else {
        console.warn('no shadowRoot for timeline');
      }
    }
  }

  /**
   * Handle the event fired by the chain result view to pick a step.
   *
   * @param step The step to pick.
   */
  public onStepPick(step: ChainOperationContextStep): void {
    if (!this.result || this._stepPickFrozen) {
      return;
    }

    // get base text snapshot
    const snapshot = this.getSnapshot();

    // get the step index
    const index = snapshot.operations.findIndex(
      (o) => o.id === step.operation.id
    );

    // remove snapshot operations after the picked step to avoid
    // their visuals creep into the snapshot view
    snapshot.operations = snapshot.operations.slice(0, index + 1);

    // update result operation ID
    this.resultOperationId = snapshot.operations[index].id;

    // extract the IDs from the last operation's diplomatics and filter
    // them so that only the ones ending with _t are kept. By convention,
    // all the IDs ending with this suffix are to be made invisible at
    // their first rendition (opacity=0). An animation will then make
    // them visible.
    this._transparentIds = this.getTransparentIds(
      snapshot.operations[index].diplomatics?.g
    );

    // update the snapshot text nodes with those introduced by operations
    this.supplyOpNodes(snapshot, this.result, step.outputTag);

    // update the view data
    this.setViewData(snapshot, step.outputTag);

    // play animation if any
    const tl = this.timelines.value.find((t) => t.tag === step.outputTag);
    if (tl) {
      // play the timeline
      setTimeout(() => {
        this.playTimeline(tl);
      }, 0);
    }
  }

  /**
   * Handle the event fired by a visual in the snapshot view.
   *
   * @param event The event.
   */
  public onVisualEvent(event: CustomEvent<GveVisualEvent>): void {
    if (this._handlingOver) {
      return;
    }
    const d = event.detail;

    if (d.event.type === 'mouseover') {
      const visual = d.source;
      if (visual.id === this._lastOverId) {
        return;
      }
      this._handlingOver = true;
      const sb: string[] = [];
      // id (type)
      sb.push('#' + visual.id);
      sb.push(` (${visual.type})`);
      // : label and features
      if (visual.data?.label) {
        sb.push(': ');
        sb.push(visual.data.label);
      }
      if (visual.data?.features?.length) {
        sb.push(' ');
        sb.push(
          visual.data.features
            .map((f: Feature) => `${f.name}=${f.value}`)
            .join('\n')
        );
      }
      // (@x,y width×height)
      sb.push(
        ` (@${visual.x.toFixed(1)},${visual.y.toFixed(1)} ` +
          `◻${visual.width.toFixed(1)}×${visual.height.toFixed(1)})`
      );
      this.visualInfo = sb.join('');
      this._lastOverId = visual.id;
    }

    this._handlingOver = false;
  }

  /**
   * Handle the change of line heights by updating the form control.
   *
   * @param heights The line heights.
   */
  public onHeightsChange(heights: Record<number, number> | undefined): void {
    this.lnHeights.setValue(heights || null);
    this.lnHeights.markAsDirty();
    this.lnHeights.updateValueAndValidity();
  }

  /**
   * Handle the change of timelines by updating the form control.
   *
   * @param timelines The timelines.
   */
  public onTimelinesChange(timelines?: GveAnimationTimeline[] | null): void {
    if (!timelines) {
      return;
    }
    this.timelines.setValue(timelines);
    this.timelines.markAsDirty();
    this.timelines.updateValueAndValidity();
  }

  /**
   * Emit the cancel event for this snapshot edit.
   */
  public close(): void {
    this.snapshotCancel.emit();
  }

  /**
   * Handle the render event from the snapshot view to get a reference
   * to the renderer.
   *
   * @param event The rendition event.
   */
  public onSnapshotRender(event: CustomEvent<SnapshotViewRenderEvent>): void {
    this._renderer = (event.detail as SnapshotViewRenderEvent).renderer;
  }

  public onImageLoad(imageElement: HTMLImageElement) {
    const size = {
      width: imageElement.naturalWidth,
      height: imageElement.naturalHeight,
    };
    if (!this.imageWidth.value) {
      this.imageWidth.setValue(size.width);
      this.imageWidth.updateValueAndValidity();
      this.imageWidth.markAsDirty();
    }
    if (!this.imageHeight.value) {
      this.imageHeight.setValue(size.height);
      this.imageHeight.updateValueAndValidity();
      this.imageHeight.markAsDirty();
    }
  }

  public onImageOpacityChange(value: number): void {
    this.imageOpacity.setValue(value);
    this.imageOpacity.updateValueAndValidity();
    this.imageOpacity.markAsDirty();
    if (this._renderer) {
      this._renderer.setImageOpacity(value);
    }
  }

  public resetImgMetadata(): void {
    this.imageX.reset();
    this.imageY.reset();
    this.imageWidth.reset();
    this.imageHeight.reset();
  }

  /**
   * Toggle rulers in the snapshot view.
   */
  public toggleRulers(): void {
    if (!this._renderer) {
      return;
    }
    this.rulers = this._renderer.toggleRulers();
  }

  private defaultCharDecorator(
    char: CharNode,
    lineNumber: number,
    x: number,
    y: number
  ): CharDecoration | null {
    const features = char.features;
    const segOut = features?.find((f) => f.name === '$seg-out');
    const seg2Out = features?.find((f) => f.name === '$seg2-out');
    const segIn = features?.find((f) => f.name === '$seg-in');
    const seg2In = features?.find((f) => f.name === '$seg2-in');

    if (!segOut && !seg2Out && !segIn && !seg2In) {
      return null;
    }

    const decoration: CharDecoration = {};
    if (segOut || seg2Out) {
      decoration.fill = segOut ? '#9B2915' : '#9B6F91';
    }
    // if (segIn || seg2In) {
    //   decoration.stroke = segIn ? '#E9B44C' : '#DF928E';
    //   decoration.strokeWidth = 3;
    // }

    return decoration;
  }

  /**
   * Get a snapshot from the form data.
   *
   * @returns New snapshot object.
   */
  private getSnapshot(): Snapshot {
    const snapshot: Snapshot = {
      size: {
        width: this.width.value,
        height: this.height.value,
      },
      style: this.style.value || undefined,
      defs: this.defs.value || undefined,
      // snapshot nodes might be changed, so we copy them
      // to avoid changing the original snapshot
      text: deepCopy(this.baseText.value),
      textStyle: this.textStyle.value || undefined,
      textOptions: {
        lineHeightOffset: this.lineHeightOffset.value,
        minLineHeights: this.lnHeights.value || undefined,
        charSpacingOffset: this.charSpacingOffset.value,
        spcWidthOffset: this.spcWidthOffset.value,
        offset: {
          x: this.offsetX.value,
          y: this.offsetY.value,
        },
      },
      operations: [...this.operations.value],
      opStyle: this.opStyle.value || undefined,
    };

    // add char decoration unless opted out
    if (!this.noDecoration()) {
      snapshot.textOptions.charDecorator = this.defaultCharDecorator;
    }

    // image
    if (this.imageUrl.value) {
      snapshot.image = {
        url: this.imageUrl.value,
        opacity: this.imageOpacity.value || undefined,
      };
      if (
        this.imageX.value ||
        this.imageY.value ||
        this.imageWidth.value ||
        this.imageHeight.value
      ) {
        snapshot.image.canvas = {
          x: this.imageX.value,
          y: this.imageY.value,
          width: this.imageWidth.value,
          height: this.imageHeight.value,
        };
      }
    }

    // timelines
    if (this.timelines.value.length) {
      snapshot.timelines = {};
      this.timelines.value.forEach((t) => {
        snapshot.timelines![t.tag] = t;
      });
    } else {
      snapshot.timelines = undefined;
    }

    return snapshot;
  }

  /**
   * Get a snapshot from the form data and emit it
   * in the snapshot change event.
   */
  public save(): void {
    if (this.form.invalid || this.noSave()) {
      return;
    }
    this.snapshot.set(this.getSnapshot());
  }
}

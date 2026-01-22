import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
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
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { customAlphabet } from 'nanoid';

import { FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import {
  BaseTextViewComponent,
  BaseTextRange,
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
import { BatchOperationEditorComponent } from '../batch-operation-editor/batch-operation-editor.component';
import { SnapshotTextEditorComponent } from '../snapshot-text-editor/snapshot-text-editor.component';
import { CharChainOperation, CharNode, Snapshot } from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';

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
    MatSlideToggle,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule,
    ChainOperationEditorComponent,
    ChainResultViewComponent,
    BaseTextViewComponent,
    FlatLookupPipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './snapshot-editor.component.html',
  styleUrl: './snapshot-editor.component.css',
})
export class SnapshotEditorComponent {
  private readonly _nanoid = customAlphabet('1234567890abcdef', 10);
  private _previewing?: boolean;
  private _stepPickFrozen?: boolean;

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

  // base text
  public baseText: FormControl<CharNode[]>;
  // operations
  public operations: FormControl<CharChainOperation[]>;
  public form: FormGroup;

  public readonly showChain: FormControl<boolean> = new FormControl<boolean>(
    false,
    { nonNullable: true },
  );
  public readonly featDetails: FormControl<boolean> = new FormControl<boolean>(
    false,
    { nonNullable: true },
  );

  public readonly chain = signal<CharChain | undefined>(undefined);

  // the currently picked base text range
  public readonly textRange = signal<BaseTextRange | undefined>(undefined);
  // the lines count for the current base text
  public readonly lineCount = signal<number>(0);
  // the currently edited operation
  public readonly editedOp = signal<CharChainOperation | undefined>(undefined);
  public readonly editedOpIndex = signal<number>(-1);
  // the patch to apply to the edited operation's range
  public readonly editedOpRangePatch = signal<BaseTextRange | undefined>(
    undefined,
  );

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

  // operations execution result
  public result?: CharChainResult;
  public resultOperationId?: string;
  public initialStepIndex = -1;

  constructor(
    formBuilder: FormBuilder,
    private _api: GveApiService,
    private _dialog: MatDialog,
    private _dialogService: DialogService,
    private _snackbar: MatSnackBar,
  ) {
    // base text
    this.baseText = new FormControl<CharNode[]>([], {
      nonNullable: true,
      validators: [Validators.required],
    });
    // operations
    this.operations = new FormControl<CharChainOperation[]>([], {
      nonNullable: true,
    });

    // form
    this.form = formBuilder.group({
      baseText: this.baseText,
      operations: this.operations,
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
  }

  private updateForm(snapshot: Snapshot | undefined) {
    this.initialStepIndex = -1;

    if (!snapshot) {
      this.form.reset();
    } else {
      if (Array.isArray(snapshot.text)) {
        this.baseText.setValue(snapshot.text);
      } else {
        this.baseText.setValue(
          GveBaseTextService.stringToBaseChars(snapshot.text),
        );
      }
      this.operations.setValue(snapshot.operations);
    }
    this.updateLineCount(this.baseText.value);

    this.form.markAsPristine();
  }

  // #region base text
  public inputBaseText(): void {
    if (this.busy()) {
      return;
    }

    const dialogRef = this._dialog.open(SnapshotTextEditorComponent, {
      data: { payload: { text: [...this.baseText.value] } },
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
   * @param applyToOp True to also apply the picked range to the edited operation.
   */
  public onRangePick(range?: BaseTextRange, applyToOp = false): void {
    this.textRange.set(range);

    if (applyToOp) {
      this.editedOpRangePatch.set({ ...range } as BaseTextRange);
    }
  }
  // #endregion

  // #region operations
  /**
   * Edit a new operation.
   */
  public editNewOperation() {
    // create a new operation and edit it, using as the initial range
    // the base text range if any
    const range = this.textRange();

    this.editedOp.set({
      id: this._nanoid(),
      type: 0,
      at: range?.at || 0,
      run: range?.run || 1,
    });
    this.editedOpIndex.set(-1);
  }

  /**
   * Edit (a copy of) the operation at the specified index.
   * @param index The operation index.
   */
  public editOperation(index: number) {
    this.editedOpIndex.set(index);
    this.editedOp.set(structuredClone(this.operations.value[index]));
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
        `Delete operation "${this.operations.value[index].id}"?`,
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
    tag: string,
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
              (s) => s.operation.id === lastOperation.id,
            );
            lastOperation.outputTag = step!.outputTag;
          }

          // update the snapshot text nodes with those introduced by operations
          this.supplyOpNodes(
            snapshot,
            wrapper.result!,
            lastOperation.outputTag,
          );

          // update the view data
          this.setViewData(snapshot, lastOperation!.outputTag);

          // get the chain model if requested
          if (this.showChain.value) {
            this.getChainAt(index);
          }
        },
        error: (error) => {
          console.error(error);
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
      (o) => o.id === step.operation.id,
    );

    // remove snapshot operations after the picked step to avoid
    // their visuals creep into the snapshot view
    snapshot.operations = snapshot.operations.slice(0, index + 1);

    // update result operation ID
    this.resultOperationId = snapshot.operations[index].id;

    // update the snapshot text nodes with those introduced by operations
    this.supplyOpNodes(snapshot, this.result, step.outputTag);

    // update the view data
    this.setViewData(snapshot, step.outputTag);
  }

  /**
   * Emit the cancel event for this snapshot edit.
   */
  public close(): void {
    this.snapshotCancel.emit();
  }

  /**
   * Get a snapshot from the form data.
   *
   * @returns New snapshot object.
   */
  private getSnapshot(): Snapshot {
    const snapshot: Snapshot = {
      // snapshot nodes might be changed, so we copy them
      // to avoid changing the original snapshot
      text: structuredClone(this.baseText.value),
      operations: structuredClone(this.operations.value),
    };

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

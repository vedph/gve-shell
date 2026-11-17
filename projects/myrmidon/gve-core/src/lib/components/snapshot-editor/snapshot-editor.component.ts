import {
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
  inject,
} from '@angular/core';
import { form, FormField, pattern, required } from '@angular/forms/signals';

import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import {
  MatFormField,
  MatLabel,
  MatError,
  MatSuffix,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabLabel, MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';

import { Subscription } from 'rxjs';

import { customAlphabet } from 'nanoid';

import { EnvService, FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import {
  DEFAULT_SETTINGS,
  GveRenditionSettings,
  GveSnapshotRendition,
} from '@myrmidon/gve-snapshot-rendition';

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
import { FeatureSetEditorComponent } from '../feature-set-editor/feature-set-editor.component';
import {
  CharChainOperation,
  CharNode,
  Feature,
  LabeledId,
  OperationSource,
  ResultWrapper,
  Snapshot,
} from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';
import { MatBadge } from '@angular/material/badge';
import { OperationSourceEditorComponent } from '../operation-source-editor/operation-source-editor.component';
import { requiredArray } from '../../validators/signal-validators';
import { getUnknownInputStepIndexes } from '../../utils/step-tags';
import {
  GVE_SHORTCUTS,
  isGveShortcut,
} from '../../utils/keyboard-shortcuts';

// default snapshot view title
const VIEW_TITLE = 'preview';

// suffix for IDs of SVG elements to be made transparent at first rendition
const SVG_TRANSP_SUFFIX = '_t';

/**
 * The editable shape behind the snapshot form.
 */
interface SnapshotControls {
  baseText: CharNode[];
  operations: CharChainOperation[];
}

/**
 * Bound snapshot -> editable draft. Nodes and operations are deep-copied,
 * so that the form never tags the caller's objects with its identity
 * symbols (getSnapshot hands out clones again, which drop them).
 */
function toDraft(snapshot: Snapshot | undefined): SnapshotControls {
  if (!snapshot) {
    return { baseText: [], operations: [] };
  }
  return {
    baseText: Array.isArray(snapshot.text)
      ? structuredClone(snapshot.text)
      : GveBaseTextService.stringToBaseChars(snapshot.text),
    operations: structuredClone(snapshot.operations),
  };
}

/**
 * Get the ordinal numbers of the operations whose value or feature values
 * include line feeds, which the operations DSL cannot represent.
 */
export function getOperationsWithLineFeeds(
  operations: CharChainOperation[],
): number[] {
  const hasLf = (s?: string) => !!s && /[\r\n]/.test(s);
  const numbers: number[] = [];
  operations.forEach((op, i) => {
    if (hasLf(op.value) || op.features?.some((f) => hasLf(f.value))) {
      numbers.push(i + 1);
    }
  });
  return numbers;
}

/**
 * Count the lines of the specified text.
 */
function countLines(text: CharNode[]): number {
  return text.length ? text.filter((c) => c.data === '\n').length + 1 : 0;
}

/**
 * 🔑 `gve-snapshot-editor`
 *
 * A component to edit a text snapshot. This is the top level component in the GVE core
 * library.
 *
 * - ▶️ `snapshot` (`Snapshot`): the snapshot to edit.
 * - ▶️ `batchOps` (`string`): the batch operations text to set for the editor.
 * - ▶️ `noSave` (`boolean`): true to disable saving.
 * - ▶️ `debug` (`boolean`): true to enable debug mode for view rendition.
 * - ▶️ `noDecoration` (`boolean`): true to not show character decoration according to the trace features in nodes.
 * - ▶️ `featureDefs` (`FeatureDefinitions`): definitions for features, including names and values.
 * - ▶️ `multiValuedFeatureIds` (`string[]`): the IDs of the features that are multi-valued. If a feature being edited is in this list, the feature editor will allow adding multiple values to it. Passed down to feature editors.
 * - ▶️ `sourceIds` (`LabeledId[]`): the list of source IDs when it's a closed set. Passed down to the operation source editor, which will show a dropdown to select from these IDs. When not specified, the source ID can be freely typed in the source editor.
 * - ▶️ `sourceTypes` (`LabeledId[]`): the list of source types when it's a closed set. Passed down to the operation source editor, which will show a dropdown to select from these types. When not specified, the source type can be freely typed in the source editor.
 * - ▶️ `renditionSettings` (`GveRenditionSettings`): settings for rendering the snapshot. These are passed to the snapshot rendition component.
 * - ▶️ `opListMaxHeight` (`string`): maximum height for the operations list (default 50vh), which scrolls vertically when longer.
 * - ▶️ `textMaxHeight` (`string`): maximum height for the base text in the text tab (default 50vh), which scrolls vertically when longer.
 *
 * Keyboard shortcuts: Alt+Shift+N adds a new operation (unless one is being edited), Alt+Shift+R runs all the operations.
 * - 🔥 `snapshotChange` (`Snapshot`): emitted when the user saves the edited snapshot.
 * - 🔥 `snapshotCancel` (`void`): emitted when the user cancels the snapshot editing.
 */
@Component({
  selector: 'gve-snapshot-editor',
  imports: [
    MatButton,
    MatIconButton,
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormField,
    MatLabel,
    MatError,
    MatSuffix,
    MatIcon,
    MatInput,
    MatProgressBar,
    MatTabLabel,
    MatTab,
    MatTabGroup,
    MatTooltip,
    FormField,
    MatBadge,
    MatSlideToggle,
    ChainOperationEditorComponent,
    ChainResultViewComponent,
    BaseTextViewComponent,
    FeatureSetEditorComponent,
    OperationSourceEditorComponent,
    FlatLookupPipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
  templateUrl: './snapshot-editor.component.html',
  styleUrl: './snapshot-editor.component.css',
})
export class SnapshotEditorComponent {
  private readonly _nanoid = customAlphabet('1234567890abcdef', 10);
  private _previewing?: boolean;
  // true when the current result comes from a preview of the unsaved edits
  // of the edited operation
  private _previewRan = false;
  private _stepPickFrozen?: boolean;
  private _currentRunSubscription?: Subscription;

  /**
   * Reference to the snapshot rendition web component.
   * Using viewChild signal to handle conditionally rendered element -
   * the element only exists when result() is truthy.
   */
  public readonly renditionRef =
    viewChild<ElementRef<GveSnapshotRendition>>('rendition');

  /**
   * Reference to the operation editor expansion panel.
   * Using viewChild signal to handle conditionally rendered element -
   * the element only exists when editedOp() is truthy.
   */
  public readonly operationEditorPanelRef = viewChild<ElementRef>(
    'operationEditorPanel',
  );

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
   * The IDs of the features that are multi-valued. If a feature being
   * edited is in this list, the feature editor will allow adding multiple
   * values to it. Passed down to feature editors.
   */
  public readonly multiValuedFeatureIds = input<string[] | undefined>([
    'r_hints',
  ]);

  /**
   * The list of source IDs when it's a closed set. Passed down to the operation
   * source editor, which will show a dropdown to select from these IDs. When not
   * specified, the source ID can be freely typed in the source editor.
   */
  public readonly sourceIds = input<LabeledId[] | undefined>();

  /**
   * The list of source types when it's a closed set. Passed down to the operation
   * source editor, which will show a dropdown to select from these types. When not
   * specified, the source type can be freely typed in the source editor.
   */
  public readonly sourceTypes = input<LabeledId[] | undefined>();

  /**
   * Settings for rendering the snapshot. These are passed to the snapshot rendition
   * component.
   */
  public readonly renditionSettings =
    input<GveRenditionSettings>(DEFAULT_SETTINGS);

  /**
   * Maximum height for the operations list (default 50vh). The operations
   * list gets a vertical scrollbar when its content exceeds this height,
   * so that what is below it stays visible. The value should be a valid
   * CSS height value (e.g., '300px', '50vh'); empty for no limit.
   */
  public readonly opListMaxHeight = input<string | undefined>('50vh');

  /**
   * Maximum height for the base text in the text tab (default 50vh). The
   * text gets a vertical scrollbar when it exceeds this height. The value
   * should be a valid CSS height value; empty for no limit.
   */
  public readonly textMaxHeight = input<string | undefined>('50vh');

  /**
   * Emitted when the user cancels the snapshot editing.
   */
  public readonly snapshotCancel = output();

  /**
   * The editable draft: base text and operations, rebuilt from the bound
   * snapshot whenever it changes (including the echo of our own save: the
   * snapshot is saved only with an explicit action).
   */
  private readonly _draft = linkedSignal(() => toDraft(this.snapshot()));

  public readonly form = form(this._draft, (path) => {
    requiredArray(path.baseText);
  });

  /**
   * View options: feature details, and auto-run operations on edit.
   */
  public readonly options = form(
    signal({ featDetails: false, autoRun: false }),
  );

  public readonly chain = signal<CharChain | undefined>(undefined);

  /**
   * True when the base text panel is expanded. It starts expanded when the
   * bound snapshot has no base text, as entering it is the first thing to
   * do for a new snapshot.
   */
  public readonly baseTextExpanded = linkedSignal(
    () => !this.snapshot()?.text?.length,
  );

  /**
   * The keyboard shortcuts, for their labels in the UI.
   */
  public readonly shortcuts = GVE_SHORTCUTS;

  // the currently picked base text range
  public readonly textRange = signal<BaseTextRange | undefined>(undefined);
  // the lines count for the current base text
  public readonly lineCount = computed(() =>
    countLines(this.form.baseText().value()),
  );
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
  public readonly result = signal<CharChainResult | undefined>(undefined);
  public readonly resultOperationId = signal<string | undefined>(undefined);
  public readonly initialStepIndex = signal<number>(-1);

  /**
   * The text of the input version for the currently edited operation, i.e.
   * the version whose characters `at`/`run` (or their index-based
   * counterparts) refer to. This is fed to the operation editor's peephole
   * preview. It is resolved from the latest execution result, honoring the
   * operation's `inputTag` (which may point to any earlier version, not
   * necessarily the output of the operation preceding it in the list, since
   * chains can branch). When it cannot be resolved (e.g. nothing has been
   * run yet), this is undefined and the operation editor falls back to the
   * snapshot's base text.
   */
  public readonly editedOpPrecedingText = computed<CharNode[] | undefined>(
    () => {
      const op = this.editedOp();
      const result = this.result();
      if (!op || !result) {
        return undefined;
      }
      const tag = this.resolveOperationInputTag(
        op,
        this.editedOpIndex(),
        result,
      );
      return tag ? this.getVersionText(result, tag) : undefined;
    },
  );

  // operations batch editing for features: the range accepts
  // comma-separated N or N-M segments, e.g. "2, 5-7, 9"
  public readonly editFeatsForm = form(
    signal({ editFeatsRange: '' }),
    (path) => {
      required(path.editFeatsRange);
      pattern(path.editFeatsRange, /^(\d+(?:-\d+)?)(\s*,\s*\d+(?:-\d+)?)*$/);
    },
  );
  // the edited operations features (set when editing features of multiple
  // operations at once)
  public readonly operationFeats = signal<Feature[] | undefined>(undefined);
  // the ordinal numbers of all the operations whose features or sources
  // are being edited at once
  public readonly batchOpNumbers = signal<number[] | undefined>(undefined);
  // the display label for the current batch range (preserves original input)
  public readonly batchRangeLabel = signal<string | undefined>(undefined);
  // true when the batch editing targets sources instead of features
  public readonly batchForSource = signal<boolean>(false);

  public readonly peepholeWindowWidth = signal<number>(15);

  private readonly _flatLookup = new FlatLookupPipe();

  private readonly _api = inject(GveApiService);
  private readonly _dialog = inject(MatDialog);
  private readonly _dialogService = inject(DialogService);
  private readonly _snackbar = inject(MatSnackBar);

  constructor() {
    // set the peephole window width from the environment variable,
    // defaulting to 15 if not set
    const env = inject(EnvService);
    this.peepholeWindowWidth.set(
      parseInt(env.get('gvePeeperWidth', '15')!, 10),
    );

    // when snapshot changes (so the draft is rebuilt from it), reset the
    // form and run all operations. untracked prevents busy() and the draft
    // (read inside runToLast → runTo) from being tracked as dependencies,
    // which would cause re-runs each time the API call completes and resets
    // busy to false. The initial step index is not set here, but together
    // with the result once it arrives (see runTo).
    effect(() => {
      this.snapshot();
      untracked(() => {
        this._previewRan = false;
        this.form().reset();
        this.runToLast();
      });
    });

    // diagnostic logging for multiValuedFeatureIds
    effect(() => {
      console.log(
        '[SnapshotEditor] multiValuedFeatureIds:',
        this.multiValuedFeatureIds(),
      );
    });

    // when rendition element becomes available (conditionally rendered),
    // initialize its settings and event listeners. Keyed on the element only:
    // initRendition reads result(), renditionSettings() and debug(), and if
    // these were tracked every new result would add another listener. New
    // results are pushed by updateRendition, and settings changes by the
    // effect below.
    effect(() => {
      const rendition = this.renditionRef()?.nativeElement;
      if (rendition) {
        untracked(() => this.initRendition(rendition));
      }
    });

    // re-apply settings whenever the renditionSettings input changes (e.g. loaded
    // asynchronously from the backend after the first render already completed)
    effect(() => {
      // reading renditionSettings() tracks it as a dependency
      this.renditionSettings();
      const rendition = this.renditionRef()?.nativeElement;
      if (rendition) {
        this.applyRenditionSettings();
      }
    });

    // when operation editor panel becomes available, scroll it into view
    effect(() => {
      const panel = this.operationEditorPanelRef()?.nativeElement;
      if (panel && this.editedOp()) {
        // use setTimeout to ensure the panel is fully rendered and the Material
        // expansion animation completes (takes ~200-300ms) before scrolling
        setTimeout(() => {
          const panelElement = this.operationEditorPanelRef()?.nativeElement;
          if (panelElement) {
            panelElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 350);
      }
    });
  }

  /**
   * Initialize rendition settings and event listeners when the element becomes available.
   * Called via effect since the element is conditionally rendered.
   */
  private initRendition(rendition: GveSnapshotRendition): void {
    console.log('GveSnapshotRendition.version:', GveSnapshotRendition.version);

    // set initial settings
    this.applyRenditionSettings();

    // Push data immediately if already available. updateRendition() is called
    // synchronously after result.set() in runTo(), but at that moment the @if
    // block hasn't yet been added to the DOM (zoneless CD is asynchronous).
    // This call recovers from that missed push once the element is actually live.
    const result = this.result();
    if (result) {
      this.pushRenditionData(rendition, result);
    }

    // listen to version change events
    rendition.addEventListener('versionTagChange', (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Version changed:', customEvent.detail);
    });
  }

  /**
   * Apply settings to the rendition component.
   */
  private applyRenditionSettings(): void {
    const rendition = this.renditionRef()?.nativeElement;
    if (!rendition) {
      return;
    }

    // copy the settings rather than mutating the input value, which
    // by default is the shared DEFAULT_SETTINGS object
    rendition.settings = {
      ...this.renditionSettings(),
      debug: this.debug() || false,
    };
  }

  /**
   * Update the snapshot rendition component with the current result data.
   */
  private updateRendition(): void {
    const rendition = this.renditionRef()?.nativeElement;
    const result = this.result();
    if (rendition && result) {
      // update settings with latest rendition settings
      this.applyRenditionSettings();
      this.pushRenditionData(rendition, result);
    }
  }

  /**
   * Set the rendition data from the specified result, supplying the base
   * text (not returned by the API, must be provided by the caller). The
   * result is copied rather than mutated, as it is the same object held by
   * the result signal and shared with the result view.
   */
  private pushRenditionData(
    rendition: GveSnapshotRendition,
    result: CharChainResult,
  ): void {
    // untracked: the base text must not become a dependency of an
    // effect calling this method
    const data = { ...result, text: untracked(this.form.baseText().value) };
    // gve-snapshot-rendition still types data with the old CharChainResult
    // (taggedNodes). Cast until the package is updated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rendition.data = data as any;
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

  // #region base text
  public inputBaseText(): void {
    if (this.busy()) {
      return;
    }

    const dialogRef = this._dialog.open(SnapshotTextEditorComponent, {
      data: { payload: { text: [...this.form.baseText().value()] } },
      width: '80%',
    });

    dialogRef.afterClosed().subscribe((text: CharNode[]) => {
      if (text?.length) {
        // update the base text and reset the current text range
        this.form.baseText().value.set(text);
        this.form.baseText().markAsDirty();
        this.textRange.set(undefined);

        // remove all operations and update the view data
        this.removeAllOperations();
      }
    });
  }

  /**
   * Copy the base text, as plain text, to the clipboard.
   */
  public copyBaseText(): void {
    const text = this.form
      .baseText()
      .value()
      .map((c) => c.data)
      .join('');
    if (!text) {
      return;
    }
    navigator.clipboard.writeText(text).then(
      () =>
        this._snackbar.open('Base text copied to clipboard', 'OK', {
          duration: 3000,
        }),
      () => this._snackbar.open('Error copying base text to clipboard', 'OK'),
    );
  }

  /**
   * Handle the keyboard shortcuts of this editor. They are ignored while
   * a dialog is open (e.g. the base text editor), and when they would not
   * be available from the UI.
   */
  public onDocumentKeydown(event: KeyboardEvent): void {
    if (this._dialog.openDialogs?.length) {
      return;
    }
    if (isGveShortcut(event, GVE_SHORTCUTS.newOperation)) {
      event.preventDefault();
      // as its button, but never replacing an operation being edited,
      // which would silently lose its unsaved changes
      if (
        !this.busy() &&
        this.form.baseText().value().length &&
        !this.editedOp()
      ) {
        this.editNewOperation();
      }
    } else if (isGveShortcut(event, GVE_SHORTCUTS.runAll)) {
      event.preventDefault();
      if (this.form.operations().value().length) {
        this.runToLast();
      }
    }
  }

  /**
   * Warn the user about the steps of the specified result whose input tag
   * refers to a version which does not exist at their point of the chain:
   * their output is empty, which might otherwise look like a glitch.
   */
  private warnUnknownInputTags(result?: CharChainResult): void {
    if (!result) {
      return;
    }
    const indexes = [...getUnknownInputStepIndexes(result.steps)];
    if (!indexes.length) {
      return;
    }
    const list = indexes
      .map((i) => {
        const step = result.steps[i];
        return `${i + 1}. ${step.operation.id} (${step.inputTag})`;
      })
      .join(', ');
    this._snackbar.open(
      `Unknown input version in operation(s) ${list}: their output is ` +
        'empty. Check their input tags.',
      'OK',
    );
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
    this.discardPreview();

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
    if (index !== this.editedOpIndex()) {
      this.discardPreview();
    }
    this.editedOpIndex.set(index);
    this.editedOp.set(structuredClone(this.form.operations().value()[index]));
  }

  /**
   * Build the tooltip text listing the human-friendly names of the given
   * operation's sources, space-separated.
   * @param sources The operation's sources.
   */
  public sourcesTooltip(sources: OperationSource[] | undefined): string {
    if (!sources?.length) {
      return '';
    }
    return sources
      .map((s) => this._flatLookup.transform(s.id, this.sourceIds(), 'id', 'label'))
      .join(' ');
  }

  /**
   * Parse a range string into a sorted array of 1-based operation ordinal
   * numbers. Accepts comma-separated segments where each segment is either
   * a single number N or a range N-M (N ≤ M). Returns null when any segment
   * is syntactically invalid or out of bounds.
   */
  private parseOpRange(rangeStr: string): number[] | null {
    const total = this.form.operations().value().length;
    const parts = rangeStr.split(',').map((p) => p.trim());
    const numbers = new Set<number>();
    for (const part of parts) {
      const m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) return null;
      const from = parseInt(m[1], 10);
      const to = m[2] ? parseInt(m[2], 10) : from;
      if (from < 1 || to > total || from > to) return null;
      for (let n = from; n <= to; n++) numbers.add(n);
    }
    return [...numbers].sort((a, b) => a - b);
  }

  /**
   * Open a feature set editor to edit all features of the operations
   * specified by the editFeatsRange form control value.
   * Supports comma-separated segments like "2, 5-7, 9".
   */
  public editOperationsFeats() {
    if (this.editFeatsForm().invalid()) {
      this.editFeatsForm.editFeatsRange().markAsTouched();
      return;
    }

    const rangeValue = this.editFeatsForm.editFeatsRange().value();
    const opNumbers = this.parseOpRange(rangeValue);
    if (!opNumbers) {
      return;
    }

    this.batchOpNumbers.set(opNumbers);
    this.batchRangeLabel.set(rangeValue.replace(/\s+/g, ''));
    this.operationFeats.set([]);
  }

  public saveOperationsFeats(features: Feature[]): void {
    const opNumbers = this.batchOpNumbers();
    if (!opNumbers) {
      return;
    }
    const operations = [...this.form.operations().value()];
    for (const opNumber of opNumbers) {
      const op = operations[opNumber - 1];
      // just add features to the existing ones, without touching existing
      // features; replace the operation object instead of mutating it, as
      // it might be shared with the snapshot received as input
      operations[opNumber - 1] = {
        ...op,
        features: [...(op.features || []), ...features],
      };
    }
    this.setOperations(operations);

    this.closeOperationFeats();
  }

  public editOperationSources() {
    if (this.editFeatsForm().invalid()) {
      this.editFeatsForm.editFeatsRange().markAsTouched();
      return;
    }

    const rangeValue = this.editFeatsForm.editFeatsRange().value();
    const opNumbers = this.parseOpRange(rangeValue);
    if (!opNumbers) {
      return;
    }

    this.batchOpNumbers.set(opNumbers);
    this.batchRangeLabel.set(rangeValue.replace(/\s+/g, ''));
    this.batchForSource.set(true);
  }

  public saveOperationSources(source: OperationSource | undefined): void {
    if (!source) {
      return;
    }
    // add source to all operations in range
    const opNumbers = this.batchOpNumbers();
    if (!opNumbers) {
      return;
    }
    const operations = [...this.form.operations().value()];
    for (const opNumber of opNumbers) {
      const op = operations[opNumber - 1];
      operations[opNumber - 1] = {
        ...op,
        sources: [...(op.sources || []), source],
      };
    }
    this.setOperations(operations);

    this.closeOperationSources();
  }

  public closeOperationFeats(): void {
    this.batchOpNumbers.set(undefined);
    this.operationFeats.set(undefined);
    this.batchRangeLabel.set(undefined);
  }

  public closeOperationSources(): void {
    this.batchOpNumbers.set(undefined);
    this.batchForSource.set(false);
    this.batchRangeLabel.set(undefined);
  }

  /**
   * Close the currently edited operation.
   */
  private closeEditedOperation() {
    this.editedOpIndex.set(-1);
    this.editedOp.set(undefined);
  }

  /**
   * Run all the operations, selecting the step of the operation at the
   * specified index in the result view. So, the result view shows the
   * operation of interest, while both the result view and the rendition
   * get the whole chain.
   * @param index The index of the operation whose step is to be selected.
   */
  private runAllSelecting(index: number): void {
    const count = this.form.operations().value().length;
    if (count) {
      this.runTo(count - 1, undefined, index);
    }
  }

  /**
   * If the current result comes from a preview of the unsaved edits of the
   * edited operation, run the saved operations again, so that the result
   * view and the rendition do not keep showing edits which were not saved.
   * Call this before leaving the edited operation.
   */
  private discardPreview(): void {
    if (!this._previewRan) {
      return;
    }
    this._previewRan = false;
    const index = this.editedOpIndex();
    if (index > -1 && index < this.form.operations().value().length) {
      this.runAllSelecting(index);
    }
  }

  /**
   * Handle the event fired by the operation editor to cancel
   * the current operation edits.
   */
  public onOperationCancel() {
    this.discardPreview();
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
    const operations = [...this.form.operations().value()];

    // replace or add the operation
    let i = this.editedOpIndex();
    if (this.editedOpIndex() > -1) {
      operations.splice(this.editedOpIndex(), 1, op);
    } else {
      operations.push(op);
      i = operations.length - 1;
    }

    // update the operations form control
    this.setOperations(operations);

    // run all the operations, selecting the edited one, if auto-run is
    // enabled, or if the current result comes from a preview (auto-run
    // might have been disabled after it): the result must reflect the saved
    // operation. All the operations are run, so that the result view and the
    // rendition get the whole chain, including the operations after it.
    if (this.options.autoRun().value() || this._previewRan) {
      this.runAllSelecting(i);
    }

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
        `Delete operation "${this.form.operations().value()[index].id}"?`,
      )
      .subscribe((yes: boolean) => {
        if (yes) {
          // close the edited operation if it is the one being deleted,
          // else keep its index in sync
          if (this.editedOpIndex() === index) {
            this.closeEditedOperation();
          } else if (this.editedOpIndex() > index) {
            this.editedOpIndex.set(this.editedOpIndex() - 1);
          }
          // reset the result operation ID if it is the one being deleted
          if (this.resultOperationId() === this.form.operations().value()[index].id) {
            this.resultOperationId.set(undefined);
          }
          // delete the operation and update the form control
          const operations = [...this.form.operations().value()];
          operations.splice(index, 1);
          this.setOperations(operations);

          // update the view data
          setTimeout(() => {
            this.runToLast();
          }, 0);
        }
      });
  }

  /**
   * Duplicate the operation at the specified index, inserting the copy
   * immediately after the original.
   * @param index The index of the operation to duplicate.
   */
  public duplicateOperation(index: number): void {
    const operations = [...this.form.operations().value()];
    const clone = structuredClone(operations[index]);
    clone.id = this._nanoid();
    operations.splice(index + 1, 0, clone);
    if (this.editedOpIndex() > index) {
      this.editedOpIndex.set(this.editedOpIndex() + 1);
    }
    this.setOperations(operations);
  }

  /**
   * Keep the edited operation index in sync when the operations at the
   * specified indexes are swapped.
   */
  private swapEditedOpIndex(a: number, b: number): void {
    if (this.editedOpIndex() === a) {
      this.editedOpIndex.set(b);
    } else if (this.editedOpIndex() === b) {
      this.editedOpIndex.set(a);
    }
  }

  /**
   * Move the operation at the specified index up by one position.
   * @param index The index of the operation to move up.
   */
  public moveOperationUp(index: number): void {
    if (index < 1) {
      return;
    }
    const operations = [...this.form.operations().value()];
    const op = operations.splice(index, 1)[0];
    operations.splice(index - 1, 0, op);
    this.swapEditedOpIndex(index, index - 1);
    this.setOperations(operations);
  }

  /**
   * Move the operation at the specified index down by one position.
   * @param index The index of the operation to move down.
   */
  public moveOperationDown(index: number): void {
    const operations = [...this.form.operations().value()];
    if (index >= operations.length - 1) {
      return;
    }
    const op = operations.splice(index, 1)[0];
    operations.splice(index + 1, 0, op);
    this.swapEditedOpIndex(index, index + 1);
    this.setOperations(operations);
  }

  public copyOperationsJson() {
    if (!this.form.operations().value().length || this.busy()) {
      return;
    }
    const json = JSON.stringify(
      { text: this.form.baseText().value(), operations: this.form.operations().value() },
      null,
      2,
    );
    navigator.clipboard.writeText(json).then(() => {
      this._snackbar.open('JSON copied to clipboard', 'OK', {
        duration: 3000,
      });
    });
  }

  public copyOperationsDsl() {
    if (!this.form.operations().value().length || this.busy()) {
      return;
    }
    const operations = this.form.operations().value();
    this._api.getDsl(operations).subscribe({
      next: (dsl: ResultWrapper<string[]>) => {
        if (dsl.result) {
          // the DSL has 1 operation per line, and it has no escape for line
          // feeds: values including them cannot be pasted back as a batch
          const withLf = getOperationsWithLineFeeds(operations);
          navigator.clipboard.writeText(dsl.result.join('\n')).then(
            () => {
              if (withLf.length) {
                this._snackbar.open(
                  `Operations DSL copied, but operation(s) ${withLf.join(', ')} ` +
                    'have values with line feeds: the DSL cannot represent ' +
                    'them, so they would not parse back.',
                  'OK',
                );
              } else {
                this._snackbar.open('Operations DSL copied to clipboard', 'OK', {
                  duration: 3000,
                });
              }
            },
            () => this._snackbar.open('Error copying DSL to clipboard', 'OK'),
          );
        }
      },
      error: (error) => {
        console.error('Error getting DSL:', error);
        this._snackbar.open('Error getting DSL', 'OK');
      },
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

    // the dialog expects its data in a payload
    const dialogRef = this._dialog.open(BatchOperationEditorComponent, {
      data: { payload: { preset: this.batchOps() } },
      minWidth: '600px',
    });

    dialogRef.afterClosed().subscribe((batchOps: CharChainOperation[]) => {
      if (batchOps) {
        const operations = [...this.form.operations().value()];
        operations.push(...batchOps);
        this.setOperations(operations);
        // update the view data
        setTimeout(() => {
          this.runToLast();
        }, 0);
      }
    });
  }

  /**
   * Set the operations, marking them as changed.
   */
  private setOperations(operations: CharChainOperation[]): void {
    this.form.operations().value.set(operations);
    this.form.operations().markAsDirty();
  }

  /**
   * Remove all the operations, close the edited operation and update the view data.
   */
  private removeAllOperations(): void {
    this._previewRan = false;
    this.resultOperationId.set(undefined);
    this.closeEditedOperation();
    this.setOperations([]);
    this.setViewData();
    this.result.set(undefined);
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
   * Resolve the tag of the input version for the given operation, i.e. the
   * version its `at`/`run` (or their index-based counterparts) refer to.
   *
   * The chain is not necessarily linear: an operation's input tag can point
   * to any earlier version, not just the output of the operation preceding
   * it in the list. So this first looks up the operation among the steps of
   * the given (already executed) result, which carries the tag the backend
   * actually resolved for it — this is authoritative and correctly accounts
   * for branching. It falls back to the operation's own `inputTag` when that
   * tag is known to the result, and finally, when `inputTag` is blank
   * (meaning "latest"), to the resolved output tag of the operation
   * preceding it in the list (or the base text, for the first operation).
   *
   * @param op The operation whose input tag is to be resolved.
   * @param index The operation's index in the list, or -1 for a new,
   * not yet appended operation.
   * @param result The latest operations execution result.
   * @returns The resolved input tag, or undefined when it cannot be
   * determined from the given result.
   */
  private resolveOperationInputTag(
    op: CharChainOperation,
    index: number,
    result: CharChainResult,
  ): string | undefined {
    const step = result.steps.find((s) => s.operation.id === op.id);
    if (step) {
      return step.inputTag;
    }

    if (op.inputTag && result.versionNodeIds[op.inputTag]) {
      return op.inputTag;
    }

    const precedingIndex =
      index > -1 ? index - 1 : this.form.operations().value().length - 1;
    if (precedingIndex < 0) {
      return 'v0';
    }

    const precedingOp = this.form.operations().value()[precedingIndex];
    if (!precedingOp) {
      return 'v0';
    }
    const precedingStep = result.steps.find(
      (s) => s.operation.id === precedingOp.id,
    );
    if (precedingStep) {
      return precedingStep.outputTag;
    }
    if (precedingOp.outputTag && result.versionNodeIds[precedingOp.outputTag]) {
      return precedingOp.outputTag;
    }
    return undefined;
  }

  /**
   * Build the ordered list of character nodes making up the given version
   * tag, by looking up its node IDs in `versionNodeIds` and resolving each
   * one against `nodes`.
   *
   * @param result The operations execution result.
   * @param tag The version tag to build the text for.
   * @returns The version's text, or undefined when the tag is unknown.
   */
  private getVersionText(
    result: CharChainResult,
    tag: string,
  ): CharNode[] | undefined {
    const ids = result.versionNodeIds[tag];
    if (!ids) {
      return undefined;
    }
    const nodeMap = new Map<number, CharNode>(
      result.nodes.map((n) => [n.id, n]),
    );
    const nodes: CharNode[] = [];
    for (const id of ids) {
      const node = nodeMap.get(id);
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
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
    // belongs to new nodes added by operations
    const maxOriginalId = nodes.reduce((max, n) => Math.max(max, n.id), 0);
    const stepIndex = result.steps.findIndex((s) => s.outputTag === tag);

    // build a map from node ID to the result node for O(1) lookup
    const nodeMap = new Map<number, CharNode>(
      result.nodes.map((n) => [n.id, n]),
    );

    // for each step up to the specified one, add the nodes introduced by the step
    // and update the features from each step node that is already present
    for (let i = 0; i <= stepIndex; i++) {
      const versionTag = result.steps[i].outputTag;
      const versionNodeIds = result.versionNodeIds[versionTag] ?? [];

      for (const nodeId of versionNodeIds) {
        const resultNode = nodeMap.get(nodeId);
        if (!resultNode) continue;

        if (nodeId > maxOriginalId && !nodes.find((n) => n.id === nodeId)) {
          // node was added by an operation — append it
          nodes.push(resultNode);
        } else {
          // node already exists — update its features
          const existing = nodes.findIndex((n) => n.id === nodeId);
          if (existing > -1) {
            nodes[existing].features = resultNode.features;
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
   * @param stepIndex The index of the step to select in the result view
   * once the result arrives. Default is index, i.e. the last executed
   * operation; it is clamped to 0-index.
   */
  public runTo(
    index: number,
    lastOperation?: CharChainOperation,
    stepIndex = index,
  ): void {
    // an invalid index must not cancel a valid in-flight run (nor throw
    // after cancelling it)
    const count = this.form.operations().value().length;
    if (index < 0 || index >= count) {
      console.warn(`runTo: invalid operation index ${index} (count ${count})`);
      return;
    }

    // Cancel any in-flight run so new data always wins over stale requests.
    // The old busy() guard silently dropped new requests while the API was
    // still responding, causing the component to freeze on rapid edits.
    if (this._currentRunSubscription) {
      this._currentRunSubscription.unsubscribe();
      this._currentRunSubscription = undefined;
      this.busy.set(false);
    }
    console.log('run to: ' + index);

    // a preview run replaces the edited operation with its unsaved
    // version; any other run shows saved operations only
    this._previewRan = !!lastOperation;

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

    // update result operation ID: the operation of the step to select
    stepIndex = Math.max(0, Math.min(stepIndex, index));
    this.resultOperationId.set(snapshot.operations[stepIndex].id);

    // run the operations. The initial step index is set only together with
    // the result it refers to: setting it now would make the result view
    // select the step at this index in the previous result while the request
    // is pending (or forever, if it fails), showing a wrong or empty text.
    this.busy.set(true);
    this._currentRunSubscription = this._api
      .runOperations(snapshot.text as CharNode[], snapshot.operations)
      .subscribe({
        next: (wrapper) => {
          // handle operation (non-fatal) error or result
          if (wrapper.error) {
            this._snackbar.open(wrapper.error, 'OK');
            return;
          }

          // set the result, and the step to select in it
          console.log('result:', wrapper.result);
          this.initialStepIndex.set(stepIndex);
          this.result.set(wrapper.result);
          this.warnUnknownInputTags(wrapper.result);

          // update the rendition component; note that when result() transitions
          // from undefined→truthy the @if element may not yet be in the DOM
          // (zoneless CD is async). initRendition() will recover the missed push
          // once Angular inserts the element.
          this.updateRendition();

          // supply the last operation output tag from its result step if not set
          // (on the local copy only: a previewed operation is not stored)
          const outputTag =
            lastOperation.outputTag ||
            wrapper.result!.steps.find(
              (s) => s.operation.id === lastOperation.id,
            )?.outputTag;
          if (!outputTag) {
            return;
          }

          // update the snapshot text nodes with those introduced by operations
          this.supplyOpNodes(snapshot, wrapper.result!, outputTag);

          // update the view data
          this.setViewData(snapshot, outputTag);
        },
        error: (error) => {
          console.error(error);
          this._snackbar.open('Error running operations', 'OK');
          this._currentRunSubscription = undefined;
          this.busy.set(false);
        },
        complete: () => {
          this._currentRunSubscription = undefined;
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
    if (this.form.operations().value().length) {
      this.runTo(this.form.operations().value().length - 1);
    } else {
      this._previewRan = false;
      this.setViewData();
      this.result.set(undefined);
    }
  }

  /**
   * Update the snapshot view by running the operations up to the
   * currently edited operation if any.
   *
   * @param operation The operation being previewed.
   */
  public onOperationPreview(operation: CharChainOperation): void {
    // no multiple previews or previewing a new operation or auto-run disabled
    if (this._previewing || this.editedOpIndex() < 0 || !this.options.autoRun().value()) {
      return;
    }
    // capture the edited operation at request time: by the time the
    // deferred run starts, the user might have saved or cancelled it, or
    // moved to another operation; the preview would then run with index
    // -1, or replace another operation with this one
    const index = this.editedOpIndex();
    this._previewing = true;
    setTimeout(() => {
      this._previewing = false;
      if (
        this.editedOpIndex() !== index ||
        this.editedOp()?.id !== operation.id
      ) {
        return;
      }
      this.runTo(index, operation);
    }, 0);
  }
  // #endregion

  /**
   * Handle the event fired by the chain result view to pick a step.
   *
   * @param step The step to pick.
   */
  public onStepPick(step: ChainOperationContextStep): void {
    const result = this.result();
    if (!result || this._stepPickFrozen) {
      return;
    }

    // get base text snapshot
    const snapshot = this.getSnapshot();

    // get the step index
    const index = snapshot.operations.findIndex(
      (o) => o.id === step.operation.id,
    );
    if (index === -1) {
      return;
    }

    // remove snapshot operations after the picked step to avoid
    // their visuals creep into the snapshot view
    snapshot.operations = snapshot.operations.slice(0, index + 1);

    // update result operation ID
    this.resultOperationId.set(snapshot.operations[index].id);

    // update the snapshot text nodes with those introduced by operations
    this.supplyOpNodes(snapshot, result, step.outputTag);

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
      text: structuredClone(this.form.baseText().value()),
      operations: structuredClone(this.form.operations().value()),
    };

    return snapshot;
  }

  /**
   * Get a snapshot from the form data and emit it
   * in the snapshot change event.
   */
  /**
   * Handle Enter in the operations range input: edit the features of the
   * operations in range, like the implicit form submission this component
   * used to rely on.
   */
  public onRangeEnter(event: Event): void {
    // never let Enter reach an implicit submission of an outer form
    event.preventDefault();
    this.editOperationsFeats();
  }

  public save(): void {
    if (this.form().invalid() || this.noSave()) {
      return;
    }
    this.snapshot.set(this.getSnapshot());
  }
}

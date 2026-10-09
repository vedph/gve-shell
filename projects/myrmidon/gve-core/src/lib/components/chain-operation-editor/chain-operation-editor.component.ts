import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { form, FormField, min, required } from '@angular/forms/signals';

// material
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

// vendor
import { customAlphabet } from 'nanoid';

// myrmidon
import { FlatLookupPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';

// local
import {
  CharChainOperation,
  CharNode,
  Feature,
  OperationFeature,
  OperationType,
  OperationSource,
  Snapshot,
  LabeledId,
} from '../../models';
import { FeatureSetEditorComponent } from '../feature-set-editor/feature-set-editor.component';
import { OperationSourceEditorComponent } from '../operation-source-editor/operation-source-editor.component';
import { SvgValidators } from '../../validators/svg-validators';
import {
  FeatureMap,
  FeaturePropMap,
} from '../feature-editor/feature-editor.component';
import { BaseTextRange } from '../base-text-view/base-text-view.component';
import {
  TextPeepholeComponent,
  OpTextRange,
} from '../text-peephole/text-peephole.component';
import { GveBaseTextService } from '../../services/gve-base-text.service';
import { debounceUntilDestroyed } from '../../utils/debounce-until-destroyed';

/**
 * The editable shape behind the operation form.
 */
interface OperationControls {
  // general
  rank: number | null;
  groupId: string;
  features: OperationFeature[];
  sources: OperationSource[];
  type: OperationType;
  at: number | null;
  atAsIndex: boolean;
  to: number | null;
  toAsIndex: boolean;
  inputTag: string;
  outputTag: string;
  run: number | null;
  toRun: number | null;
  value: string;
  // svg
  svg: string;
  // elements
  elementFeatures: Record<string, Feature[]>;
  // diplomatic
  newTextHidden: boolean;
  dpFeatures: Feature[];
}

/**
 * Get which arguments are used by the specified operation type.
 */
function getOperationArgs(type: OperationType): {
  to: boolean;
  toRun: boolean;
  value: boolean;
} {
  switch (type) {
    case OperationType.moveAfter:
    case OperationType.moveBefore:
      return { to: true, toRun: false, value: false };
    case OperationType.swap:
      return { to: true, toRun: true, value: false };
    case OperationType.addAfter:
    case OperationType.addBefore:
    case OperationType.replace:
      return { to: false, toRun: false, value: true };
    default:
      return { to: false, toRun: false, value: false };
  }
}

/**
 * Toggle the escape of line feeds in the specified text. As the value
 * is edited in a single-line input, LF characters are represented
 * there by backslashes.
 *
 * @param text The text.
 * @param on True to escape LF (LF to backslash), false to unescape it
 * (backslash to LF).
 * @returns The text.
 */
function toggleLfEscape(
  text: string | null | undefined,
  on: boolean,
): string | null | undefined {
  if (!text) return text;
  return on ? text.replace(/\n/g, '\\') : text.replace(/\\/g, '\n');
}

/**
 * Bound operation -> editable draft. The arguments not used by the
 * operation's type are reset. Features and sources are deep-copied, so that
 * the form never tags the caller's objects with its identity symbols.
 */
function toDraft(operation: CharChainOperation | undefined): OperationControls {
  const type = operation?.type ?? OperationType.annotate;
  const args = getOperationArgs(type);
  return {
    rank: operation?.rank || 0,
    groupId: operation?.groupId || '',
    features: structuredClone(operation?.features || []),
    sources: structuredClone(operation?.sources || []),
    type,
    at: operation?.at ?? 0,
    atAsIndex: operation?.atAsIndex || false,
    to: args.to ? operation?.to || 0 : 0,
    toAsIndex: operation?.toAsIndex || false,
    inputTag: operation?.inputTag || '',
    outputTag: operation?.outputTag || '',
    run: operation?.run ?? 0,
    toRun: args.toRun ? operation?.toRun || 0 : 0,
    // escape line feeds in value for editing
    value: args.value ? toggleLfEscape(operation?.value, true) || '' : '',
    svg: '',
    elementFeatures: {},
    newTextHidden: false,
    dpFeatures: [],
  };
}

/**
 * Editable draft -> operation. Features and sources are deep-copied:
 * structuredClone drops the identity symbols the form tags array items with,
 * which an object spread would copy.
 */
function toOperation(v: OperationControls, id: string): CharChainOperation {
  return {
    rank: v.rank || undefined,
    groupId: v.groupId || undefined,
    features: v.features.length ? structuredClone(v.features) : undefined,
    sources: v.sources.length ? structuredClone(v.sources) : undefined,
    id,
    type: v.type,
    at: v.at!,
    atAsIndex: v.atAsIndex || undefined,
    to: v.to || undefined,
    toAsIndex: v.toAsIndex || undefined,
    inputTag: v.inputTag || undefined,
    outputTag: v.outputTag || undefined,
    run: v.run!,
    toRun: v.toRun || undefined,
    // un-escape line feeds in value for storage
    value: toggleLfEscape(v.value, false) || undefined,
  };
}

/**
 * Definitions for features, including names and values.
 */
export interface FeatureDefinitions {
  /**
   * The list of feature names to display in the name selection.
   * This is used when you have a closed list of features.
   */
  names?: LabeledId[];

  /**
   * The feature values map. When specified and the user selects a feature
   * name present in the map keys, the corresponding values will be used
   * to populate the value selection.
   */
  values?: FeatureMap;
  /**
   * The feature properties map. When specified and the user selects a
   * feature name present in the map keys, the corresponding properties
   * will be used to populate the form controls for set policy, negation,
   * global, and short-lived. This allows presetting these properties
   * for specific features without hardcoding that logic in the component.
   */
  props?: FeaturePropMap;
}

/**
 * 🔑 `gve-chain-operation-editor`
 *
 * A component for editing a variant generation operation.
 * Used by the `gve-snapshot-editor` component.
 * - ▶️ `operation` (`CharChainOperation`): the operation to edit.
 * - ▶️ `snapshot` (`Snapshot`): the snapshot the operation refers to.
 * - ▶️ `hidePreview` (`boolean`): whether to hide the preview request button.
 * - ▶️ `sourceIds` (`LabeledId[]`): the list of source IDs, when using a closed list.
 * - ▶️ `sourceTypes` (`LabeledId[]`): the list of source types, when using a closed list.
 * - ▶️ `featureDefs` (`FeatureDefinitions`): definitions for features, including
 * names, values, and properties.
 * - ▶️ `rangePatch` (`BaseTextRange`): when set, the edited operation's text
 * range (at and run) will be patched with the provided one.
 * - ▶️ `precedingText` (`CharNode[]`): the text resulting from running the
 * operations preceding the edited one, i.e. this operation's input text.
 * Used to feed the at/run peephole preview. When not provided (e.g. not
 * yet computed), the snapshot's base text is used instead.
 * - 🔥 `operationChange` (`CharChainOperation`): emitted when the operation
 * is changed.
 * - 🔥 `operationPreview` (`CharChainOperation`): emitted when the operation
 * preview is requested.
 * - 🔥 `operationCancel` (`void`): emitted when operation editing is cancelled.
 *
 * The editor is composed of many sections:
 * - **general**:
 *  - ID: each operation has an ID, automatically assigned. This is not used in
 * the context of the operation or of its transformations, but is provided as a
 * reference.
 *  - at and run: coordinates for the selection of the base text targeted by
 * this operation. Check `idx` when `at` is index-based rather than ID-based.
 *  - to and to-run: a second coordinate, used by some operations.
 *  - value: the text value argument, for those operations requiring it.
 *  - rank and group ID.
 *  - input and output tags.
 *  - features. These are metadata attached to this operation, and can be any
 * type of name=value pairs.
 * - **sources**: sources are a special type of metadata used when your text
 * versions come from more than a single source. In this case, you can specify
 * the source(s) for each operation, just like in a traditional apparatus you
 * specify witnesses for each variant. Each source has an ID, a type, a
 * probability rank (0=not specified, else 1-N), and an optional free text note.
 * - **diplomatic**: SVG `g` code. The diplomatic section is the approximate
 * diplomatic representation of the layout of the annotated text. It essentially
 * consists in a freely editable SVG code, always grouped into a single root `g`
 * element, encoding all the graphical traits representing this operation.
 * The visual part of each operation can be placed everywhere on the snapshot,
 * as specified by its coordinates.
 * - **elements**: features of any of the SVG code elements having an ID.
 * The elements section lists all the SVG elements having an `id` attribute in
 * the SVG code of the diplomatic section. The ID allows you to attach
 * any number of features (metadata modeled as name=value pairs) to each of
 * these elements. Among these features, you may use `style` or `class` for
 * renditional purposes, and any other name for your own metadata. Note that
 * element IDs will be required also when dealing with animations. So, ensure
 * to assign an ID to each element you want to animate.
 * - **dp feats**: diplomatic features: these are features (metadata modeled
 * as name=value pairs) for the diplomatic representation of this operation
 * as a whole.
 */
@Component({
  selector: 'gve-chain-operation-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    ClipboardModule,
    MatBadgeModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    FeatureSetEditorComponent,
    OperationSourceEditorComponent,
    TextPeepholeComponent,
    FlatLookupPipe,
  ],
  templateUrl: './chain-operation-editor.component.html',
  styleUrl: './chain-operation-editor.component.css',
})
export class ChainOperationEditorComponent {
  private readonly _nanoid = customAlphabet('1234567890abcdef', 10);

  /**
   * The operation to edit.
   */
  public readonly operation = model<CharChainOperation | undefined>();

  /**
   * The snapshot the operation refers to.
   */
  public readonly snapshot = input<Snapshot | undefined>();

  /**
   * Whether to hide the preview request button.
   */
  public readonly hidePreview = input<boolean | undefined>();

  /**
   * Definitions for features, including names, values, and properties.
   */
  public readonly featureDefs = input<FeatureDefinitions | undefined>();

  /**
   * Set when the edited operation's text range is to be patched.
   */
  public readonly rangePatch = input<BaseTextRange | undefined>();

  /**
   * The text resulting from running the operations preceding the edited
   * one, i.e. this operation's input text. Used to feed the at/run
   * peephole preview shown next to the run field. When not provided
   * (e.g. not yet computed), the snapshot's base text is used instead.
   */
  public readonly precedingText = input<CharNode[] | undefined>();

  /**
   * The IDs of the features that are multi-valued. If a feature being
   * edited is in this list, the feature editor will allow adding multiple
   * values to it. Passed down to feature editors.
   */
  public readonly multiValuedFeatureIds = input<string[] | undefined>([
    'r_hints',
  ]);

  /**
   * The list of source IDs when it's a closed set.
   */
  public readonly sourceIds = input<LabeledId[] | undefined>();

  /**
   * The list of source types when it's a closed set.
   */
  public readonly sourceTypes = input<LabeledId[] | undefined>();

  /**
   * The 1-based ordinal number of the edited operation among its siblings
   * in the chain. Used to enable/disable the previous/next navigation
   * buttons and to compute the requested ordinal when they are clicked.
   */
  public readonly operationOrdinal = input<number | undefined>();

  /**
   * The total number of operations in the chain the edited operation
   * belongs to. Used together with `operationOrdinal` to enable/disable
   * the previous/next navigation buttons.
   */
  public readonly operationCount = input<number | undefined>();

  /**
   * Emitted when the operation preview is requested.
   */
  public readonly operationPreview = output<CharChainOperation>();

  /**
   * Emitted when operation editing is cancelled.
   */
  public readonly operationCancel = output();

  /**
   * Emitted when the user asks to edit another operation of the chain via
   * the previous/next navigation buttons. The parent component should
   * handle this by loading the operation at the requested 1-based ordinal
   * number into this editor.
   */
  public readonly operationOrdinalRequest = output<number>();

  public readonly tabIndex = signal<number>(0);
  // elements parsed from SVG and having an id attribute;
  // we can attach features to each of these elements
  public readonly elements = signal<SVGElement[]>([]);
  public readonly editedElementId = signal<string | undefined>(undefined);
  // source
  public readonly editedSource = signal<OperationSource | undefined>(undefined);
  public readonly editedSourceIndex = signal<number>(-1);

  public readonly peepholeWindowWidth = input<number>(15);

  /**
   * The text to feed the at/run peephole preview: the preceding text
   * (this operation's input) when available, otherwise the snapshot's
   * base text.
   */
  public readonly peepholeText = computed<CharNode[]>(() => {
    const preceding = this.precedingText();
    if (preceding?.length) {
      return preceding;
    }
    const snapshot = this.snapshot();
    if (!snapshot?.text) {
      return [];
    }
    return Array.isArray(snapshot.text)
      ? snapshot.text
      : GveBaseTextService.stringToBaseChars(snapshot.text);
  });

  /**
   * The ID of the edited operation: the bound operation's ID, or a newly
   * generated one when it has none. Kept when the operation is cleared.
   */
  public readonly id = linkedSignal<
    CharChainOperation | undefined,
    string | undefined
  >({
    source: this.operation,
    computation: (operation, previous) =>
      operation ? operation.id || this._nanoid() : previous?.value,
  });

  /**
   * The editable draft, rebuilt from the bound operation whenever it
   * changes (including the echo of our own save: the operation is saved
   * only with an explicit action).
   */
  private readonly _draft = linkedSignal(() => toDraft(this.operation()));

  public readonly form = form(this._draft, (path) => {
    required(path.type);
    // the backend rejects negative values, even for indexes
    required(path.at);
    min(path.at, 0);
    required(path.run);
    min(path.run, 0);
    min(path.to, 0);
    min(path.toRun, 0);
    min(path.rank, 0);
    // value's required validation depends on type
    required(path.value, {
      when: ({ valueOf }) => getOperationArgs(valueOf(path.type)).value,
    });
    SvgValidators.rootG(path.svg);
  });

  /**
   * The arguments used by the edited operation's type.
   */
  private readonly _args = computed(() =>
    getOperationArgs(this.form.type().value()),
  );
  public readonly hasTo = computed(() => this._args().to);
  public readonly hasToRun = computed(() => this._args().toRun);
  public readonly hasValue = computed(() => this._args().value);

  /**
   * True when the edited operation can be saved.
   */
  public readonly canSave = computed(
    () => !this.form().invalid() && this.form().dirty(),
  );

  /**
   * The peephole preview of the operation's input text, tracking the
   * at/run/atAsIndex form values.
   */
  public readonly peepholeRange = computed<OpTextRange>(() => ({
    at: this.form.at().value() ?? 0,
    run: this.form.run().value() ?? 0,
    atAsIndex: this.form.atAsIndex().value(),
  }));

  constructor(private _dialogService: DialogService) {
    // a new bound operation means there are no unsaved edits
    effect(() => {
      this.operation();
      untracked(() => this.form().reset());
    });

    // diagnostic logging for multiValuedFeatureIds
    effect(() => {
      console.log(
        '[ChainOperationEditor] multiValuedFeatureIds:',
        this.multiValuedFeatureIds(),
      );
    });

    // whenever the type changes, reset the arguments it does not use
    // (toDraft already does this for a newly bound operation)
    effect(() => {
      const args = this._args();
      untracked(() => {
        if (!args.to && this.form.to().value() !== 0) {
          this.form.to().reset(0);
        }
        if (!args.toRun && this.form.toRun().value() !== 0) {
          this.form.toRun().reset(0);
        }
        if (!args.value && this.form.value().value() !== '') {
          this.form.value().reset('');
        }
      });
    });

    // when rangePatch changes, patch operation range (at and run,
    // resetting atAsIndex to false)
    effect(() => {
      const range = this.rangePatch();

      if (range) {
        untracked(() => {
          console.log('patching range', range);

          this.form.at().value.set(range.at);
          this.form.at().markAsDirty();

          this.form.atAsIndex().value.set(false);
          this.form.atAsIndex().markAsDirty();

          this.form.run().value.set(range.run);
          this.form.run().markAsDirty();
        });
      }
    });

    // whenever the draft changes, update preview
    toObservable(this._draft)
      .pipe(debounceUntilDestroyed(500))
      .subscribe(() => {
        this.requestPreview();
      });
  }

  public onFeaturesChange(features: OperationFeature[]): void {
    this.form.features().value.set(features);
    this.form.features().markAsDirty();
  }

  public onDpFeaturesChange(features: Feature[]): void {
    this.form.dpFeatures().value.set(features);
    this.form.dpFeatures().markAsDirty();
  }

  // #region sources
  public addSource(): void {
    this.editedSource.set({
      id: this.sourceIds()?.length ? this.sourceIds()![0].id : '',
      type: this.sourceTypes()?.length ? this.sourceTypes()![0].id : '',
    });
    this.editedSourceIndex.set(-1);
  }

  public editSource(index: number): void {
    this.editedSourceIndex.set(index);
    this.editedSource.set(
      structuredClone(this.form.sources().value()[index]),
    );
  }

  public closeSource(): void {
    this.editedSourceIndex.set(-1);
    this.editedSource.set(undefined);
  }

  public onSourceChange(source: OperationSource): void {
    const sources = [...this.form.sources().value()];
    if (this.editedSourceIndex() === -1) {
      sources.push(source);
    } else {
      sources[this.editedSourceIndex()] = source;
    }
    this.form.sources().value.set(sources);
    this.form.sources().markAsDirty();
    this.closeSource();
  }
  // #endregion

  public cancel(): void {
    this.operationCancel.emit();
  }

  private requestOperationOrdinal(ordinal: number): void {
    if (this.form().dirty()) {
      this._dialogService
        .confirm('Confirm', 'Discard unsaved changes to this operation?')
        .subscribe((yes: boolean) => {
          if (yes) {
            this.operationOrdinalRequest.emit(ordinal);
          }
        });
    } else {
      this.operationOrdinalRequest.emit(ordinal);
    }
  }

  public editPreviousOperation(): void {
    const ordinal = this.operationOrdinal();
    if (!ordinal || ordinal <= 1) {
      return;
    }
    this.requestOperationOrdinal(ordinal - 1);
  }

  public editNextOperation(): void {
    const ordinal = this.operationOrdinal();
    const count = this.operationCount();
    if (!ordinal || !count || ordinal >= count) {
      return;
    }
    this.requestOperationOrdinal(ordinal + 1);
  }

  public deleteSource(index: number): void {
    const sources = [...this.form.sources().value()];
    sources.splice(index, 1);

    // keep the edited source index in sync with the list
    const editedIndex = this.editedSourceIndex();
    if (editedIndex === index) {
      this.closeSource();
    } else if (editedIndex > index) {
      this.editedSourceIndex.set(editedIndex - 1);
    }

    this.form.sources().value.set(sources);
    this.form.sources().markAsDirty();
  }

  public requestPreview(): void {
    this.operationPreview.emit(toOperation(this._draft(), this.id()!));
  }

  /**
   * Handle Enter in a single-line input: save when possible, like the
   * implicit form submission this component used to rely on.
   */
  public onEnter(event: Event): void {
    // never let Enter reach an implicit submission of an outer form
    event.preventDefault();
    if (this.canSave()) {
      this.save();
    }
  }

  public save(): void {
    if (!this.form().valid()) {
      return;
    }

    this.operation.set(toOperation(this._draft(), this.id()!));
  }
}

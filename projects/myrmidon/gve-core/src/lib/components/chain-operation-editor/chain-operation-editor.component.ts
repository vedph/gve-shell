import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

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
import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { customAlphabet } from 'nanoid';

// myrmidon
import { FlatLookupPipe, NgxToolsValidators } from '@myrmidon/ngx-tools';

// local
import {
  CharChainOperation,
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
    ReactiveFormsModule,
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
    NgeMonacoModule,
    FeatureSetEditorComponent,
    OperationSourceEditorComponent,
    FlatLookupPipe,
  ],
  templateUrl: './chain-operation-editor.component.html',
  styleUrl: './chain-operation-editor.component.css',
})
export class ChainOperationEditorComponent implements OnInit, OnDestroy {
  private readonly _subs: Subscription[];
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
   * Emitted when the operation preview is requested.
   */
  public readonly operationPreview = output<CharChainOperation>();

  /**
   * Emitted when operation editing is cancelled.
   */
  public readonly operationCancel = output();

  public readonly tabIndex = signal<number>(0);
  public readonly id = signal<string | undefined>(undefined);
  public readonly hasTo = signal<boolean>(false);
  public readonly hasToRun = signal<boolean>(false);
  public readonly hasValue = signal<boolean>(false);
  // elements parsed from SVG and having an id attribute;
  // we can attach features to each of these elements
  public readonly elements = signal<SVGElement[]>([]);
  public readonly editedElementId = signal<string | undefined>(undefined);
  // source
  public readonly editedSource = signal<OperationSource | undefined>(undefined);
  public readonly editedSourceIndex = signal<number>(-1);

  // general
  public rank: FormControl<number>;
  public groupId: FormControl<string | null>;
  public features: FormControl<Feature[]>;
  public sources: FormControl<OperationSource[]>;
  public type: FormControl<OperationType>;
  public at: FormControl<number>;
  public atAsIndex: FormControl<boolean>;
  public to: FormControl<number>;
  public toAsIndex: FormControl<boolean>;
  public inputTag: FormControl<string | null>;
  public outputTag: FormControl<string | null>;
  public run: FormControl<number>;
  public toRun: FormControl<number>;
  public value: FormControl<string | null>;
  // svg
  public svg: FormControl<string>;
  // elements
  public elementFeatures: FormControl<Record<string, Feature[]>>;
  // diplomatic
  public newTextHidden: FormControl<boolean>;
  public dpFeatures: FormControl<Feature[]>;
  // root
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this._subs = [];
    // general
    this.rank = formBuilder.control<number>(0, { nonNullable: true });
    this.groupId = formBuilder.control<string | null>(null);
    this.features = formBuilder.control<Feature[]>([], { nonNullable: true });
    this.sources = formBuilder.control<OperationSource[]>([], {
      nonNullable: true,
    });
    this.type = formBuilder.control<OperationType>(OperationType.annotate, {
      validators: Validators.required,
      nonNullable: true,
    });
    this.at = formBuilder.control<number>(0, {
      validators: [
        Validators.required,
        NgxToolsValidators.conditionalValidator(
          () => !this.atAsIndex.value,
          Validators.min(0),
        ),
      ],
      nonNullable: true,
    });
    this.atAsIndex = formBuilder.control<boolean>(false, { nonNullable: true });
    this.to = formBuilder.control<number>(0, {
      nonNullable: true,
    });
    this.toAsIndex = formBuilder.control<boolean>(false, { nonNullable: true });
    this.inputTag = formBuilder.control<string | null>(null);
    this.outputTag = formBuilder.control<string | null>(null);
    this.run = formBuilder.control<number>(0, {
      validators: Validators.required,
      nonNullable: true,
    });
    this.toRun = formBuilder.control<number>(0, { nonNullable: true });
    this.value = formBuilder.control<string | null>(null, {
      validators: NgxToolsValidators.conditionalValidator(
        () =>
          this.type.value === OperationType.addBefore ||
          this.type.value === OperationType.addAfter ||
          this.type.value === OperationType.replace,
        Validators.required,
      ),
      nonNullable: true,
    });

    // svg
    this.svg = formBuilder.control<string>('', {
      validators: [SvgValidators.rootGValidator()],
      nonNullable: true,
    });
    this.elementFeatures = formBuilder.control<Record<string, Feature[]>>(
      {},
      { nonNullable: true },
    );
    this.newTextHidden = formBuilder.control<boolean>(false, {
      nonNullable: true,
    });
    this.dpFeatures = formBuilder.control<Feature[]>([], { nonNullable: true });

    this.form = formBuilder.group({
      rank: this.rank,
      groupId: this.groupId,
      features: this.features,
      sources: this.sources,
      type: this.type,
      at: this.at,
      atAsIndex: this.atAsIndex,
      to: this.to,
      toAsIndex: this.toAsIndex,
      inputTag: this.inputTag,
      outputTag: this.outputTag,
      run: this.run,
      toRun: this.toRun,
      value: this.value,
      svg: this.svg,
      elementFeatures: this.elementFeatures,
      newTextHidden: this.newTextHidden,
      dpFeatures: this.dpFeatures,
    });

    // when operation changes, update form
    effect(() => {
      this.updateForm(this.operation());
    });

    // diagnostic logging for multiValuedFeatureIds
    effect(() => {
      console.log(
        '[ChainOperationEditor] multiValuedFeatureIds:',
        this.multiValuedFeatureIds(),
      );
    });

    // when rangePatch changes, patch operation range (at and run,
    // resetting atAsIndex to false)
    effect(() => {
      const range = this.rangePatch();

      if (range) {
        console.log('patching range', range);

        this.at.setValue(range.at);
        this.at.markAsDirty();
        this.at.updateValueAndValidity();

        this.atAsIndex.setValue(false);
        this.atAsIndex.markAsDirty();
        this.atAsIndex.updateValueAndValidity();

        this.run.setValue(range.run);
        this.run.markAsDirty();
        this.run.updateValueAndValidity();
      }
    });
  }

  public ngOnInit(): void {
    // whenever svg or base change, update preview
    this._subs.push(
      this.form.valueChanges
        .pipe(
          filter((changes) => 'svg' in changes || 'snapshot' in changes),
          debounceTime(500),
        )
        .subscribe(() => {
          this.requestPreview();
        }),
    );

    // whenever type changes, update args UI
    this._subs.push(
      this.type.valueChanges.subscribe(() => this.updateArgsUI()),
    );
  }

  public ngOnDestroy(): void {
    for (const sub of this._subs) {
      sub.unsubscribe();
    }
  }

  private toggleLfEscape(
    text: string | null | undefined,
    on: boolean,
  ): string | null | undefined {
    if (!text) return text;
    return on ? text.replace(/\\/g, '\n') : text.replace(/\n/g, '\\');
  }

  public onFeaturesChange(features: OperationFeature[]): void {
    this.features.setValue(features);
    this.features.markAsDirty();
  }

  public onDpFeaturesChange(features: Feature[]): void {
    this.dpFeatures.setValue(features);
    this.dpFeatures.markAsDirty();
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
    this.editedSource.set(structuredClone(this.sources.value[index]));
  }

  public closeSource(): void {
    this.editedSourceIndex.set(-1);
    this.editedSource.set(undefined);
  }

  public onSourceChange(source: OperationSource): void {
    const sources = [...this.sources.value];
    if (this.editedSourceIndex() === -1) {
      sources.push(source);
    } else {
      sources[this.editedSourceIndex()] = source;
    }
    this.sources.setValue(sources);
    this.sources.updateValueAndValidity();
    this.sources.markAsDirty();
    this.closeSource();
  }
  // #endregion

  private updateArgsUI(): void {
    let to = false,
      toRun = false,
      value = false;
    switch (this.type.value) {
      case OperationType.moveAfter:
      case OperationType.moveBefore:
        to = true;
        break;
      case OperationType.swap:
        to = true;
        toRun = true;
        break;
      case OperationType.addAfter:
      case OperationType.addBefore:
      case OperationType.replace:
        value = true;
        break;
    }
    this.hasTo.set(to);
    this.hasToRun.set(toRun);
    this.hasValue.set(value);

    if (!to) {
      this.to.reset();
    }
    if (!toRun) {
      this.toRun.reset();
    }
    if (!value) {
      this.value.reset();
    }
  }

  private updateForm(operation?: CharChainOperation | null): void {
    if (!operation) {
      this.form.reset();
      this.updateArgsUI();
      return;
    }

    // get or generate ID
    if (operation.id) {
      this.id.set(operation.id);
    } else {
      this.id.set(this._nanoid());
    }

    this.rank.setValue(operation.rank || 0);
    this.groupId.setValue(operation.groupId || null);
    this.features.setValue(operation.features || []);
    this.sources.setValue(operation.sources || []);

    this.type.setValue(operation.type);
    this.at.setValue(operation.at);
    this.atAsIndex.setValue(operation.atAsIndex || false);
    this.to.setValue(operation.to || 0);
    this.toAsIndex.setValue(operation.toAsIndex || false);
    this.inputTag.setValue(operation.inputTag || null);
    this.outputTag.setValue(operation.outputTag || null);
    this.run.setValue(operation.run);
    this.toRun.setValue(operation.toRun || 0);
    // escape line feeds in value for editing
    this.value.setValue(this.toggleLfEscape(operation.value, true) || null);

    this.form.markAsPristine();

    this.updateArgsUI();
  }

  public cancel(): void {
    this.operationCancel.emit();
  }

  private getOperation(): CharChainOperation {
    return {
      rank: this.rank.value || undefined,
      groupId: this.groupId.value || undefined,
      features: this.features.value?.length ? this.features.value : undefined,
      sources: this.sources.value?.length ? this.sources.value : undefined,
      id: this.id()!,
      type: this.type.value,
      at: this.at.value,
      atAsIndex: this.atAsIndex.value || undefined,
      to: this.to.value || undefined,
      toAsIndex: this.toAsIndex.value || undefined,
      inputTag: this.inputTag.value || undefined,
      outputTag: this.outputTag.value || undefined,
      run: this.run.value,
      toRun: this.toRun.value || undefined,
      // un-escape line feeds in value for storage
      value: this.toggleLfEscape(this.value.value, false) || undefined,
    };
  }

  public deleteSource(index: number): void {
    const sources = [...this.sources.value];
    sources.splice(index, 1);
    this.sources.setValue(sources);
    this.sources.updateValueAndValidity();
    this.sources.markAsDirty();
  }

  public requestPreview(): void {
    this.operationPreview.emit(this.getOperation());
  }

  public save(): void {
    if (!this.form.valid) {
      return;
    }

    this.operation.set(this.getOperation());
  }
}

import {
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
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
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
import { deepCopy, SafeHtmlPipe } from '@myrmidon/ngx-tools';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import {
  CharChainOperation,
  Feature,
  OperationFeature,
  OperationType,
  OperationSource,
  SnapshotBase,
  LabeledId,
} from '@myrmidon/gve-snapshot-view';

// local
import { FeatureSetEditorComponent } from '../feature-set-editor/feature-set-editor.component';
import { OperationSourceEditorComponent } from '../operation-source-editor/operation-source-editor.component';
import { SettingsService } from '../../services/settings.service';
import { SvgValidators } from '../../validators/svg-validators';
import { FeatureMap } from '../feature-editor/feature-editor.component';
import { VarBaseTextRange } from '../base-text-view/base-text-view.component';

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
}

/**
 * 🔑 `gve-chain-operation-editor`
 *
 * A component for editing a variant generation operation.
 * Used by the `gve-snapshot-editor` component.
 * - ▶️ `operation` (`CharChainOperation`): the operation to edit.
 * - ▶️ `snapshot` (`SnapshotBase`): the snapshot the operation refers to.
 * - ▶️ `hidePreview` (`boolean`): whether to hide the preview request button.
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
    SafeHtmlPipe,
    FeatureSetEditorComponent,
    OperationSourceEditorComponent,
  ],
  templateUrl: './chain-operation-editor.component.html',
  styleUrl: './chain-operation-editor.component.css',
})
export class ChainOperationEditorComponent implements OnInit, OnDestroy {
  // monaco
  private readonly _disposables: monaco.IDisposable[] = [];
  private readonly _subs: Subscription[];
  private readonly _nanoid = customAlphabet('1234567890abcdef', 10);
  private _editorModel?: monaco.editor.ITextModel;
  private _editor?: monaco.editor.IStandaloneCodeEditor;

  /**
   * The operation to edit.
   */
  public readonly operation = model<CharChainOperation | undefined>();

  /**
   * The snapshot the operation refers to.
   */
  public readonly snapshot = input<SnapshotBase | undefined>();

  /**
   * Whether to hide the preview request button.
   */
  public readonly hidePreview = input<boolean | undefined>();

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
   * Set when the edited operation's text range is to be patched.
   */
  public readonly rangePatch = input<VarBaseTextRange | undefined>();

  /**
   * Emitted when the operation is changed.
   */
  public readonly operationChange = output<CharChainOperation>();

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

  constructor(
    formBuilder: FormBuilder,
    private _clipboard: Clipboard,
    private _settings: SettingsService,
    private _dialogService: DialogService
  ) {
    this._subs = [];
    // general
    this.rank = formBuilder.control<number>(0, { nonNullable: true });
    this.groupId = formBuilder.control<string | null>(null);
    this.features = formBuilder.control<Feature[]>([], { nonNullable: true });
    this.sources = formBuilder.control<OperationSource[]>([], {
      nonNullable: true,
    });
    this.type = formBuilder.control<OperationType>(OperationType.replace, {
      validators: Validators.required,
      nonNullable: true,
    });
    this.at = formBuilder.control<number>(0, {
      validators: Validators.required,
      nonNullable: true,
    });
    this.atAsIndex = formBuilder.control<boolean>(false, { nonNullable: true });
    this.to = formBuilder.control<number>(0, { nonNullable: true });
    this.toAsIndex = formBuilder.control<boolean>(false, { nonNullable: true });
    this.inputTag = formBuilder.control<string | null>(null);
    this.outputTag = formBuilder.control<string | null>(null);
    this.run = formBuilder.control<number>(0, {
      validators: Validators.required,
      nonNullable: true,
    });
    this.toRun = formBuilder.control<number>(0, { nonNullable: true });
    this.value = formBuilder.control<string | null>(null);

    // svg
    this.svg = formBuilder.control<string>('', {
      validators: [SvgValidators.rootGValidator()],
      nonNullable: true,
    });
    this.elementFeatures = formBuilder.control<Record<string, Feature[]>>(
      {},
      { nonNullable: true }
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

    // when snapshot changes, update SVG
    effect(() => {
      const snapshot = this.snapshot();
      const dirty = this.hasTextChanges(snapshot || undefined);
      if (dirty) {
        this.requestPreview();
        this._editorModel?.setValue(this.svg.value || '');
      }
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
          debounceTime(500)
        )
        .subscribe(() => {
          this.requestPreview();
        })
    );

    // whenever type changes, update args UI
    this._subs.push(
      this.type.valueChanges.subscribe(() => this.updateArgsUI())
    );
  }

  public ngOnDestroy(): void {
    this._disposables.forEach((d) => d.dispose());
    for (const sub of this._subs) {
      sub.unsubscribe();
    }
  }

  private toggleLfEscape(
    text: string | null | undefined,
    on: boolean
  ): string | null | undefined {
    if (!text) return text;
    return on ? text.replace(/\\/g, '\n') : text.replace(/\n/g, '\\');
  }

  private hasTextChanges(snapshot?: SnapshotBase): boolean {
    if ((!snapshot && this.snapshot()) || (snapshot && !this.snapshot())) {
      return true;
    }
    if (
      snapshot?.size?.width !== this.snapshot()?.size?.width ||
      snapshot?.size?.height !== this.snapshot()?.size?.height
    ) {
      return true;
    }
    if (
      snapshot?.style !== this.snapshot()?.style ||
      snapshot?.text !== this.snapshot()?.text ||
      snapshot?.textStyle !== this.snapshot()?.textStyle
    ) {
      return true;
    }
    // compare textOptions returning true if any different
    const options = snapshot?.textOptions;
    if (
      options?.lineHeightOffset !==
        this.snapshot()?.textOptions?.lineHeightOffset ||
      options?.charSpacingOffset !==
        this.snapshot()?.textOptions?.charSpacingOffset ||
      options?.spcWidthOffset !== this.snapshot()?.textOptions?.spcWidthOffset
    ) {
      return true;
    }
    return false;
  }

  public onCreateEditor(editor: monaco.editor.IEditor) {
    console.log('creating editor');
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._editorModel =
      this._editorModel || monaco.editor.createModel(this.svg.value, 'xml');
    editor.setModel(this._editorModel);
    this._editor = editor as monaco.editor.IStandaloneCodeEditor;

    this._disposables.push(
      // when the editor content changes, update the SVG control value
      this._editorModel.onDidChangeContent((e) => {
        console.log('change content');
        const code = this._editorModel!.getValue();
        if (code !== this.svg.value) {
          this.svg.setValue(code);
          this.svg.markAsDirty();
          this.svg.updateValueAndValidity();
        }
      })
    );
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
    this.editedSource.set({ id: '', type: '' });
    this.editedSourceIndex.set(-1);
  }

  public editSource(index: number): void {
    this.editedSourceIndex.set(index);
    this.editedSource.set(deepCopy(this.sources.value[index]));
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
    this.closeSource();
  }
  // #endregion

  // #region svg
  public saveSvg(): void {
    if (!this.svg.value) {
      return;
    }
    const blob = new Blob([this.svg.value], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // create filename from date and time
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(':', '-');
    a.download = `svg-${date}_${time}.svg`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  public openSvgEditor(): void {
    const url = this._settings.get<string>(
      'svg-editor',
      'https://editor.method.ac/'
      // 'https://boxy-svg.com/app'
    );
    if (url) {
      if (this.svg.value) {
        this._clipboard.copy(this.svg.value);
      }
      window.open(url, '_blank');
    }
  }

  public loadSvg(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this._editorModel?.setValue(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  public setSvgFromClipboard(): void {
    navigator.clipboard.readText().then((text) => {
      this._editorModel?.setValue(text);
    });
  }

  private parseSvg(svg?: string): SVGElement[] {
    if (!svg) {
      return [];
    }
    try {
      // parse SVG code extracting all the SVG elements with an id attribute
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const elements = Array.from(doc.querySelectorAll('[id]'));

      // for each element, read x and y and add a transform with a translate
      // equal to -x and -y so that the element is at the origin. This is useful
      // so that the element can be previewed in its box without wasting space
      // just because it happens not to be placed at the SVG origin
      for (const element of elements) {
        const x = parseFloat(element.getAttribute('x') || '0');
        const y = parseFloat(element.getAttribute('y') || '0');
        element.setAttribute('transform', `translate(${-x},${-y})`);
      }

      return elements as SVGElement[];
    } catch (e) {
      this.svg.setErrors({ invalidSvg: true });
      return [];
    }
  }

  public removeDecimals(): void {
    const svg = this.svg.value;
    const newSvg = svg.replace(/(\d+)\.\d+/g, '$1');
    this._editorModel?.setValue(newSvg);
  }

  public wrapInGroup(): void {
    // wrap SVG code in <g>...</g> if it does not already start with <g>
    const svg = this.svg.value;
    if (!svg.startsWith('<g')) {
      this._editorModel?.setValue(`<g>${svg}</g>`);
    }
  }
  // #endregion

  // #region element features
  public onTabIndexChange(index: number): void {
    this.tabIndex.set(index);
    if (index === 3) {
      this.elements.set(this.parseSvg(this.svg.value));
    }
  }

  public editElementFeatures(element: SVGElement): void {
    const id = element.id;
    const features = this.elementFeatures.value[id] || [];
    this.elementFeatures.setValue({
      ...this.elementFeatures.value,
      [id]: features,
    });
    this.editedElementId.set(id);
  }

  public deleteElementFeatures(element: SVGElement): void {
    const id = element.id;
    const elementFeatures = { ...this.elementFeatures.value };
    if (!elementFeatures[id]) {
      return;
    }

    this._dialogService
      .confirm('Confirm', 'Delete element features?')
      .subscribe((yes: boolean) => {
        if (yes) {
          delete elementFeatures[id];
          this.elementFeatures.setValue(elementFeatures);

          if (this.editedElementId() === id) {
            this.editedElementId.set(undefined);
          }
        }
      });
  }

  public onElementFeaturesChange(features: Feature[]): void {
    if (this.editedElementId()) {
      this.elementFeatures.setValue({
        ...this.elementFeatures.value,
        [this.editedElementId()!]: features,
      });
      this.editedElementId.set(undefined);
    }
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
    this.newTextHidden.setValue(
      operation.diplomatics?.isNewTextHidden || false
    );
    this.dpFeatures.setValue(operation.diplomatics?.features || []);

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

    this.svg.setValue(operation.diplomatics?.g || '');
    this._editorModel?.setValue(this.svg.value || '');
    this.elementFeatures.setValue(operation.diplomatics?.elementFeatures || {});

    this.form.markAsPristine();

    this.elements.set(this.parseSvg(operation.diplomatics?.g));

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
      diplomatics: {
        g: this.svg.value,
        isNewTextHidden: this.newTextHidden.value,
        features: this.dpFeatures.value,
        elementFeatures: this.elementFeatures.value,
      },
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

  public requestPreview(): void {
    this.operationPreview.emit(this.getOperation());
  }

  public save(): void {
    if (!this.form.valid) {
      return;
    }

    this.operation.set(this.getOperation());
    this.operationChange.emit(this.operation()!);
  }
}

import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';

import {
  CharNode,
  Feature,
  GveTextVisual,
  GveVisualEvent,
  Snapshot,
  SnapshotViewData,
  SnapshotViewRenderEvent,
  SnapshotViewService,
} from '@myrmidon/gve-snapshot-view';
import { NgeMonacoModule } from '@cisstech/nge/monaco';

import {
  FeatureSetEditorComponent,
  BaseTextViewComponent,
  BaseTextCharEvent,
} from '../../../../projects/myrmidon/gve-core/src/public-api';
import { AssetService } from '../../services/asset.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-snapshot-view-demo',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSliderModule,
    MatTooltipModule,
    NgeMonacoModule,
    FeatureSetEditorComponent,
    BaseTextViewComponent,
  ],
  templateUrl: './snapshot-view-demo.component.html',
  styleUrl: './snapshot-view-demo.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SnapshotViewDemoComponent implements OnInit {
  private readonly _disposables: monaco.IDisposable[] = [];
  private _editorModel?: monaco.editor.ITextModel;
  private _editor?: monaco.editor.IStandaloneCodeEditor;
  private _renderer?: SnapshotViewService;
  private _sub?: Subscription;

  public text: FormControl<string>;
  public form: FormGroup;
  public debug: FormControl<boolean>;

  public snapshot: FormControl<string>;

  public characters: CharNode[] = [];
  public selectedCharIndex = -1;
  public selectedChar?: CharNode;
  public selectedCharLabel?: string;

  public svg?: string;
  public visuals?: GveTextVisual[];
  public events: GveVisualEvent[] = [];
  public viewData?: SnapshotViewData;
  public rulers = true;
  public imageOpacity = 0.8;

  constructor(
    formBuilder: FormBuilder,
    private _clipboard: Clipboard,
    private _snackbar: MatSnackBar,
    private _asset: AssetService
  ) {
    this.text = new FormControl<string>(
      'there was an old man with a beard,\nwho cried: "It is just as I feared!',
      {
        validators: [Validators.required, Validators.maxLength(1000)],
        nonNullable: true,
      }
    );
    this.form = formBuilder.group({
      text: this.text,
    });
    this.debug = new FormControl<boolean>(false, { nonNullable: true });
    this.snapshot = new FormControl<string>('{}', {
      nonNullable: true,
    });
  }

  public ngOnInit(): void {
    this.setText();
  }

  public ngOnDestroy(): void {
    this._disposables.forEach((d) => d.dispose());
  }

  public onCreateEditor(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });

    this._asset.loadText('limerick.json').subscribe((text) => {
      this._editorModel =
        this._editorModel || monaco.editor.createModel(text, 'json');
      editor.setModel(this._editorModel);
      this.snapshot.setValue(text);
      this._editor = editor as monaco.editor.IStandaloneCodeEditor;

      this._disposables.push(
        this._editorModel.onDidChangeContent((e) => {
          console.log(this._editorModel!.getValue());
          this.snapshot.setValue(this._editorModel!.getValue());
          this.snapshot.markAsDirty();
          this.snapshot.updateValueAndValidity();
        })
      );

      this.render();
    });
  }

  public setText(): void {
    this.selectedCharIndex = -1;
    this.selectedChar = undefined;
    this.selectedCharLabel = undefined;
    this.characters = SnapshotViewService.stringToBaseChars(this.text.value);
  }

  public copyTextCode(): void {
    if (!this.characters?.length) {
      return;
    }
    const json = JSON.stringify(this.characters, null, 2);
    this._clipboard.copy(json);
    this._snackbar.open('Copied to clipboard', 'OK', {
      duration: 2000,
    });
  }

  private parseSnapshot(): Snapshot | undefined {
    try {
      let json = this.snapshot.value;
      return JSON.parse(json) as Snapshot;
    } catch (error) {
      console.error(error);
      this._snackbar.open('Invalid JSON', 'OK', {
        duration: 2000,
      });
      return undefined;
    }
  }

  public setJson(): void {
    try {
      const snapshot = this.parseSnapshot();
      if (!snapshot) {
        return;
      }
      snapshot.text = this.characters;
      const json = JSON.stringify(snapshot, null, 2);
      this._editorModel?.setValue(json);
    } catch (error) {
      console.error(error);
      this._snackbar.open('Invalid JSON', 'OK', {
        duration: 2000,
      });
    }
  }

  public onSelectedChar(event: BaseTextCharEvent): void {
    this.selectedChar = this.characters.find((c) => c.id === event.char.id);
    this.selectedCharLabel = event.char.label;
  }

  public onFeaturesChange(features: Feature[]): void {
    this.selectedChar!.features = features;
  }

  private updateViewData(): void {
    const snapshot = this.parseSnapshot();
    if (!snapshot) {
      return;
    }
    this.viewData = {
      snapshot: snapshot,
      options: {
        showRulers: true,
        showGrid: true,
        delayedRender: true,
        panZoom: true,
        debug: this.debug.value,
      },
    };
  }

  public async render(): Promise<void> {
    this.updateViewData();
  }

  public onSnapshotRender(event: CustomEvent<SnapshotViewRenderEvent>): void {
    this._renderer = (event.detail as SnapshotViewRenderEvent).renderer;
  }

  public onVisualEvent(event: CustomEvent<GveVisualEvent>): void {
    this.events.unshift(event.detail);
    if (this.events.length > 10) {
      this.events.pop();
    }
  }

  public toggleRulers(): void {
    if (!this._renderer) {
      return;
    }
    this.rulers = this._renderer.toggleRulers();
  }

  public onImageOpacityChange(value: number): void {
    if (this._renderer) {
      this._renderer.setImageOpacity(value);
    }
  }
}

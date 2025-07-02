
import { Component, effect, input, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  CharNode,
  Feature,
  SnapshotViewService,
} from '@myrmidon/gve-snapshot-view';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { BaseTextCharEvent } from '../base-text-char/base-text-char.component';
import {
  BaseTextViewComponent,
  VarBaseTextRange,
} from '../base-text-view/base-text-view.component';
import { FeatureSetEditorComponent } from '../feature-set-editor/feature-set-editor.component';

/**
 * 🔑 `gve-base-text-editor`
 *
 * Editor for snapshot's base text. This can receive a string or an array
 * of `CharNode` objects, and lets the user edit the text, character by
 * character, optionally also setting its features.
 *
 * Used by the `gve-snapshot-editor` component.
 */
@Component({
  selector: 'gve-base-text-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    BaseTextViewComponent,
    FeatureSetEditorComponent
],
  templateUrl: './base-text-editor.component.html',
  styleUrl: './base-text-editor.component.css',
})
export class BaseTextEditorComponent {
  /**
   * The text to edit. In input this can be a string, an array of `CharNode`
   * objects, or undefined. In output this will be an array of `CharNode`
   * objects.
   */
  public readonly text = input.required({
    transform: (value: CharNode[] | string | undefined) => {
      if (value === undefined) {
        return undefined;
      }
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'string') {
        return SnapshotViewService.stringToBaseChars(value);
      }
      return undefined;
    },
  });

  /**
   * Emitted for the edited text as an array of `CharNode`'s whenever it changes.
   */
  public readonly textChange = output<CharNode[]>();

  public userText: FormControl<string>;
  public form: FormGroup;

  public selectedChar?: CharNode;
  public selectedCharLabel?: string;
  public textRange?: VarBaseTextRange;

  constructor(formBuilder: FormBuilder, private _dialogService: DialogService) {
    this.userText = formBuilder.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(10000)],
    });
    this.form = formBuilder.group({
      userText: this.userText,
    });

    effect(() => {
      this.resetSelectedChar();
      if (!this.text()) {
        this.userText.reset();
      } else {
        this.userText.setValue(
          this.text()!
            .map((c) => c.label)
            .join('')
        );
        this.userText.markAsPristine();
        this.userText.updateValueAndValidity();
      }
    });
  }

  private resetSelectedChar(): void {
    this.selectedChar = undefined;
    this.selectedCharLabel = undefined;
  }

  public onSelectedChar(event: BaseTextCharEvent): void {
    this.selectedChar = this.text()!.find((c) => c.id === event.char.id);
    this.selectedCharLabel = event.char.label;
  }

  public onFeaturesChange(features: Feature[]): void {
    this.selectedChar!.features = features;
    this.textChange.emit(this.text()!);
  }

  public onRangePick(range: VarBaseTextRange) {
    this.textRange = range;
  }

  public patchTextFromUser(): void {
    // TODO
  }

  public setTextFromUser(): void {
    this._dialogService
      .confirm('Confirm', 'Reset text?')
      .subscribe((yes: boolean) => {
        if (yes) {
          this.textChange.emit(
            SnapshotViewService.stringToBaseChars(this.userText.value)
          );
        }
      });
  }
}

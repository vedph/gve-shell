import { Component, effect, input, output, signal } from '@angular/core';
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

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { BaseTextCharEvent } from '../base-text-char/base-text-char.component';
import {
  BaseTextViewComponent,
  BaseTextRange,
} from '../base-text-view/base-text-view.component';
import { FeatureSetEditorComponent } from '../feature-set-editor/feature-set-editor.component';
import { CharNode, Feature } from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';

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
    FeatureSetEditorComponent,
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
        return GveBaseTextService.stringToBaseChars(value);
      }
      return undefined;
    },
  });

  /**
   * Emitted for the edited text as an array of `CharNode`'s whenever it changes.
   */
  public readonly textChange = output<CharNode[]>();

  public readonly selectedChar = signal<CharNode | undefined>(undefined);
  public readonly selectedCharLabel = signal<string | undefined>(undefined);
  public readonly textRange = signal<BaseTextRange | undefined>(undefined);

  public userText: FormControl<string>;
  public form: FormGroup;

  constructor(
    formBuilder: FormBuilder,
    private _dialogService: DialogService,
  ) {
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
            .map((c) => c.data)
            .join(''),
        );
        this.userText.markAsPristine();
        this.userText.updateValueAndValidity();
      }
    });
  }

  private resetSelectedChar(): void {
    this.selectedChar.set(undefined);
    this.selectedCharLabel.set(undefined);
  }

  public onSelectedChar(event: BaseTextCharEvent): void {
    this.selectedChar.set(this.text()!.find((c) => c.id === event.char.id));
    this.selectedCharLabel.set(event.char.label);
  }

  public onFeaturesChange(features: Feature[]): void {
    const char = this.selectedChar();
    if (!char) {
      return;
    }
    const chars = this.text()!.map((c) =>
      c.id === char.id ? { ...c, features } : c,
    );
    this.selectedChar.set({ ...char, features });
    this.textChange.emit(chars);
  }

  public onRangePick(range: BaseTextRange) {
    this.textRange.set(range);
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
            GveBaseTextService.stringToBaseChars(this.userText.value),
          );
        }
      });
  }
}

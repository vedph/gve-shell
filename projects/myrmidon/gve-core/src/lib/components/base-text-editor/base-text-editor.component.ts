import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

import { DialogService } from '@myrmidon/ngx-mat-tools';

import { BaseTextCharEvent } from '../base-text-char/base-text-char.component';
import {
  BaseTextViewComponent,
  BaseTextRange,
} from '../base-text-view/base-text-view.component';
import { FeatureSetEditorComponent } from '../feature-set-editor/feature-set-editor.component';
import { CharNode, Feature } from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';
import { softMaxLength } from '../../validators/signal-validators';

/**
 * The editable shape behind the base text form.
 */
interface BaseTextControls {
  userText: string;
}

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
    FormField,
    MatButton,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatTooltip,
    BaseTextViewComponent,
    FeatureSetEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
   * The IDs of the features that are multi-valued. If a feature being
   * edited is in this list, the feature editor will allow adding multiple
   * values to it. Passed down to feature editors.
   */
  public readonly multiValuedFeatureIds = input<string[] | undefined>([
    'r_hints',
  ]);

  /**
   * Emitted for the edited text as an array of `CharNode`'s whenever it changes.
   */
  public readonly textChange = output<CharNode[]>();

  public readonly selectedChar = signal<CharNode | undefined>(undefined);
  public readonly selectedCharLabel = signal<string | undefined>(undefined);
  public readonly textRange = signal<BaseTextRange | undefined>(undefined);

  private readonly _dialogService = inject(DialogService);

  /**
   * The editable draft: the text as a plain string, rebuilt whenever the
   * bound text changes. Edits are applied only via setTextFromUser.
   */
  private readonly _draft = linkedSignal<BaseTextControls>(() => ({
    userText: (this.text() ?? []).map((c) => c.data).join(''),
  }));

  public readonly form = form(this._draft, (path) => {
    required(path.userText);
    softMaxLength(path.userText, 10000);
  });

  constructor() {
    // diagnostic logging for multiValuedFeatureIds
    effect(() => {
      console.log(
        '[BaseTextEditor] multiValuedFeatureIds:',
        this.multiValuedFeatureIds(),
      );
    });

    // when the text changes (and so the draft is rebuilt from it), reset
    // the selected char and the form interaction state
    effect(() => {
      this.text();
      untracked(() => {
        this.resetSelectedChar();
        this.form().reset();
      });
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
    // base text node features are stored under the 'v0' version tag
    const updatedFeatures: { [tag: string]: Feature[] } | null = features.length
      ? { v0: features }
      : null;
    const chars = this.text()!.map((c) =>
      c.id === char.id ? { ...c, features: updatedFeatures } : c,
    );
    this.selectedChar.set({ ...char, features: updatedFeatures });
    this.textChange.emit(chars);
  }

  public onRangePick(range: BaseTextRange) {
    this.textRange.set(range);
  }

  public setTextFromUser(): void {
    this._dialogService
      .confirm('Confirm', 'Reset text?')
      .subscribe((yes: boolean) => {
        if (yes) {
          this.textChange.emit(
            GveBaseTextService.stringToBaseChars(this.form.userText().value()),
          );
        }
      });
  }
}

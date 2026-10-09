import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  linkedSignal,
  model,
  OnInit,
  untracked,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

import { CharNode, PayloadMatDialogConfig } from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { softMaxLength } from '../../validators/signal-validators';

/**
 * The editable shape behind the snapshot text form.
 */
interface SnapshotTextControls {
  userText: string;
}

/**
 * Bound text nodes -> editable draft.
 */
function toDraft(nodes: CharNode[]): SnapshotTextControls {
  return { userText: nodes.map((node) => node.data).join('') };
}

/**
 * 🔑 `gve-snapshot-text-editor`
 *
 * A component to edit a snapshot text. This component can be used both in a dialog
 * and as a standalone component.
 *
 * - ▶️ `text` (`CharNode[]`): the text to edit.
 * - 🔥 `textChange` (`CharNode[]`): event emitted when text changes.
 */
@Component({
  selector: 'gve-snapshot-text-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatButton,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatTooltip,
  ],
  templateUrl: './snapshot-text-editor.component.html',
  styleUrl: './snapshot-text-editor.component.css',
})
export class SnapshotTextEditorComponent implements OnInit {
  public readonly text = model<CharNode[]>([]);

  /**
   * The editable draft, rebuilt from the bound text whenever it changes.
   * This includes the echo of our own save: the text is saved only with an
   * explicit action, and the saved nodes map back to the same string.
   */
  private readonly _draft = linkedSignal(() => toDraft(this.text()));

  public readonly form = form(this._draft, (path) => {
    required(path.userText);
    softMaxLength(path.userText, 5000);
  });

  private readonly _snackbar = inject(MatSnackBar);

  // this component can be used as a dialog
  public readonly dialogRef =
    inject<MatDialogRef<SnapshotTextEditorComponent>>(MatDialogRef, {
      optional: true,
    }) ?? undefined;
  public readonly data =
    inject<PayloadMatDialogConfig<{ text?: CharNode[] }>>(MAT_DIALOG_DATA, {
      optional: true,
    }) ?? undefined;

  constructor() {
    // a new bound text (including the echo of our own save) means there are
    // no unsaved edits, so clear the interaction state. Keyed on the model,
    // not on the draft: a draft that merely returns to the bound value (e.g.
    // a blank text trimmed to empty by save) must keep its errors visible.
    effect(() => {
      this.text();
      untracked(() => this.form().reset());
    });
  }

  public ngOnInit() {
    if (this.data?.payload?.text) {
      this.text.set(this.data.payload.text);
    }
  }

  public close(): void {
    this.dialogRef?.close();
  }

  public copyToClipboard(): void {
    const json = JSON.stringify(
      GveBaseTextService.stringToBaseChars(this.form.userText().value()),
    );
    navigator.clipboard.writeText(json);
    this._snackbar.open('Copied JSON code to clipboard', undefined, {
      duration: 2000,
    });
  }

  private trimLines(text: string): string {
    return text
      .split('\n')
      .map((line) => line.trim())
      .join('\n');
  }

  public save(): void {
    if (this.form().invalid()) {
      return;
    }
    const userText = this.trimLines(this.form.userText().value());
    this.form.userText().value.set(userText);
    if (!userText) {
      return;
    }
    this.text.set(GveBaseTextService.stringToBaseChars(userText));
    this.dialogRef?.close(this.text());
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';

import { CharChainOperation, PayloadMatDialogConfig } from '../../models';
import { GveApiService } from '../../services/gve-api.service';
import { softMaxLength } from '../../validators/signal-validators';

/**
 * 🔑 `gve-batch-operation-editor`
 *
 * A component to edit a batch of operations. This component can be used both in a dialog
 * and as a standalone component.
 *
 * - ▶️ `preset` (`string`): the optional preset text to parse.
 * - 🔥 `operationsChange` (`CharChainOperation[]`): event emitted when operations change.
 */
@Component({
  selector: 'gve-batch-operation-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    MatTooltip,
  ],
  templateUrl: './batch-operation-editor.component.html',
  styleUrl: './batch-operation-editor.component.css',
})
export class BatchOperationEditorComponent implements OnInit {
  public readonly busy = signal<boolean>(false);
  public readonly parseError = signal<string | undefined>(undefined);

  public readonly form = form(signal({ inputOps: '' }), (path) => {
    required(path.inputOps);
    softMaxLength(path.inputOps, 2000);
  });

  /**
   * The preset text to parse if any. Usually you start with a blank
   * text, but sometimes you might want to pre-set it.
   */
  public readonly preset = input<string | undefined>();

  /**
   * Emitted when operations change.
   */
  public readonly operationsChange = output<CharChainOperation[]>();

  private readonly _api = inject(GveApiService);

  // this component can be used as a dialog
  public readonly dialogRef =
    inject<MatDialogRef<BatchOperationEditorComponent>>(MatDialogRef, {
      optional: true,
    }) ?? undefined;
  public readonly data =
    inject<PayloadMatDialogConfig<{ preset?: string }>>(MAT_DIALOG_DATA, {
      optional: true,
    }) ?? undefined;

  constructor() {
    // Track only the preset signal; use untracked for the call so that
    // busy() read inside parseOperations() is not tracked as a dependency
    // (otherwise the API completing and setting busy=false would re-trigger
    // the effect, causing an infinite loop of API calls).
    effect(() => {
      const preset = this.preset();
      untracked(() => this.parseOperations(preset || undefined));
    });
  }

  public ngOnInit() {
    if (this.data?.payload?.preset) {
      this.parseOperations(this.data?.payload?.preset);
    }
  }

  public parseOperations(text?: string): void {
    if (this.busy() || !text) {
      return;
    }
    this.busy.set(true);
    this.parseError.set(undefined);

    this._api.parseOperations(text).subscribe({
      next: (wrapper) => {
        if (wrapper.error) {
          this.parseError.set(wrapper.error);
          return;
        }
        this.operationsChange.emit(wrapper.result || []);
        if (this.dialogRef) {
          this.dialogRef.close(wrapper.result);
        }
      },
      error: (error) => {
        this.parseError.set(error.message);
        this.busy.set(false);
      },
      complete: () => {
        this.busy.set(false);
      },
    });
  }

  public close(): void {
    this.dialogRef?.close();
  }
}

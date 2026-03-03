import {
  ChangeDetectionStrategy,
  Component,
  effect,
  Inject,
  input,
  OnInit,
  Optional,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { CharChainOperation, PayloadMatDialogConfig } from '../../models';
import { GveApiService } from '../../services/gve-api.service';

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
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './batch-operation-editor.component.html',
  styleUrl: './batch-operation-editor.component.css',
})
export class BatchOperationEditorComponent implements OnInit {
  public readonly busy = signal<boolean>(false);
  public readonly parseError = signal<string | undefined>(undefined);

  public text: FormControl<string | null>;
  public form: FormGroup;

  /**
   * The preset text to parse if any. Usually you start with a blank
   * text, but sometimes you might want to pre-set it.
   */
  public readonly preset = input<string | undefined>();

  /**
   * Emitted when operations change.
   */
  public readonly operationsChange = output<CharChainOperation[]>();

  constructor(
    formBuilder: FormBuilder,
    private _api: GveApiService,
    // this component can be used as a dialog
    @Optional()
    public dialogRef?: MatDialogRef<BatchOperationEditorComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data?: PayloadMatDialogConfig<{ preset?: string }>,
  ) {
    this.text = formBuilder.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(2000),
    ]);
    this.form = formBuilder.group({
      inputOps: this.text,
    });

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

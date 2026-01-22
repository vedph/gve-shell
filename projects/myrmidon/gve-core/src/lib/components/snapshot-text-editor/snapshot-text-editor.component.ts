import {
  Component,
  effect,
  Inject,
  model,
  OnInit,
  Optional,
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

import { CharNode, PayloadMatDialogConfig } from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';

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
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './snapshot-text-editor.component.html',
  styleUrl: './snapshot-text-editor.component.css',
})
export class SnapshotTextEditorComponent implements OnInit {
  public userText: FormControl<string>;
  public form: FormGroup;

  public readonly text = model<CharNode[]>([]);

  constructor(
    formBuilder: FormBuilder,
    // this component can be used as a dialog
    @Optional()
    public dialogRef?: MatDialogRef<SnapshotTextEditorComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data?: PayloadMatDialogConfig<{ text?: CharNode[] }>
  ) {
    this.userText = formBuilder.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(5000)],
    });
    this.form = new FormGroup({
      userText: this.userText,
    });

    // when text changes, update the user text
    effect(() => {
      this.updateUserText(this.text());
    });
  }

  private updateUserText(nodes: CharNode[]): void {
    this.userText.setValue(nodes.map((node) => node.data).join(''));
    this.userText.markAsPristine();
    this.userText.updateValueAndValidity();
  }

  public ngOnInit() {
    if (this.data?.payload?.text) {
      this.text.set(this.data.payload.text);
    }
  }

  public close(): void {
    this.dialogRef?.close();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.userText.setValue(this.userText.value.trim());
    if (!this.userText.value) {
      return;
    }
    this.text.set(GveBaseTextService.stringToBaseChars(this.userText.value));
    this.dialogRef?.close(this.text());
  }
}

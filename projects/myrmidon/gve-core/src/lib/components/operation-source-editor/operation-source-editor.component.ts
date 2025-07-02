
import { Component, effect, input, model, output } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LabeledId, OperationSource } from '@myrmidon/gve-snapshot-view';

/**
 * 🔑 `gve-operation-source-editor`
 *
 * A component to edit an operation source.
 * Used by chain operation editor component.
 *
 * - ▶️ `source` (`OperationSource`): the source to edit.
 * - ▶️ `ids` (`LabeledId[]`): the list of source IDs, when using a closed
 * list for them.
 * - ▶️ `types` (`LabeledId[]`): the list of source types, when using a closed
 * list for them.
 * - 🔥 `sourceChange` (`EventEmitter<OperationSource>`): the event emitted
 * when the source changes.
 * - 🔥 `sourceCancel` (`EventEmitter<void>`): the event emitted when the
 * edit is canceled.
 */
@Component({
  selector: 'gve-operation-source-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
],
  templateUrl: './operation-source-editor.component.html',
  styleUrl: './operation-source-editor.component.css',
})
export class OperationSourceEditorComponent {
  /**
   * The source to edit.
   */
  public readonly source = model<OperationSource | undefined>();

  /**
   * The list of source IDs when it's a closed set.
   */
  public readonly ids = input<LabeledId[] | undefined>();

  /**
   * The list of source types when it's a closed set.
   */
  public readonly types = input<LabeledId[] | undefined>();

  /**
   * The event emitted when the source changes.
   */
  public readonly sourceChange = output<OperationSource | undefined>();

  /**
   * The event emitted when the edit is canceled.
   */
  public sourceCancel = output();

  public id: FormControl<string>;
  public type: FormControl<string>;
  public rank: FormControl<number>;
  public note: FormControl<string | null>;
  public form: FormGroup;

  constructor(formBuilder: FormBuilder) {
    this.id = new FormControl('', {
      validators: [Validators.required, Validators.maxLength(50)],
      nonNullable: true,
    });
    this.type = new FormControl('', {
      validators: [Validators.required, Validators.maxLength(50)],
      nonNullable: true,
    });
    this.rank = new FormControl(0, {
      nonNullable: true,
    });
    this.note = new FormControl(null, {
      validators: [Validators.maxLength(1000)],
    });
    this.form = formBuilder.group({
      id: this.id,
      type: this.type,
      rank: this.rank,
      note: this.note,
    });

    // when source changes, update form
    effect(() => {
      this.updateForm(this.source());
    });
  }

  private updateForm(source?: OperationSource): void {
    if (!source) {
      this.form.reset();
      return;
    }
    this.id.setValue(source.id);
    this.type.setValue(source.type);
    this.rank.setValue(source.rank || 0);
    this.note.setValue(source.note || null);
    this.form.markAsPristine();
  }

  public cancel(): void {
    this.sourceCancel.emit();
  }

  public save(): void {
    if (this.form.invalid) {
      return;
    }
    this.source.set({
      id: this.id.value,
      type: this.type.value,
      rank: this.rank.value,
      note: this.note.value || undefined,
    });
    this.sourceChange.emit(this.source());
  }
}

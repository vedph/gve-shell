import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  linkedSignal,
  model,
  output,
  untracked,
} from '@angular/core';
import { form, FormField, min, required } from '@angular/forms/signals';

import { MatIconButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';

import { LabeledId, OperationSource } from '../../models';
import { softMaxLength } from '../../validators/signal-validators';

/**
 * The editable shape behind the operation source form.
 */
interface OperationSourceControls {
  id: string;
  type: string;
  rank: number | null;
  note: string;
}

/**
 * Bound source -> editable draft.
 */
function toDraft(source: OperationSource | undefined): OperationSourceControls {
  return {
    id: source?.id ?? '',
    type: source?.type ?? '',
    rank: source?.rank || 0,
    note: source?.note || '',
  };
}

/**
 * Editable draft -> source.
 */
function toSource(v: OperationSourceControls): OperationSource {
  return {
    id: v.id,
    type: v.type,
    rank: v.rank ?? 0,
    note: v.note || undefined,
  };
}

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatError,
    MatIcon,
    MatInput,
    MatSelect,
    MatOption,
    MatTooltip,
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
   * The event emitted when the edit is canceled.
   */
  public sourceCancel = output();

  /**
   * The editable draft, rebuilt from the bound source whenever it changes
   * (including the echo of our own save: the source is saved only with an
   * explicit action).
   */
  private readonly _draft = linkedSignal(() => toDraft(this.source()));

  public readonly form = form(this._draft, (path) => {
    required(path.id);
    softMaxLength(path.id, 50);
    required(path.type);
    softMaxLength(path.type, 50);
    min(path.rank, 0);
    softMaxLength(path.note, 1000);
  });

  constructor() {
    // a new bound source means there are no unsaved edits
    effect(() => {
      this.source();
      untracked(() => this.form().reset());
    });
  }

  public cancel(): void {
    this.sourceCancel.emit();
  }

  /**
   * Handle Enter in a single-line input: accept the changes when valid,
   * like the implicit form submission this component used to rely on.
   */
  public onEnter(event: Event): void {
    // never let Enter reach an implicit submission of an outer form
    event.preventDefault();
    this.save();
  }

  public save(): void {
    if (this.form().invalid()) {
      return;
    }
    this.source.set(toSource(this._draft()));
  }
}

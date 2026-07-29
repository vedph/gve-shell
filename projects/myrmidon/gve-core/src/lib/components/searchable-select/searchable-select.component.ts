import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatSelectModule } from '@angular/material/select';

import { LabeledId } from '../../models';

/**
 * 🔑 `gve-searchable-select`
 *
 * A generic, reusable `mat-select` wrapper adding a sticky filter input
 * pinned to the top of the options panel. Users get the best of both
 * worlds: the full, scrollable list is visible as soon as the panel
 * opens, and typing instantly narrows it down in place.
 *
 * Implements `ControlValueAccessor`, so it's a drop-in replacement for a
 * plain `mat-select` bound via `[formControl]` or `formControlName`: the
 * selected value is the `id` of the chosen `LabeledId`.
 *
 * `mat-error` and `mat-hint` elements can be projected as children, just
 * like when nesting them directly under a `mat-form-field`.
 *
 * - ▶️ `options` (`LabeledId[]`): the selectable items.
 * - ▶️ `label` (`string`): the form field label.
 * - ▶️ `filterPlaceholder` (`string`): placeholder for the filter input.
 * - ▶️ `noOptionsText` (`string`): text shown when no option matches the
 * filter.
 * - ▶️ `required` (`boolean`): whether a value is required.
 */
@Component({
  selector: 'gve-searchable-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor {
  private readonly _select = viewChild<MatSelect>('select');
  private readonly _filterInput =
    viewChild<ElementRef<HTMLInputElement>>('filterInput');

  /**
   * The selectable items.
   */
  public readonly options = input<LabeledId[]>([]);

  /**
   * The form field label.
   */
  public readonly label = input<string>('');

  /**
   * Placeholder for the sticky filter input.
   */
  public readonly filterPlaceholder = input<string>('Type to filter…');

  /**
   * Text shown when no option matches the current filter.
   */
  public readonly noOptionsText = input<string>('No matching options');

  /**
   * Whether a value is required.
   */
  public readonly required = input<boolean>(false);

  /**
   * The current filter term, typed into the sticky filter input.
   */
  public readonly filterTerm = signal<string>('');

  /**
   * The currently selected option's ID, or null when none is selected.
   */
  public readonly value = signal<string | null>(null);

  /**
   * Whether the control is disabled.
   */
  public readonly disabled = signal<boolean>(false);

  /**
   * The options matching the current filter term. Matches against both
   * label and ID, case-insensitively.
   */
  public readonly filteredOptions = computed(() => {
    const term = this.filterTerm().trim().toLowerCase();
    const options = this.options();
    if (!term) {
      return options;
    }
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term),
    );
  });

  private _onChange: (value: string | null) => void = () => {};
  private _onTouched: () => void = () => {};

  public writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  public registerOnChange(fn: (value: string | null) => void): void {
    this._onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  public onSelectionChange(value: string): void {
    this.value.set(value);
    this._onChange(value);
  }

  public onFilterInput(event: Event): void {
    this.filterTerm.set((event.target as HTMLInputElement).value);
  }

  /**
   * Keys that should still reach mat-select's own panel keydown handler
   * (closing, and moving into / activating the option list). Everything
   * else (letters, digits, etc.) is kept local to the filter input so it
   * doesn't trigger mat-select's built-in type-ahead.
   */
  private static readonly PASSTHROUGH_KEYS = new Set([
    'Escape',
    'Tab',
    'ArrowDown',
    'ArrowUp',
    'Enter',
  ]);

  public onFilterKeydown(event: KeyboardEvent): void {
    if (!SearchableSelectComponent.PASSTHROUGH_KEYS.has(event.key)) {
      event.stopPropagation();
    }
  }

  public onOpenedChange(opened: boolean): void {
    if (opened) {
      queueMicrotask(() => this._filterInput()?.nativeElement.focus());
    } else {
      this.filterTerm.set('');
      this._onTouched();
    }
  }

  /**
   * Moves keyboard focus to the select trigger, without opening the
   * panel. Mirrors the native `focus()` behavior of a plain `mat-select`.
   */
  public focus(): void {
    this._select()?.focus();
  }
}

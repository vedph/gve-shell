import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  input,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * 🔑 `gve-ln-heights-editor`
 *
 * A component to edit line heights.
 * Used by the `gve-snapshot-editor` component.
 *
 * - ▶️ `lineCount` (`number`): the number of lines.
 * - ▶️ `heights` (`Record<number, number>`): the line heights.
 * - 🔥 `heightsChange` (`EventEmitter<Record<number, number>>`): the event
 * emitted when the heights change.
 */
@Component({
  selector: 'gve-ln-heights-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './ln-heights-editor.component.html',
  styleUrl: './ln-heights-editor.component.css',
})
export class LnHeightsEditorComponent implements OnInit, OnDestroy {
  private _subs?: Subscription[];
  private _heights?: Record<number, number>;

  public lineNumber: FormControl<number>;
  public height: FormControl<number>;

  /**
   * The total number of lines in the text.
   */
  public readonly lineCount = input<number>(0);

  /**
   * The heights map of the lines. Each key is a line number and the value is
   * the height of the line.
   */
  public readonly heights = input<Record<number, number> | undefined>();

  /**
   * The event emitted when the heights change.
   */
  public readonly heightsChange = output<Record<number, number> | undefined>();

  public lineNumbers: number[] = [];

  constructor(formBuilder: FormBuilder) {
    this.lineNumber = formBuilder.control(0, { nonNullable: true });
    this.height = formBuilder.control(0, { nonNullable: true });

    // when lineCount changes, update lineNumbers
    effect(() => {
      this.lineNumbers = Array.from(
        { length: this.lineCount() },
        (_, i) => i + 1
      );
    });
  }

  private pruneHeights(): void {
    // remove all the heigths with value=0
    this._heights = Object.fromEntries(
      Object.entries(this._heights || {}).filter(([_, v]) => v !== 0)
    );
    // if heights are now empty, set to undefined
    if (Object.keys(this._heights).length === 0) {
      this._heights = undefined;
    }
  }

  public ngOnInit(): void {
    this._subs = [];
    // update heights[ln] when height changes and emit heightsChange
    this._subs.push(
      this.height.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(200))
        .subscribe((value) => {
          if (!this._heights) {
            this._heights = {};
          }
          this._heights[this.lineNumber.value] = value;
          this.pruneHeights();
          this.heightsChange.emit(this._heights);
        })
    );

    // update height when line number changes
    this._subs.push(
      this.lineNumber.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(200))
        .subscribe((value) => {
          if (!this._heights) return;
          this.height.setValue(this._heights[value] || 0);
        })
    );
  }

  public ngOnDestroy(): void {
    this._subs?.forEach((sub) => sub.unsubscribe());
  }

  public reset(): void {
    this._heights = undefined;
    this.heightsChange.emit(undefined);
  }
}

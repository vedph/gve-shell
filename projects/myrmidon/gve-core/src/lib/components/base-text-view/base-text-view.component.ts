import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';

import {
  BaseTextChar,
  BaseTextCharComponent,
  BaseTextCharEvent,
} from '../base-text-char/base-text-char.component';
import { CharNode } from '../../models';

/**
 * A range in the base text.
 */
export interface BaseTextRange {
  at: number;
  run: number;
}

/**
 * 🔑 `gve-base-text-view`
 *
 * A component to display a selectable base text. Its input is either a string or an
 * array of `CharNode`'s. The base text is the starting text in a set of transformations,
 * and is represented as a sequence of characters with optional metadata.
 * This component allows users to view and select characters or ranges of characters.
 * Used by the chain result view component and the base text editor component.
 *
 * - ▶️ `defaultColor` (`string`): the default color for the text.
 * - ▶️ `colorCallback` (callback): an optional callback to get the color of a
 * character node.
 * - ▶️ `defaultBorderColor` (`string`): the default border color for the text.
 * - ▶️ `borderColorCallback` (callback): an optional callback to get the border color
 * of a character node.
 * - ▶️ `selectionColor` (`string`): the color for the selected text.
 * - ▶️ `hasLineNumber` (`boolean`): true if line numbers should be displayed next
 * to each line.
 * - a toolbar button lets users toggle between showing each character's node
 * ID or its 0-based index, tracked by the `showIndex` signal.
 * - ▶️ `text` (`string` | `CharNode[]`): the text to display.
 * - 🔥 `charPick` (`BaseTextCharEvent`): emitted when a character is picked.
 * - 🔥 `rangePick` (`BaseTextRange`): emitted when a range is picked.
 */
@Component({
  selector: 'gve-base-text-view',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    BaseTextCharComponent,
  ],
  templateUrl: './base-text-view.component.html',
  styleUrl: './base-text-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTextViewComponent implements OnInit {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _clipboard = inject(Clipboard);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly _searchSubject = new Subject<string>();
  private _lastSelectedPosition?: number;
  private _selectionAnchor?: number;

  /**
   * The default color for the text.
   */
  public readonly defaultColor = input('#DBDBDB');

  /**
   * The default border color for the text.
   */
  public readonly defaultBorderColor = input('#DBDBDB');

  /**
   * The color for the selected text.
   */
  public readonly selectionColor = input('#3E92CC');

  /**
   * The color for search match highlights.
   */
  public readonly searchHighlightColor = input('#FFD54F');

  /**
   * True if line numbers should be displayed next to each line.
   */
  public readonly hasLineNumber = input(false);

  /**
   * The search query entered in the toolbar.
   */
  public readonly searchQuery = signal('');

  /**
   * The positions of search matches (start and length pairs).
   */
  private readonly searchMatches = signal<{ start: number; length: number }[]>(
    [],
  );

  /**
   * The text to display.
   */
  public readonly text = input<CharNode[]>([]);

  /**
   * An optional callback to get the color of a character node.
   * Return null to use the default color.
   */
  public readonly colorCallback = input<
    ((node: CharNode) => string | null) | undefined
  >();

  /**
   * An optional callback to get the color of a character node.
   * Return null to use the default color.
   */
  public readonly borderColorCallback = input<
    ((node: CharNode) => string | null) | undefined
  >();

  /**
   * Emitted when a character is picked.
   */
  public readonly charPick = output<BaseTextCharEvent>();

  /**
   * Emitted when a range is picked. This is preceded by a character pick event.
   * The range is defined by the starting character and the number of characters.
   * The range is inclusive.
   */
  public readonly rangePick = output<BaseTextRange>();

  /**
   * True to show each character's 0-based index instead of its node ID.
   * Toggled at will by the user via the toolbar button.
   */
  public readonly showIndex = signal<boolean>(false);

  /**
   * The base characters organized by lines, computed from text input.
   */
  private readonly baseLines = computed(() => {
    return this.buildLines(
      this.text(),
      this.colorCallback(),
      this.borderColorCallback(),
    );
  });

  /**
   * Signal for tracking selected range state.
   */
  private readonly selectedRange = signal<{
    start: number;
    end: number;
  } | null>(null);

  /**
   * The lines with selection or search highlight state applied.
   * Search highlights take priority over selection when present.
   */
  public readonly lines = computed(() => {
    const base = this.baseLines();
    const range = this.selectedRange();
    const matches = this.searchMatches();

    // If there are search matches, highlight them instead of selection
    if (matches.length > 0) {
      let position = 0;
      return base.map((line) =>
        line.map((char) => {
          const currentPos = position++;
          const isMatch = matches.some(
            (m) => currentPos >= m.start && currentPos < m.start + m.length,
          );
          if (isMatch) {
            return {
              ...char,
              oldColor: char.oldColor || char.color,
              oldBorderColor: char.oldBorderColor || char.borderColor,
              color: this.searchHighlightColor(),
              borderColor: this.searchHighlightColor(),
            };
          }
          return char;
        }),
      );
    }

    // Otherwise, apply selection highlight if present
    if (!range) {
      return base;
    }

    const { start, end } = range;
    let position = 0;

    return base.map((line) =>
      line.map((char) => {
        const currentPos = position++;
        if (currentPos >= start && currentPos <= end) {
          return {
            ...char,
            oldColor: char.oldColor || char.color,
            oldBorderColor: char.oldBorderColor || char.borderColor,
            color: this.selectionColor(),
            borderColor: this.selectionColor(),
          };
        }
        return char;
      }),
    );
  });

  constructor() {
    // reset selection when text changes
    effect(() => {
      this.text();
      this._lastSelectedPosition = undefined;
      this._selectionAnchor = undefined;
      this.selectedRange.set(null);
      this.clearSearch();
    });
  }

  public ngOnInit(): void {
    // Setup debounced search
    this._searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  private buildLines(
    text: CharNode[],
    colorCallback?: (node: CharNode) => string | null,
    borderColorCallback?: (node: CharNode) => string | null,
  ): BaseTextChar[][] {
    if (!text || text.length === 0) {
      return [];
    }

    const newLines: BaseTextChar[][] = [];
    newLines.push([]);

    const nodes = text as CharNode[];

    for (let i = 0; i < nodes.length; i++) {
      const char: BaseTextChar = {
        id: nodes[i].id,
        index: i,
        value: nodes[i].data,
        label: nodes[i].label,
        color: colorCallback
          ? colorCallback(nodes[i]) || this.defaultColor()
          : this.defaultColor(),
        borderColor: borderColorCallback
          ? borderColorCallback(nodes[i]) || this.defaultBorderColor()
          : this.defaultBorderColor(),
        emSize: 1.5,
      };
      char.oldColor = char.color;
      char.oldBorderColor = char.borderColor;

      newLines[newLines.length - 1].push(char);

      if (char.value === '\n') {
        newLines.push([]);
      }
    }

    return newLines;
  }

  public onCharPick(event: BaseTextCharEvent): void {
    // guard against null/undefined event.char
    if (!event?.char) {
      return;
    }

    // find the position of the clicked character in the flat array
    const clickedPosition = this.findCharPosition(event.char.id);
    if (clickedPosition === -1) {
      return; // character not found
    }

    // calculate selection state
    const isRangeSelection =
      this._lastSelectedPosition !== undefined &&
      this._lastSelectedPosition !== clickedPosition &&
      event.event?.ctrlKey;

    let rangeToEmit: BaseTextRange;

    if (isRangeSelection && this._lastSelectedPosition !== undefined) {
      // range selection: use positions, not IDs
      const minPos = Math.min(this._lastSelectedPosition, clickedPosition);
      const maxPos = Math.max(this._lastSelectedPosition, clickedPosition);

      // update selection range
      this.selectedRange.set({ start: minPos, end: maxPos });

      // emit range based on the first character's ID at minPos and the count
      const firstCharId = this.getCharIdAtPosition(minPos);
      rangeToEmit = { at: firstCharId, run: maxPos - minPos + 1 };
    } else {
      // single character selection
      this.selectedRange.set({ start: clickedPosition, end: clickedPosition });

      // update last selected character and position, and set anchor for keyboard navigation
      this._lastSelectedPosition = clickedPosition;
      this._selectionAnchor = clickedPosition;

      rangeToEmit = { at: event.char.id, run: 1 };
    }

    // emit events last, after all internal state is updated
    this.charPick.emit(event);
    this.rangePick.emit(rangeToEmit);
  }

  /**
   * Find the position (index in flat array) of a character by its ID.
   * Returns -1 if not found.
   */
  private findCharPosition(charId: number): number {
    const baseLines = this.baseLines();
    let position = 0;

    for (const line of baseLines) {
      for (const char of line) {
        if (char.id === charId) {
          return position;
        }
        position++;
      }
    }

    return -1;
  }

  /**
   * Get the character ID at a specific position in the flat array.
   * Returns the ID or -1 if position is out of bounds.
   */
  private getCharIdAtPosition(position: number): number {
    const baseLines = this.baseLines();
    let currentPos = 0;

    for (const line of baseLines) {
      for (const char of line) {
        if (currentPos === position) {
          return char.id;
        }
        currentPos++;
      }
    }

    return -1;
  }

  /**
   * Handle search input changes and trigger debounced search.
   */
  public onSearchInput(query: string): void {
    this.searchQuery.set(query);
    this._searchSubject.next(query);
  }

  /**
   * Perform the actual search and update match positions.
   */
  private performSearch(query: string): void {
    if (!query || query.length === 0) {
      this.searchMatches.set([]);
      return;
    }

    const text = this.text();
    if (!text || text.length === 0) {
      this.searchMatches.set([]);
      return;
    }

    // Build the full text string from CharNodes
    const fullText = text.map((node) => node.data).join('');

    // Find all matches (case-insensitive)
    const matches: { start: number; length: number }[] = [];
    const lowerQuery = query.toLowerCase();
    const lowerText = fullText.toLowerCase();
    let startIndex = 0;

    while (startIndex < lowerText.length) {
      const index = lowerText.indexOf(lowerQuery, startIndex);
      if (index === -1) {
        break;
      }
      matches.push({ start: index, length: query.length });
      startIndex = index + 1;
    }

    this.searchMatches.set(matches);
  }

  /**
   * Clear the search query and remove search highlights.
   */
  public clearSearch(): void {
    this.searchQuery.set('');
    this.searchMatches.set([]);
  }

  /**
   * Toggle between showing each character's node ID or its 0-based index.
   */
  public toggleShowIndex(): void {
    this.showIndex.set(!this.showIndex());
  }

  /**
   * Get the total number of characters in the text.
   */
  private getTotalCharCount(): number {
    return this.text().length;
  }

  /**
   * Get the character at a specific position.
   */
  private getCharAtPosition(position: number): BaseTextChar | null {
    const baseLines = this.baseLines();
    let currentPos = 0;

    for (const line of baseLines) {
      for (const char of line) {
        if (currentPos === position) {
          return char;
        }
        currentPos++;
      }
    }

    return null;
  }

  /**
   * Handle keyboard events for arrow key navigation.
   * - Left/Right: Move single selection to previous/next character
   * - Shift+Left/Right: Extend selection range
   */
  public onKeyDown(event: KeyboardEvent): void {
    const range = this.selectedRange();
    if (!range) {
      return;
    }

    const totalChars = this.getTotalCharCount();
    if (totalChars === 0) {
      return;
    }

    let newStart: number = range.start;
    let newEnd: number = range.end;
    let handled = false;

    if (event.key === 'ArrowLeft') {
      if (event.shiftKey) {
        // Shift+Left: extend selection to the left from anchor
        if (this._selectionAnchor === undefined) {
          this._selectionAnchor = range.start;
        }
        // Determine which end to move based on anchor position
        if (range.end === this._selectionAnchor) {
          // Moving start to the left
          newStart = Math.max(0, range.start - 1);
          newEnd = range.end;
        } else {
          // Shrinking from right toward anchor, or extending left past anchor
          if (range.end > this._selectionAnchor) {
            // Shrink from right
            newStart = range.start;
            newEnd = range.end - 1;
          } else {
            // Extend left
            newStart = Math.max(0, range.start - 1);
            newEnd = range.end;
          }
        }
        handled = true;
      } else {
        // Left without shift: move to single selection one position left
        const currentPos = range.start;
        const newPos = Math.max(0, currentPos - 1);
        newStart = newPos;
        newEnd = newPos;
        this._selectionAnchor = newPos;
        this._lastSelectedPosition = newPos;
        handled = true;
      }
    } else if (event.key === 'ArrowRight') {
      if (event.shiftKey) {
        // Shift+Right: extend selection to the right from anchor
        if (this._selectionAnchor === undefined) {
          this._selectionAnchor = range.start;
        }
        // Determine which end to move based on anchor position
        if (range.start === this._selectionAnchor) {
          // Moving end to the right
          newStart = range.start;
          newEnd = Math.min(totalChars - 1, range.end + 1);
        } else {
          // Shrinking from left toward anchor, or extending right past anchor
          if (range.start < this._selectionAnchor) {
            // Shrink from left
            newStart = range.start + 1;
            newEnd = range.end;
          } else {
            // Extend right
            newStart = range.start;
            newEnd = Math.min(totalChars - 1, range.end + 1);
          }
        }
        handled = true;
      } else {
        // Right without shift: move to single selection one position right
        const currentPos = range.end;
        const newPos = Math.min(totalChars - 1, currentPos + 1);
        newStart = newPos;
        newEnd = newPos;
        this._selectionAnchor = newPos;
        this._lastSelectedPosition = newPos;
        handled = true;
      }
    }

    if (handled) {
      event.preventDefault();
      this.selectedRange.set({ start: newStart, end: newEnd });

      // Emit rangePick event
      const firstCharId = this.getCharIdAtPosition(newStart);
      const rangeToEmit: BaseTextRange = {
        at: firstCharId,
        run: newEnd - newStart + 1,
      };
      this.rangePick.emit(rangeToEmit);

      // Emit charPick for single selection
      if (newStart === newEnd) {
        const char = this.getCharAtPosition(newStart);
        if (char) {
          this.charPick.emit({
            char,
            event: null as unknown as MouseEvent,
          });
        }
      }
    }
  }

  /**
   * Copy the currently selected text to the clipboard.
   */
  public copySelection(): void {
    const range = this.selectedRange();
    if (!range) {
      return;
    }

    const text = this.text();
    if (!text || text.length === 0) {
      return;
    }

    // Extract the selected characters
    const selectedChars = text
      .slice(range.start, range.end + 1)
      .map((node) => node.data)
      .join('');

    this._clipboard.copy(selectedChars);
    this._snackBar.open('Text copied', 'OK', { duration: 2000 });
  }

  /**
   * Copy the currently selected range coordinates to the clipboard.
   * Format: "ID" for single character, "IDxCOUNT" for range.
   */
  public copyCoordinates(): void {
    const range = this.selectedRange();
    if (!range) {
      return;
    }

    const text = this.text();
    if (!text || text.length === 0) {
      return;
    }

    const startId = text[range.start].id;
    const count = range.end - range.start + 1;

    const coords = count === 1 ? `${startId}` : `${startId}x${count}`;

    this._clipboard.copy(coords);
    this._snackBar.open(`Coordinates copied: ${coords}`, 'OK', {
      duration: 2000,
    });
  }

  /**
   * Check if there is an active selection.
   */
  public readonly hasSelection = computed(() => {
    return this.selectedRange() !== null;
  });

  /**
   * Get the total count of matched characters.
   */
  public readonly matchCount = computed(() => {
    const matches = this.searchMatches();
    return matches.reduce((sum, m) => sum + m.length, 0);
  });

  /**
   * Check if a search is active (query is not empty).
   */
  public readonly isSearchActive = computed(() => {
    return this.searchQuery().length > 0;
  });

  /**
   * Space-separated list of character IDs collected via double-click.
   */
  public readonly pickedIds = signal('');

  /**
   * Append a character's ID to the pickedIds string on double-click.
   */
  public onCharDblPick(event: BaseTextCharEvent): void {
    if (!event?.char) {
      return;
    }
    const current = this.pickedIds();
    this.pickedIds.set(current ? `${current} ${event.char.id}` : `${event.char.id}`);
  }

  /**
   * Clear the collected IDs string.
   */
  public clearPickedIds(): void {
    this.pickedIds.set('');
  }

  /**
   * Copy the collected IDs string to the clipboard.
   */
  public copyPickedIds(): void {
    const ids = this.pickedIds();
    if (!ids) {
      return;
    }
    this._clipboard.copy(ids);
    this._snackBar.open('IDs copied', 'OK', { duration: 2000 });
  }
}

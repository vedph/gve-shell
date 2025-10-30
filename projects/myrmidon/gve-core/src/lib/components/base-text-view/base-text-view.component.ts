import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import { CharNode } from '@myrmidon/gve-snapshot-view';

import {
  BaseTextChar,
  BaseTextCharComponent,
  BaseTextCharEvent,
} from '../base-text-char/base-text-char.component';

/**
 * A range in the base text.
 */
export interface VarBaseTextRange {
  at: number;
  run: number;
}

/**
 * 🔑 `gve-base-text-view`
 *
 * A component to display a selectable base text. Its input is either a string or an
 * array of `CharNode`'s.
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
 * - ▶️ `text` (`string` | `CharNode[]`): the text to display.
 * - 🔥 `charPick` (`BaseTextCharEvent`): emitted when a character is picked.
 * - 🔥 `rangePick` (`VarBaseTextRange`): emitted when a range is picked.
 */
@Component({
  selector: 'gve-base-text-view',
  imports: [BaseTextCharComponent],
  templateUrl: './base-text-view.component.html',
  styleUrl: './base-text-view.component.css',
})
export class BaseTextViewComponent {
  private _lastSelectedPosition?: number;

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
   * True if line numbers should be displayed next to each line.
   */
  public readonly hasLineNumber = input(false);

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
  public readonly rangePick = output<VarBaseTextRange>();

  /**
   * The base characters organized by lines, computed from text input.
   */
  private readonly baseLines = computed(() => {
    return this.buildLines(
      this.text(),
      this.colorCallback(),
      this.borderColorCallback()
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
   * The lines with selection state applied, computed from base lines and selection.
   */
  public readonly lines = computed(() => {
    const base = this.baseLines();
    const range = this.selectedRange();

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
      })
    );
  });

  constructor() {
    // reset selection when text changes
    effect(() => {
      this.text();
      this._lastSelectedPosition = undefined;
      this.selectedRange.set(null);
    });
  }

  private buildLines(
    text: CharNode[],
    colorCallback?: (node: CharNode) => string | null,
    borderColorCallback?: (node: CharNode) => string | null
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

    let rangeToEmit: VarBaseTextRange;

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

      // update last selected character and position
      this._lastSelectedPosition = clickedPosition;

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
}

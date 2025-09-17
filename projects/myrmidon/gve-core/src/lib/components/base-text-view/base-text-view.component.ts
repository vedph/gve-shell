import { Component, effect, input, output, signal } from '@angular/core';

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
  private _lastSelectedChar?: BaseTextChar;

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

  public readonly lines = signal<BaseTextChar[][]>([]);

  constructor() {
    // build lines when text or border color callback change
    effect(() => {
      this.buildLines(
        this.text(),
        this.colorCallback(),
        this.borderColorCallback()
      );
    });

    // reset _lastSelectedChar when text changes
    effect(() => {
      this.text();
      this._lastSelectedChar = undefined;
    });
  }

  private buildLines(
    text: CharNode[],
    colorCallback?: (node: CharNode) => string | null,
    borderColorCallback?: (node: CharNode) => string | null
  ): void {
    if (!text) {
      this.lines.set([]);
      return;
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

    this.lines.set(newLines);
  }

  private resetColors(): void {
    if (!this.lines()) return;

    const newLines = this.lines().map((line) =>
      line.map((c) => {
        if (!c) return c;
        return {
          ...c,
          color: c.oldColor || this.defaultColor(),
          borderColor: c.oldBorderColor || this.defaultBorderColor(),
        };
      })
    );
    this.lines.set(newLines);
  }

  public onCharPick(event: BaseTextCharEvent): void {
    // guard against null/undefined event.char
    if (!event?.char) {
      return;
    }

    // first reset all colors before updating
    this.resetColors();

    // calculate selection state
    const isRangeSelection =
      Boolean(this._lastSelectedChar) &&
      this._lastSelectedChar !== event.char &&
      event.event?.ctrlKey;

    let rangeToEmit: VarBaseTextRange;

    if (isRangeSelection && this._lastSelectedChar) {
      const minId = Math.min(this._lastSelectedChar.id, event.char.id);
      const maxId = Math.max(this._lastSelectedChar.id, event.char.id);

      // update UI to highlight range - create new objects
      const newLines = this.lines().map((line) =>
        line.map((c) => {
          if (!c) return c;
          if (c.id >= minId && c.id <= maxId) {
            return {
              ...c,
              oldColor: c.color,
              oldBorderColor: c.borderColor,
              color: this.selectionColor(),
              borderColor: this.selectionColor(),
            };
          }
          return c;
        })
      );
      this.lines.set(newLines);

      rangeToEmit = { at: minId, run: maxId - minId + 1 };
    } else {
      // single character selection - create new objects
      const newLines = this.lines().map((line) =>
        line.map((c) => {
          if (!c) return c;
          if (c.id === event.char.id) {
            const updatedChar = {
              ...c,
              oldColor: c.color,
              oldBorderColor: c.borderColor,
              color: this.selectionColor(),
              borderColor: this.selectionColor(),
            };
            // update last selected character reference
            this._lastSelectedChar = updatedChar;
            return updatedChar;
          }
          return c;
        })
      );
      this.lines.set(newLines);

      rangeToEmit = { at: event.char.id, run: 1 };
    }

    // emit events last, after all internal state is updated
    this.charPick.emit(event);
    this.rangePick.emit(rangeToEmit);
  }
}

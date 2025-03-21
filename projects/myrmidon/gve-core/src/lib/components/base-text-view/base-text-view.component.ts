import { CommonModule } from '@angular/common';
import { Component, effect, input, output } from '@angular/core';

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
  imports: [CommonModule, BaseTextCharComponent],
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

  public lines: BaseTextChar[][] = [];

  constructor() {
    // build lines when text or border color callback change
    effect(() => {
      this.buildLines(
        this.text(),
        this.colorCallback(),
        this.borderColorCallback()
      );
    });
  }

  private buildLines(
    text: CharNode[],
    colorCallback?: (node: CharNode) => string | null,
    borderColorCallback?: (node: CharNode) => string | null
  ): void {
    if (!text) {
      this.lines = [];
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

    this.lines = newLines;
  }

  private resetColors(): void {
    for (const line of this.lines) {
      for (const c of line) {
        c.color = c.oldColor || this.defaultColor();
        c.borderColor = c.oldBorderColor || this.defaultBorderColor();
      }
    }
  }

  public onCharPick(event: BaseTextCharEvent): void {
    this.resetColors();

    if (
      this._lastSelectedChar &&
      this._lastSelectedChar !== event.char &&
      event.event.ctrlKey
    ) {
      const minId = Math.min(this._lastSelectedChar.id, event.char.id);
      const maxId = Math.max(this._lastSelectedChar.id, event.char.id);

      for (const line of this.lines) {
        for (const c of line) {
          if (c.id >= minId && c.id <= maxId) {
            c.oldColor = c.color;
            c.oldBorderColor = c.borderColor;

            c.color = this.selectionColor();
            c.borderColor = this.selectionColor();
          }
        }
      }

      this.charPick.emit(event);
      this.rangePick.emit({ at: minId, run: maxId - minId + 1 });
      return;
    } else {
      // select current char
      event.char.oldColor = event.char.color;
      event.char.oldBorderColor = event.char.borderColor;

      event.char.color = this.selectionColor();
      event.char.borderColor = this.selectionColor();
      this.charPick.emit(event);
      this.rangePick.emit({ at: event.char.id, run: 1 });
    }

    this._lastSelectedChar = event.char;
  }
}

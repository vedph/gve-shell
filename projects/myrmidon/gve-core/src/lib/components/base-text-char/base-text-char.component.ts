import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatRipple } from '@angular/material/core';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

/**
 * A single character from a base text.
 */
export interface BaseTextChar {
  id: number;
  /**
   * The 0-based index of this character in the flat text sequence it
   * belongs to.
   */
  index: number;
  value: string;
  label: string;
  color: string;
  oldColor?: string;
  borderColor: string;
  oldBorderColor?: string;
  emSize: number;
}

/**
 * Event emitted by the base text character component when a character
 * is clicked.
 */
export interface BaseTextCharEvent {
  char: BaseTextChar;
  event: MouseEvent;
}

/**
 * 🔑 `gve-base-text-char`
 *
 * A component that displays a single character from a base text.
 * Used by `gve-base-text-view`.
 */
@Component({
  selector: 'gve-base-text-char',
  imports: [
    MatRipple,
    ColorToContrastPipe,
  ],
  templateUrl: './base-text-char.component.html',
  styleUrl: './base-text-char.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTextCharComponent {
  /**
   * The character to display.
   */
  public readonly char = input<BaseTextChar | undefined>();

  /**
   * True to show the character's index instead of its ID.
   */
  public readonly showIndex = input<boolean>(false);

  /**
   * Emitted when the character is clicked.
   */
  public readonly charPick = output<BaseTextCharEvent>();

  /**
   * Emitted when the character is double-clicked.
   */
  public readonly charDblPick = output<BaseTextCharEvent>();

  public readonly defaultColor = '#D8D8D8';
  public readonly defaultBorderColor = '#D8D8D8';
  public readonly defaultEmSize = 1.5;

  public onCharClick(event: MouseEvent): void {
    this.charPick.emit({ char: this.char()!, event });
  }

  public onCharDblClick(event: MouseEvent): void {
    this.charDblPick.emit({ char: this.char()!, event });
  }
}

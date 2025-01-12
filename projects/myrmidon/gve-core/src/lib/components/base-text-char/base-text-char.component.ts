import { Component, input, output } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';

import { ColorToContrastPipe } from '@myrmidon/ngx-tools';

/**
 * A single character from a base text.
 */
export interface BaseTextChar {
  id: number;
  value: string;
  label: string;
  color: string;
  borderColor: string;
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
  imports: [MatRippleModule, ColorToContrastPipe],
  templateUrl: './base-text-char.component.html',
  styleUrl: './base-text-char.component.css',
})
export class BaseTextCharComponent {
  public defaultColor = '#D8D8D8';
  public defaultBorderColor = '#D8D8D8';
  public defaultEmSize = 1.5;

  /**
   * The character to display.
   */
  public readonly char = input<BaseTextChar | undefined>();

  /**
   * Emitted when the character is clicked.
   */
  public readonly charPick = output<BaseTextCharEvent>();

  public onCharClick(event: MouseEvent): void {
    this.charPick.emit({ char: this.char()!, event });
  }
}

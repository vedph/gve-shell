import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { CharNode } from '../../models';
import { BaseTextRange } from '../base-text-view/base-text-view.component';

export interface OpTextRange extends BaseTextRange {
  /**
   * If true, the `at` property is treated as an index into the text
   * array rather than a node ID.
   */
  atAsIndex?: boolean;
}

/**
 * Text peephole component. This shows a window of a text version,
 * with a maximum number of characters, each with its text value and
 * numeric ID similar to the BaseTextCharComponent. Users can scroll
 * the window to "slide" the text and see its surrounding characters,
 * or double click to reset the window to its default position, where
 * selected characters are centered.
 */
@Component({
  selector: 'gve-text-peephole',
  imports: [
    MatIconButton,
    MatIcon,
  ],
  templateUrl: './text-peephole.component.html',
  styleUrl: './text-peephole.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextPeepholeComponent {
  private _dragStartX = 0;
  private _dragStartWindowStart = 0;

  /**
   * The total maximum number of characters to show in the window,
   * including the selected characters and their surrounding context.
   */
  public readonly windowWidth = input<number>(15);

  /**
   * The default size of the text in the peephole, in em units.
   * The size of the number below the text is computed from this
   * and it is smaller.
   */
  public readonly emSize = input<number>(1.0);

  /**
   * The full text of the version being peeked into.
   */
  public readonly text = input<CharNode[]>([]);

  /**
   * The range of selected characters. If not set, the peephole will show the
   * first character in the text plus its surrounding context.
   */
  public readonly selectedRange = input<OpTextRange | null>(null);

  /**
   * True to show each character's 0-based index in the displayed text
   * instead of its node ID. Set this to keep the peephole consistent with
   * `selectedRange.atAsIndex`.
   */
  public readonly showIndex = input<boolean>(false);

  /**
   * The index of the first character shown in the window.
   */
  public readonly windowStart = signal<number>(0);

  /**
   * True while the user is dragging the window to scroll it.
   */
  public readonly isDragging = signal<boolean>(false);

  /**
   * The highest allowed value for windowStart, so that the window
   * never scrolls past the end of the text.
   */
  private readonly maxWindowStart = computed(() =>
    Math.max(0, this.text().length - this.windowWidth()),
  );

  /**
   * The characters currently visible in the window.
   */
  public readonly visibleChars = computed(() => {
    const start = this.windowStart();
    return this.text().slice(start, start + this.windowWidth());
  });

  /**
   * The count of characters hidden to the left of the window.
   */
  public readonly hiddenLeftCount = computed(() => this.windowStart());

  /**
   * The count of characters hidden to the right of the window.
   */
  public readonly hiddenRightCount = computed(() =>
    Math.max(
      0,
      this.text().length - this.windowStart() - this.visibleChars().length,
    ),
  );

  /**
   * The [start,end] indexes (inclusive) of the selection in the full
   * text array, resolved from `selectedRange`, or null when there is
   * no selection or it cannot be resolved.
   */
  private readonly selectedIndexRange = computed(() => {
    const range = this.selectedRange();
    if (!range || range.run <= 0) {
      return null;
    }
    const start = this.resolveSelectionStartIndex(range);
    if (start === -1) {
      return null;
    }
    return { start, end: start + range.run - 1 };
  });

  constructor() {
    // recenter the window whenever the text or the selection changes
    effect(() => {
      this.text();
      this.selectedRange();
      this.windowStart.set(this.computeCenteredStart());
    });
  }

  private resolveSelectionStartIndex(range: OpTextRange): number {
    if (range.atAsIndex) {
      return range.at;
    }
    return this.text().findIndex((c) => c.id === range.at);
  }

  private computeCenteredStart(): number {
    const range = this.selectedRange();
    const length = this.text().length;
    const width = this.windowWidth();

    if (!range) {
      return 0;
    }

    const selectionStart = this.resolveSelectionStartIndex(range);
    if (selectionStart === -1) {
      return 0;
    }

    const selectionCenter = selectionStart + (range.run - 1) / 2;
    const start = Math.round(selectionCenter - (width - 1) / 2);

    return Math.max(0, Math.min(start, Math.max(0, length - width)));
  }

  private setWindowStart(value: number): void {
    this.windowStart.set(Math.max(0, Math.min(value, this.maxWindowStart())));
  }

  /**
   * True if the given index in the full text array is part of the
   * current selection.
   */
  public isSelected(index: number): boolean {
    const range = this.selectedIndexRange();
    return !!range && index >= range.start && index <= range.end;
  }

  /**
   * Computes the carousel scale of the character at the given position
   * in the visible window, so that edge characters appear smaller than
   * the ones at the center.
   */
  public getScale(position: number): number {
    const total = this.visibleChars().length;
    if (total <= 1) {
      return 1;
    }
    const center = (total - 1) / 2;
    const minScale = 0.55;
    return 1 - (Math.abs(position - center) / center) * (1 - minScale);
  }

  /**
   * Scrolls the window one character to the left.
   */
  public scrollLeft(): void {
    this.setWindowStart(this.windowStart() - 1);
  }

  /**
   * Scrolls the window one character to the right.
   */
  public scrollRight(): void {
    this.setWindowStart(this.windowStart() + 1);
  }

  /**
   * Recenters the window on the current selection (or on the start of
   * the text, when there is no selection).
   */
  public recenter(): void {
    this.windowStart.set(this.computeCenteredStart());
  }

  /**
   * Handles arrow key navigation when the component has keyboard focus.
   */
  public onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.scrollLeft();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.scrollRight();
    }
  }

  /**
   * Starts a drag-to-scroll interaction.
   */
  public onPointerDown(event: PointerEvent): void {
    this.isDragging.set(true);
    this._dragStartX = event.clientX;
    this._dragStartWindowStart = this.windowStart();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  /**
   * Updates the window position while dragging.
   */
  public onPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) {
      return;
    }
    const dx = event.clientX - this._dragStartX;
    const step = 24 * this.emSize();
    const deltaChars = Math.round(-dx / step);
    this.setWindowStart(this._dragStartWindowStart + deltaChars);
  }

  /**
   * Ends a drag-to-scroll interaction.
   */
  public onPointerUp(): void {
    this.isDragging.set(false);
  }

  /**
   * Recenters the window on double click.
   */
  public onWindowDblClick(): void {
    this.recenter();
  }
}

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { TextPeepholeComponent } from './text-peephole.component';
import { GveBaseTextService } from '../../services/gve-base-text.service';

describe('TextPeepholeComponent', () => {
  // 26 chars, IDs 1-26, indexes 0-25
  const text = GveBaseTextService.stringToBaseChars(
    'abcdefghijklmnopqrstuvwxyz',
  );

  const labels = (container: Element) =>
    Array.from(container.querySelectorAll('.c-label')).map((e) =>
      e.textContent!.trim(),
    );
  const ids = (container: Element) =>
    Array.from(container.querySelectorAll('.c-id')).map((e) =>
      e.textContent!.trim(),
    );

  it('should show nothing for empty text', async () => {
    const { container } = await render(TextPeepholeComponent);
    expect(container.querySelectorAll('.char-cell')).toHaveLength(0);
  });

  it('should show the first window when no selection', async () => {
    const { container, fixture } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 5 },
    });
    expect(labels(container)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ids(container)).toEqual(['1', '2', '3', '4', '5']);
    expect(fixture.componentInstance.hiddenLeftCount()).toBe(0);
    expect(fixture.componentInstance.hiddenRightCount()).toBe(21);
    expect(
      screen.getByRole('button', { name: 'Scroll window left' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Scroll window right' }),
    ).toBeEnabled();
  });

  it('should center the window on a selection by ID', async () => {
    const { container } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 5, selectedRange: { at: 11, run: 1 } },
    });
    // k (ID 11, index 10) centered
    expect(labels(container)).toEqual(['i', 'j', 'k', 'l', 'm']);
    const selected = Array.from(
      container.querySelectorAll('.c-label.selected'),
    ).map((e) => e.textContent!.trim());
    expect(selected).toEqual(['k']);
  });

  it('should center on a selection by index and show indexes', async () => {
    const { container } = await render(TextPeepholeComponent, {
      inputs: {
        text,
        windowWidth: 5,
        selectedRange: { at: 10, run: 3, atAsIndex: true },
        showIndex: true,
      },
    });
    // k-m (indexes 10-12) centered on l
    expect(labels(container)).toEqual(['j', 'k', 'l', 'm', 'n']);
    expect(ids(container)).toEqual(['9', '10', '11', '12', '13']);
    expect(container.querySelectorAll('.c-label.selected')).toHaveLength(3);
  });

  it('should clamp the window at the end of the text', async () => {
    const { container } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 5, selectedRange: { at: 26, run: 1 } },
    });
    expect(labels(container)).toEqual(['v', 'w', 'x', 'y', 'z']);
    expect(
      screen.getByRole('button', { name: 'Scroll window right' }),
    ).toBeDisabled();
  });

  it('should show the start when the selection is not found', async () => {
    const { container } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 3, selectedRange: { at: 999, run: 1 } },
    });
    expect(labels(container)).toEqual(['a', 'b', 'c']);
    expect(container.querySelectorAll('.selected')).toHaveLength(0);
  });

  it('should ignore selections with no run', async () => {
    const { fixture } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 3, selectedRange: { at: 1, run: 0 } },
    });
    expect(fixture.componentInstance.isSelected(0)).toBe(false);
  });

  it('should scroll with buttons and recenter on double click', async () => {
    const user = userEvent.setup();
    const { container } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 3, selectedRange: { at: 5, run: 1 } },
    });
    expect(labels(container)).toEqual(['d', 'e', 'f']);
    await user.click(screen.getByRole('button', { name: 'Scroll window right' }));
    expect(labels(container)).toEqual(['e', 'f', 'g']);
    await user.click(screen.getByRole('button', { name: 'Scroll window left' }));
    await user.click(screen.getByRole('button', { name: 'Scroll window left' }));
    expect(labels(container)).toEqual(['c', 'd', 'e']);
    await user.dblClick(container.querySelector('.window')!);
    expect(labels(container)).toEqual(['d', 'e', 'f']);
  });

  it('should scroll with arrow keys', async () => {
    const user = userEvent.setup();
    const { container } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 3 },
    });
    (container.querySelector('.window') as HTMLElement).focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(labels(container)).toEqual(['c', 'd', 'e']);
    await user.keyboard('{ArrowLeft}');
    expect(labels(container)).toEqual(['b', 'c', 'd']);
    // other keys are ignored
    await user.keyboard('x');
    expect(labels(container)).toEqual(['b', 'c', 'd']);
  });

  it('should not scroll before the start', async () => {
    const { fixture } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 3 },
    });
    fixture.componentInstance.scrollLeft();
    expect(fixture.componentInstance.windowStart()).toBe(0);
  });

  it('should scroll by dragging', async () => {
    const { container, fixture } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 3, emSize: 1 },
    });
    const win = container.querySelector('.window') as HTMLElement;
    // moving the pointer without a drag does nothing
    fireEvent.pointerMove(win, { clientX: 0 });
    expect(fixture.componentInstance.windowStart()).toBe(0);

    fireEvent.pointerDown(win, { clientX: 100 });
    expect(fixture.componentInstance.isDragging()).toBe(true);
    // dragging left by 2 chars (24px per em) scrolls right by 2
    fireEvent.pointerMove(win, { clientX: 52 });
    expect(fixture.componentInstance.windowStart()).toBe(2);
    fireEvent.pointerUp(win);
    expect(fixture.componentInstance.isDragging()).toBe(false);
    fireEvent.pointerMove(win, { clientX: 0 });
    expect(fixture.componentInstance.windowStart()).toBe(2);
  });

  it('should compute carousel scales', async () => {
    const { fixture } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 5 },
    });
    const c = fixture.componentInstance;
    expect(c.getScale(2)).toBe(1);
    expect(c.getScale(0)).toBeCloseTo(0.55);
    expect(c.getScale(4)).toBeCloseTo(0.55);
  });

  it('should use scale 1 for a single char', async () => {
    const { fixture } = await render(TextPeepholeComponent, {
      inputs: { text: text.slice(0, 1) },
    });
    expect(fixture.componentInstance.getScale(0)).toBe(1);
  });

  it('should recenter when the selection changes', async () => {
    const { container, fixture } = await render(TextPeepholeComponent, {
      inputs: { text, windowWidth: 3, selectedRange: { at: 5, run: 1 } },
    });
    fixture.componentRef.setInput('selectedRange', { at: 20, run: 1 });
    await fixture.whenStable();
    expect(labels(container)).toEqual(['s', 't', 'u']);
  });
});

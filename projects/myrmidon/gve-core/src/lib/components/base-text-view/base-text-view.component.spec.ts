import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  BaseTextRange,
  BaseTextViewComponent,
} from './base-text-view.component';
import { BaseTextCharEvent } from '../base-text-char/base-text-char.component';
import { CharNode } from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';

describe('BaseTextViewComponent', () => {
  let clipboard: { copy: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clipboard = { copy: vi.fn() };
    snackBar = { open: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function setup(
    text: CharNode[] | string = 'abc\nde',
    inputs: Record<string, unknown> = {},
  ) {
    const charPick = vi.fn<(e: BaseTextCharEvent) => void>();
    const rangePick = vi.fn<(r: BaseTextRange) => void>();
    const result = await render(BaseTextViewComponent, {
      inputs: {
        text:
          typeof text === 'string'
            ? GveBaseTextService.stringToBaseChars(text)
            : text,
        ...inputs,
      },
      on: { charPick, rangePick },
      providers: [
        { provide: Clipboard, useValue: clipboard },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    const chars = () =>
      Array.from(
        result.container.querySelectorAll('gve-base-text-char #container'),
      ) as HTMLElement[];
    return { ...result, charPick, rangePick, chars };
  }

  const colorOf = (el: HTMLElement) =>
    (el.querySelector('#c-id') as HTMLElement).style.backgroundColor;

  it('should render lines split at LF', async () => {
    const { container } = await setup();
    const lines = container.querySelectorAll('.line');
    expect(lines).toHaveLength(2);
    // LF stays at the end of its line
    expect(lines[0].querySelectorAll('gve-base-text-char')).toHaveLength(4);
    expect(lines[1].querySelectorAll('gve-base-text-char')).toHaveLength(2);
  });

  it('should limit the text height only when requested', async () => {
    const { container, fixture } = await setup();
    const text = () => container.querySelector('#text') as HTMLElement;
    expect(text().style.maxHeight).toBe('');
    fixture.componentRef.setInput('maxHeight', '10em');
    await fixture.whenStable();
    expect(text().style.maxHeight).toBe('10em');
    expect(text().style.overflowY).toBe('auto');
  });

  it('should render nothing for empty text', async () => {
    const { container } = await setup([]);
    expect(container.querySelectorAll('.line')).toHaveLength(0);
  });

  it('should render line numbers when requested', async () => {
    const { container } = await setup('a\nb', { hasLineNumber: true });
    const nrs = Array.from(container.querySelectorAll('.nr')).map((e) =>
      e.textContent!.trim(),
    );
    expect(nrs).toEqual(['1', '2']);
  });

  it('should use color callbacks and defaults', async () => {
    const { chars } = await setup('ab', {
      defaultColor: '#000001',
      colorCallback: (n: CharNode) => (n.id === 1 ? '#0000FF' : null),
      borderColorCallback: (n: CharNode) => (n.id === 2 ? '#00FF00' : null),
    });
    expect(colorOf(chars()[0])).toBe('rgb(0, 0, 255)');
    expect(colorOf(chars()[1])).toBe('rgb(0, 0, 1)');
    expect(
      (chars()[1].querySelector('#c-label') as HTMLElement).style.borderColor,
    ).toBe('rgb(0, 255, 0)');
  });

  it('should pick a single char', async () => {
    const { chars, charPick, rangePick, fixture } = await setup();
    await userEvent.click(chars()[1]);
    expect(charPick).toHaveBeenCalledTimes(1);
    expect(charPick.mock.calls[0][0].char.id).toBe(2);
    expect(rangePick).toHaveBeenCalledWith({ at: 2, run: 1 });
    expect(fixture.componentInstance.hasSelection()).toBe(true);
    expect(colorOf(chars()[1])).toBe('rgb(62, 146, 204)');
  });

  it('should pick a range with ctrl+click in both directions', async () => {
    const user = userEvent.setup();
    const { chars, rangePick } = await setup();
    await user.click(chars()[4]);
    await user.keyboard('{Control>}');
    await user.click(chars()[1]);
    await user.keyboard('{/Control}');
    expect(rangePick).toHaveBeenLastCalledWith({ at: 2, run: 4 });
    // selection highlighted for positions 1-4
    const selected = chars().map((c) => colorOf(c) === 'rgb(62, 146, 204)');
    expect(selected).toEqual([false, true, true, true, true, false]);
  });

  it('should emit a range using the ID at the first position', async () => {
    // non-contiguous IDs, as in a version text
    const text: CharNode[] = [
      { id: 10, label: 'x', data: 'x' },
      { id: 3, label: 'y', data: 'y' },
      { id: 7, label: 'z', data: 'z' },
    ];
    const user = userEvent.setup();
    const { chars, rangePick } = await setup(text);
    await user.click(chars()[2]);
    await user.keyboard('{Control>}');
    await user.click(chars()[1]);
    await user.keyboard('{/Control}');
    expect(rangePick).toHaveBeenLastCalledWith({ at: 3, run: 2 });
  });

  it('should treat ctrl+click on the same char as a single pick', async () => {
    const user = userEvent.setup();
    const { chars, rangePick } = await setup();
    await user.click(chars()[1]);
    await user.keyboard('{Control>}');
    await user.click(chars()[1]);
    await user.keyboard('{/Control}');
    expect(rangePick).toHaveBeenLastCalledWith({ at: 2, run: 1 });
  });

  it('should ignore picks of unknown or missing chars', async () => {
    const { fixture, charPick } = await setup();
    const c = fixture.componentInstance;
    c.onCharPick(undefined as unknown as BaseTextCharEvent);
    c.onCharPick({
      char: { id: 999 } as never,
      event: new MouseEvent('click'),
    });
    expect(charPick).not.toHaveBeenCalled();
  });

  describe('keyboard navigation', () => {
    async function focused() {
      const s = await setup('abcdef');
      await userEvent.click(s.chars()[2]);
      s.charPick.mockClear();
      s.rangePick.mockClear();
      (s.container.querySelector('#text') as HTMLElement).focus();
      return s;
    }

    it('should do nothing without selection', async () => {
      const { container, rangePick } = await setup('abc');
      (container.querySelector('#text') as HTMLElement).focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(rangePick).not.toHaveBeenCalled();
    });

    it('should move a single selection with arrows', async () => {
      const { rangePick, charPick } = await focused();
      await userEvent.keyboard('{ArrowRight}');
      expect(rangePick).toHaveBeenLastCalledWith({ at: 4, run: 1 });
      expect(charPick.mock.calls[0][0].char.id).toBe(4);
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(rangePick).toHaveBeenLastCalledWith({ at: 2, run: 1 });
    });

    it('should clamp at text boundaries', async () => {
      const { rangePick } = await focused();
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}');
      expect(rangePick).toHaveBeenLastCalledWith({ at: 1, run: 1 });
      await userEvent.keyboard(
        '{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}',
      );
      expect(rangePick).toHaveBeenLastCalledWith({ at: 6, run: 1 });
    });

    it('should extend and shrink with shift+arrows', async () => {
      const { rangePick, charPick } = await focused();
      // anchor at position 2 (ID 3)
      await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
      expect(rangePick).toHaveBeenLastCalledWith({ at: 3, run: 3 });
      // no charPick for ranges
      expect(charPick).not.toHaveBeenCalled();
      await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
      expect(rangePick).toHaveBeenLastCalledWith({ at: 3, run: 2 });
      await userEvent.keyboard('{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}');
      expect(rangePick).toHaveBeenLastCalledWith({ at: 2, run: 2 });
      await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
      expect(rangePick).toHaveBeenLastCalledWith({ at: 3, run: 1 });
    });

    it('should ignore other keys', async () => {
      const { rangePick } = await focused();
      await userEvent.keyboard('x');
      expect(rangePick).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should highlight matches after debounce, case-insensitively', async () => {
      vi.useFakeTimers();
      const { fixture, chars } = await setup('abAB');
      const c = fixture.componentInstance;
      c.onSearchInput('ab');
      expect(c.isSearchActive()).toBe(true);
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      expect(c.matchCount()).toBe(4);
      expect(chars().every((e) => colorOf(e) === 'rgb(255, 213, 79)')).toBe(
        true,
      );
    });

    it('should find no matches', async () => {
      vi.useFakeTimers();
      const { fixture, container } = await setup('abc');
      fixture.componentInstance.onSearchInput('zz');
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      expect(fixture.componentInstance.matchCount()).toBe(0);
      expect(container.querySelector('.match-count.no-matches')).toHaveTextContent(
        '0',
      );
    });

    it('should clear search highlights and select a clicked char', async () => {
      const { fixture, chars, charPick, rangePick } = await setup('abAB');
      const c = fixture.componentInstance;
      c.onSearchInput('ab');
      await new Promise((r) => setTimeout(r, 350));
      await fixture.whenStable();
      expect(c.matchCount()).toBe(4);

      await userEvent.click(chars()[2]);
      await fixture.whenStable();
      expect(c.searchQuery()).toBe('');
      expect(c.matchCount()).toBe(0);
      expect(c.hasSelection()).toBe(true);
      expect(rangePick).toHaveBeenLastCalledWith({ at: 3, run: 1 });
      expect(charPick).toHaveBeenCalled();
      // the clicked char shows the selection color, the others no more
      // the search highlight color
      expect(colorOf(chars()[2])).toBe('rgb(62, 146, 204)');
      for (const i of [0, 1, 3]) {
        expect(colorOf(chars()[i])).not.toBe('rgb(255, 213, 79)');
        expect(colorOf(chars()[i])).not.toBe('rgb(62, 146, 204)');
      }
      expect((screen.getByPlaceholderText('search') as HTMLInputElement).value).toBe('');
    });

    it('should clear the search', async () => {
      vi.useFakeTimers();
      const { fixture } = await setup('abc');
      const c = fixture.componentInstance;
      c.onSearchInput('a');
      vi.advanceTimersByTime(300);
      c.clearSearch();
      expect(c.searchQuery()).toBe('');
      expect(c.matchCount()).toBe(0);
      expect(c.isSearchActive()).toBe(false);
    });

    it('should search the same query again after clearing it', async () => {
      vi.useFakeTimers();
      const { fixture } = await setup('abc');
      const c = fixture.componentInstance;
      c.onSearchInput('b');
      vi.advanceTimersByTime(300);
      expect(c.matchCount()).toBe(1);
      c.clearSearch();
      c.onSearchInput('b');
      vi.advanceTimersByTime(300);
      expect(c.matchCount()).toBe(1);
    });

    it('should not highlight a search pending when cleared', async () => {
      vi.useFakeTimers();
      const { fixture } = await setup('abc');
      const c = fixture.componentInstance;
      c.onSearchInput('b');
      c.clearSearch();
      vi.advanceTimersByTime(300);
      expect(c.matchCount()).toBe(0);
    });

    it('should clear search matches for an empty query', async () => {
      vi.useFakeTimers();
      const { fixture } = await setup('abc');
      const c = fixture.componentInstance;
      c.onSearchInput('b');
      vi.advanceTimersByTime(300);
      c.onSearchInput('');
      vi.advanceTimersByTime(300);
      expect(c.matchCount()).toBe(0);
    });

    it('should search from the toolbar input and clear with its button', async () => {
      const user = userEvent.setup();
      const { fixture } = await setup('abc');
      await user.type(screen.getByPlaceholderText('search'), 'c');
      expect(fixture.componentInstance.searchQuery()).toBe('c');
      await user.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(fixture.componentInstance.searchQuery()).toBe('');
    });
  });

  it('should reset selection and search when text changes', async () => {
    const { fixture, chars } = await setup('abc');
    await userEvent.click(chars()[0]);
    fixture.componentInstance.onSearchInput('a');
    fixture.componentRef.setInput(
      'text',
      GveBaseTextService.stringToBaseChars('xyz'),
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.hasSelection()).toBe(false);
    expect(fixture.componentInstance.searchQuery()).toBe('');
  });

  describe('copy', () => {
    it('should disable copy buttons without selection', async () => {
      await setup('abc');
      expect(screen.getByRole('button', { name: /^copy$/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /copy coords/ })).toBeDisabled();
    });

    it('should do nothing on copy without selection', async () => {
      const { fixture } = await setup('abc');
      fixture.componentInstance.copySelection();
      fixture.componentInstance.copyCoordinates();
      expect(clipboard.copy).not.toHaveBeenCalled();
    });

    it('should copy the selected text and coordinates', async () => {
      const user = userEvent.setup();
      const { chars } = await setup('abcd');
      await user.click(chars()[1]);
      await user.click(screen.getByRole('button', { name: /copy coords/ }));
      expect(clipboard.copy).toHaveBeenLastCalledWith('2');
      await user.keyboard('{Control>}');
      await user.click(chars()[2]);
      await user.keyboard('{/Control}');
      await user.click(screen.getByRole('button', { name: /^copy$/ }));
      expect(clipboard.copy).toHaveBeenLastCalledWith('bc');
      await user.click(screen.getByRole('button', { name: /copy coords/ }));
      expect(clipboard.copy).toHaveBeenLastCalledWith('2x2');
      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  it('should toggle between IDs and indexes', async () => {
    const user = userEvent.setup();
    const { container, fixture } = await setup('ab');
    const ids = () =>
      Array.from(container.querySelectorAll('#c-id')).map((e) =>
        e.textContent!.trim(),
      );
    expect(ids()).toEqual(['1', '2']);
    await user.click(screen.getByRole('button', { name: /^id$/ }));
    expect(fixture.componentInstance.showIndex()).toBe(true);
    expect(ids()).toEqual(['0', '1']);
  });

  describe('picked IDs', () => {
    it('should collect, copy and clear double-clicked IDs', async () => {
      const user = userEvent.setup();
      const { chars, container, fixture } = await setup('abc');
      await user.dblClick(chars()[0]);
      await user.dblClick(chars()[2]);
      expect(container.querySelector('.picked-ids')).toHaveTextContent('1 3');
      await user.click(
        screen.getByRole('button', { name: 'Copy collected IDs to clipboard' }),
      );
      expect(clipboard.copy).toHaveBeenCalledWith('1 3');
      await user.click(screen.getByRole('button', { name: 'Clear collected IDs' }));
      expect(fixture.componentInstance.pickedIds()).toBe('');
      expect(container.querySelector('.picked-ids')).toBeNull();
    });

    it('should ignore empty events and not copy empty IDs', async () => {
      const { fixture } = await setup('abc');
      fixture.componentInstance.onCharDblPick(
        undefined as unknown as BaseTextCharEvent,
      );
      fixture.componentInstance.copyPickedIds();
      expect(fixture.componentInstance.pickedIds()).toBe('');
      expect(clipboard.copy).not.toHaveBeenCalled();
    });
  });

});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SnapshotTextEditorComponent } from './snapshot-text-editor.component';
import { GveBaseTextService } from '../../services/gve-base-text.service';
import { CharNode } from '../../models';

describe('SnapshotTextEditorComponent', () => {
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    snackBar = { open: vi.fn() };
  });

  async function setup(
    inputs: Record<string, unknown> = {},
    dialog?: { ref: { close: ReturnType<typeof vi.fn> }; data?: unknown },
  ) {
    const providers: unknown[] = [{ provide: MatSnackBar, useValue: snackBar }];
    if (dialog) {
      providers.push({ provide: MatDialogRef, useValue: dialog.ref });
      providers.push({ provide: MAT_DIALOG_DATA, useValue: dialog.data });
    }
    const result = await render(SnapshotTextEditorComponent, {
      inputs,
      providers: providers as never[],
    });
    const changes: CharNode[][] = [];
    result.fixture.componentInstance.text.subscribe((t) => changes.push(t));
    return { ...result, c: result.fixture.componentInstance, changes };
  }

  it('should show the text of the received nodes', async () => {
    await setup({ text: GveBaseTextService.stringToBaseChars('ab\nc') });
    expect(screen.getByRole('textbox', { name: 'base text' })).toHaveValue(
      'ab\nc',
    );
  });

  it('should not show dialog parts outside a dialog', async () => {
    await setup();
    expect(screen.queryByText('Set Base Text')).toBeNull();
    expect(screen.queryByRole('button', { name: 'close' })).toBeNull();
  });

  it('should set trimmed text lines', async () => {
    const user = userEvent.setup();
    const { changes, c } = await setup();
    await user.type(
      screen.getByRole('textbox', { name: 'base text' }),
      '  ab  {Enter} c ',
    );
    await user.click(screen.getByRole('button', { name: 'set' }));
    expect(c.userText.value).toBe('ab\nc');
    expect(changes.at(-1)).toEqual(GveBaseTextService.stringToBaseChars('ab\nc'));
  });

  it('should not set invalid or blank text', async () => {
    const { c, changes } = await setup();
    c.save();
    c.userText.setValue('   ');
    c.save();
    expect(changes).toEqual([]);
  });

  it('should show validation errors', async () => {
    const user = userEvent.setup();
    const { fixture } = await setup();
    const input = screen.getByRole('textbox', { name: 'base text' });
    await user.type(input, 'x');
    await user.clear(input);
    await user.tab();
    await fixture.whenStable();
    expect(screen.getByText('text required')).toBeInTheDocument();
    await user.click(input);
    await user.paste('x'.repeat(5001));
    await fixture.whenStable();
    expect(screen.getByText('text too long')).toBeInTheDocument();
  });

  it('should copy JSON to the clipboard', async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, 'writeText');
    await setup({ text: GveBaseTextService.stringToBaseChars('ab') });
    await user.click(screen.getByRole('button', { name: 'JSON' }));
    expect(write).toHaveBeenCalledWith(
      JSON.stringify(GveBaseTextService.stringToBaseChars('ab')),
    );
    expect(snackBar.open).toHaveBeenCalled();
  });

  describe('as dialog', () => {
    it('should load text from dialog data and close with result', async () => {
      const user = userEvent.setup();
      const ref = { close: vi.fn() };
      await setup(
        {},
        {
          ref,
          data: {
            payload: { text: GveBaseTextService.stringToBaseChars('xy') },
          },
        },
      );
      expect(screen.getByText('Set Base Text')).toBeInTheDocument();
      const input = screen.getByRole('textbox', { name: 'base text' });
      expect(input).toHaveValue('xy');
      await user.type(input, 'z');
      await user.click(screen.getByRole('button', { name: 'set' }));
      expect(ref.close).toHaveBeenCalledWith(
        GveBaseTextService.stringToBaseChars('xyz'),
      );
    });

    it('should close without result', async () => {
      const ref = { close: vi.fn() };
      await setup({}, { ref });
      await userEvent.click(screen.getByRole('button', { name: 'close' }));
      expect(ref.close).toHaveBeenCalledWith();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';

import { BatchOperationEditorComponent } from './batch-operation-editor.component';
import { GveApiService } from '../../services/gve-api.service';
import {
  CharChainOperation,
  OperationType,
  ResultWrapper,
} from '../../models';

const OPS: CharChainOperation[] = [
  { id: 'a', type: OperationType.delete, at: 1, run: 1 },
];

describe('BatchOperationEditorComponent', () => {
  let api: { parseOperations: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { parseOperations: vi.fn(() => of({ result: OPS })) };
  });

  async function setup(
    inputs: Record<string, unknown> = {},
    dialog?: { ref: { close: ReturnType<typeof vi.fn> }; data?: unknown },
  ) {
    const operationsChange = vi.fn();
    const providers: unknown[] = [{ provide: GveApiService, useValue: api }];
    if (dialog) {
      providers.push({ provide: MatDialogRef, useValue: dialog.ref });
      providers.push({ provide: MAT_DIALOG_DATA, useValue: dialog.data });
    }
    const result = await render(BatchOperationEditorComponent, {
      inputs,
      on: { operationsChange },
      providers: providers as never[],
    });
    return { ...result, c: result.fixture.componentInstance, operationsChange };
  }

  it('should disable batch add without text', async () => {
    await setup();
    expect(screen.getByRole('button', { name: 'batch add' })).toBeDisabled();
    expect(api.parseOperations).not.toHaveBeenCalled();
  });

  it('should parse typed text and emit operations', async () => {
    const user = userEvent.setup();
    const { operationsChange, c } = await setup();
    await user.type(screen.getByRole('textbox', { name: 'operations' }), 'x');
    await user.click(screen.getByRole('button', { name: 'batch add' }));
    expect(api.parseOperations).toHaveBeenCalledWith('x');
    expect(operationsChange).toHaveBeenCalledWith(OPS);
    expect(c.busy()).toBe(false);
  });

  it('should emit an empty array for a missing result', async () => {
    api.parseOperations.mockReturnValue(of({}));
    const { c, operationsChange } = await setup();
    c.parseOperations('x');
    expect(operationsChange).toHaveBeenCalledWith([]);
  });

  it('should parse the preset input', async () => {
    const { operationsChange } = await setup({ preset: 'p' });
    expect(api.parseOperations).toHaveBeenCalledWith('p');
    expect(operationsChange).toHaveBeenCalledWith(OPS);
  });

  it('should show a parse error', async () => {
    api.parseOperations.mockReturnValue(of({ error: 'bad syntax' }));
    const { c, fixture, operationsChange } = await setup();
    c.parseOperations('x');
    await fixture.whenStable();
    expect(screen.getByText('bad syntax')).toBeInTheDocument();
    expect(operationsChange).not.toHaveBeenCalled();
    expect(c.busy()).toBe(false);
  });

  it('should recover from an API error', async () => {
    api.parseOperations.mockReturnValue(
      throwError(() => new Error('network down')),
    );
    const { c, fixture } = await setup();
    c.parseOperations('x');
    await fixture.whenStable();
    expect(screen.getByText('network down')).toBeInTheDocument();
    // not stuck busy: the user can retry
    expect(c.busy()).toBe(false);
    api.parseOperations.mockReturnValue(of({ result: OPS }));
    c.parseOperations('x');
    expect(api.parseOperations).toHaveBeenCalledTimes(2);
  });

  it('should ignore requests while busy or without text', async () => {
    const pending = new Subject<ResultWrapper<CharChainOperation[]>>();
    api.parseOperations.mockReturnValue(pending);
    const { c } = await setup();
    c.parseOperations('');
    expect(api.parseOperations).not.toHaveBeenCalled();
    c.parseOperations('x');
    c.parseOperations('y');
    expect(api.parseOperations).toHaveBeenCalledTimes(1);
    expect(c.busy()).toBe(true);
    pending.next({ result: OPS });
    pending.complete();
    expect(c.busy()).toBe(false);
  });

  describe('as dialog', () => {
    it('should parse the dialog preset and close with result', async () => {
      const ref = { close: vi.fn() };
      await setup({}, { ref, data: { payload: { preset: 'p' } } });
      expect(screen.getByText('Add Operations')).toBeInTheDocument();
      expect(api.parseOperations).toHaveBeenCalledWith('p');
      expect(ref.close).toHaveBeenCalledWith(OPS);
    });

    it('should close without result', async () => {
      const ref = { close: vi.fn() };
      await setup({}, { ref });
      await userEvent.click(screen.getByRole('button', { name: 'close' }));
      expect(ref.close).toHaveBeenCalledWith();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, of, throwError } from 'rxjs';
import { DialogService } from '@myrmidon/ngx-mat-tools';
import { DEFAULT_SETTINGS } from '@myrmidon/gve-snapshot-rendition';

import { SnapshotEditorComponent } from './snapshot-editor.component';
import {
  CharChainResult,
  GveApiService,
} from '../../services/gve-api.service';
import {
  CharChainOperation,
  OperationType,
  ResultWrapper,
  Snapshot,
} from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
// the form tags the objects in its own draft arrays with a hidden identity
// symbol: compare draft values through a JSON round-trip
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const op = (
  id: string,
  props: Partial<CharChainOperation> = {},
): CharChainOperation => ({
  id,
  type: OperationType.annotate,
  at: 1,
  run: 1,
  ...props,
});

/**
 * Build a fake execution result for the specified operations, where each
 * operation N (1-based) takes vN-1 as input and outputs vN, unless the
 * operation defines its own tags.
 */
function fakeResult(ops: CharChainOperation[]): CharChainResult {
  const nodes = GveBaseTextService.stringToBaseChars('abc');
  const versionNodeIds: { [tag: string]: number[] } = { v0: [1, 2, 3] };
  const steps = ops.map((o, i) => {
    const inputTag = o.inputTag || `v${i}`;
    const outputTag = o.outputTag || `v${i + 1}`;
    versionNodeIds[outputTag] = [1, 2, 3, 100 + i];
    nodes.push({
      id: 100 + i,
      label: `${i}`,
      data: `${i}`,
      sourceTag: outputTag,
      features: { [outputTag]: [{ name: 'f', value: `${i}`, setPolicy: 0 }] },
    });
    return {
      operation: o,
      inputTag,
      outputTag,
      result: 'abc',
      refNodeIds: [],
    };
  });
  return {
    steps,
    chainDump: '',
    chainTags: ['v0', ...steps.map((s) => s.outputTag)],
    nodes,
    versionNodeIds,
    globalFeatures: { v0: [] },
  };
}

describe('SnapshotEditorComponent', () => {
  let api: {
    runOperations: ReturnType<typeof vi.fn>;
    getDsl: ReturnType<typeof vi.fn>;
  };
  let dialog: { confirm: ReturnType<typeof vi.fn> };
  let matDialog: { open: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = {
      runOperations: vi.fn(
        (_t: unknown, ops: CharChainOperation[]) =>
          of({ result: fakeResult(ops) }) as Observable<
            ResultWrapper<CharChainResult>
          >,
      ),
      getDsl: vi.fn(() => of({ result: ['a', 'b'] })),
    };
    dialog = { confirm: vi.fn(() => of(true)) };
    matDialog = { open: vi.fn() };
    snackBar = { open: vi.fn() };
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  async function setup(inputs: Record<string, unknown> = {}) {
    const snapshotCancel = vi.fn();
    const result = await render(SnapshotEditorComponent, {
      inputs,
      on: { snapshotCancel },
      providers: [
        { provide: GveApiService, useValue: api },
        { provide: DialogService, useValue: dialog },
        { provide: MatDialog, useValue: matDialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    const saved: (Snapshot | undefined)[] = [];
    result.fixture.componentInstance.snapshot.subscribe((s) => saved.push(s));
    return {
      ...result,
      c: result.fixture.componentInstance,
      saved,
      snapshotCancel,
      showOperations: async () => {
        await userEvent.click(screen.getByRole('tab', { name: /operations/ }));
        await wait(600);
        await result.fixture.whenStable();
      },
    };
  }

  const SNAPSHOT = (): Snapshot => ({
    text: 'ab\nc',
    operations: [op('o1'), op('o2'), op('o3')],
  });

  describe('form structure', () => {
    it('should render no <form> element, so it stays valid at any nesting depth', async () => {
      const { container } = await setup({ snapshot: SNAPSHOT() });
      expect(container.querySelector('form')).toBeNull();
    });

    it('should not save when pressing Enter in a nested search box', async () => {
      const user = userEvent.setup();
      const { saved } = await setup({ snapshot: SNAPSHOT() });
      const [search] = screen.getAllByPlaceholderText('search');
      await user.type(search, 'a{Enter}');
      expect(saved).toEqual([]);
    });

    it('should save clean copies, never tagging the bound objects', async () => {
      const snapshot: Snapshot = {
        text: GveBaseTextService.stringToBaseChars('ab'),
        operations: [op('o1', { features: [{ name: 'f', value: 'v', setPolicy: 0 }] })],
      };
      const { c, saved } = await setup({ snapshot });
      c.duplicateOperation(0);
      c.save();
      const symbols = (o: object) => Object.getOwnPropertySymbols(o).length;
      for (const o of [
        ...(snapshot.text as object[]),
        ...snapshot.operations,
        ...(saved.at(-1)!.text as object[]),
        ...saved.at(-1)!.operations,
        ...saved.at(-1)!.operations.flatMap((o) => o.features || []),
      ]) {
        expect(symbols(o)).toBe(0);
      }
    });
  });

  describe('loading', () => {
    it('should load a string snapshot and run its operations', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      expect(plain(c.form.baseText().value())).toEqual(
        GveBaseTextService.stringToBaseChars('ab\nc'),
      );
      expect(c.lineCount()).toBe(2);
      expect(c.form.operations().value().map((o) => o.id)).toEqual([
        'o1',
        'o2',
        'o3',
      ]);
      expect(api.runOperations).toHaveBeenCalledTimes(1);
      expect(c.result()!.steps).toHaveLength(3);
      expect(c.resultOperationId()).toBe('o3');
      expect(c.initialStepIndex()).toBe(2);
      expect(c.busy()).toBe(false);
      expect(c.form().dirty()).toBe(false);
    });

    it('should load a nodes snapshot', async () => {
      const nodes = GveBaseTextService.stringToBaseChars('xy');
      const { c } = await setup({ snapshot: { text: nodes, operations: [] } });
      // a copy: the form must not tag the caller's nodes
      expect(plain(c.form.baseText().value())).toEqual(nodes);
      expect(c.form.baseText().value()).not.toBe(nodes);
      expect(c.lineCount()).toBe(1);
      // no operations: nothing to run
      expect(api.runOperations).not.toHaveBeenCalled();
      expect(c.result()).toBeUndefined();
    });

    it('should reset without snapshot', async () => {
      const { c } = await setup();
      expect(c.form.baseText().value()).toEqual([]);
      expect(c.lineCount()).toBe(0);
      expect(c.form.operations().value()).toEqual([]);
    });

    it('should list operations', async () => {
      const { container, showOperations } = await setup({
        snapshot: {
          text: 'abc',
          operations: [
            op('o1', {
              type: OperationType.replace,
              value: 'x',
              groupId: 'g',
              sources: [{ id: 's1', type: 't' }],
              features: [{ name: 'version', value: 'draft', setPolicy: 0 }],
            }),
          ],
        },
      });
      await showOperations();
      const cells = Array.from(container.querySelectorAll('#list tbody td')).map(
        (td) => td.textContent!.trim(),
      );
      expect(cells[0]).toBe('1.');
      expect(cells).toContain('o1');
      expect(cells).toContain('replace');
      expect(cells).toContain('x');
      expect(cells).toContain('g');
    });

    it('should apply rendition settings without mutating the defaults', async () => {
      const before = structuredClone(DEFAULT_SETTINGS);
      const { fixture } = await setup({ snapshot: SNAPSHOT(), debug: true });
      await fixture.whenStable();
      expect(DEFAULT_SETTINGS).toEqual(before);
    });

    it('should add the rendition listener once, however many results arrive', async () => {
      const { c, container, fixture } = await setup({ snapshot: SNAPSHOT() });
      await fixture.whenStable();
      const rendition = container.querySelector(
        'gve-snapshot-rendition',
      ) as HTMLElement & {
        data: { steps: unknown };
        settings: { debug?: boolean };
      };
      expect(rendition).not.toBeNull();

      // new results (each run returns a new result object)
      for (let i = 0; i < 3; i++) {
        c.runToLast();
        await fixture.whenStable();
      }
      // the latest result still reaches the rendition
      expect(rendition.data.steps).toBe(c.result()!.steps);

      const log = vi.mocked(console.log);
      log.mockClear();
      rendition.dispatchEvent(
        new CustomEvent('versionTagChange', { detail: 'v1' }),
      );
      const changes = log.mock.calls.filter((a) => a[0] === 'Version changed:');
      expect(changes).toHaveLength(1);

      // settings still follow their inputs
      fixture.componentRef.setInput('debug', true);
      await fixture.whenStable();
      expect(rendition.settings.debug).toBe(true);
    });
  });

  describe('saving', () => {
    it('should save the snapshot', async () => {
      const user = userEvent.setup();
      const { saved } = await setup({ snapshot: SNAPSHOT() });
      await user.click(screen.getByRole('button', { name: /save/ }));
      expect(saved).toHaveLength(1);
      expect(saved[0]!.text).toEqual(
        GveBaseTextService.stringToBaseChars('ab\nc'),
      );
      expect(saved[0]!.operations.map((o) => o.id)).toEqual([
        'o1',
        'o2',
        'o3',
      ]);
    });

    it('should not save when noSave', async () => {
      const { c, saved } = await setup({ snapshot: SNAPSHOT(), noSave: true });
      expect(screen.queryByRole('button', { name: /save/ })).toBeNull();
      c.save();
      expect(saved).toEqual([]);
    });

    it('should not save an invalid form', async () => {
      const { c, saved } = await setup();
      c.save();
      expect(saved).toEqual([]);
    });

    it('should emit cancel on close', async () => {
      const { snapshotCancel } = await setup({ snapshot: SNAPSHOT() });
      await userEvent.click(screen.getByRole('button', { name: /close/ }));
      expect(snapshotCancel).toHaveBeenCalled();
    });
  });

  describe('editing operations', () => {
    it('should edit a new operation from the picked range', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.onRangePick({ at: 2, run: 3 });
      c.editNewOperation();
      expect(c.editedOp()).toEqual(
        expect.objectContaining({ type: 0, at: 2, run: 3 }),
      );
      expect(c.editedOp()!.id).toMatch(/^[0-9a-f]{10}$/);
      expect(c.editedOpIndex()).toBe(-1);
    });

    it('should edit a new operation with default range', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editNewOperation();
      expect(c.editedOp()).toEqual(expect.objectContaining({ at: 0, run: 1 }));
    });

    it('should patch the edited operation range', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.onRangePick({ at: 4, run: 2 }, true);
      expect(c.editedOpRangePatch()).toEqual({ at: 4, run: 2 });
      c.onRangePick({ at: 5, run: 1 });
      expect(c.editedOpRangePatch()).toEqual({ at: 4, run: 2 });
    });

    it('should edit a copy of an existing operation', async () => {
      const { c, fixture, showOperations } = await setup({
        snapshot: SNAPSHOT(),
      });
      await showOperations();
      await userEvent.click(
        screen.getAllByRole('button', { name: 'Edit operation' })[1],
      );
      await fixture.whenStable();
      expect(c.editedOpIndex()).toBe(1);
      expect(c.editedOp()).toEqual(plain(c.form.operations().value()[1]));
      expect(c.editedOp()).not.toBe(c.form.operations().value()[1]);
      expect(
        fixture.nativeElement.querySelector('gve-chain-operation-editor'),
      ).not.toBeNull();
    });

    it('should replace an edited operation', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editOperation(1);
      c.onOperationChange(op('o2', { at: 9 }));
      expect(c.form.operations().value()[1].at).toBe(9);
      expect(c.form.operations().dirty()).toBe(true);
      expect(c.editedOp()).toBeUndefined();
      // auto-run is off
      expect(api.runOperations).toHaveBeenCalledTimes(1);
    });

    it('should append a new operation and auto-run to it', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.options.autoRun().value.set(true);
      c.editNewOperation();
      c.onOperationChange(op('o4'));
      expect(c.form.operations().value().map((o) => o.id)).toEqual([
        'o1',
        'o2',
        'o3',
        'o4',
      ]);
      expect(api.runOperations).toHaveBeenCalledTimes(2);
      expect(c.resultOperationId()).toBe('o4');
    });

    it('should ignore a null operation change', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.onOperationChange(null);
      expect(c.form.operations().value()).toHaveLength(3);
    });

    it('should cancel operation editing', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editOperation(0);
      c.onOperationCancel();
      expect(c.editedOp()).toBeUndefined();
      expect(c.editedOpIndex()).toBe(-1);
    });

    it('should navigate operations from the operation editor', async () => {
      const { c, fixture, showOperations } = await setup({
        snapshot: SNAPSHOT(),
      });
      await showOperations();
      c.editOperation(0);
      await fixture.whenStable();
      await userEvent.click(
        screen.getByRole('button', { name: 'Edit next operation' }),
      );
      expect(c.editedOpIndex()).toBe(1);
      expect(c.editedOp()!.id).toBe('o2');
    });

    it('should delete an operation after confirmation and rerun', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.deleteOperation(2);
      expect(dialog.confirm).toHaveBeenCalled();
      expect(c.form.operations().value().map((o) => o.id)).toEqual(['o1', 'o2']);
      // the result operation was deleted
      expect(c.resultOperationId()).toBeUndefined();
      await wait();
      expect(api.runOperations).toHaveBeenCalledTimes(2);
      expect(c.resultOperationId()).toBe('o2');
    });

    it('should not delete when not confirmed', async () => {
      dialog.confirm.mockReturnValue(of(false));
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.deleteOperation(0);
      expect(c.form.operations().value()).toHaveLength(3);
    });

    it('should close the edited operation when deleting it', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editOperation(1);
      c.deleteOperation(1);
      expect(c.editedOp()).toBeUndefined();
    });

    it('should keep the edited operation index in sync when deleting', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editOperation(2);
      c.deleteOperation(0);
      expect(c.editedOpIndex()).toBe(1);
      c.onOperationChange(op('o3', { at: 9 }));
      expect(c.form.operations().value().map((o) => [o.id, o.at])).toEqual([
        ['o2', 1],
        ['o3', 9],
      ]);
    });

    it('should duplicate an operation with a new ID', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editOperation(2);
      c.duplicateOperation(0);
      const ops = c.form.operations().value();
      expect(ops).toHaveLength(4);
      expect(ops[1].id).not.toBe('o1');
      expect(plain({ ...ops[1], id: 'o1' })).toEqual(plain(ops[0]));
      expect(c.editedOpIndex()).toBe(3);
      c.onOperationChange(op('o3', { at: 9 }));
      expect(plain(c.form.operations().value()[3])).toEqual(
        op('o3', { at: 9 }),
      );
    });

    it('should move operations keeping the edited index in sync', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      const ids = () => c.form.operations().value().map((o) => o.id);
      c.editOperation(0);
      c.moveOperationDown(0);
      expect(ids()).toEqual(['o2', 'o1', 'o3']);
      expect(c.editedOpIndex()).toBe(1);
      c.moveOperationUp(2);
      expect(ids()).toEqual(['o2', 'o3', 'o1']);
      expect(c.editedOpIndex()).toBe(2);
      c.moveOperationUp(2);
      expect(ids()).toEqual(['o2', 'o1', 'o3']);
      expect(c.editedOpIndex()).toBe(1);
      c.onOperationChange(op('o1', { at: 9 }));
      expect(c.form.operations().value()[1]).toEqual(op('o1', { at: 9 }));
      // out of bounds moves are ignored
      c.moveOperationUp(0);
      c.moveOperationDown(2);
      expect(ids()).toEqual(['o2', 'o1', 'o3']);
    });

    it('should remove all operations after confirmation', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editOperation(0);
      c.clearOperations();
      expect(c.form.operations().value()).toEqual([]);
      expect(c.editedOp()).toBeUndefined();
      expect(c.result()).toBeUndefined();
      expect(c.resultOperationId()).toBeUndefined();
    });

    it('should not remove operations when not confirmed', async () => {
      dialog.confirm.mockReturnValue(of(false));
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.clearOperations();
      expect(c.form.operations().value()).toHaveLength(3);
    });

    it('should build sources tooltips', async () => {
      const { c } = await setup({
        sourceIds: [{ id: 's1', label: 'Source 1' }],
      });
      expect(c.sourcesTooltip(undefined)).toBe('');
      expect(c.sourcesTooltip([])).toBe('');
      expect(
        c.sourcesTooltip([
          { id: 's1', type: 't' },
          { id: 's2', type: 't' },
        ]),
      ).toBe('Source 1 s2');
    });
  });

  describe('batch features and sources', () => {
    it('should add features to the operations in range', async () => {
      const snapshot = SNAPSHOT();
      snapshot.operations[0].features = [
        { name: 'a', value: '1', setPolicy: 0 },
      ];
      const { c } = await setup({ snapshot });
      c.editFeatsForm.editFeatsRange().value.set('1, 3');
      c.editOperationsFeats();
      expect(c.batchOpNumbers()).toEqual([1, 3]);
      expect(c.batchRangeLabel()).toBe('1,3');
      expect(c.operationFeats()).toEqual([]);

      c.saveOperationsFeats([{ name: 'b', value: '2', setPolicy: 0 }]);
      const ops = c.form.operations().value();
      expect(ops[0].features!.map((f) => f.name)).toEqual(['a', 'b']);
      expect(ops[1].features).toBeUndefined();
      expect(ops[2].features!.map((f) => f.name)).toEqual(['b']);
      expect(c.form.operations().dirty()).toBe(true);
      expect(c.batchOpNumbers()).toBeUndefined();
      expect(c.operationFeats()).toBeUndefined();
      // the input snapshot was not mutated
      expect(snapshot.operations[0].features).toHaveLength(1);
      expect(snapshot.operations[2].features).toBeUndefined();
    });

    it('should add a source to the operations in range', async () => {
      const snapshot = SNAPSHOT();
      const { c } = await setup({ snapshot });
      c.editFeatsForm.editFeatsRange().value.set('2-3');
      c.editOperationSources();
      expect(c.batchForSource()).toBe(true);
      expect(c.batchOpNumbers()).toEqual([2, 3]);
      c.saveOperationSources({ id: 's', type: 't' });
      const ops = c.form.operations().value();
      expect(ops[0].sources).toBeUndefined();
      expect(ops[1].sources).toEqual([{ id: 's', type: 't' }]);
      expect(ops[2].sources).toEqual([{ id: 's', type: 't' }]);
      expect(c.batchForSource()).toBe(false);
      expect(snapshot.operations[1].sources).toBeUndefined();
    });

    it('should ignore saves without a batch', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.saveOperationsFeats([{ name: 'b', value: '2', setPolicy: 0 }]);
      c.saveOperationSources({ id: 's', type: 't' });
      c.saveOperationSources(undefined);
      expect(c.form.operations().value().every((o) => !o.features && !o.sources)).toBe(
        true,
      );
    });

    it.each(['', 'x', '0', '4', '3-2', '1-9'])(
      'should reject the range %j',
      async (range) => {
        const { c } = await setup({ snapshot: SNAPSHOT() });
        c.editFeatsForm.editFeatsRange().value.set(range);
        c.editOperationsFeats();
        c.editOperationSources();
        expect(c.batchOpNumbers()).toBeUndefined();
      },
    );

    it('should merge overlapping ranges', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editFeatsForm.editFeatsRange().value.set('3, 1-2, 2');
      c.editOperationsFeats();
      expect(c.batchOpNumbers()).toEqual([1, 2, 3]);
    });

    it('should close the batch editors', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editFeatsForm.editFeatsRange().value.set('1');
      c.editOperationsFeats();
      c.closeOperationFeats();
      expect(c.batchOpNumbers()).toBeUndefined();
      c.editOperationSources();
      c.closeOperationSources();
      expect(c.batchForSource()).toBe(false);
      expect(c.batchRangeLabel()).toBeUndefined();
    });

    it('should not save the snapshot when submitting the range form', async () => {
      const user = userEvent.setup();
      const { c, saved, fixture, showOperations } = await setup({
        snapshot: SNAPSHOT(),
      });
      await showOperations();
      await user.type(
        screen.getByRole('textbox', { name: /operations \(e\.g\./ }),
        '1',
      );
      await user.click(
        screen.getByRole('button', { name: 'Edit features for range' }),
      );
      await fixture.whenStable();
      expect(c.batchOpNumbers()).toEqual([1]);
      expect(saved).toEqual([]);
    });

    it('should edit features for the range with Enter', async () => {
      const user = userEvent.setup();
      const { c, saved, fixture, showOperations } = await setup({
        snapshot: SNAPSHOT(),
      });
      await showOperations();
      await user.type(
        screen.getByRole('textbox', { name: /operations \(e\.g\./ }),
        '2-3{Enter}',
      );
      await fixture.whenStable();
      expect(c.batchOpNumbers()).toEqual([2, 3]);
      expect(saved).toEqual([]);
    });

    it('should edit sources for the range from the UI', async () => {
      const user = userEvent.setup();
      const { c, fixture, showOperations } = await setup({
        snapshot: SNAPSHOT(),
      });
      await showOperations();
      await user.type(
        screen.getByRole('textbox', { name: /operations \(e\.g\./ }),
        '2',
      );
      await user.click(
        screen.getByRole('button', { name: 'Edit sources for range' }),
      );
      await fixture.whenStable();
      expect(c.batchForSource()).toBe(true);
      expect(screen.getByText(/Sources of 2/)).toBeInTheDocument();
    });
  });

  describe('clipboard', () => {
    it('should copy operations JSON', async () => {
      const write = vi.spyOn(navigator.clipboard, 'writeText');
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.copyOperationsJson();
      await wait();
      const json = JSON.parse(write.mock.calls.at(-1)![0] as string);
      expect(json.operations).toHaveLength(3);
      expect(json.text).toHaveLength(4);
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('should copy operations DSL', async () => {
      const write = vi.spyOn(navigator.clipboard, 'writeText');
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.copyOperationsDsl();
      await wait();
      expect(api.getDsl).toHaveBeenCalled();
      expect(write).toHaveBeenLastCalledWith('a\nb');
    });

    it('should report DSL errors', async () => {
      api.getDsl.mockReturnValue(throwError(() => new Error('x')));
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.copyOperationsDsl();
      expect(snackBar.open).toHaveBeenCalledWith('Error getting DSL', 'OK');
    });

    it('should not copy without operations', async () => {
      const write = vi.spyOn(navigator.clipboard, 'writeText');
      write.mockClear();
      const { c } = await setup({ snapshot: { text: 'a', operations: [] } });
      c.copyOperationsJson();
      c.copyOperationsDsl();
      expect(write).not.toHaveBeenCalled();
      expect(api.getDsl).not.toHaveBeenCalled();
    });
  });

  describe('dialogs', () => {
    it('should set a new base text removing operations', async () => {
      const nodes = GveBaseTextService.stringToBaseChars('x\ny\nz');
      matDialog.open.mockReturnValue({ afterClosed: () => of(nodes) });
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.onRangePick({ at: 1, run: 1 });
      c.inputBaseText();
      expect(matDialog.open.mock.calls[0][1].data.payload.text).toHaveLength(4);
      expect(c.form.baseText().value()).toBe(nodes);
      expect(c.lineCount()).toBe(3);
      expect(c.textRange()).toBeUndefined();
      expect(c.form.operations().value()).toEqual([]);
      expect(c.result()).toBeUndefined();
    });

    it('should keep the base text when the dialog is dismissed', async () => {
      matDialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.inputBaseText();
      expect(c.form.operations().value()).toHaveLength(3);
    });

    it('should append parsed operations and rerun', async () => {
      matDialog.open.mockReturnValue({
        afterClosed: () => of([op('p1'), op('p2')]),
      });
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.parseOperations();
      expect(c.form.operations().value().map((o) => o.id)).toEqual([
        'o1',
        'o2',
        'o3',
        'p1',
        'p2',
      ]);
      await wait();
      expect(api.runOperations).toHaveBeenCalledTimes(2);
    });

    it('should ignore a dismissed batch dialog', async () => {
      matDialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.parseOperations();
      expect(c.form.operations().value()).toHaveLength(3);
    });

    it('should not open dialogs while busy', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.busy.set(true);
      c.inputBaseText();
      c.parseOperations();
      c.copyOperationsJson();
      expect(matDialog.open).not.toHaveBeenCalled();
    });
  });

  describe('running', () => {
    it('should report operation errors', async () => {
      api.runOperations.mockReturnValue(of({ error: 'bad op' }));
      const { c } = await setup({ snapshot: SNAPSHOT() });
      expect(snackBar.open).toHaveBeenCalledWith('bad op', 'OK');
      expect(c.result()).toBeUndefined();
      expect(c.busy()).toBe(false);
    });

    it('should report API errors', async () => {
      api.runOperations.mockReturnValue(throwError(() => new Error('down')));
      const { c } = await setup({ snapshot: SNAPSHOT() });
      expect(snackBar.open).toHaveBeenCalledWith(
        'Error running operations',
        'OK',
      );
      expect(c.busy()).toBe(false);
    });

    it('should cancel an in-flight run', async () => {
      const pending = new Subject<ResultWrapper<CharChainResult>>();
      api.runOperations.mockReturnValue(pending);
      const { c } = await setup({ snapshot: SNAPSHOT() });
      expect(c.busy()).toBe(true);
      api.runOperations.mockImplementation((_t, ops: CharChainOperation[]) =>
        of({ result: fakeResult(ops) }),
      );
      c.runTo(0);
      expect(pending.observed).toBe(false);
      expect(c.busy()).toBe(false);
      expect(c.resultOperationId()).toBe('o1');
    });

    it('should run to an operation', async () => {
      const { c, showOperations } = await setup({ snapshot: SNAPSHOT() });
      await showOperations();
      await userEvent.click(
        screen.getAllByRole('button', { name: 'Run to this operation' })[0],
      );
      const [, ops] = api.runOperations.mock.calls.at(-1)!;
      expect(ops.map((o: CharChainOperation) => o.id)).toEqual(['o1']);
      expect(c.initialStepIndex()).toBe(0);
    });

    it('should preview an edited operation when auto-run is on', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      // auto-run off
      c.editOperation(1);
      c.onOperationPreview(op('o2', { at: 5 }));
      await wait();
      expect(api.runOperations).toHaveBeenCalledTimes(1);

      c.options.autoRun().value.set(true);
      c.onOperationPreview(op('o2', { at: 5 }));
      // multiple previews are ignored
      c.onOperationPreview(op('o2', { at: 6 }));
      await wait();
      expect(api.runOperations).toHaveBeenCalledTimes(2);
      const [, ops] = api.runOperations.mock.calls.at(-1)!;
      expect(ops.map((o: CharChainOperation) => [o.id, o.at])).toEqual([
        ['o1', 1],
        ['o2', 5],
      ]);
    });

    it('should not preview a new operation', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.options.autoRun().value.set(true);
      c.editNewOperation();
      c.onOperationPreview(op('new'));
      await wait();
      expect(api.runOperations).toHaveBeenCalledTimes(1);
    });

    it('should set the result operation on step pick', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.onStepPick(c.result()!.steps[0]);
      expect(c.resultOperationId()).toBe('o1');
    });

    it('should ignore picks of steps not in the operations', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      const step = { ...c.result()!.steps[0], operation: op('zz') };
      expect(() => c.onStepPick(step)).not.toThrow();
      expect(c.resultOperationId()).toBe('o3');
    });

    it('should ignore step picks without result', async () => {
      const { c } = await setup();
      c.onStepPick({
        operation: op('o1'),
        inputTag: 'v0',
        outputTag: 'v1',
        refNodeIds: [],
      });
      expect(c.resultOperationId()).toBeUndefined();
    });

    it('should render the result view', async () => {
      const { fixture } = await setup({ snapshot: SNAPSHOT() });
      await fixture.whenStable();
      const result = fixture.nativeElement.querySelector(
        '#result',
      ) as HTMLElement;
      expect(result).not.toBeNull();
      expect(
        within(result).getAllByText(/v3/).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('edited operation preceding text', () => {
    it('should be undefined without edited operation or result', async () => {
      const { c } = await setup({ snapshot: { text: 'abc', operations: [] } });
      expect(c.editedOpPrecedingText()).toBeUndefined();
      c.editNewOperation();
      expect(c.editedOpPrecedingText()).toBeUndefined();
    });

    it('should use the input version of an executed operation', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editOperation(1);
      // o2 input is v1
      expect(c.editedOpPrecedingText()!.map((n) => n.id)).toEqual([
        1, 2, 3, 100,
      ]);
    });

    it('should use the base text for the first operation', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editOperation(0);
      expect(c.editedOpPrecedingText()!.map((n) => n.id)).toEqual([1, 2, 3]);
    });

    it('should use the output of the last operation for a new one', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editNewOperation();
      expect(c.editedOpPrecedingText()!.map((n) => n.id)).toEqual([
        1, 2, 3, 102,
      ]);
    });

    it('should use an explicit known input tag of a new operation', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      c.editedOpIndex.set(-1);
      c.editedOp.set(op('new', { inputTag: 'v1' }));
      expect(c.editedOpPrecedingText()!.map((n) => n.id)).toEqual([
        1, 2, 3, 100,
      ]);
    });

    it('should use v0 for a new operation in an empty chain', async () => {
      const { c } = await setup({ snapshot: SNAPSHOT() });
      // simulate a result still available while operations were removed
      c.form.operations().value.set([]);
      c.editNewOperation();
      expect(c.editedOpPrecedingText()!.map((n) => n.id)).toEqual([1, 2, 3]);
    });
  });
});

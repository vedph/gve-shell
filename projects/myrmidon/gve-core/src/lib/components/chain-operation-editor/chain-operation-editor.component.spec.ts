import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { ChainOperationEditorComponent } from './chain-operation-editor.component';
import {
  CharChainOperation,
  FeatureSetPolicy,
  OperationType,
} from '../../models';
import { GveBaseTextService } from '../../services/gve-base-text.service';

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

const op = (props: Partial<CharChainOperation> = {}): CharChainOperation => ({
  id: 'op1',
  type: OperationType.annotate,
  at: 2,
  run: 1,
  ...props,
});

describe('ChainOperationEditorComponent', () => {
  let dialog: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    dialog = { confirm: vi.fn(() => of(true)) };
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  async function setup(inputs: Record<string, unknown> = {}) {
    const cancel = vi.fn();
    const preview = vi.fn<(o: CharChainOperation) => void>();
    const ordinal = vi.fn<(n: number) => void>();
    const result = await render(ChainOperationEditorComponent, {
      inputs,
      on: {
        operationCancel: cancel,
        operationPreview: preview,
        operationOrdinalRequest: ordinal,
      },
      providers: [{ provide: DialogService, useValue: dialog }],
    });
    const saved: (CharChainOperation | undefined)[] = [];
    result.fixture.componentInstance.operation.subscribe((o) => saved.push(o));
    return {
      ...result,
      c: result.fixture.componentInstance,
      saved,
      cancel,
      preview,
      ordinal,
    };
  }

  describe('loading', () => {
    it('should reset the form without operation', async () => {
      const { c } = await setup();
      expect(c.type.value).toBe(OperationType.annotate);
      expect(c.at.value).toBe(0);
      expect(c.hasValue()).toBe(false);
    });

    it('should load an operation', async () => {
      const { c } = await setup({
        operation: op({
          type: OperationType.swap,
          at: 3,
          atAsIndex: true,
          run: 2,
          to: 5,
          toAsIndex: true,
          toRun: 1,
          rank: 1,
          groupId: 'g',
          inputTag: 'v1',
          outputTag: 'v2',
          features: [{ name: 'f', value: 'v', setPolicy: 0 }],
          sources: [{ id: 's', type: 't' }],
        }),
      });
      expect(c.id()).toBe('op1');
      expect(c.type.value).toBe(OperationType.swap);
      expect(c.at.value).toBe(3);
      expect(c.atAsIndex.value).toBe(true);
      expect(c.run.value).toBe(2);
      expect(c.to.value).toBe(5);
      expect(c.toAsIndex.value).toBe(true);
      expect(c.toRun.value).toBe(1);
      expect(c.rank.value).toBe(1);
      expect(c.groupId.value).toBe('g');
      expect(c.inputTag.value).toBe('v1');
      expect(c.outputTag.value).toBe('v2');
      expect(c.features.value).toHaveLength(1);
      expect(c.sources.value).toHaveLength(1);
      expect(c.hasTo()).toBe(true);
      expect(c.hasToRun()).toBe(true);
      expect(c.hasValue()).toBe(false);
      expect(c.form.pristine).toBe(true);
      expect(screen.getByText('op1')).toBeInTheDocument();
    });

    it('should load defaults for missing optional properties', async () => {
      const { c } = await setup({ operation: op() });
      expect(c.rank.value).toBe(0);
      expect(c.groupId.value).toBeNull();
      expect(c.features.value).toEqual([]);
      expect(c.sources.value).toEqual([]);
      expect(c.to.value).toBe(0);
      expect(c.toRun.value).toBe(0);
      expect(c.inputTag.value).toBeNull();
      expect(c.value.value).toBeNull();
    });

    it('should generate an ID when missing', async () => {
      const { c } = await setup({ operation: op({ id: '' }) });
      expect(c.id()).toMatch(/^[0-9a-f]{10}$/);
    });

    it('should escape LF in the value for editing', async () => {
      const { c } = await setup({
        operation: op({ type: OperationType.replace, value: 'a\nb' }),
      });
      expect(c.value.value).toBe('a\\b');
      expect(screen.getByRole('textbox', { name: 'value' })).toHaveValue(
        'a\\b',
      );
    });

    it('should reset when the operation is cleared', async () => {
      const { c, fixture } = await setup({ operation: op({ at: 9 }) });
      fixture.componentRef.setInput('operation', undefined);
      await fixture.whenStable();
      expect(c.at.value).toBe(0);
    });
  });

  describe('args UI', () => {
    it.each([
      [OperationType.replace, false, false, true],
      [OperationType.delete, false, false, false],
      [OperationType.addBefore, false, false, true],
      [OperationType.addAfter, false, false, true],
      [OperationType.moveBefore, true, false, false],
      [OperationType.moveAfter, true, false, false],
      [OperationType.swap, true, true, false],
      [OperationType.annotate, false, false, false],
    ])('type %i: to=%s, toRun=%s, value=%s', async (type, to, toRun, value) => {
      const { c, fixture } = await setup({ operation: op({ type }) });
      await fixture.whenStable();
      expect(c.hasTo()).toBe(to);
      expect(c.hasToRun()).toBe(toRun);
      expect(c.hasValue()).toBe(value);
      expect(!!screen.queryByRole('spinbutton', { name: 'to' })).toBe(to);
      expect(!!screen.queryByRole('spinbutton', { name: 'to run' })).toBe(
        toRun,
      );
      expect(!!screen.queryByRole('textbox', { name: 'value' })).toBe(value);
    });

    it('should reset unused args when changing type', async () => {
      const { c } = await setup({
        operation: op({ type: OperationType.swap, to: 4, toRun: 2 }),
      });
      c.type.setValue(OperationType.replace);
      expect(c.to.value).toBe(0);
      expect(c.toRun.value).toBe(0);
      c.value.setValue('x');
      c.type.setValue(OperationType.delete);
      expect(c.value.value).toBeNull();
    });
  });

  describe('validation', () => {
    it('should require a value for value-based types', async () => {
      const { c } = await setup({ operation: op() });
      expect(c.form.valid).toBe(true);
      // switching type must re-validate the (empty) value
      c.type.setValue(OperationType.replace);
      expect(c.value.errors).toEqual({ required: true });
      expect(c.form.valid).toBe(false);
      c.value.setValue('x');
      expect(c.form.valid).toBe(true);
    });

    it('should require a non-negative at, even as index', async () => {
      // the backend rejects negative indexes
      const { c } = await setup({ operation: op({ at: 0 }) });
      expect(c.at.valid).toBe(true);
      c.at.setValue(-1);
      expect(c.at.errors).toHaveProperty('min');
      c.atAsIndex.setValue(true);
      c.at.updateValueAndValidity();
      expect(c.at.errors).toHaveProperty('min');
    });

    it('should show validation errors', async () => {
      const user = userEvent.setup();
      const { fixture } = await setup({ operation: op() });
      const at = screen.getByRole('spinbutton', { name: 'at' });
      await user.clear(at);
      await user.tab();
      await fixture.whenStable();
      expect(screen.getByText('at required')).toBeInTheDocument();
      await user.type(at, '-1');
      await user.tab();
      await fixture.whenStable();
      expect(screen.getByText('at must be at least 0')).toBeInTheDocument();
    });

    it('should not save an invalid operation', async () => {
      const { c, saved } = await setup({
        operation: op({ type: OperationType.replace }),
      });
      c.save();
      expect(saved).toEqual([]);
    });
  });

  describe('saving', () => {
    it('should save the edited operation', async () => {
      const user = userEvent.setup();
      const { saved } = await setup({ operation: op() });
      const run = screen.getByRole('spinbutton', { name: 'run' });
      await user.clear(run);
      await user.type(run, '3');
      await user.click(screen.getByRole('button', { name: /save/ }));
      expect(saved).toEqual([
        {
          rank: undefined,
          groupId: undefined,
          features: undefined,
          sources: undefined,
          id: 'op1',
          type: OperationType.annotate,
          at: 2,
          atAsIndex: undefined,
          to: undefined,
          toAsIndex: undefined,
          inputTag: undefined,
          outputTag: undefined,
          run: 3,
          toRun: undefined,
          value: undefined,
        },
      ]);
    });

    it('should disable save while pristine', async () => {
      await setup({ operation: op() });
      expect(screen.getByRole('button', { name: /save/ })).toBeDisabled();
    });

    it('should save all properties, unescaping LF in value', async () => {
      const { c, saved } = await setup({
        operation: op({
          type: OperationType.swap,
          atAsIndex: true,
          to: 5,
          toAsIndex: true,
          toRun: 2,
          rank: 1,
          groupId: 'g',
          inputTag: 'v1',
          outputTag: 'v2',
          features: [{ name: 'f', value: 'v', setPolicy: 0 }],
          sources: [{ id: 's', type: 't' }],
        }),
      });
      c.save();
      expect(saved.at(-1)).toEqual({
        id: 'op1',
        type: OperationType.swap,
        at: 2,
        atAsIndex: true,
        run: 1,
        to: 5,
        toAsIndex: true,
        toRun: 2,
        rank: 1,
        groupId: 'g',
        inputTag: 'v1',
        outputTag: 'v2',
        features: [{ name: 'f', value: 'v', setPolicy: 0 }],
        sources: [{ id: 's', type: 't' }],
        value: undefined,
      });

      c.type.setValue(OperationType.addAfter);
      c.value.setValue('x\\y');
      c.save();
      expect(saved.at(-1)!.value).toBe('x\ny');
    });

    it('should round-trip a value with LF unchanged', async () => {
      const { c, saved } = await setup({
        operation: op({ type: OperationType.replace, value: 'a\nb' }),
      });
      c.save();
      expect(saved.at(-1)!.value).toBe('a\nb');
    });

    it('should emit cancel', async () => {
      const { cancel } = await setup({ operation: op() });
      await userEvent.click(
        screen.getByRole('button', { name: 'Discard operation' }),
      );
      expect(cancel).toHaveBeenCalled();
    });
  });

  describe('features', () => {
    it('should set features from the feature set editor', async () => {
      const { c } = await setup({ operation: op() });
      c.onFeaturesChange([
        { name: 'f', value: 'v', setPolicy: FeatureSetPolicy.single },
      ]);
      expect(c.features.value).toHaveLength(1);
      expect(c.features.dirty).toBe(true);
    });

    it('should set diplomatic features', async () => {
      const { c } = await setup({ operation: op() });
      c.onDpFeaturesChange([{ name: 'f', value: 'v', setPolicy: 0 }]);
      expect(c.dpFeatures.value).toHaveLength(1);
      expect(c.dpFeatures.dirty).toBe(true);
    });

    it('should not save the operation when accepting a feature', async () => {
      const user = userEvent.setup();
      const { saved, c, fixture } = await setup({ operation: op() });
      await user.click(screen.getByRole('button', { name: /^feature$/ }));
      await fixture.whenStable();
      const editor = fixture.nativeElement.querySelector(
        'gve-feature-editor',
      ) as HTMLElement;
      const [name, value] = within(editor).getAllByRole('textbox');
      await user.type(name, 'n');
      await user.type(value, 'v');
      await user.click(
        within(editor).getByRole('button', { name: 'Accept changes' }),
      );
      expect(c.features.value.map((f) => f.name)).toEqual(['n']);
      expect(saved).toEqual([]);
    });
  });

  describe('sources', () => {
    it('should add a source with the first closed IDs', async () => {
      const { c } = await setup({
        operation: op(),
        sourceIds: [{ id: 'a', label: 'A' }],
        sourceTypes: [{ id: 't', label: 'T' }],
      });
      c.addSource();
      expect(c.editedSource()).toEqual({ id: 'a', type: 't' });
      expect(c.editedSourceIndex()).toBe(-1);
    });

    it('should add a blank source for open sets', async () => {
      const { c } = await setup({ operation: op() });
      c.addSource();
      expect(c.editedSource()).toEqual({ id: '', type: '' });
    });

    it('should add, edit and delete sources', async () => {
      const { c } = await setup({ operation: op() });
      c.addSource();
      c.onSourceChange({ id: 'a', type: 't' });
      c.addSource();
      c.onSourceChange({ id: 'b', type: 't' });
      expect(c.sources.value.map((s) => s.id)).toEqual(['a', 'b']);
      expect(c.editedSource()).toBeUndefined();
      expect(c.sources.dirty).toBe(true);

      c.editSource(1);
      expect(c.editedSourceIndex()).toBe(1);
      expect(c.editedSource()).toEqual({ id: 'b', type: 't' });
      expect(c.editedSource()).not.toBe(c.sources.value[1]);
      c.onSourceChange({ id: 'c', type: 't' });
      expect(c.sources.value.map((s) => s.id)).toEqual(['a', 'c']);

      c.deleteSource(0);
      expect(c.sources.value.map((s) => s.id)).toEqual(['c']);
    });

    it('should keep the edited source index in sync when deleting', async () => {
      const { c } = await setup({
        operation: op({
          sources: [
            { id: 'a', type: 't' },
            { id: 'b', type: 't' },
          ],
        }),
      });
      c.editSource(1);
      c.deleteSource(0);
      expect(c.editedSourceIndex()).toBe(0);
      c.onSourceChange({ id: 'b2', type: 't' });
      expect(c.sources.value.map((s) => s.id)).toEqual(['b2']);
    });

    it('should close the source editor when deleting the edited source', async () => {
      const { c } = await setup({
        operation: op({ sources: [{ id: 'a', type: 't' }] }),
      });
      c.editSource(0);
      c.deleteSource(0);
      expect(c.editedSource()).toBeUndefined();
    });

    it('should list sources and edit them from the UI', async () => {
      const user = userEvent.setup();
      const { c, fixture } = await setup({
        operation: op({ sources: [{ id: 'a', type: 't', rank: 2 }] }),
        sourceIds: [{ id: 'a', label: 'Alpha' }],
      });
      await user.click(screen.getByRole('tab', { name: 'sources' }));
      await wait(600);
      await fixture.whenStable();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Edit this source' }));
      await fixture.whenStable();
      expect(c.editedSourceIndex()).toBe(0);
      expect(
        fixture.nativeElement.querySelector('tbody tr.selected'),
      ).not.toBeNull();
      await user.click(
        screen.getByRole('button', { name: 'Delete this source' }),
      );
      expect(c.sources.value).toEqual([]);
    });
  });

  describe('range', () => {
    it('should patch the range', async () => {
      const { c, fixture } = await setup({
        operation: op({ at: 1, atAsIndex: true, run: 1 }),
      });
      fixture.componentRef.setInput('rangePatch', { at: 5, run: 3 });
      await fixture.whenStable();
      expect(c.at.value).toBe(5);
      expect(c.atAsIndex.value).toBe(false);
      expect(c.run.value).toBe(3);
      expect(c.form.dirty).toBe(true);
    });

    it('should sync the peephole range with at/run/atAsIndex', async () => {
      const { c } = await setup({ operation: op({ at: 2, run: 3 }) });
      expect(c.peepholeRange()).toEqual({ at: 2, run: 3, atAsIndex: false });
      c.atAsIndex.setValue(true);
      expect(c.peepholeRange().atAsIndex).toBe(true);
    });

    it('should feed the peephole with the preceding text if any', async () => {
      const preceding = GveBaseTextService.stringToBaseChars('xyz');
      const { c } = await setup({
        operation: op(),
        precedingText: preceding,
        snapshot: { text: 'abc', operations: [] },
      });
      expect(c.peepholeText()).toBe(preceding);
    });

    it('should feed the peephole with the snapshot text as fallback', async () => {
      const { c, fixture } = await setup({
        operation: op(),
        precedingText: [],
        snapshot: { text: 'abc', operations: [] },
      });
      expect(c.peepholeText()).toEqual(
        GveBaseTextService.stringToBaseChars('abc'),
      );
      const nodes = GveBaseTextService.stringToBaseChars('q');
      fixture.componentRef.setInput('snapshot', { text: nodes, operations: [] });
      expect(c.peepholeText()).toBe(nodes);
      fixture.componentRef.setInput('snapshot', undefined);
      expect(c.peepholeText()).toEqual([]);
    });
  });

  describe('preview', () => {
    it('should emit a preview on request', async () => {
      const user = userEvent.setup();
      const { preview } = await setup({ operation: op() });
      await user.click(
        screen.getByRole('button', { name: 'Preview operation' }),
      );
      expect(preview).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'op1', at: 2 }),
      );
    });

    it('should hide the preview button', async () => {
      await setup({ operation: op(), hidePreview: true });
      expect(
        screen.queryByRole('button', { name: 'Preview operation' }),
      ).toBeNull();
    });

    it('should emit a debounced preview on form changes', async () => {
      const { c, preview } = await setup({ operation: op() });
      preview.mockClear();
      c.run.setValue(4);
      c.run.setValue(5);
      expect(preview).not.toHaveBeenCalled();
      await wait(550);
      expect(preview).toHaveBeenCalledTimes(1);
      expect(preview.mock.calls[0][0].run).toBe(5);
    });
  });

  describe('navigation', () => {
    it('should disable previous/next at the chain boundaries', async () => {
      const { fixture } = await setup({
        operation: op(),
        operationOrdinal: 1,
        operationCount: 1,
      });
      const prev = screen.getByRole('button', { name: 'Edit previous operation' });
      const next = screen.getByRole('button', { name: 'Edit next operation' });
      expect(prev).toBeDisabled();
      expect(next).toBeDisabled();
      fixture.componentRef.setInput('operationOrdinal', 2);
      fixture.componentRef.setInput('operationCount', 3);
      await fixture.whenStable();
      expect(prev).toBeEnabled();
      expect(next).toBeEnabled();
    });

    it('should request adjacent operations', async () => {
      const user = userEvent.setup();
      const { ordinal } = await setup({
        operation: op(),
        operationOrdinal: 2,
        operationCount: 3,
      });
      await user.click(
        screen.getByRole('button', { name: 'Edit previous operation' }),
      );
      expect(ordinal).toHaveBeenLastCalledWith(1);
      await user.click(
        screen.getByRole('button', { name: 'Edit next operation' }),
      );
      expect(ordinal).toHaveBeenLastCalledWith(3);
      expect(dialog.confirm).not.toHaveBeenCalled();
    });

    it('should ignore requests out of the chain', async () => {
      const { c, ordinal, fixture } = await setup({ operation: op() });
      c.editPreviousOperation();
      c.editNextOperation();
      fixture.componentRef.setInput('operationOrdinal', 1);
      fixture.componentRef.setInput('operationCount', 1);
      c.editPreviousOperation();
      c.editNextOperation();
      expect(ordinal).not.toHaveBeenCalled();
    });

    it('should confirm discarding changes', async () => {
      const { c, ordinal } = await setup({
        operation: op(),
        operationOrdinal: 2,
        operationCount: 3,
      });
      c.run.setValue(9);
      c.form.markAsDirty();
      dialog.confirm.mockReturnValue(of(false));
      c.editNextOperation();
      expect(dialog.confirm).toHaveBeenCalled();
      expect(ordinal).not.toHaveBeenCalled();
      dialog.confirm.mockReturnValue(of(true));
      c.editNextOperation();
      expect(ordinal).toHaveBeenCalledWith(3);
    });
  });
});

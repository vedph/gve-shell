import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { MatSnackBar } from '@angular/material/snack-bar';

import { FeatureSetEditorComponent } from './feature-set-editor.component';
import { Feature, FeatureSetPolicy, OperationFeature } from '../../models';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const f = (
  name: string,
  value: string,
  setPolicy = FeatureSetPolicy.multiple,
): Feature => ({ name, value, setPolicy });

let snackBar: { open: ReturnType<typeof vi.fn> };
beforeEach(() => {
  snackBar = { open: vi.fn() };
});

async function setup(inputs: Record<string, unknown> = {}) {
  const close = vi.fn();
  const result = await render(FeatureSetEditorComponent, {
    inputs,
    on: { close },
    providers: [{ provide: MatSnackBar, useValue: snackBar }],
  });
  const changes: (Feature[] | OperationFeature[])[] = [];
  result.fixture.componentInstance.features.subscribe((v) => changes.push(v));
  const rows = () =>
    Array.from(result.container.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td'))
        .slice(2, 5)
        .map((td) => td.textContent!.trim()),
    );
  return { ...result, c: result.fixture.componentInstance, changes, close, rows };
}

describe('FeatureSetEditorComponent', () => {
  it('should list features with policies and flags', async () => {
    const { rows, container } = await setup({
      features: [
        f('a', '1'),
        { ...f('b', '2', FeatureSetPolicy.single), isNegated: true },
        { ...f('c', '3', FeatureSetPolicy.singleFirst), isGlobal: true, isShortLived: true },
      ],
    });
    expect(rows()).toEqual([
      ['a', '1', 'M'],
      ['b', '2', 'S'],
      ['c', '3', 'SF'],
    ]);
    const flags = Array.from(container.querySelectorAll('tbody tr')).map(
      (tr) => tr.querySelectorAll('td')[5].textContent!.trim(),
    );
    expect(flags).toEqual(['', 'remove_circle', 'publictimer']);
  });

  it('should hide flags when not var', async () => {
    const { container } = await setup({ features: [f('a', '1')], isVar: false });
    expect(container.querySelectorAll('thead th')).toHaveLength(5);
  });

  it('should look up names and values', async () => {
    const { rows } = await setup({
      features: [f('c', 'r')],
      featNames: [{ id: 'c', label: 'Color' }],
      featValues: { c: [{ id: 'r', label: 'Red' }] },
    });
    expect(rows()).toEqual([['Color', 'Red', 'M']]);
  });

  it('should add a feature', async () => {
    const { c, changes } = await setup({ features: [f('a', '1')] });
    await userEvent.click(screen.getByRole('button', { name: /^feature$/ }));
    expect(c.editedFeature()).toEqual(f('', ''));
    expect(c.editedFeatureIndex()).toBe(-1);
    c.onFeatureChange(f('b', '2'));
    expect(changes.at(-1)).toEqual([f('a', '1'), f('b', '2')]);
    expect(c.editedFeature()).toBeUndefined();
  });

  it('should add a feature through the child editor', async () => {
    const user = userEvent.setup();
    const { changes, fixture } = await setup({ features: [] });
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
    expect(changes.at(-1)).toEqual([
      {
        name: 'n',
        value: 'v',
        setPolicy: 0,
        isNegated: false,
        isGlobal: false,
        isShortLived: false,
      },
    ]);
  });

  it('should edit a feature in place', async () => {
    const user = userEvent.setup();
    const a = f('a', '1');
    const b = f('b', '2');
    const { c, changes } = await setup({ features: [a, b] });
    await user.click(screen.getAllByRole('button', { name: 'Edit this feature' })[1]);
    expect(c.editedFeatureIndex()).toBe(1);
    expect(c.editedFeature()).toEqual(b);
    expect(c.editedFeature()).not.toBe(b);
    expect(c.isEdited(b)).toBe(true);
    expect(c.isEdited(a)).toBe(false);
    c.onFeatureChange(f('b', '3'));
    expect(changes.at(-1)).toEqual([a, f('b', '3')]);
  });

  it('should ignore an undefined feature change', async () => {
    const { c, changes } = await setup({ features: [f('a', '1')] });
    c.onFeatureChange(undefined);
    expect(changes).toEqual([]);
  });

  it('should replace same-name features when single', async () => {
    const { c, changes } = await setup({
      features: [f('a', '1'), f('b', '2'), f('a', '3')],
    });
    c.addFeature();
    c.onFeatureChange(f('a', '4', FeatureSetPolicy.single));
    expect(changes.at(-1)).toEqual([f('b', '2'), f('a', '4', FeatureSetPolicy.single)]);
  });

  it('should replace an existing single feature with the same name', async () => {
    const { c, changes } = await setup({
      features: [f('a', '1', FeatureSetPolicy.single), f('b', '2')],
    });
    c.addFeature();
    c.onFeatureChange(f('a', '3'));
    expect(changes.at(-1)).toEqual([f('b', '2'), f('a', '3')]);
  });

  it('should keep same-name features when multiple', async () => {
    const { c, changes } = await setup({ features: [f('a', '1')] });
    c.addFeature();
    c.onFeatureChange(f('a', '2'));
    expect(changes.at(-1)).toEqual([f('a', '1'), f('a', '2')]);
  });

  it('should edit a single feature without losing others', async () => {
    // editing a single feature must replace it, not the feature
    // which follows it after removing duplicates
    const a = f('a', '1', FeatureSetPolicy.single);
    const b = f('b', '2');
    const { c, changes } = await setup({ features: [a, b] });
    c.editFeature(a);
    c.onFeatureChange(f('a', '9', FeatureSetPolicy.single));
    expect(changes.at(-1)).toEqual([f('a', '9', FeatureSetPolicy.single), b]);
  });

  it('should edit a feature removing other single duplicates', async () => {
    const x = f('x', '0');
    const a1 = f('a', '1');
    const a2 = f('a', '2');
    const { c, changes } = await setup({ features: [x, a1, a2] });
    c.editFeature(a2);
    c.onFeatureChange(f('a', '3', FeatureSetPolicy.single));
    expect(changes.at(-1)).toEqual([x, f('a', '3', FeatureSetPolicy.single)]);
  });

  it('should delete a feature', async () => {
    const user = userEvent.setup();
    const a = f('a', '1');
    const b = f('b', '2');
    const { changes } = await setup({ features: [a, b] });
    await user.click(screen.getAllByRole('button', { name: 'Delete this feature' })[0]);
    expect(changes.at(-1)).toEqual([b]);
  });

  it('should ignore deleting an unknown feature', async () => {
    const { c, changes } = await setup({ features: [f('a', '1')] });
    c.deleteFeature(f('a', '1'));
    expect(changes).toEqual([]);
  });

  it('should keep the edited index in sync when deleting', async () => {
    const a = f('a', '1');
    const b = f('b', '2');
    const cc = f('c', '3');
    const { c, changes } = await setup({ features: [a, b, cc] });
    c.editFeature(cc);
    c.deleteFeature(a);
    expect(c.editedFeatureIndex()).toBe(1);
    c.onFeatureChange(f('c', '9'));
    expect(changes.at(-1)).toEqual([b, f('c', '9')]);
  });

  it('should close the editor when deleting the edited feature', async () => {
    const a = f('a', '1');
    const { c } = await setup({ features: [a, f('b', '2')] });
    c.editFeature(a);
    c.deleteFeature(a);
    expect(c.editedFeature()).toBeUndefined();
    expect(c.editedFeatureIndex()).toBe(-1);
  });

  it('should keep the edited index when deleting a following feature', async () => {
    const a = f('a', '1');
    const b = f('b', '2');
    const { c } = await setup({ features: [a, b] });
    c.editFeature(a);
    c.deleteFeature(b);
    expect(c.editedFeatureIndex()).toBe(0);
  });

  it('should cancel editing', async () => {
    const a = f('a', '1');
    const { c, fixture } = await setup({ features: [a] });
    c.editFeature(a);
    await fixture.whenStable();
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(c.editedFeature()).toBeUndefined();
  });

  it('should report multi-valued features', async () => {
    const { c, fixture } = await setup();
    expect(c.isFeatureMultiValued(f('r_hints', ''))).toBe(true);
    expect(c.isFeatureMultiValued(f('x', ''))).toBe(false);
    expect(c.isFeatureMultiValued(undefined)).toBe(false);
    fixture.componentRef.setInput('multiValuedFeatureIds', undefined);
    expect(c.isFeatureMultiValued(f('r_hints', ''))).toBe(false);
  });

  describe('filter', () => {
    const features = [f('alpha', '1'), f('beta', '2'), f('gamma', '3')];

    it('should show the filter from the threshold on', async () => {
      const { fixture } = await setup({ features, filterThreshold: 4 });
      expect(screen.queryByRole('textbox', { name: 'filter' })).toBeNull();
      fixture.componentRef.setInput('filterThreshold', 3);
      await fixture.whenStable();
      expect(screen.getByRole('textbox', { name: 'filter' })).toBeInTheDocument();
    });

    it('should filter and highlight the edited feature', async () => {
      const user = userEvent.setup();
      const { rows, c, container, fixture } = await setup({
        features,
        filterThreshold: 0,
      });
      await user.type(screen.getByRole('textbox', { name: 'filter' }), 'MM');
      await wait(350);
      await fixture.whenStable();
      expect(rows()).toEqual([['gamma', '3', 'M']]);

      c.editFeature(features[2]);
      await fixture.whenStable();
      // the filtered row is highlighted even if its filtered index differs
      expect(container.querySelector('tbody tr.selected')).not.toBeNull();

      await user.click(screen.getByRole('button', { name: 'Reset filter' }));
      await wait(350);
      await fixture.whenStable();
      expect(rows()).toHaveLength(3);
    });
  });

  describe('batch mode', () => {
    it('should edit a draft and commit it on OK', async () => {
      const user = userEvent.setup();
      const a = f('a', '1');
      const { c, changes } = await setup({ features: [a], batchMode: true });
      c.addFeature();
      c.onFeatureChange(f('b', '2'));
      expect(changes).toEqual([]);
      expect(c.workingFeatures()).toEqual([a, f('b', '2')]);
      c.deleteFeature(c.workingFeatures()[0]);
      expect(changes).toEqual([]);
      await user.click(screen.getByRole('button', { name: /OK/ }));
      expect(changes.at(-1)).toEqual([f('b', '2')]);
    });

    it('should emit close', async () => {
      const { close } = await setup({ batchMode: true });
      await userEvent.click(screen.getByRole('button', { name: /close/ }));
      expect(close).toHaveBeenCalled();
    });

    it('should not show OK/close outside batch mode', async () => {
      await setup();
      expect(screen.queryByRole('button', { name: /OK/ })).toBeNull();
    });
  });

  describe('sorting', () => {
    it('should list features sorted by name, keeping the order of equal names', async () => {
      const { rows } = await setup({
        features: [f('c', '1'), f('A', '1'), f('b', '1'), f('a', '2')],
      });
      expect(rows().map((r) => r[0] + r[1])).toEqual(['A1', 'a2', 'b1', 'c1']);
    });

    it('should edit and delete the right feature when sorted', async () => {
      const { c, changes } = await setup({
        features: [f('z', '1'), f('a', '1')],
      });
      // first listed row is "a", the second feature
      const user = userEvent.setup();
      await user.click(screen.getAllByRole('button', { name: 'Edit this feature' })[0]);
      expect(c.editedFeatureIndex()).toBe(1);
      await user.click(screen.getAllByRole('button', { name: 'Delete this feature' })[0]);
      expect(changes.at(-1)).toEqual([f('z', '1')]);
    });
  });

  describe('copy and paste', () => {
    const clipboard = () =>
      navigator.clipboard as unknown as {
        writeText: ReturnType<typeof vi.fn>;
        readText: ReturnType<typeof vi.fn>;
      };
    const copyButton = () => screen.getByRole('button', { name: /copy/ });
    const pasteButton = () => screen.getByRole('button', { name: /paste/ });

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should copy the selected features', async () => {
      const user = userEvent.setup();
      const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
      const features = [f('b', '2'), f('a', '1', FeatureSetPolicy.single), f('c', '3')];
      const { c } = await setup({ features });
      expect(copyButton()).toBeDisabled();

      // rows are sorted: a, b, c
      await user.click(screen.getByRole('checkbox', { name: 'Select feature a for copy' }));
      await user.click(screen.getByRole('checkbox', { name: 'Select feature c for copy' }));
      expect(c.selectedFeatures()).toEqual([features[1], features[2]]);
      expect(copyButton()).toHaveTextContent('(2)');

      await user.click(copyButton());
      expect(JSON.parse(write.mock.calls.at(-1)![0])).toEqual([
        f('a', '1', FeatureSetPolicy.single),
        f('c', '3'),
      ]);
      expect(snackBar.open).toHaveBeenCalledWith('2 features copied', 'OK', {
        duration: 3000,
      });
    });

    it('should select and deselect all the listed features', async () => {
      const user = userEvent.setup();
      const features = [f('a', '1'), f('b', '2')];
      const { c } = await setup({ features });
      const all = screen.getByRole('checkbox', { name: 'Select all the listed features' });
      await user.click(all);
      expect(c.selectedFeatures()).toEqual(features);
      expect(c.allSelected()).toBe(true);
      await user.click(all);
      expect(c.selectedFeatures()).toEqual([]);
    });

    it('should drop deleted features from the selection', async () => {
      const features = [f('a', '1'), f('b', '2')];
      const { c } = await setup({ features });
      c.toggleSelected(features[0]);
      c.deleteFeature(features[0]);
      expect(c.selectedFeatures()).toEqual([]);
    });

    it('should report copy errors', async () => {
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
      const features = [f('a', '1')];
      const { c } = await setup({ features });
      c.toggleSelected(features[0]);
      await c.copySelected();
      expect(snackBar.open).toHaveBeenCalledWith('Error copying features', 'OK');
    });

    it('should paste features according to their set policy', async () => {
      const user = userEvent.setup();
      vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue(
        JSON.stringify([
          f('m', 'new'),
          f('s', 'new', FeatureSetPolicy.single),
          f('sf', 'new1', FeatureSetPolicy.singleFirst),
          f('sf', 'new2', FeatureSetPolicy.singleFirst),
        ]),
      );
      const { changes } = await setup({
        features: [f('m', 'old'), f('s', 'old1'), f('s', 'old2'), f('sf', 'old')],
      });
      await user.click(pasteButton());
      expect(changes.at(-1)).toEqual([
        f('m', 'old'),
        f('m', 'new'),
        f('s', 'new', FeatureSetPolicy.single),
        f('sf', 'new1', FeatureSetPolicy.singleFirst),
        f('sf', 'new2', FeatureSetPolicy.singleFirst),
      ]);
      expect(snackBar.open).toHaveBeenCalledWith('4 features pasted', 'OK', {
        duration: 3000,
      });
    });

    it('should round-trip copied features through paste', async () => {
      let clip = '';
      vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(async (t) => {
        clip = t;
      });
      vi.spyOn(navigator.clipboard, 'readText').mockImplementation(async () => clip);
      const features: OperationFeature[] = [
        { ...f('a', 'say "hi"'), isGlobal: true },
      ];
      const { c, changes } = await setup({ features });
      c.toggleSelected(features[0]);
      await c.copySelected();
      await c.paste();
      expect(changes.at(-1)).toEqual([features[0], features[0]]);
    });

    it('should drop variant flags when pasting into plain features', async () => {
      vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue(
        JSON.stringify([{ ...f('a', '1'), isNegated: true }]),
      );
      const { c, changes } = await setup({ features: [], isVar: false });
      await c.paste();
      expect(changes.at(-1)).toEqual([f('a', '1')]);
    });

    it('should report a clipboard without features', async () => {
      vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('hello');
      const { c, changes } = await setup({ features: [f('a', '1')] });
      await c.paste();
      expect(changes).toEqual([]);
      expect(snackBar.open).toHaveBeenCalledWith(
        'No copied features found in clipboard',
        'OK',
        { duration: 3000 },
      );
    });

    it('should report clipboard read errors', async () => {
      vi.spyOn(navigator.clipboard, 'readText').mockRejectedValue(new Error('denied'));
      const { c } = await setup({ features: [] });
      await c.paste();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Error reading features from clipboard',
        'OK',
      );
    });

    it('should paste into the draft in batch mode', async () => {
      vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue(
        JSON.stringify([f('b', '2')]),
      );
      const { c, changes } = await setup({ features: [f('a', '1')], batchMode: true });
      await c.paste();
      expect(changes).toEqual([]);
      expect(c.draftFeatures()).toEqual([f('a', '1'), f('b', '2')]);
    });

    it('should keep editing the edited feature after a paste', async () => {
      vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue(
        JSON.stringify([f('a', '9', FeatureSetPolicy.single)]),
      );
      const features = [f('a', '1'), f('b', '2')];
      const { c } = await setup({ features });
      // b keeps being edited, at its new index
      c.editFeature(features[1]);
      await c.paste();
      expect(c.editedFeatureIndex()).toBe(0);
      expect(c.workingFeatures()[0]).toBe(features[1]);

      // a is replaced: its editing is closed
      c.editFeature(c.workingFeatures()[1]);
      await c.paste();
      expect(c.editedFeature()).toBeUndefined();
    });
  });

  it('should show the shortcut of the add button', async () => {
    await setup({ addFeatureShortcut: 'Alt+Shift+F' });
    expect(screen.getByRole('button', { name: /^feature$/ })).toHaveAttribute(
      'aria-keyshortcuts',
      'Alt+Shift+F',
    );
  });
});

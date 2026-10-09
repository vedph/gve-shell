import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { OperationSourceEditorComponent } from './operation-source-editor.component';
import { OperationSource } from '../../models';

async function setup(inputs: Record<string, unknown> = {}) {
  const cancel = vi.fn();
  const result = await render(OperationSourceEditorComponent, {
    inputs,
    on: { sourceCancel: cancel },
  });
  const saved: (OperationSource | undefined)[] = [];
  result.fixture.componentInstance.source.subscribe((s) => saved.push(s));
  return { ...result, c: result.fixture.componentInstance, saved, cancel };
}

describe('OperationSourceEditorComponent', () => {
  it('should start with an empty invalid form', async () => {
    const { c } = await setup();
    expect(c.form().invalid()).toBe(true);
    expect(screen.getByRole('button', { name: 'Accept changes' })).toBeDisabled();
  });

  it('should load a source', async () => {
    const { c } = await setup({
      source: { id: 'a', type: 't', rank: 2, note: 'n' },
    });
    expect(c.form.id().value()).toBe('a');
    expect(c.form.type().value()).toBe('t');
    expect(c.form.rank().value()).toBe(2);
    expect(c.form.note().value()).toBe('n');
    expect(c.form().dirty()).toBe(false);
  });

  it('should load defaults for missing rank and note', async () => {
    const { c } = await setup({ source: { id: 'a', type: 't' } });
    expect(c.form.rank().value()).toBe(0);
    expect(c.form.note().value()).toBe('');
  });

  it('should reset when the source is cleared', async () => {
    const { c, fixture } = await setup({ source: { id: 'a', type: 't' } });
    fixture.componentRef.setInput('source', undefined);
    await fixture.whenStable();
    expect(c.form.id().value()).toBe('');
  });

  it('should save a source typed in free inputs', async () => {
    const user = userEvent.setup();
    const { saved } = await setup();
    await user.type(screen.getByRole('textbox', { name: 'id' }), 'a');
    await user.type(screen.getByRole('textbox', { name: 'type' }), 't');
    await user.type(screen.getByRole('textbox', { name: 'note' }), 'n');
    await user.click(screen.getByRole('button', { name: 'Accept changes' }));
    expect(saved).toEqual([{ id: 'a', type: 't', rank: 0, note: 'n' }]);
  });

  it('should save undefined for an empty note', async () => {
    const { c, saved } = await setup({ source: { id: 'a', type: 't', rank: 1 } });
    c.save();
    expect(saved.at(-1)).toEqual({ id: 'a', type: 't', rank: 1, note: undefined });
  });

  it('should not save an invalid form', async () => {
    const { c, saved } = await setup();
    c.save();
    expect(saved).toEqual([]);
  });

  it('should use selects for closed sets', async () => {
    const user = userEvent.setup();
    const { c } = await setup({
      ids: [{ id: 'a', label: 'Alpha' }],
      types: [{ id: 't', label: 'Type T' }],
    });
    await user.click(screen.getByRole('combobox', { name: 'id' }));
    await user.click(await screen.findByRole('option', { name: 'Alpha' }));
    await user.click(screen.getByRole('combobox', { name: 'type' }));
    await user.click(await screen.findByRole('option', { name: 'Type T' }));
    expect(c.form.id().value()).toBe('a');
    expect(c.form.type().value()).toBe('t');
  });

  it('should show validation errors', async () => {
    const user = userEvent.setup();
    const { fixture } = await setup();
    const id = screen.getByRole('textbox', { name: 'id' });
    await user.type(id, 'x');
    await user.clear(id);
    await user.tab();
    await fixture.whenStable();
    expect(screen.getByText('ID required')).toBeInTheDocument();
    await user.click(id);
    await user.paste('x'.repeat(51));
    await fixture.whenStable();
    expect(screen.getByText('id too long')).toBeInTheDocument();

    const type = screen.getByRole('textbox', { name: 'type' });
    await user.type(type, 'x');
    await user.clear(type);
    await user.tab();
    await fixture.whenStable();
    expect(screen.getByText('type required')).toBeInTheDocument();
    await user.click(type);
    await user.paste('x'.repeat(51));
    await fixture.whenStable();
    expect(screen.getByText('type too long')).toBeInTheDocument();
  });

  it('should emit sourceCancel', async () => {
    const { cancel } = await setup();
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(cancel).toHaveBeenCalled();
  });

  it('should render no <form> element, so it stays valid at any nesting depth', async () => {
    const { container } = await setup();
    expect(container.querySelector('form')).toBeNull();
  });

  it('should accept changes with Enter in a single-line input', async () => {
    const user = userEvent.setup();
    const { saved } = await setup();
    await user.type(screen.getByRole('textbox', { name: 'id' }), 'a');
    // invalid (no type): Enter does not save
    await user.keyboard('{Enter}');
    expect(saved).toEqual([]);
    await user.type(screen.getByRole('textbox', { name: 'type' }), 't{Enter}');
    expect(saved).toEqual([{ id: 'a', type: 't', rank: 0, note: undefined }]);
  });

  it('should require a non-negative rank', async () => {
    const { c } = await setup({ source: { id: 'a', type: 't' } });
    c.form.rank().value.set(-1);
    expect(c.form.rank().getError('min')).toBeTruthy();
    expect(c.form().invalid()).toBe(true);
  });

  it('should not propagate its form submit to outer forms', async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    document.addEventListener('submit', outer);
    try {
      await setup({ source: { id: 'a', type: 't' } });
      await user.click(screen.getByRole('button', { name: 'Accept changes' }));
      expect(outer).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('submit', outer);
    }
  });
});

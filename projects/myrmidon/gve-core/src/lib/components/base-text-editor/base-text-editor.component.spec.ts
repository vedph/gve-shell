import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { DialogService } from '@myrmidon/ngx-mat-tools';

import { BaseTextEditorComponent } from './base-text-editor.component';
import { GveBaseTextService } from '../../services/gve-base-text.service';
import { CharNode, FeatureSetPolicy } from '../../models';

describe('BaseTextEditorComponent', () => {
  let dialog: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    dialog = { confirm: vi.fn(() => of(true)) };
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  async function setup(text: CharNode[] | string | undefined) {
    const textChange = vi.fn<(t: CharNode[]) => void>();
    const result = await render(BaseTextEditorComponent, {
      inputs: { text },
      on: { textChange },
      providers: [{ provide: DialogService, useValue: dialog }],
    });
    const chars = () =>
      Array.from(
        result.container.querySelectorAll('gve-base-text-char #container'),
      ) as HTMLElement[];
    return { ...result, c: result.fixture.componentInstance, textChange, chars };
  }

  it('should accept a string text', async () => {
    const { c, chars } = await setup('ab');
    expect(c.text()).toEqual(GveBaseTextService.stringToBaseChars('ab'));
    expect(c.form.userText().value()).toBe('ab');
    expect(c.form.userText().dirty()).toBe(false);
    expect(chars()).toHaveLength(2);
  });

  it('should accept a nodes text', async () => {
    const nodes = GveBaseTextService.stringToBaseChars('xyz');
    const { c } = await setup(nodes);
    expect(c.text()).toBe(nodes);
    expect(c.form.userText().value()).toBe('xyz');
  });

  it('should reset for an undefined text', async () => {
    const { c, container } = await setup(undefined);
    expect(c.text()).toBeUndefined();
    expect(c.form.userText().value()).toBe('');
    expect(container.querySelectorAll('gve-base-text-char')).toHaveLength(0);
  });

  it('should reset text from user input after confirmation', async () => {
    const user = userEvent.setup();
    const { textChange } = await setup('ab');
    const input = screen.getByRole('textbox', { name: 'text' });
    await user.clear(input);
    await user.type(input, 'cd');
    await user.click(screen.getByRole('button', { name: 'set' }));
    expect(dialog.confirm).toHaveBeenCalledWith('Confirm', 'Reset text?');
    expect(textChange).toHaveBeenCalledWith(
      GveBaseTextService.stringToBaseChars('cd'),
    );
  });

  it('should not reset text when not confirmed', async () => {
    dialog.confirm.mockReturnValue(of(false));
    const { c, textChange } = await setup('ab');
    c.setTextFromUser();
    expect(textChange).not.toHaveBeenCalled();
  });

  it('should disable set without text', async () => {
    const user = userEvent.setup();
    await setup('ab');
    await user.clear(screen.getByRole('textbox', { name: 'text' }));
    expect(screen.getByRole('button', { name: 'set' })).toBeDisabled();
  });

  it('should show validation errors', async () => {
    const user = userEvent.setup();
    const { fixture } = await setup('ab');
    const input = screen.getByRole('textbox', { name: 'text' });
    await user.clear(input);
    await user.tab();
    await fixture.whenStable();
    expect(screen.getByText('text required')).toBeInTheDocument();
    await user.click(input);
    await user.paste('x'.repeat(10001));
    // errors show once touched (Material's default error state matcher)
    await user.tab();
    await fixture.whenStable();
    expect(screen.getByText('text too long')).toBeInTheDocument();
  });

  it('should select a char, show its range and features', async () => {
    const user = userEvent.setup();
    const nodes: CharNode[] = [
      {
        id: 1,
        label: 'a',
        data: 'a',
        features: { v0: [{ name: 'f', value: 'v', setPolicy: 0 }] },
      },
      { id: 2, label: 'b', data: 'b' },
    ];
    const { c, chars, container, fixture } = await setup(nodes);
    await user.click(chars()[0]);
    await fixture.whenStable();
    expect(c.selectedChar()).toBe(nodes[0]);
    expect(c.selectedCharLabel()).toBe('a');
    expect(container.querySelector('#text-range')).toHaveTextContent('1 × 1');
    expect(container.querySelector('gve-feature-set-editor')).not.toBeNull();
    expect(container.querySelector('gve-feature-set-editor tbody')).toHaveTextContent('f');
  });

  it('should emit updated features of the selected char', async () => {
    const nodes = GveBaseTextService.stringToBaseChars('ab');
    const { c, textChange } = await setup(nodes);
    c.onFeaturesChange([{ name: 'x', value: 'y', setPolicy: 0 }]);
    // nothing selected
    expect(textChange).not.toHaveBeenCalled();

    c.onSelectedChar({
      char: { id: 2, label: 'b' } as never,
      event: new MouseEvent('click'),
    });
    const features = [
      { name: 'x', value: 'y', setPolicy: FeatureSetPolicy.single },
    ];
    c.onFeaturesChange(features);
    const emitted = textChange.mock.calls[0][0];
    expect(emitted[0]).toBe(nodes[0]);
    expect(emitted[1]).toEqual({ ...nodes[1], features: { v0: features } });
    expect(c.selectedChar()!.features).toEqual({ v0: features });

    // clearing all features sets null
    c.onFeaturesChange([]);
    expect(textChange.mock.calls[1][0][1].features).toBeNull();
  });

  it('should reset the selection when the text changes', async () => {
    const { c, fixture } = await setup('ab');
    c.onSelectedChar({
      char: { id: 1, label: 'a' } as never,
      event: new MouseEvent('click'),
    });
    fixture.componentRef.setInput('text', 'cd');
    await fixture.whenStable();
    expect(c.selectedChar()).toBeUndefined();
    expect(c.form.userText().value()).toBe('cd');
  });

  it('should set the text range', async () => {
    const { c } = await setup('ab');
    c.onRangePick({ at: 1, run: 2 });
    expect(c.textRange()).toEqual({ at: 1, run: 2 });
  });

  it('should not confirm a text reset when a feature is accepted', async () => {
    const user = userEvent.setup();
    const { chars, fixture } = await setup('ab');
    await user.click(chars()[0]);
    await fixture.whenStable();
    await user.click(screen.getByRole('button', { name: /^feature$/ }));
    await fixture.whenStable();
    const editor = fixture.nativeElement.querySelector('gve-feature-editor');
    const inputs = editor.querySelectorAll('input');
    await user.type(inputs[0], 'n');
    await user.type(inputs[1], 'v');
    await user.click(screen.getByRole('button', { name: 'Accept changes' }));
    expect(dialog.confirm).not.toHaveBeenCalled();
  });

  it('should render no <form> element, so it stays valid at any nesting depth', async () => {
    const { container } = await setup('ab');
    expect(container.querySelector('form')).toBeNull();
  });

  it('should flag a too long text without truncating it', async () => {
    const user = userEvent.setup();
    const { c, fixture } = await setup('');
    const input = screen.getByRole('textbox', { name: 'text' });
    // no native maxlength: the browser must not cut the pasted text
    expect(input).not.toHaveAttribute('maxlength');
    await user.click(input);
    await user.paste('x'.repeat(10001));
    // errors show once touched (Material's default error state matcher)
    await user.tab();
    await fixture.whenStable();
    expect(c.form.userText().value()).toHaveLength(10001);
    expect(screen.getByText('text too long')).toBeInTheDocument();
  });
});

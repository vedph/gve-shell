import { describe, expect, it } from 'vitest';
import { Component, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatError } from '@angular/material/form-field';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { SearchableSelectComponent } from './searchable-select.component';
import { LabeledId } from '../../models';

const OPTIONS: LabeledId[] = [
  { id: 'red', label: 'Red' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Deep Blue' },
];

@Component({
  imports: [ReactiveFormsModule, SearchableSelectComponent, MatError],
  template: `
    <gve-searchable-select
      #sel
      label="color"
      [options]="options()"
      [required]="true"
      [formControl]="ctl"
    >
      <mat-error>color required</mat-error>
    </gve-searchable-select>
  `,
})
class HostComponent {
  public readonly options = signal(OPTIONS);
  public readonly ctl = new FormControl<string | null>(null);
  public readonly sel = viewChild.required<SearchableSelectComponent>('sel');
}

describe('SearchableSelectComponent', () => {
  it('should filter options by label or ID, case-insensitively', async () => {
    const { fixture } = await render(SearchableSelectComponent, {
      inputs: { options: OPTIONS },
    });
    const c = fixture.componentInstance;
    expect(c.filteredOptions()).toEqual(OPTIONS);
    c.filterTerm.set('  BLUE ');
    expect(c.filteredOptions().map((o) => o.id)).toEqual(['blue']);
    c.filterTerm.set('gre');
    expect(c.filteredOptions().map((o) => o.id)).toEqual(['green']);
    c.filterTerm.set('deep');
    expect(c.filteredOptions().map((o) => o.id)).toEqual(['blue']);
  });

  it('should render its label', async () => {
    await render(SearchableSelectComponent, {
      inputs: { options: OPTIONS, label: 'color' },
    });
    expect(screen.getByText('color')).toBeInTheDocument();
  });

  it('should write the form value and select from the panel', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(HostComponent);
    const host = fixture.componentInstance;
    host.ctl.setValue('green');
    await fixture.whenStable();
    const combo = screen.getByRole('combobox');
    expect(combo).toHaveTextContent('Green');

    await user.click(combo);
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: 'Red' }));
    expect(host.ctl.value).toBe('red');
    expect(host.ctl.touched).toBe(true);
  });

  it('should filter the panel options by typing', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(HostComponent);
    await user.click(screen.getByRole('combobox'));
    const input = await screen.findByPlaceholderText('Type to filter…');
    await user.type(input, 'blu');
    await fixture.whenStable();
    const listbox = screen.getByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent!.trim()),
    ).toEqual(['Deep Blue']);
  });

  it('should show the no options text when nothing matches', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(HostComponent);
    await user.click(screen.getByRole('combobox'));
    const input = await screen.findByPlaceholderText('Type to filter…');
    await user.type(input, 'zzz');
    await fixture.whenStable();
    expect(screen.getByText('No matching options')).toBeInTheDocument();
  });

  it('should reset the filter when the panel closes', async () => {
    const { fixture } = await render(SearchableSelectComponent, {
      inputs: { options: OPTIONS },
    });
    const c = fixture.componentInstance;
    let touched = 0;
    c.registerOnTouched(() => touched++);
    c.filterTerm.set('x');
    c.onOpenedChange(false);
    expect(c.filterTerm()).toBe('');
    expect(touched).toBe(1);
  });

  it('should focus the filter input when the panel opens', async () => {
    const user = userEvent.setup();
    await render(HostComponent);
    await user.click(screen.getByRole('combobox'));
    const input = await screen.findByPlaceholderText('Type to filter…');
    await new Promise((r) => queueMicrotask(() => r(null)));
    expect(input).toHaveFocus();
  });

  it('should stop propagation only for non-navigation keys', async () => {
    const { fixture } = await render(SearchableSelectComponent);
    const c = fixture.componentInstance;
    for (const key of ['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'Enter']) {
      const ev = new KeyboardEvent('keydown', { key });
      let stopped = false;
      ev.stopPropagation = () => (stopped = true);
      c.onFilterKeydown(ev);
      expect(stopped).toBe(false);
    }
    const ev = new KeyboardEvent('keydown', { key: 'a' });
    let stopped = false;
    ev.stopPropagation = () => (stopped = true);
    c.onFilterKeydown(ev);
    expect(stopped).toBe(true);
  });

  it('should propagate the disabled state', async () => {
    const { fixture } = await render(HostComponent);
    fixture.componentInstance.ctl.disable();
    await fixture.whenStable();
    expect(fixture.componentInstance.sel().disabled()).toBe(true);
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('should write null for a nullish value', async () => {
    const { fixture } = await render(SearchableSelectComponent);
    fixture.componentInstance.writeValue(undefined as unknown as null);
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('should focus the select trigger', async () => {
    const { fixture } = await render(HostComponent);
    fixture.componentInstance.sel().focus();
    expect(screen.getByRole('combobox')).toHaveFocus();
  });

  it('should project mat-error', async () => {
    const user = userEvent.setup();
    const { fixture } = await render(HostComponent);
    fixture.componentInstance.ctl.addValidators((c) =>
      c.value ? null : { required: true },
    );
    fixture.componentInstance.ctl.updateValueAndValidity();
    fixture.componentInstance.ctl.markAsTouched();
    await user.click(document.body);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('mat-error')).toHaveTextContent(
      'color required',
    );
  });
});

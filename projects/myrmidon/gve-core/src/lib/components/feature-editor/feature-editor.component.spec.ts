import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import {
  FeatureEditorComponent,
  FeatureMap,
  FeaturePropMap,
} from './feature-editor.component';
import {
  Feature,
  FeatureSetPolicy,
  LabeledId,
  OperationFeature,
} from '../../models';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// longer than the name change debounce time
const DEBOUNCE = 350;

const NAMES: LabeledId[] = [
  { id: 'color', label: 'Color' },
  { id: 'r_hints', label: 'Hints' },
  { id: 'note', label: 'Note' },
];
const VALUES: FeatureMap = {
  color: [
    { id: 'red', label: 'Red' },
    { id: 'blue', label: 'Blue' },
  ],
  r_hints: [
    { id: 'h1', label: 'Hint 1' },
    { id: 'h2', label: 'Hint 2' },
  ],
};
const PROPS: FeaturePropMap = {
  note: {
    setPolicy: FeatureSetPolicy.single,
    isNegated: true,
    isGlobal: true,
    isShortLived: true,
  },
};

async function setup(inputs: Record<string, unknown> = {}) {
  const result = await render(FeatureEditorComponent, { inputs });
  const saved: (Feature | OperationFeature | undefined)[] = [];
  result.fixture.componentInstance.feature.subscribe((f) => saved.push(f));
  return { ...result, c: result.fixture.componentInstance, saved };
}

describe('FeatureEditorComponent', () => {
  describe('free names and values', () => {
    it('should start with an empty invalid form', async () => {
      const { c } = await setup();
      expect(c.form().invalid()).toBe(true);
      expect(
        screen.getByRole('button', { name: 'Accept changes' }),
      ).toBeDisabled();
    });

    it('should load a feature', async () => {
      const { c } = await setup({
        feature: {
          name: 'n',
          value: 'v:x',
          setPolicy: FeatureSetPolicy.single,
        },
      });
      expect(c.form.name().value()).toBe('n');
      // no closed values: no prefix split
      expect(c.form.value().value()).toBe('v:x');
      expect(c.form.valuePrefix().value()).toBe('');
      expect(c.form.setPolicy().value()).toBe(FeatureSetPolicy.single);
      expect(c.form().dirty()).toBe(false);
    });

    it('should edit and save a non-var feature, trimming values', async () => {
      const user = userEvent.setup();
      const { saved } = await setup();
      const [name, value] = screen.getAllByRole('textbox');
      await user.type(name, ' n ');
      await user.type(value, ' v ');
      await user.click(screen.getByRole('button', { name: 'Accept changes' }));
      expect(saved).toEqual([
        { name: 'n', value: 'v', setPolicy: FeatureSetPolicy.multiple },
      ]);
    });

    it('should save a var feature with its flags', async () => {
      const user = userEvent.setup();
      const { saved } = await setup({ isVar: true });
      const [name, value] = screen.getAllByRole('textbox');
      await user.type(name, 'n');
      await user.type(value, 'v');
      await user.click(screen.getByRole('checkbox', { name: /negated/ }));
      await user.click(screen.getByRole('checkbox', { name: /short-lived/ }));
      await user.click(screen.getByRole('checkbox', { name: /global/ }));
      await user.click(screen.getByRole('button', { name: 'Accept changes' }));
      expect(saved).toEqual([
        {
          name: 'n',
          value: 'v',
          setPolicy: FeatureSetPolicy.multiple,
          isNegated: true,
          isGlobal: true,
          isShortLived: true,
        },
      ]);
    });

    it('should load var feature flags', async () => {
      const { c } = await setup({
        isVar: true,
        feature: {
          name: 'n',
          value: 'v',
          setPolicy: FeatureSetPolicy.multiple,
          isNegated: true,
          isGlobal: true,
          isShortLived: true,
        } as OperationFeature,
      });
      expect(c.form.isNegated().value()).toBe(true);
      expect(c.form.isGlobal().value()).toBe(true);
      expect(c.form.isShortLived().value()).toBe(true);
    });

    it('should not save an invalid form', async () => {
      const { c, saved } = await setup();
      c.save();
      expect(saved).toEqual([]);
    });

    it('should show validation errors', async () => {
      const user = userEvent.setup();
      const { fixture } = await setup();
      const [name, value] = screen.getAllByRole('textbox');
      await user.type(name, 'x');
      await user.clear(name);
      await user.tab();
      await fixture.whenStable();
      expect(screen.getByText('name required')).toBeInTheDocument();
      await user.type(name, 'x'.repeat(51));
      await fixture.whenStable();
      expect(screen.getByText('name too long')).toBeInTheDocument();
      await user.click(value);
      await user.paste('v'.repeat(5001));
      await fixture.whenStable();
      expect(screen.getByText('value too long')).toBeInTheDocument();
    });

    it('should not reset the value when changing a free name', async () => {
      const user = userEvent.setup();
      const { c } = await setup({
        feature: { name: 'n', value: 'v', setPolicy: 0 },
      });
      await user.type(screen.getAllByRole('textbox')[0], 'x');
      await wait(DEBOUNCE);
      expect(c.form.value().value()).toBe('v');
    });

    it('should reset the form when the feature is cleared', async () => {
      const { c, fixture } = await setup({
        feature: { name: 'n', value: 'v', setPolicy: 0 },
      });
      fixture.componentRef.setInput('feature', undefined);
      await fixture.whenStable();
      expect(c.form.name().value()).toBe('');
      expect(c.nameIds()).toBeUndefined();
    });

    it('should emit featureCancel', async () => {
      const cancel = vi.fn();
      await render(FeatureEditorComponent, { on: { featureCancel: cancel } });
      await userEvent.click(
        screen.getByRole('button', { name: 'Discard changes' }),
      );
      expect(cancel).toHaveBeenCalled();
    });

    it('should focus the free name input after loading', async () => {
      await setup({ feature: { name: 'n', value: 'v', setPolicy: 0 } });
      await wait(10);
      expect(screen.getAllByRole('textbox')[0]).toHaveFocus();
    });

    it('should not propagate its form submit to outer forms', async () => {
      const user = userEvent.setup();
      const outer = vi.fn();
      document.addEventListener('submit', outer);
      try {
        await setup({ feature: { name: 'n', value: 'v', setPolicy: 0 } });
        await user.type(screen.getAllByRole('textbox')[1], 'x');
        await user.click(
          screen.getByRole('button', { name: 'Accept changes' }),
        );
        expect(outer).not.toHaveBeenCalled();
      } finally {
        document.removeEventListener('submit', outer);
      }
    });
  });

  describe('form structure', () => {
    it('should render no <form> element, so it stays valid at any nesting depth', async () => {
      const { container } = await setup();
      expect(container.querySelector('form')).toBeNull();
    });

    it('should accept changes with Enter only when they can be saved', async () => {
      const user = userEvent.setup();
      const { saved } = await setup({
        feature: { name: 'n', value: 'v', setPolicy: 0 },
      });
      const [name, value] = screen.getAllByRole('textbox');
      // pristine: Enter does nothing
      await user.click(value);
      await user.keyboard('{Enter}');
      expect(saved).toEqual([]);
      // invalid: Enter does nothing
      await user.clear(name);
      await user.keyboard('{Enter}');
      expect(saved).toEqual([]);
      await user.type(name, 'm{Enter}');
      expect(saved).toEqual([
        { name: 'm', value: 'v', setPolicy: FeatureSetPolicy.multiple },
      ]);
    });

    it('should not reset the value on the echo of its own save', async () => {
      const { c, saved } = await setup({
        featNames: NAMES,
        featValues: VALUES,
        feature: { name: 'color', value: 'red', setPolicy: 0 },
      });
      c.form.value().value.set('blue');
      c.save();
      await wait(DEBOUNCE);
      expect(saved.at(-1)).toEqual({ name: 'color', value: 'blue', setPolicy: 0 });
      expect(c.form.value().value()).toBe('blue');
    });
  });

  describe('closed names and values', () => {
    it('should load a closed value splitting its prefix', async () => {
      const { c, fixture } = await setup({
        featNames: NAMES,
        featValues: VALUES,
        feature: { name: 'color', value: '@2:red', setPolicy: 0 },
      });
      expect(c.nameIds()).toEqual(VALUES['color']);
      expect(c.form.valuePrefix().value()).toBe('@2:');
      expect(c.form.value().value()).toBe('red');
      await fixture.whenStable();
      expect(screen.getByRole('combobox', { name: 'value' })).toHaveTextContent(
        'Red',
      );
    });

    it('should load a closed value without prefix', async () => {
      const { c } = await setup({
        featNames: NAMES,
        featValues: VALUES,
        feature: { name: 'color', value: 'red', setPolicy: 0 },
      });
      expect(c.form.valuePrefix().value()).toBe('');
      expect(c.form.value().value()).toBe('red');
    });

    it('should save a closed value with its prefix', async () => {
      const { c, saved } = await setup({
        featNames: NAMES,
        featValues: VALUES,
        feature: { name: 'color', value: 'red', setPolicy: 0 },
      });
      c.form.valuePrefix().value.set('@1:');
      c.form.value().value.set('blue');
      c.save();
      expect(saved.at(-1)).toEqual({
        name: 'color',
        value: '@1:blue',
        setPolicy: 0,
      });
    });

    it('should validate the prefix', async () => {
      const { c } = await setup({
        featNames: NAMES,
        featValues: VALUES,
        feature: { name: 'color', value: 'red', setPolicy: 0 },
      });
      c.form.valuePrefix().value.set('@1');
      expect(c.form.valuePrefix().getError('noColon')).toBeTruthy();
      c.form.valuePrefix().value.set('@1:');
      expect(c.form.valuePrefix().errors()).toEqual([]);
    });

    it('should reset value and apply props when picking a name', async () => {
      const { c } = await setup({
        isVar: true,
        featNames: NAMES,
        featValues: VALUES,
        featProps: PROPS,
        feature: { name: 'color', value: '@1:red', setPolicy: 0 },
      });
      c.form.name().value.set('note');
      await wait(DEBOUNCE);
      expect(c.form.value().value()).toBe('');
      expect(c.form.valuePrefix().value()).toBe('');
      expect(c.nameIds()).toBeUndefined();
      expect(c.form.setPolicy().value()).toBe(FeatureSetPolicy.single);
      expect(c.form.isNegated().value()).toBe(true);
      expect(c.form.isGlobal().value()).toBe(true);
      expect(c.form.isShortLived().value()).toBe(true);
    });

    it('should apply only the defined props', async () => {
      const { c } = await setup({
        isVar: true,
        featNames: NAMES,
        featProps: { note: { setPolicy: FeatureSetPolicy.singleFirst } },
      });
      c.form.isNegated().value.set(true);
      c.form.name().value.set('note');
      await wait(DEBOUNCE);
      expect(c.form.setPolicy().value()).toBe(FeatureSetPolicy.singleFirst);
      expect(c.form.isNegated().value()).toBe(true);
    });

    it('should refresh value IDs when re-picking a name after a load', async () => {
      const { c, fixture } = await setup({
        featNames: NAMES,
        featValues: VALUES,
      });
      // user picks color
      c.form.name().value.set('color');
      await wait(DEBOUNCE);
      expect(c.nameIds()).toEqual(VALUES['color']);
      // programmatic load of another feature
      fixture.componentRef.setInput('feature', {
        name: 'r_hints',
        value: 'h1',
        setPolicy: 0,
      });
      await fixture.whenStable();
      expect(c.nameIds()).toEqual(VALUES['r_hints']);
      // user picks color again
      c.form.name().value.set('color');
      await wait(DEBOUNCE);
      expect(c.nameIds()).toEqual(VALUES['color']);
      expect(c.form.value().value()).toBe('');
    });

    it('should handle the user re-picking the loaded name', async () => {
      const { c } = await setup({
        isVar: true,
        featNames: NAMES,
        featValues: VALUES,
        featProps: PROPS,
        feature: { name: 'note', value: 'x', setPolicy: 0 },
      });
      c.form.name().value.set('color');
      await wait(DEBOUNCE);
      expect(c.nameIds()).toEqual(VALUES['color']);
      // back to the loaded name: still a user change
      c.form.name().value.set('note');
      await wait(DEBOUNCE);
      expect(c.nameIds()).toBeUndefined();
      expect(c.form.setPolicy().value()).toBe(FeatureSetPolicy.single);
    });

    it('should pick the name from the searchable select', async () => {
      const user = userEvent.setup();
      const { c } = await setup({ featNames: NAMES, featValues: VALUES });
      await user.click(screen.getByRole('combobox', { name: 'name' }));
      await user.click(await screen.findByRole('option', { name: 'Color' }));
      await wait(DEBOUNCE);
      expect(c.form.name().value()).toBe('color');
      expect(c.nameIds()).toEqual(VALUES['color']);
    });
  });

  describe('multi-valued features', () => {
    it('should compose values', async () => {
      const { c } = await setup({
        featNames: NAMES,
        featValues: VALUES,
        feature: { name: 'r_hints', value: '', setPolicy: 0 },
      });
      expect(c.isMultiValued()).toBe(true);
      expect(screen.getByText('composite value')).toBeInTheDocument();
      // nothing selected: no-op
      c.addValueToComposite();
      expect(c.form.value().value()).toBe('');
      c.form.selectedValue().value.set('h1');
      c.addValueToComposite();
      expect(c.form.value().value()).toBe('h1');
      expect(c.form.selectedValue().value()).toBe('');
      c.form.selectedValue().value.set('h2');
      c.addValueToComposite();
      expect(c.form.value().value()).toBe('h1 h2');
      expect(c.form.value().dirty()).toBe(true);
    });

    it('should not be multi-valued without IDs', async () => {
      const { c } = await setup({
        multiValuedFeatureIds: undefined,
        feature: { name: 'r_hints', value: '', setPolicy: 0 },
      });
      expect(c.isMultiValued()).toBe(false);
    });
  });
});

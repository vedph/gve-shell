import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { FeatureSetViewComponent } from './feature-set-view.component';
import { Feature, FeatureSetPolicy } from '../../models';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const f = (name: string, value: string): Feature => ({
  name,
  value,
  setPolicy: FeatureSetPolicy.multiple,
});

describe('FeatureSetViewComponent', () => {
  const rows = (container: Element) =>
    Array.from(container.querySelectorAll('tbody tr')).map((tr) => [
      tr.querySelector('th')!.textContent!.trim(),
      tr.querySelector('td')!.textContent!.trim(),
    ]);

  it('should render nothing without features', async () => {
    const { container } = await render(FeatureSetViewComponent);
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('#filter')).toBeNull();
  });

  it('should list features', async () => {
    const { container } = await render(FeatureSetViewComponent, {
      inputs: { features: [f('a', '1'), f('b', '2')] },
    });
    expect(rows(container)).toEqual([
      ['a', '1'],
      ['b', '2'],
    ]);
  });

  it('should look up names and values', async () => {
    const { container } = await render(FeatureSetViewComponent, {
      inputs: {
        features: [f('c', 'r'), f('x', 'y')],
        featNames: [{ id: 'c', label: 'Color' }],
        featValues: { c: [{ id: 'r', label: 'Red' }] },
      },
    });
    expect(rows(container)).toEqual([
      ['Color', 'Red'],
      ['x', 'y'],
    ]);
  });

  it('should show the filter only above the threshold', async () => {
    const { container, fixture } = await render(FeatureSetViewComponent, {
      inputs: { features: [f('a', '1'), f('b', '2')], filterThreshold: 2 },
    });
    expect(container.querySelector('#filter')).toBeNull();
    fixture.componentRef.setInput('filterThreshold', 1);
    await fixture.whenStable();
    expect(container.querySelector('#filter')).not.toBeNull();
    expect(container.querySelector('#badge')).toHaveTextContent('2');
  });

  it('should always show the filter with threshold 0', async () => {
    const { container } = await render(FeatureSetViewComponent, {
      inputs: { features: [], filterThreshold: 0 },
    });
    expect(container.querySelector('#filter')).not.toBeNull();
  });

  it('should filter features by name and reset the filter', async () => {
    const user = userEvent.setup();
    const { container, fixture } = await render(FeatureSetViewComponent, {
      inputs: {
        features: [f('alpha', '1'), f('beta', '2'), f('Alps', '3')],
        filterThreshold: 0,
      },
    });
    await user.type(screen.getByRole('textbox', { name: 'filter' }), 'AL');
    await wait(350);
    await fixture.whenStable();
    expect(rows(container).map((r) => r[0])).toEqual(['alpha', 'Alps']);

    await user.click(screen.getByRole('button', { name: 'Reset filter' }));
    await wait(350);
    await fixture.whenStable();
    expect(rows(container)).toHaveLength(3);
  });

  it('should reset the filter when features change', async () => {
    const { fixture } = await render(FeatureSetViewComponent, {
      inputs: { features: [f('a', '1')], filterThreshold: 0 },
    });
    const c = fixture.componentInstance;
    c.filter.setValue('zzz');
    await wait(350);
    expect(c.filteredFeatures()).toHaveLength(0);
    fixture.componentRef.setInput('features', [f('b', '1'), f('c', '2')]);
    await fixture.whenStable();
    expect(c.filter.value).toBeNull();
    expect(c.filteredFeatures()).toHaveLength(2);
  });
});

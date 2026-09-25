import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import {
  BaseTextChar,
  BaseTextCharComponent,
  BaseTextCharEvent,
} from './base-text-char.component';

describe('BaseTextCharComponent', () => {
  const char: BaseTextChar = {
    id: 7,
    index: 3,
    value: 'a',
    label: 'a',
    color: '#FF0000',
    borderColor: '#00FF00',
    emSize: 2,
  };

  it('should render nothing without char', async () => {
    const { container } = await render(BaseTextCharComponent);
    expect(container.querySelector('#container')).toBeNull();
  });

  it('should render label, ID and styles', async () => {
    const { container } = await render(BaseTextCharComponent, {
      inputs: { char },
    });
    const label = container.querySelector('#c-label') as HTMLElement;
    const id = container.querySelector('#c-id') as HTMLElement;
    expect(label).toHaveTextContent('a');
    expect(label.style.fontSize).toBe('2em');
    expect(label.style.borderColor).toBe('rgb(0, 255, 0)');
    expect(id).toHaveTextContent('7');
    expect(id.style.fontSize).toBe('1em');
    expect(id.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('should render the index when showIndex is true', async () => {
    const { container } = await render(BaseTextCharComponent, {
      inputs: { char, showIndex: true },
    });
    expect(container.querySelector('#c-id')).toHaveTextContent('3');
  });

  it('should emit charPick on click', async () => {
    const pick = vi.fn<(e: BaseTextCharEvent) => void>();
    await render(BaseTextCharComponent, {
      inputs: { char },
      on: { charPick: pick },
    });
    await userEvent.click(screen.getByText('a'));
    expect(pick).toHaveBeenCalledTimes(1);
    expect(pick.mock.calls[0][0].char).toBe(char);
    expect(pick.mock.calls[0][0].event).toBeInstanceOf(MouseEvent);
  });

  it('should emit charDblPick on double click', async () => {
    const dblPick = vi.fn<(e: BaseTextCharEvent) => void>();
    await render(BaseTextCharComponent, {
      inputs: { char },
      on: { charDblPick: dblPick },
    });
    await userEvent.dblClick(screen.getByText('a'));
    expect(dblPick).toHaveBeenCalledTimes(1);
    expect(dblPick.mock.calls[0][0].char).toBe(char);
  });
});

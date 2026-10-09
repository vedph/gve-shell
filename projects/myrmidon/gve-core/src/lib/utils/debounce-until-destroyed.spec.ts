import { describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  takeUntilDestroyed,
  toObservable,
} from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { debounceUntilDestroyed } from './debounce-until-destroyed';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Component({ selector: 'gve-test-host', template: '' })
class HostComponent {
  public readonly value = signal(0);
  public readonly plain: number[] = [];
  public readonly guarded: number[] = [];

  constructor() {
    toObservable(this.value)
      .pipe(debounceTime(50), takeUntilDestroyed())
      .subscribe((v) => this.plain.push(v));
    toObservable(this.value)
      .pipe(debounceUntilDestroyed(50))
      .subscribe((v) => this.guarded.push(v));
  }
}

describe('debounceUntilDestroyed', () => {
  it('should debounce like debounceTime while alive', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const c = fixture.componentInstance;
    await fixture.whenStable();
    c.value.set(1);
    await fixture.whenStable();
    c.value.set(2);
    await fixture.whenStable();
    await wait(80);
    expect(c.guarded).toEqual([2]);
    expect(c.plain).toEqual([2]);
  });

  it('should drop a pending value on destroy, unlike debounceTime', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const c = fixture.componentInstance;
    await fixture.whenStable();
    await wait(80);
    c.plain.length = 0;
    c.guarded.length = 0;

    c.value.set(1);
    await fixture.whenStable();
    fixture.destroy();
    await wait(80);

    // the hazard: debounceTime flushes on toObservable's completion
    expect(c.plain).toEqual([1]);
    expect(c.guarded).toEqual([]);
  });
});

import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  concatWith,
  debounceTime,
  MonoTypeOperatorFunction,
  NEVER,
} from 'rxjs';

/**
 * Debounce a signal-derived observable (from `toObservable`) for as long
 * as its injection context lives, dropping a value still pending when that
 * context is destroyed.
 *
 * Why not just `debounceTime(ms), takeUntilDestroyed()`: `toObservable`
 * completes its observable from a `DestroyRef.onDestroy` callback, which is
 * registered before (and so runs before) the one of `takeUntilDestroyed`;
 * and `debounceTime` emits its pending value when its source completes. The
 * subscriber would then run once more on a destroyed component, e.g.
 * emitting an output (NG0953). Here the source completion is swallowed, so
 * only `takeUntilDestroyed` ends the stream, discarding any pending value.
 *
 * Must be used in an injection context, unless `destroyRef` is specified.
 *
 * @param ms The debounce time in milliseconds.
 * @param destroyRef The optional destroy reference.
 */
export function debounceUntilDestroyed<T>(
  ms: number,
  destroyRef?: DestroyRef,
): MonoTypeOperatorFunction<T> {
  const untilDestroyed = takeUntilDestroyed<T>(destroyRef);
  return (source) =>
    source.pipe(concatWith(NEVER), debounceTime(ms), untilDestroyed);
}

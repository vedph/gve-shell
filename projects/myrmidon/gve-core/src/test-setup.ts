// Global setup for the gve-core unit tests (Vitest + jsdom, zoneless).
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no Clipboard API: provide a minimal stub, so that components
// using navigator.clipboard can be tested by spying on it.
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: vi.fn(() => Promise.resolve()),
      readText: vi.fn(() => Promise.resolve('')),
    },
  });
}

// jsdom does not implement ResizeObserver (used by the snapshot rendition)
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

// jsdom does not implement scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

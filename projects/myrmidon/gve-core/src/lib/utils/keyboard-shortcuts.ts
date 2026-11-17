/**
 * Keyboard shortcuts of the GVE editors. All of them use Alt+Shift with a
 * letter, matched by its physical key (`KeyboardEvent.code`), so that they:
 * - do not depend on the keyboard layout, nor on the character produced by
 * Option+Shift on macOS;
 * - do not interfere with browser shortcuts (Ctrl/Cmd combinations, and
 * Alt+letter which opens menus on Windows and Linux) nor with AltGr
 * (= Ctrl+Alt) characters of many European layouts.
 */
export const GVE_SHORTCUTS = {
  /** Snapshot editor: add a new operation. */
  newOperation: { code: 'KeyN', label: 'Alt+Shift+N' },
  /** Snapshot editor: run all the operations. */
  runAll: { code: 'KeyR', label: 'Alt+Shift+R' },
  /** Operation editor: add a new feature. */
  newFeature: { code: 'KeyF', label: 'Alt+Shift+F' },
  /** Operation editor: add a new source. */
  newSource: { code: 'KeyS', label: 'Alt+Shift+S' },
} as const;

/**
 * A GVE keyboard shortcut.
 */
export type GveShortcut = (typeof GVE_SHORTCUTS)[keyof typeof GVE_SHORTCUTS];

/**
 * True if the specified keyboard event matches the specified shortcut.
 */
export function isGveShortcut(event: KeyboardEvent, shortcut: GveShortcut): boolean {
  return (
    event.altKey &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.repeat &&
    event.code === shortcut.code
  );
}

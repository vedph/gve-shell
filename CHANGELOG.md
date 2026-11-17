# History

- 2026-11-17: improvements (each covered by tests):
  - `SnapshotEditorComponent`:
    - with auto-run, saving an edited operation (or leaving a previewed one) now runs *all* the operations, selecting the edited one in the result view, rather than running only up to it: the result view and the rendition get the whole chain. `runTo` has a new optional `stepIndex` parameter for the step to select.
    - warning (snackbar) when operations have an input tag referring to a version which does not exist at their point of the chain, so that their output is empty. The steps map and the result view flag them too (new `getUnknownInputStepIndexes` utility).
    - the base text panel starts expanded when the snapshot has no base text.
    - new button to copy the base text.
    - new `run` button to run all the operations.
    - keyboard shortcuts: `Alt+Shift+N` adds a new operation (ignored while editing one), `Alt+Shift+R` runs all the operations. They are ignored while a dialog is open (`GVE_SHORTCUTS`, `isGveShortcut`).
    - layout: the operations list (`opListMaxHeight`, now 50vh by default) and the base text (new `textMaxHeight`, 50vh) scroll rather than pushing the rest of the editor off screen; the list header is sticky, and the list scrolls horizontally on narrow screens. The result fieldset has no height limit any more, as its parts scroll by themselves (no nested scrollbars).
    - copying the operations DSL warns when some operations have values with line feeds, which the DSL cannot represent, so that they would not parse back via batch. Quotes and backslashes instead round-trip (verified against the backend).
    - 🐛 the `batchOps` preset never reached the batch dialog (wrong data shape, and the signal was passed instead of its value).
    - 🐛 the add operation button was not disabled without base text (it tested an array for falsiness).
  - `ChainOperationEditorComponent`: keyboard shortcuts `Alt+Shift+F` adds a new feature (switching to the general tab; ignored while editing a feature) and `Alt+Shift+S` adds a new source (ignored while editing one). The tab group selection is now synced both ways, so that switching tabs programmatically works after the user changed tab.
  - `ChainResultViewComponent`: warning for a step with an unknown input version; the step text scrolls (new `textMaxHeight`, 45vh), as does the steps map (CSS `--gve-steps-map-max-height`, 70vh). On narrow screens the map is stacked below the step rather than hidden.
  - `StepsMapComponent`: flags steps with an unknown input version; stronger highlight of the selected step.
  - `BaseTextViewComponent`: clicking a character while search matches are highlighted clears the search and selects the character (before, the selection was hidden by the search highlight). New `maxHeight` input.
  - `FeatureSetEditorComponent`: features are listed sorted by name; features can be selected (also all at once) and copied to the clipboard, and pasted back into any feature set according to the set policy of each pasted feature (`mergePastedFeatures`); new `addFeatureShortcut` input for the add button hint.
  - `FeatureEditorComponent`: the prefix field has no placeholder, which overlapped its label; the example is in its tooltip.
- 2026-11-17: 🐛 fixes in the data flow from `SnapshotEditorComponent` to the result view and the rendition (each covered by new tests, verified to fail before the fix):
  - `SnapshotEditorComponent`:
    - `initialStepIndex` was set when a run started, rather than together with its result. While the request was pending, the result view selected the step at the new index in the *previous* result: an empty text (when that result had no such step) or the text of a wrong step. If the run failed, this state persisted. The index is now set only when the result arrives.
    - a deferred preview (auto-run) read the edited operation index only when it ran. If the user saved, cancelled or moved to another operation in the meantime, it either ran with index -1 (throwing *after* cancelling the in-flight run of the save, so that the result and rendition were left stale) or replaced another operation with the previewed one. The index is now captured at request time, and the preview is dropped when the edited operation changed. `runTo` also ignores invalid indexes without cancelling the pending run.
    - after previewing unsaved edits of an operation (auto-run), cancelling them or leaving the operation kept showing the unsaved edits in the result view and in the rendition. The saved operations are now run again; the same happens when saving after auto-run was turned off.
    - the result pushed to the rendition was mutated (`text`) while being the same object held by the `result` signal and shared with the result view. It is now copied.
  - `StepsMapComponent`: steps were tracked and their text lines keyed by output tag, which is not unique across steps (an operation whose input tag points to an earlier version outputs to it again). Earlier steps showed the text of later ones with the same tag, and duplicate `@for` keys confused DOM reuse. Steps are now tracked by position. A selection coming from a previous result is mapped to its counterpart among the new steps.
  - `ChainResultViewComponent`: picking a step resolved it again from its output tag, so that picking one of several steps with the same tag selected the first one; a step left over from a previous result (as emitted by the map) could become the current step. The picked step is now selected as such, and steps not in the current result are ignored.
  - `ChainOperationEditorComponent`: the debounced auto-preview is requested only for user edits (dirty form), not when an operation is bound. This changes the original behaviour (which previewed on load too): with auto-run on, merely opening or browsing operations ran the chain truncated at the opened operation.
- 2026-11-13: updated Angular and packages.

## 8.0.0

- 2026-10-09:
  - updated packages.
  - ⚠️ migrated `gve-core` and the demo app from reactive/template-driven forms to signal forms (`@angular/forms/signals`). Components no longer render `<form>` elements; component inputs/outputs/models are unchanged, but the public `FormControl` fields are replaced by signal form field trees. See `signal-forms-migration.md` for details and behaviour changes.
  - replaced `scripts/build-libs.mjs` (dependency order from manifests and imports, `--dry`, `--clear-cache`).
  - moved the `rollup` override from `package.json` to `pnpm-workspace.yaml` (pnpm 12 no longer reads the former, which broke all `pnpm run` scripts).
  - replaced NgModule imports with standalone directives/components/pipes; `inject()` instead of constructor injection; `@Service()` for root services.
  - 🐛 `SnapshotEditorComponent`: every new execution result added another `versionTagChange` listener to the rendition (the init effect tracked `result()`).
  - `ChainOperationEditorComponent`: commented out the unused diplomatic/SVG/elements state (never in the template nor in the saved operation).

## 7.0.20

- 2026-09-25:
  - updated Angular and packages.
  - removed unused `@myrmidon/ngx-viz`.
  - 🧪 **tests**: full Vitest test suite for `gve-core` (Angular Testing Library for components, plain Vitest for services, validators and utilities; API services excluded). Added `@testing-library/jest-dom` matchers and `@vitest/coverage-v8`; test setup in `projects/myrmidon/gve-core/src/test-setup.ts`. Removed the app's test target and its stub specs (demo pages are not tested). Scripts: `test`, `test:watch`, `test:coverage`.
  - 🛠️ **workspace**: local libraries are resolved only via `tsconfig.json` `paths` to `dist/`. Added `scripts/build-libs.mjs` (`pnpm run build-libs`/`build-lib`: builds libraries in dependency order, optionally clearing `.angular/cache`) and `scripts/check-local-libs.mjs` (`pnpm run check-libs`, also run before `start`, `build` and `build-libs`), which fails when a local library is found in `node_modules`/lockfile or is not mapped to its `dist/`.
  - 🐛 **fixes** found while testing:
    - `FeatureSetEditorComponent`:
      - saving an edited feature when another feature with the same name had a single set policy (or the edited one had it) replaced the wrong feature, losing data: removing duplicates shifted indexes before the edited feature was replaced at its old index.
      - deleting a feature while editing another one left a stale edited index, so that saving the edit replaced the wrong feature.
      - the edited row highlight used the filtered row index, so it was wrong while filtering.
      - filter label was a plain `label` rather than `mat-label`.
    - `FeatureEditorComponent`:
      - accepting a feature submitted its form, and the submit event bubbled up to any ancestor form: e.g. in the operation editor it also saved (and closed) the whole operation, and in the base text editor it prompted to reset the text. The form now stops the submit propagation.
      - after a feature was loaded programmatically, re-picking the name the user had last picked was ignored (`distinctUntilChanged` compared against a stale value), so the value list and value reset were not updated.
      - the free-text name input never got the focus when loading a feature (the view child is an `ElementRef`, not the input element).
      - "too long" errors were never shown (`maxLength` vs. Angular's `maxlength` error key). The same fix applies to `BaseTextEditorComponent`, `OperationSourceEditorComponent` and `SnapshotTextEditorComponent`.
    - `OperationSourceEditorComponent`: its form submit no longer bubbles to ancestor forms (e.g. saving the operation when accepting a source).
    - `ChainOperationEditorComponent`:
      - line feeds escaping in the operation value was reversed: loading an operation turned backslashes into LF, and saving turned LF into backslashes, so that a value with LF was corrupted on save. Now, as intended, LF is shown as `\` in the (single-line) value input, and `\` is saved as LF. Note that as a consequence of this convention a literal backslash cannot be entered in a value.
      - changing the operation type to one requiring a value (replace, add-before, add-after) did not re-validate the value, so that the operation could be saved without it.
      - deleting a source while editing another one left a stale edited index, so that saving the source replaced the wrong one.
      - the edited source row highlight never showed (it compared against a clone). Added tooltips to the source edit/delete buttons.
    - `ChainResultViewComponent`: the features of a picked text range were computed by filtering nodes with IDs in the numeric range `at`..`at+run-1`, while the range refers to consecutive nodes in the version text (whose IDs are not contiguous once operations add or move nodes); also, the current version was taken from the tag control, which is not set when the step comes from `initialStepIndex`. Now the range is resolved positionally in the current step's text.
    - `BaseTextViewComponent`: after clearing a search, searching again for the same text did nothing (`distinctUntilChanged`); and a search still pending when cleared could bring its highlights back.
    - `BatchOperationEditorComponent`: an API error left the component busy forever, disabling any further parsing. Also added the missing `MatTooltipModule` import (tooltips were not shown), as in `SnapshotTextEditorComponent`.
    - `SnapshotEditorComponent`:
      - deleting, duplicating or moving operations while editing one left a stale edited index, so that saving the edited operation replaced another one.
      - batch-adding features or sources to a range of operations mutated the operation objects, which are shared with the snapshot received as input (so changes leaked even when not saved).
      - submitting the operations range form (to edit features/sources of a range) also submitted the outer form, thus saving the snapshot.
      - picking a step whose operation is not in the list threw an error.
      - applying rendition settings mutated the input settings object (by default the shared `DEFAULT_SETTINGS` of `@myrmidon/gve-snapshot-rendition`).
    - `SnapshotTextEditorComponent`: text label was a plain `label` rather than `mat-label`.
    - `SettingsService`: the key prefix was not transparent as documented: `getKeys` and `settingChange$` returned prefixed keys, so that e.g. `get(getKeys()[0])` failed.
    - `GveGraphvizService`: double quotes (and backslashes) in node labels were not escaped, producing invalid DOT code.
    - `SvgValidators.rootGValidator`: malformed XML was accepted (`DOMParser` does not throw), while an SVG with whitespace around its root `g`, or with nested `g` elements, was rejected.
  - ♿ **accessibility**: added `aria-label`s to all the icon-only buttons (they had no accessible name, as the icon is `aria-hidden` and a tooltip is just a description).
- 2026-09-22: updated packages.
- 2026-09-14: updated packages.
- 2026-09-04: updated packages.

## 7.0.19

- 2026-08-13:
  - 🆕 `TextPeepholeComponent`: new `showIndex` input; when true, the number shown under each character is its window-relative position (`windowStart() + i`) instead of its node ID. Consequently, `ChainOperationEditorComponent` — binds `[showIndex]="peepholeRange().atAsIndex ?? false"` on the peephole, reusing the same signal already kept in sync with the atAsIndex form control, so the peephole automatically switches display mode as the user toggles the idx checkbox.
  - 🆕 `BaseTextViewComponent` / `BaseTextCharComponent` — added a `showIndex` signal on the view (default off) with a `toggleShowIndex()` method and a new toolbar button (icon/text switches between tag/id and numbers/index). `BaseTextChar` now carries an index field (the character's 0-based position in the flat text sequence, continuous across lines/newlines), and `BaseTextCharComponent` takes a `showIndex` input to decide whether to render id or index.

- 2026-08-11: fixed the base text limitation of the `BaseTextPeepholeComponent`, both of which traced back to a single root cause: `chain-operation-editor.component.ts`:213 already had a `precedingText` input designed to feed the peephole the operation's actual input-version text (falling back to base text when absent).

The fix is in snapshot-editor.component.ts: a new `editedOpPrecedingText` computed signal resolves the correct input text for the operation being edited, and it's now wired into the template via [precedingText]="`editedOpPrecedingText()`".

Resolution logic (`resolveOperationInputTag`), respecting branching per your note:

Look up the edited operation by id among result().steps — the backend already resolved the actual inputTag there, correctly handling branches and blank tags.
If not found (e.g. a brand-new, never-run operation) but `inputTag` is explicitly set and known to `result().versionNodeIds`, use it directly.
Otherwise (blank inputTag, "= latest"), fall back to the resolved output tag of the preceding operation in the list — or v0 for the first operation.
`getVersionText` then builds the ordered `CharNode[]` for that tag from versionNodeIds + nodes, matching the model you described.

Renamed `BaseTextPeepholeComponent` → `TextPeepholeComponent` (and `OpBaseTextRange` → `OpTextRange`), moving base-text-peephole/ to text-peephole/, selector gve-base-text-peephole → gve-text-peephole, updating all references in chain-operation-editor, public-api.ts, and the demo app.

## 7.0.18

- 2026-07-29: 🆕 added search box in feature picker.

## 7.0.17

- 2026-07-23: updated packages.

## 7.0.16

- 2026-07-10:
  - 🆕 added edit previous/next operation to operation editor.
  - 🆕 added tooltips for sources in operations list.
  - increased default peephole width from 15 to 20 and adjusted its layout.
  - updated packages (fixes to renderer).
  - updated rendition-settings.json with new hints and animations.

## 7.0.15

- 2026-07-03:
  - minor layout fixes in operations list.
  - parameterized peephole window with (`env.js`).

## 7.0.14

- 2026-07-02:
  - 🆕 added text peephole to operation editor.
  - added vertical gridlines to table.
  - added operation number to editor.
  - updated packages.

## 7.0.13

- 2026-06-26:
  - updated Angular and packages.
  - fixes to snapshot editor:
    - `runTo()` silently dropped updates when busy (primary freeze cause). In `snapshot-editor.component.ts`, `if (this.busy()) return` caused any new data that arrived while the API was still responding to be silently discarded. The component then stayed frozen showing old state. Fix: replace with subscription cancellation — the in-flight request is unsubscribed and the new one starts immediately. Latest data always wins.
  - `updateRendition()` called before the element exists in DOM (first-load blank render).
  - `result.set(wrapper.result)` followed immediately by `updateRendition()` doesn't work on first load because in zoneless Angular the `@if (result())` DOM insertion is asynchronous. `renditionRef()?.nativeElement` is undefined at that moment. Fix: `initRendition()` (the effect that fires when the element appears) now also pushes the current result data if already available, recovering the missed push.
  - no reactive path for settings arriving after first render. `renditionSettings` is loaded async from the backend. If it arrives after the element was already initialized, nothing re-applied it. Fix: a new `effect()` watches `renditionSettings()` and calls `applyRenditionSettings()` whenever it changes.

## 7.0.11

- 2026-06-13:
  - removed unused Monaco dependencies and updated packages.
  - ⚠️ moved from Jest to Vitest.
- 2026-06-05:
  - fixed delete source button not connected to code.
  - ⚠️ upgraded to Angular 22.

## 7.0.9

- 2026-05-29: 🆕 added `featProps` to `FeatureEditorComponent` (and its ancestors) to preset features properties when the user picks a feature from the component. Example:

```json
{
  "log": {
    "setPolicy": FeatureSetPolicy.single,
    "isGlobal": true
 },
  "version": {
    "setPolicy": FeatureSetPolicy.single,
    "isGlobal": true,
    "isShortLived": true
 }
}
```

## 7.0.8

- 2026-05-28: added prefix for feature value in feature editor. Sometimes users need to add a custom prefix to the value (always ending with `:` by convention); in editing features, when the value is not closed, users they just type it. When instead the value is closed, they had no way to enter it. So for instance if color is a closed feature having a set of values like red, green, blue, users may want not only to pick "red" and get its value (e.g. "r"); but also to prefix it something, like "@2:", so that in the end the feature's value will be "@2:r" and not just "r". A new form control named `valuePrefix` has been added which contains the prefix to be added to the edited feature value. This control will be visible in the HTML template only if the selected feature name has a closed set of values.

## 7.0.7

- 2026-05-26:
  - better UI for batch operations add dialog.
  - 🆕 added copy text button to steps map.
  - 🆕 improved copy JSON function to copy both base text and operations, so a run-operations request body can be got from it.
  - updated packages.
- 2026-05-21: updated Angular and packages.

## 7.0.6

- 2026-05-16: updated Angular and packages.
- 2026-05-14: updated Angular and packages.
- 2026-05-07: added batch source editor.

## 7.0.2

- 2026-05-07: fixes to features set editor in batch mode.

## 7.0.1

- 2026-05-06:
  - 🆕 adding features for multiple operations at once.
  - display version badge and source in operations list.
  - more validation to operation editor: conditional validation for at>0 when not index, and for required value when the operation is add/replace.
  - updated Angular and packages.

## 7.0.0

- 2026-04-25: ⚠️ refactored for new API response models.
- 2026-04-24: more comments.

## 6.1.6

- 2026-04-16:
  - updated Angular and packages.
  - 🆕 added `sourceIds` and `sourceTypes` presets to snapshot editor.

## 6.1.5

- 2026-04-02:
  - ⚠️ shell gone zoneless.
  - improved layout of feature editor to be more compact.
  - improved layout of text visualization in steps map. Now the text is fully visible (wraps and has vertical scrollbar if needed).
  - improved layout of base text dialog and add operations dialog.
  - added automatic line trimming to input base text.
  - updated renderer library for font size fix.
- 2026-03-26:
  - move annotation operation to the top of the list and make it the default type in the editor.
  - adjust tables default color.
- 2026-03-18:
  - updated Angular and packages.
  - 🆕 migrated shell app to M3 themes and added dark theme support to components.

## 6.1.2

- 2026-03-12: 🆕 added ID collection in text view.
- 2026-03-04:
  - updated packages (added `tw`/`th` to renderer offset features).
  - fixes to feature set editor.

## 6.1.0

- 2026-03-03:
  - updated Angular and packages.
  - ⚠️ migrated to `OnPush`.

## 6.0.4

- 2026-02-19:
  - 🆕 added button to copy GVE operations DSL in snapshot editor.
  - updated Angular and packages.

## 6.0.3

- 2026-01-29:
  - improvements and fixes.
  - updated Angular and package.

## 6.0.0

- 2026-01-22:
  - ⚠️ REFACTORED MODELS to remove visuals from operations.
  - removed obsolete components.
  - lot of usability improvements.

## 5.0.3

- 2025-11-06:
  - added lookup pipe to features in snapshot editor.
  - updated Angular.

## 5.0.2

- 2025-10-30:
  - added logic to patch the currently edited operation in snapshot from the range picked in the operation result.
  - refactored `BaseTextViewComponent` to use indexes rather than IDs when selecting ranges.
- 2025-10-24:
  - added flags to features set editor.
  - added toggle button to show/hide features details in operations list.
  - fix: use `\` as LF escape in operation's value editor so we can type LF in it.
  - fix: properly handle LF when editing base text.
- 2025-10-23: updated Angular and packages.

## 5.0.1

- 2025-10-01: propagate feature definitions up to snapshot editor so we can define them from consumer code (here Cadmus): the hierarchy from bottom to top is feature-set-editor -> chain-operation-editor -> snapshot-editor.
- 2025-09-17:
  - updated Angular and packages.
  - ⚠️ refactored all components for full reactivity.
- 2025-08-02:
  - updated Angular and packages.
  - updated peer dependencies and version in library.
- 2025-07-12: updated Angular and packages.

## 4.0.0

- 2025-07-02: ⚠️ updated Angular (v20) and packages.

## 3.0.4

- 2025-05-27: Docker image.
- 2025-05-22:
  - updated Angular.
  - better loading message.
- 2025-05-03: updated Angular and packages.
- 2025-03-21:
  - updated Angular and packages.
  - adding decoration for `$seg-out` and `$seg2-out` features.
  - added demo page for testing the chain result view component.
- 2025-03-04: updated Angular and packages.
- 2025-01-28: updated Angular and packages.

## 3.0.3

- 2025-01-15:
  - fixed unescaped `"` in label in graphviz service.
  - better handling of mouseover in snapshot editor.
  - added missing log entry to ARZDC sample.

## 3.0.2

- 2025-01-15: logos in homepage.
- 2025-01-12: transparent background for graphviz.

## 3.0.1

- 2025-01-12:
  - replaced `graphviz-webcomponent` with [my own ngx-viz](https://github.com/vedph/ngx-viz).
  - replaced mock image provider service as the previous one (<via.placeholder.com>) keeps failing. Now using <dummyimage.com>.
- 2025-01-07: updated test packages.
- 2024-12-22: updated Angular and packages.
- 2024-12-18: updated packages.
- 2024-12-11: adding chain view. Currently the web component (`graphviz-webcomponent`) for displaying Graphviz does not work (see the [issue](https://github.com/prantlf/graphviz-webcomponent/issues/5)), but the code is correctly generated and can be copied or viewed in an external page.

## 3.0.0

- 2024-12-08:
  - ⚠️ refactored properties and events to be signal-based.
  - M3 theme.
  - tsconfig `moduleResolution` set to `bundler` rather than to `node`.
  - updated JEST config (still not working properly).
  - added base text nodes view under base text controls.

## 2.0.0

- 2024-12-06:
  - updated Angular and packages.
  - better settings service.
- 2024-12-03: ⚠️ upgraded to new core dependencies.
- 2024-11-28: added new text hidden property to operation diplomatics.
- 2024-11-25:
  - refactored snapshot editor logic for building view data.
  - added callback for border to base text view component.
  - moved base text editor to dialog.
- 2024-11-24:
  - added image opacity to snapshot editor.
  - adjusted API root URL.
  - added remove decimals button to operation editor and fixed commands which modify SVG code.
  - added reset image metadata button.
  - added automatic image width and height setting on load.

## 1.0.0

- 2024-11-23: ⚠️ upgraded to Angular 19.

## 0.0.6

- 2024-11-19: updated Angular and packages.
- 2024-11-12:
  - updated Angular and packages.
  - ⚠️ updated snapshot view dependency to 1.1.0 to allow for multiple pass rendition of text.
  - added x,y,width,height to visual info.
  - removed redundant placeholders in some controls.
- 2024-11-06:
  - fixes to `runToLast` timing.
  - added button for running operations next to ruler.
  - moved add batch ops to dialog.
- 2024-11-05:
  - fix to result not updated when operation saved in snapshot editor.
  - handle multiple lines in map.
  - updated Angular and packages.

## 0.0.5

- 2024-10-15: updated packages (added GSAP import).
- 2024-10-06:
  - ⚠️ updated packages (refactored tween model).
  - removed animation vars and refactored their editor in animation tween.
- 2024-09-25:
  - updated Angular and packages.
  - added Compodoc documentation, which implies:
    1. installing Compodoc globally: `npm install -g @compodoc/compodoc`.
    2. add a `tsconfig.doc.json` with Compodoc configuration.
    3. for your conceptual documentation, create a folder like `docs` and place in it `summary.json` with the TOC and all the MD files you want. The TOC can have `children` for each page.
    4. add to your `package.json` scripts section the launch script, including `docs`: `"compodoc": "npx compodoc -p tsconfig.doc.json --disablePrivate --includes docs"`.
    5. run with `npm run compodoc`.
    6. FIX: run `mvdocimg.ps1` to move conceptual documentation images in the right place.
    7. see the results with `compodoc -s`.
- 2024-09-13: updated Angular and packages.

## 0.0.4

- 2024-07-08:
  - added service method for new tags endpoint.
  - added timelines set component.
- 2024-06-28:
  - fixes to snapshot editor preview update timing.
  - fixes to snapshot editor operation.

## 0.0.2

- 2024-06-27: added `noSave` property to snapshot editor.

## 0.0.1

- 2024-06-27: library metadata.
- 2024-06-20: fixes and updates.
- 2024-06-09:
  - updated Angular and packages.
  - added `class="mat-X"` for each `color="X"` (e.g. `class="mat-primary"` wherever there is a `color="primary"`) to allow transitioning to Angular Material M3 from M2. This also implies adding it directly to the target element, so in the case of `mat-icon` inside a `button` with `color` the class is added to `mat-icon` directly (unless the button too has the same color). This allows to keep the old M2 clients while using the new M3, because it seems that the compatibility mixin is not effective in some cases like inheritance of `color`, and in the future `color` will be replaced by `class` altogether.
  - [theming](https://material.angular.io/guide/theming)

- 2024-05-25:
  - upgraded to Angular 18.
  - renamings.

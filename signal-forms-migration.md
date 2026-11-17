# Signal forms migration log

Migration of `@myrmidon/gve-core` and the `gve-shell` demo app from reactive (and template-driven) forms to `@angular/forms/signals` (Angular 22.2).

Convention: **verified** means measured (test, build, source read or browser run, as stated). **Believed** means reasoned but not measured; each says how to check it.

## Status

| step                                        | result                                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| baseline `ng test @myrmidon/gve-core`       | 19 files / 346 tests green (verified)                                                               |
| after migration `ng test @myrmidon/gve-core`| 20 files / 369 tests green (verified)                                                               |
| `node scripts/build-libs.mjs`               | `@myrmidon/gve-core` ok, no warnings (verified)                                                      |
| `ng build` (app, production)                | ok, no warnings (verified)                                                                           |
| browser run                                 | nested flow and all demo routes OK, 0 console errors (verified, headless Chrome over CDP, see below) |

The only library is `gve-core`; its only downstream is the app.

## Build script

`scripts/build-libs.mjs` was replaced with a script modeled on `cadmus-shell-v3/scripts/build-libs.mjs`. It derives the build order from the libraries' `package.json` (peer)dependencies plus the `@myrmidon/*` imports found in their sources. It builds the named libraries plus everything downstream of them, and supports `--dry` and `--clear-cache`. It calls `ng.js` directly, so it does not depend on the `pnpm` wrapper (see Housekeeping). The stricter `scripts/check-local-libs.mjs` guard was kept and still runs first.

## What the browser actually runs (verified)

- `@myrmidon/gve-core` is resolved only via `tsconfig.json` `paths` → `dist/`. `node_modules/@myrmidon` holds only third-party packages. The guard passes.
- `.angular/cache` was deleted before `ng serve`. In the served page, `main.js` contains `softMaxLength` and `debounceUntilDestroyed`, which exist only in the migrated library. `formControl` appears only inside Angular's own packages. The page has 0 `<form>` elements.

## Patterns used

- Model-bound editors (`feature-editor`, `operation-source-editor`, `chain-operation-editor`, `snapshot-text-editor`, `snapshot-editor`) use pure `toDraft()`/`toModel()` functions, a `linkedSignal` draft, and `form(draft, schema)`.
  - All of them save **explicitly**; none autosaves. The original components rebuilt the form on the echo of their own save. A plain `linkedSignal` rebuild keeps that behaviour. The `previous`-based echo check from the template is only needed for autosave, so it was not used, and no component needed an echo guard.
  - The interaction-state `reset()` effect is keyed on the **model**, as the originals' `markAsPristine()` was. In `snapshot-text-editor`, keying it on the draft ("draft in sync") hid the "text required" error after a blank text was trimmed to empty while the bound text was also empty. A test caught this (verified), and the test is kept.
- The filter boxes (`feature-set-view`, `feature-set-editor`) use `form()` over a filter string with the `debounce(path, 300)` rule and a `computed()` `filteredFeatures`. In the view, the filter is a `linkedSignal` cleared when `features` changes.
- The view pickers (`chain-result-view`) and the toggles/range box in `snapshot-editor` use small standalone `form(signal(...))`s.
- `base-text-view`'s search box is not a form: `[ngModel]`/`(ngModelChange)` became `[value]`/`(input)`, with no forms dependency. Routing it through `[formField]` would need an effect or `toObservable` to feed its debounced Subject. That changes the timing the fake-timer tests rely on.
- `gve-searchable-select` remains a `ControlValueAccessor`. `[formField]` drives it through CVA interop: CVA takes priority in `FormField` (verified, source read). This works in tests and in Chrome (verified).
- No component renders a `<form>`. Action buttons are `type="button"` with `(click)`. Where the original relied on implicit submission for Enter, it is now explicit `(keydown.enter)`, which calls `preventDefault()` and saves only when the old default button would have been enabled:
  - free name/prefix/value inputs of `feature-editor`
  - id/type/rank inputs of `operation-source-editor`
  - single-line inputs of `chain-operation-editor`
  - the operations range input of `snapshot-editor` (edits the features of the range)

## Verified findings

1. **Hidden validators from static `min` attributes.** With reactive forms, `type="number" min="0"` plus `[formControl]` activates the `MinValidator` directive. So `at`, `run`, `to`, `toRun` and `rank` (operation editor) and `rank` (source editor) always had `min(0)`.
   - Evidence: the existing test "should require a non-negative at, even as index" passes even though the `conditionalValidator` predicate is false there.
   - Ported as explicit `min(path, 0)` rules. This makes the `NgxToolsValidators.conditionalValidator` on `at` redundant. The conditional `value` requirement is `required(path.value, { when })`, so `NgxToolsSignalValidators` was not needed.
2. **Static `min` attributes are a compile error with `[formField]`** (NG8022, `ng build` of the app). At runtime `FormField` would leave such an attribute alone (source read), but the template compiler rejects it. Use `min()` rules instead.
3. **The built-in `maxLength()` rule sets the native `maxlength` attribute** (source read: `FormField` → `setNativeDomProperty`). The browser then truncates typed or pasted text, so "too long" errors never show and long pasted texts are cut silently. An internal `softMaxLength()` rule (`validators/signal-validators.ts`) gives the same `maxLength` error without the attribute. The existing paste-over-limit tests pass with it.
4. **`required()` sets the native `required` attribute, and the CVA path sets `required` inputs on host directives.** Required fields now show Material's asterisk. `gve-searchable-select` gets `required=true`, and Chrome showed `aria-required="true"` on its `mat-select`.
5. **`toObservable(...).pipe(debounceTime(n), takeUntilDestroyed())` runs its subscriber once more after destroy.**
   - `toObservable` completes its subject from a `DestroyRef` callback registered before the one from `takeUntilDestroyed`, and `debounceTime` flushes on completion.
   - Observed as NG0953 (emit on a destroyed output) in the operation editor's specs, and measured in `utils/debounce-until-destroyed.spec.ts`: the plain pipeline delivers the pending value after `destroy()`, the guarded one does not.
   - Fixed with the internal `debounceUntilDestroyed()` operator in all three such pipelines.
6. **FieldTree identity Symbols leak through object spread.** The form tags items of its *own* draft arrays, and `{...item}` copies those enumerable Symbol keys. The saved operation carried them, observed as a `toEqual` failure.
   - Fix: `structuredClone` at the model boundary, for features/sources in the operation editor and nodes/operations in the snapshot editor, both incoming and outgoing.
   - Tests assert that neither bound nor saved objects carry Symbols.
   - Specs that compare draft internals use a JSON round-trip.
7. **The operation editor's auto-preview fires on every change.** The original's `valueChanges` filter (`'svg' in changes`) is always true. Measured on the original (from `HEAD`) and the migrated component: both emit 1 `operationPreview` after the initial load and 1 after a reload.
   - Changed later (2026-11-17): the preview is requested only when the form is dirty, so binding an operation no longer emits it (see CHANGELOG).
8. Material's `mat-error` shows only once the control is touched (default error state matcher), as before.

## Browser verification (headless Chrome over CDP)

`/demo/snapshot`, nested flow:

- edit operation 1
- add a feature in the nested feature-set editor, picking the name from `gve-searchable-select` (trusted mouse events) and typing the value
- Accept

Results:

- The feature row count went 2 → 3, the feature editor closed, the operation editor stayed open with Save enabled, and the snapshot was **not** saved.
- Saving the operation closed its editor. The snapshot editor's draft operation 1 then had the new feature (`r_char-offsets=v1`), and its form was dirty.
- No console errors or warnings, and 0 `<form>` elements.

The routes `feature`, `feature-set`, `operation`, `base-text`, `base-text-peephole` and `chain-result-view` all rendered with 0 forms and no console errors or warnings.

## Behaviour changes (intentional)

- Enter in a text box embedded in `gve-snapshot-editor` (base text search, feature filters) no longer saves the snapshot. Before, implicit submission of the outer `<form>` did that. Covered by a test.
- After a new feature/source/operation is loaded into its editor, Accept/Save is disabled until something is edited. The interaction state is now reset on load; before, a previously dirty `feature-editor` stayed dirty.
- `operation-source-editor`: an emptied rank is saved as `0` rather than `null`.
- Optional text fields (`groupId`, `inputTag`, `outputTag`, `value`, `note`) are `''` instead of `null` in the draft. Saved models are unchanged: empty becomes `undefined`.
- In `feature-editor`, a debounced user name change still pending when another feature is loaded is now discarded. Before, it was applied to the newly loaded feature.

## Public API changes (library)

Inputs, outputs and models are unchanged. Form internals changed:

- The `FormControl`/`FormGroup` fields are replaced by a `form` field tree in these components:
  - `base-text-editor`: `userText`
  - `batch-operation-editor`: `text` → `form.inputOps`
  - `snapshot-text-editor`, `operation-source-editor`, `feature-editor` and `chain-operation-editor`: each control → `form.<name>`
  - `chain-result-view`: `form.versionTag` / `form.tag`
  - `feature-set-view` and `feature-set-editor`: `filter`
  - `snapshot-editor`:
    - `baseText`/`operations` → `form.*`
    - `featDetails`/`autoRun` → `options.*`
    - `editFeatsRange` → `editFeatsForm.editFeatsRange`
- These became read-only `computed`s:
  - `filteredFeatures` (feature-set view/editor)
  - `hasTo`/`hasToRun`/`hasValue`/`peepholeRange` (operation editor)
  - `lineCount` (snapshot editor)
- `id` (operation editor), and `nameIds` and the current name (feature editor), are `linkedSignal`s, still writable.
- `SvgValidators` (internal, not exported) is now a signal rule, `rootG()`, plus the pure `getRootGError()`.

## Believed (not measured)

- **What makes the form materialize (and tag) array items** that have no per-item rules. It happens through `getChild()`/`ensureChildrenMap()` (source read), but I did not identify which call triggers it for `features`. Check: break in `computeChildrenMap` with `forceMaterialize === true` while running the operation editor spec. The `structuredClone` boundaries make the answer irrelevant for correctness.
- **`editedOpPrecedingText` (snapshot editor) now also tracks the operations list,** because it reads the draft signal. Before, it tracked only the edited op, its index and the result. This should only make it fresher. Check: change the operations while editing a new operation and compare the peephole.

## Housekeeping

Done after the migration commit:

- **pnpm scripts:** `pnpm test` / `pnpm run …` failed with `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`, because pnpm 12 no longer reads `"pnpm": { "overrides": … }` from `package.json`. The `rollup` override was moved to `pnpm-workspace.yaml`, and `pnpm install` now actually applies it: `@rollup/wasm-node` replaces the per-platform native rollup packages in the lockfile. `pnpm test`, `pnpm run build-libs` and `pnpm run check-libs` work (verified).
- **Duplicate rendition listeners:** confirmed in Chrome (verified). After one new execution result, a single `versionTagChange` event logged `Version changed` twice, and `GveSnapshotRendition.version` was logged a second time. Cause: the rendition effect tracks `result()` (and `renditionSettings()`, `debug()`) through `initRendition()`, so every new result re-runs it and adds another listener. **Fixed:** the effect now runs `initRendition()` untracked, keyed on the element only. New data still reaches the rendition through `updateRendition()`, and settings changes through the settings effect. Verified: a new spec test failed before the fix (4 listeners after 4 results) and passes after it; in Chrome, after 4 distinct results, a version change is handled once.
- **`chain-operation-editor` dead state commented out:** the `svg`, `elementFeatures`, `newTextHidden` and `dpFeatures` draft fields, the SVG rule, `elements`, `editedElementId`, `onDpFeaturesChange` and its spec test. They were unused: not in the template, not in `toOperation()` or `CharChainOperation`, not referenced by the demo app or by `cadmus-part-gve-snapshot`, which uses only `gve-snapshot-editor` (verified by search). `SvgValidators` is now unused, but was kept.
- **NgModule imports replaced** by the standalone directives, components and pipes the templates actually use, in the library and in the app (including `CommonModule` → `JsonPipe`, `RouterModule` → `RouterLink`). The symbols were resolved like the compiler does: module exports were expanded from the packages' `.d.ts`, and selectors matched against the templates. Verified:
  - build and tests pass;
  - in Chrome, the multiset of directives Angular instantiated (`ng.getDirectives`) on every demo route, and with the operation and feature editors open, is identical before and after.
- **Injection modernized:**
  - constructor parameters → `inject()`;
  - `@Optional() @Inject(MAT_DIALOG_DATA)` → `inject(…, { optional: true }) ?? undefined`, keeping the public `dialogRef`/`data` types;
  - `@Injectable({ providedIn: 'root' })` → `@Service()` (`GveApiService`, `GveGraphvizService`, `SettingsService`, the app's `AssetService`).
  - Verified: tests, builds, unchanged browser census and nested flow.

Still open (reported, not fixed):

- `console.log` calls left in library code:
  - the `multiValuedFeatureIds` diagnostic effects in `base-text-editor`, `chain-operation-editor` and `snapshot-editor`
  - `'patching range'` in `chain-operation-editor`
  - `'set view data'`, `'run to'`, `'result:'`, `'operation change'`, `'Version changed'` and the rendition version in `snapshot-editor`
- `snapshot-editor.setViewData()` only logs and computes an unused snapshot.
- The `searchable-select` spec hosts the component with reactive forms. That is correct for testing its CVA contract.

# History

## 7.0.3

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

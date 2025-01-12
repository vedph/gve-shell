# Gve Core

- 🚀 `npm i @myrmidon/gve-core`.

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.0. All the components in this library are standalone, and since version 3 their properties and events are signal-based.

This is the core UI library for [GVE](https://vedph.github.io/gve-doc).

```plantuml
@startuml
[animation timeline]
[animation timeline set]
[animation tween]
[base text char]
[base text editor]
[base text view]
[chain op editor]
[chain result view]
[feature editor]
[feature set editor]
[feature set view]
[ln heights editor]
[batch ops editor]
[snapshot text editor]
[op source editor]
[snapshot editor]
[steps map]

[feature set editor] --> [feature editor]
[animation timeline] --> [animation tween]
[animation timeline set] --> [animation timeline]
[animation timeline set] --> [dialog service]
[base text view] --> [base text char]
[base text editor] --> [base text view]
[base text editor] --> [feature set editor]
[base text editor] --> [dialog service]
[chain op editor] --> [feature set editor]
[chain op editor] --> [op source editor]
[chain op editor] --> [settings service]
[chain op editor] --> [dialog service]
[chain result view] --> [base text view]
[chain result view] --> [feature set view]
[chain result view] --> [steps map]
[snapshot editor] --> [snapshot text editor]
[snapshot editor] --> [batch ops editor]
[snapshot editor] --> [animation timeline set]
[snapshot editor] --> [base text editor]
[snapshot editor] --> [chain op editor]
[snapshot editor] --> [chain result view]
[snapshot editor] --> [ln heights editor]
[snapshot editor] --> [snapshot view]
[snapshot editor] --> [dialog service]
[snapshot editor] --> [api service]
@enduml
```

## Snapshot Editor

The snapshot editor is the top-level component in the library and orchestrates the behavior of all the components included in it. Its API is very simple, as it just deals with a full snapshot:

- ▶️ `snapshot` (`Snapshot`): the snapshot to edit.
- ▶️ `batchOps` (`string`): the batch operations text to set for the editor.
- ▶️ `noSave` (`boolean`): true to disable saving.
- 🔥 `snapshotChange` (`Snapshot`): emitted when the user saves the edited snapshot.
- 🔥 `snapshotCancel` (`void`): emitted when the user cancels the snapshot editing.

The only data directly handled by the component are:

- size and style;
- base text and related data;
- background image.

Operations and timelines are handled by other children components. The snapshot model is built dynamically when required (via `getSnapshot`), and it is displayed by a snapshot view.

## Dependencies

- [@myrmidon/ngx-tools, @myrmidon/ngx-mat-tools](https://github.com/vedph/ngx-tools)
- [@myrmidon/gve-snapshot-view](https://github.com/vedph/gve-snapshot-view): the snapshot view. This is a pure TS library, no JS framework required. The component is a standard web component.
- [cisstech/nge](https://github.com/cisstech/nge) for a light Monaco editor wrapper.
- [@svgdotjs/svg.js](https://github.com/svgdotjs/svg.js/) for SVG manipulation.
- [gsap](https://gsap.com/) for animations.

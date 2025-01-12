# GVE Shell

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.7.

[VEdition](https://vedph.github.io/gve-doc) frontend (code-named `GVE` = Goethe Venetian Epigrams) shell. This app is a shell used to develop libraries including GVE components and services for snapshots. Related repositories:

- [backend core and APIs](https://github.com/vedph/gve-core).
- [Cadmus editor frontend](https://github.com/vedph/cadmus-gve-app). This is a [Cadmus](https://vedph.github.io/cadmus-doc)-based editor for GVE entities including (but not limited to) GVE snapshots.
- [documentation](https://github.com/vedph/gve-doc). This repository is the source for the [VEdition documentation web pages](https://vedph.github.io/gve-doc).

## Docker

🐋 Quick Docker image build:

1. `npm run build-lib`.
2. update version in `env.js` and `ng build --configuration=production`.
3. `docker build . -t vedph2020/gve-shell:0.0.6 -t vedph2020/gve-shell:latest` (replace with the current version).

💡 You will be able to spare a prod-specific image by just overwriting the [env.js](src/env.js) file in your [Docker compose script](docker-compose.yml) via a volume, e.g.. putting under `gve-shell`:

```yml
volumes:
  - /opt/gve/env.js:/usr/share/nginx/html/env.js
```

where `/opt/gve/env.js` is the path to the modified `env.js` file in your host machine, and the portion of the value after colon is the path to `env.js` inside the container. In `env.js` you must ensure that `apiUrl` points to the correct API location, which in the default file is just `localhost` with a specific non-standard port.

To just run the image, use `docker run -d --name gve-shell -p 4200:80 vedph2020/gve-shell:0.0.2`. For the full-stack demo use the [compose](docker-compose.yml) script.

## Projects

- [gve.core](projects/myrmidon/gve-core/README.md)

## Dependencies

Main third-party dependencies:

- [GSAP](https://gsap.com): `npm i gsap`, `npm i --save-dev @types/gsap`.
- [SVG.js](https://svgjs.dev/docs/3.0/): `npm i @svgdotjs/svg.js`: this is used to parse SVG code building objects. There seem to be glitches in doing this via a `DOMParser`, like `getBBox()` not being available on SVG elements, even though they were created from the SVG namespace.

## Documentation

📖 Build as follows:

1. `npm run compodoc`.
2. FIX: run `./mvdocimg.ps1` to move conceptual documentation images in the right place.
3. see the results with `compodoc -s`.

To publish the documentation via GitHub:

1. ensure that you add the generated documentation folder to the source code.
2. configure GitHub Pages:
    - go to your repository on GitHub.
    - click on the Settings tab.
    - scroll down to the Pages section.
    - Under Source, select the branch you want to use (e.g., main) and the folder (e.g. /docs).
    - click Save.
3. after a few minutes, your documentation should be available at <https://YOURUSERNAME.github.io/YOURREPOSITORY/>.

## History

- 2025-01-12:
  - replaced `graphviz-webcomponent` with [my own ngx-viz](https://github.com/vedph/ngx-viz).
  - replaced mock image provider service as the previous one (<via.placeholder.com>) keeps failing. Now using <dummyimage.com>.
- 2025-01-07: updated test packages.
- 2024-12-22: updated Angular and packages.
- 2024-12-18: updated packages.
- 2024-12-11: adding chain view. Currently the web component (`graphviz-webcomponent`) for displaying Graphviz does not work (see the [issue](https://github.com/prantlf/graphviz-webcomponent/issues/5)), but the code is correctly generated and can be copied or viewed in an external page.

### 3.0.0

- 2024-12-08:
  - ⚠️ refactored properties and events to be signal-based.
  - M3 theme.
  - tsconfig `moduleResolution` set to `bundler` rather than to `node`.
  - updated JEST config (still not working properly).
  - added base text nodes view under base text controls.

### 2.0.0

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

### 1.0.0

- 2024-11-23: ⚠️ upgraded to Angular 19.

### 0.0.6

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

### 0.0.5

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

### 0.0.4

- 2024-07-08:
  - added service method for new tags endpoint.
  - added timelines set component.
- 2024-06-28:
  - fixes to snapshot editor preview update timing.
  - fixes to snapshot editor operation.

### 0.0.2

- 2024-06-27: added `noSave` property to snapshot editor.

### 0.0.1

- 2024-06-27: library metadata.
- 2024-06-20: fixes and updates.
- 2024-06-09:
  - updated Angular and packages.
  - added `class="mat-X"` for each `color="X"` (e.g. `class="mat-primary"` wherever there is a `color="primary"`) to allow transitioning to Angular Material M3 from M2. This also implies adding it directly to the target element, so in the case of `mat-icon` inside a `button` with `color` the class is added to `mat-icon` directly (unless the button too has the same color). This allows to keep the old M2 clients while using the new M3, because it seems that the compatibility mixin is not effective in some cases like inheritance of `color`, and in the future `color` will be replaced by `class` altogether.
  - [theming](https://material.angular.io/guide/theming)

- 2024-05-25:
  - upgraded to Angular 18.
  - renamings.

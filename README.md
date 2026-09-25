# GVE Shell

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.7.

[VEdition](https://vedph.github.io/gve-doc) frontend (code-named `GVE` = Goethe Venetian Epigrams) shell. This app is a shell used to develop libraries including GVE components and services for snapshots. Related repositories:

- [backend core and APIs](https://github.com/vedph/gve-core).
- [Cadmus editor frontend](https://github.com/vedph/cadmus-gve-app). This is a [Cadmus](https://vedph.github.io/cadmus-doc)-based editor for GVE entities including (but not limited to) GVE snapshots.
- [documentation](https://github.com/vedph/gve-doc). This repository is the source for the [VEdition documentation web pages](https://vedph.github.io/gve-doc).

## Workspace

Local libraries (the `library` projects in `angular.json`) are consumed by the app **only** through the `tsconfig.json` `paths` mapping to their `dist/` output, never through `node_modules`:

- `pnpm run build-libs`: builds all the local libraries in dependency order (derived from their `package.json` files). Pass library names to build them plus all their dependents, e.g. `node scripts/build-libs.mjs @myrmidon/gve-core`; add `--clear-cache` to also remove `.angular/cache`, whose Vite pre-bundle is not invalidated when a library is rebuilt into `dist/`. A library change reaches the app only after rebuilding it (and its dependents).
- `pnpm run check-libs`: fails if a local library is found in `node_modules` or in the lockfile, is listed among the workspace dependencies, or is not mapped to its `dist/` in `tsconfig.json`. This guard runs automatically before `pnpm start`, `pnpm run build` and `pnpm run build-libs`.

If a change does not appear in the app, check what is being served (`ls -la node_modules/@myrmidon/`, `grep -r "someNewString" .angular/cache dist/`), then remove `.angular/cache` and restart `ng serve`.

Tests (Vitest, jsdom, Angular Testing Library) cover the libraries only (the app's pages are just demos):

- `pnpm test`: run once.
- `pnpm run test:watch`: watch mode.
- `pnpm run test:coverage`: with coverage report in `coverage/`.

## Docker

🐋 Quick Docker image build:

1. `pnpm run build-lib`.
2. update version in `env.js` and `ng build --configuration=production`.
3. `docker build . -t vedph2020/gve-shell:6.0.0 -t vedph2020/gve-shell:latest` (replace with the current version).

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

- [GSAP](https://gsap.com): `pnpm i gsap`, `pnpm i --save-dev @types/gsap`.

## Documentation

📖 Build as follows:

1. `pnpm run compodoc`.
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

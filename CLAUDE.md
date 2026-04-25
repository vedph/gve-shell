# CLAUDE.md

## Purpose of the Workspace

This workspace contains an Angular library to edit a data model named snapshot, which represents the recipe for the transformations of a base text into multiple versions for philological purposes. The snapshot describes multiple versions of a text with:

- a base text.
- editing operations which transform it. These operations also carry metadata, designed to be injected into output.

Text is modeled as a set of nodes, each representing 1 character.

## Projects Overview

- `projects/myrmidon/gve-core`: the core components library. This contains:
  - core models in `models.ts`.
  - a top-level UI component, the `SnapshotEditorComponent`, and all its descendant components.
  - services to connect to backend API and provide other utility functions.
- `gve-shell` app: this app is used as a demo for development. It contains pages for each component to test with some mock data.

The backend for this frontend can be found in folder `/Projects/Gve/Gve`; in it, the API projects consumed here are `Gve.Api.Controllers` and `Gve.Api`.

## Build

- build library: `pnpm run build-lib`
- build app: `ng build`

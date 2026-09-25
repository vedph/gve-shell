// Shared helpers for discovering the local workspace libraries.
//
// Local libraries are the angular.json projects of type "library". Each one
// is resolved by consumers in this workspace ONLY through the tsconfig.json
// "paths" mapping to its dist/ output (never through node_modules).
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const workspaceRoot = resolve(import.meta.dirname, '..');

function readJson(path) {
  const text = readFileSync(path, 'utf8');
  try {
    return JSON.parse(text);
  } catch {
    // tsconfig files may contain comments (only whole-line ones are used here)
    return JSON.parse(
      text.replace(/^\s*\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, ''),
    );
  }
}

/**
 * Get the local libraries, with their name, root, output path and
 * the names of the other local libraries they depend on.
 */
export function getLocalLibs() {
  const angular = readJson(join(workspaceRoot, 'angular.json'));
  const libs = Object.entries(angular.projects)
    .filter(([, p]) => p.projectType === 'library')
    .map(([project, p]) => {
      const pkg = readJson(join(workspaceRoot, p.root, 'package.json'));
      const ngPackage = readJson(join(workspaceRoot, p.root, 'ng-package.json'));
      return {
        project,
        name: pkg.name,
        root: p.root,
        dest: resolve(workspaceRoot, p.root, ngPackage.dest),
        deps: Object.keys({
          ...pkg.dependencies,
          ...pkg.peerDependencies,
        }),
      };
    });
  const names = new Set(libs.map((l) => l.name));
  for (const lib of libs) {
    lib.deps = lib.deps.filter((d) => names.has(d));
  }
  return libs;
}

/**
 * Sort the libraries so that each one comes after all the local
 * libraries it depends on.
 */
export function sortByDependencies(libs) {
  const byName = new Map(libs.map((l) => [l.name, l]));
  const sorted = [];
  const state = new Map(); // name -> 'visiting' | 'done'

  const visit = (lib, path) => {
    const s = state.get(lib.name);
    if (s === 'done') return;
    if (s === 'visiting') {
      throw new Error(
        `Circular dependency among local libraries: ${[...path, lib.name].join(' -> ')}`,
      );
    }
    state.set(lib.name, 'visiting');
    for (const dep of lib.deps) {
      visit(byName.get(dep), [...path, lib.name]);
    }
    state.set(lib.name, 'done');
    sorted.push(lib);
  };
  libs.forEach((l) => visit(l, []));
  return sorted;
}

export { readJson };

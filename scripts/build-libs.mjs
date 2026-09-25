// Build all the local workspace libraries in dependency order.
//
// Usage: node scripts/build-libs.mjs [--clear-cache] [lib-name ...]
// - with no names, builds all the libraries;
// - with names, builds them AND every local library depending on them
//   (directly or indirectly), still in dependency order;
// - --clear-cache also removes .angular/cache, whose Vite pre-bundle
//   is not invalidated when a library is rebuilt into dist/.
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  getLocalLibs,
  sortByDependencies,
  workspaceRoot,
} from './local-libs.mjs';

const args = process.argv.slice(2);
const clearCache = args.includes('--clear-cache');
const requested = args.filter((a) => !a.startsWith('--'));

execSync('node scripts/check-local-libs.mjs', {
  cwd: workspaceRoot,
  stdio: 'inherit',
});

const libs = sortByDependencies(getLocalLibs());
let targets = libs;
if (requested.length) {
  const unknown = requested.filter((r) => !libs.some((l) => l.name === r));
  if (unknown.length) {
    console.error(`Unknown local libraries: ${unknown.join(', ')}`);
    process.exit(1);
  }
  // add all the dependents of the requested libraries
  const selected = new Set(requested);
  let grown = true;
  while (grown) {
    grown = false;
    for (const lib of libs) {
      if (!selected.has(lib.name) && lib.deps.some((d) => selected.has(d))) {
        selected.add(lib.name);
        grown = true;
      }
    }
  }
  targets = libs.filter((l) => selected.has(l.name));
}

for (const lib of targets) {
  console.log(`\n=== Building ${lib.name}`);
  execSync(`ng build ${lib.project}`, { cwd: workspaceRoot, stdio: 'inherit' });
}

if (clearCache) {
  rmSync(join(workspaceRoot, '.angular', 'cache'), {
    recursive: true,
    force: true,
  });
  console.log('\nRemoved .angular/cache: restart ng serve.');
}

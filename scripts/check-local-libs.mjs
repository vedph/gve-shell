// Guard: fail when a local workspace library could be resolved from
// anywhere but its dist/ output via tsconfig "paths".
//
// A local library must never exist in node_modules (e.g. as a published
// npm copy pulled in by a dependency, or by an accidental "pnpm add"):
// if it does, imports may silently resolve to that stale copy.
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getLocalLibs, readJson, workspaceRoot } from './local-libs.mjs';

const errors = [];
const libs = getLocalLibs();
const rootPkg = readJson(join(workspaceRoot, 'package.json'));
const paths = readJson(join(workspaceRoot, 'tsconfig.json')).compilerOptions
  ?.paths ?? {};

for (const lib of libs) {
  // 1. no copy in node_modules (neither symlink nor folder)
  const nm = join(workspaceRoot, 'node_modules', ...lib.name.split('/'));
  let inNodeModules = false;
  try {
    lstatSync(nm);
    inNodeModules = true;
  } catch {
    // not found: fine
  }
  if (inNodeModules) {
    errors.push(
      `${lib.name} exists in node_modules (${nm}). Remove it: local ` +
        `libraries must be resolved only via tsconfig "paths" to dist/.`,
    );
  }

  // 2. not declared as a dependency of the workspace
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (rootPkg[key]?.[lib.name]) {
      errors.push(`${lib.name} is listed in package.json ${key}: remove it.`);
    }
  }

  // 3. mapped in tsconfig paths to its dist output
  const mapped = paths[lib.name];
  if (!mapped?.length || resolve(workspaceRoot, mapped[0]) !== lib.dest) {
    errors.push(
      `tsconfig.json "paths" must map ${lib.name} to its dist output ` +
        `(${lib.dest}), found: ${JSON.stringify(mapped)}`,
    );
  }
}

// 4. no stale copy in pnpm's virtual store either
const pnpmStore = join(workspaceRoot, 'node_modules', '.pnpm');
if (existsSync(pnpmStore)) {
  const lock = existsSync(join(workspaceRoot, 'pnpm-lock.yaml'))
    ? readFileSync(join(workspaceRoot, 'pnpm-lock.yaml'), 'utf8')
    : '';
  for (const lib of libs) {
    if (lock.includes(`'${lib.name}@`) || lock.includes(`\n  ${lib.name}@`)) {
      errors.push(
        `${lib.name} appears in pnpm-lock.yaml: some package depends on a ` +
          `published copy of this local library.`,
      );
    }
  }
}

if (errors.length) {
  console.error('Local library resolution check FAILED:');
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
console.log(
  `Local library resolution OK (${libs.map((l) => l.name).join(', ')}).`,
);

/**
 * Build the global plugin: global/plugin.js bundled with what it shares with the
 * view, plus the built collection code embedded as text (what its installer
 * writes into a collection).
 *
 *   node global/build.mjs   → collection/dist/plugin.js, then global/dist/plugin.js
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../collection/build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// esbuild picks a loader by extension, and .js has to stay code for the rest of
// the bundle, so the collection code is embedded from a .txt copy (gitignored;
// a fixed path, because esbuild writes it into the bundle as a comment).
const code = join(here, 'dist', 'collection-code.txt');
mkdirSync(dirname(code), { recursive: true });
copyFileSync(build(), code);
const out = join(here, 'dist', 'plugin.js');
execFileSync(join(root, 'sdk', 'node_modules', '.bin', 'esbuild'), [
	join(here, 'plugin.js'), '--bundle', '--format=iife', '--global-name=plugins', '--keep-names',
	`--alias:outline-collection-code=${code}`, '--loader:.txt=text',
	`--outfile=${out}`, '--log-level=warning',
], { cwd: root, stdio: 'inherit' });
console.log(`built ${out} (${statSync(out).size} bytes)`);

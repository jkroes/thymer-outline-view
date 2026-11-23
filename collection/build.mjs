/**
 * Build the collection code: the Outline view, plus (optionally) one extras
 * module merged in for a collection that needs other code in its single slot.
 *
 *   node collection/build.mjs                          → collection/dist/plugin.js
 *   node collection/build.mjs --extras f.js --out o.js → o.js, with f.js merged in
 *
 * collection/dist/plugin.js (no extras) is the paste-ready form, committed.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

export function build({ extras = join(here, 'no-extras.js'), out = join(here, 'dist', 'plugin.js') } = {}) {
	extras = resolve(extras);
	out = resolve(out);
	statSync(extras); // a missing extras file should fail here, not as an esbuild error
	mkdirSync(dirname(out), { recursive: true });
	execFileSync(join(root, 'sdk', 'node_modules', '.bin', 'esbuild'), [
		join(here, 'plugin.js'), '--bundle', '--format=iife', '--global-name=plugins', '--keep-names',
		`--alias:outline-extras=${extras}`, `--outfile=${out}`, '--log-level=warning',
	], { cwd: root, stdio: 'inherit' });
	return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
	const out = build({ extras: arg('--extras'), out: arg('--out') });
	console.log(`built ${out} (${statSync(out).size} bytes)`);
}

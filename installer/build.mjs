/**
 * Embed the view's built bundle into the installer.
 *
 * The installer has to hand a complete paste-ready copy of the view to
 * saveCode(). The view is module-style source, so what gets embedded is the
 * IIFE bundle from `./build.sh .` (dist/plugin.js) — run that first. The code
 * is full of template literals and backticks, so it is injected as a JSON
 * string literal rather than pasted into a template. JSON.stringify emits a
 * valid JS string expression, so no escaping of our own is needed.
 *
 *   ./build.sh . && node installer/build.mjs   →   installer/dist/plugin.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
let view;
try {
	view = readFileSync(join(here, '..', 'dist', 'plugin.js'), 'utf8');
} catch {
	console.error('dist/plugin.js not found — run ./build.sh . first');
	process.exit(1);
}
const template = readFileSync(join(here, 'plugin.js'), 'utf8');

if (!template.includes('__VIEW_SOURCE__')) {
	console.error('installer/plugin.js has no __VIEW_SOURCE__ placeholder');
	process.exit(1);
}
if (/^\s*(export|import)\s/m.test(view)) {
	console.error('dist/plugin.js still has module syntax — it must be paste-ready');
	process.exit(1);
}

const out = template.replace('__VIEW_SOURCE__', JSON.stringify(view));

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'plugin.js'), out);

console.log(`built installer/dist/plugin.js (${out.length} bytes, view ${view.length})`);

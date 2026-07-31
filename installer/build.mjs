/**
 * Embed the view's source into the installer.
 *
 * The installer has to hand a complete copy of plugin.js to saveCode(), and the
 * view is full of template literals and backticks, so the source is injected as
 * a JSON string literal rather than pasted into a template. JSON.stringify emits
 * a valid JS string expression, so no escaping of our own is needed.
 *
 *   node installer/build.mjs   →   installer/dist/plugin.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const view = readFileSync(join(here, '..', 'plugin.js'), 'utf8');
const template = readFileSync(join(here, 'plugin.js'), 'utf8');

if (!template.includes('__VIEW_SOURCE__')) {
	console.error('installer/plugin.js has no __VIEW_SOURCE__ placeholder');
	process.exit(1);
}
if (view.includes('export class Plugin')) {
	console.error('view source still has the export keyword — it must be paste-ready');
	process.exit(1);
}

const out = template.replace('__VIEW_SOURCE__', JSON.stringify(view));

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'plugin.js'), out);

console.log(`built installer/dist/plugin.js (${out.length} bytes, view ${view.length})`);

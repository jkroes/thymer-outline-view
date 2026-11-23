/**
 * Build the collection code and write it into collections of the workspace named
 * by $THYMER_WORKSPACE (a workspace GUID), through the desktop app's MCP server.
 *
 *   node collection/deploy.mjs "Legal Codes"   one collection, by name or guid
 *   node collection/deploy.mjs --all           every collection already carrying it
 *
 * Extras: if local/extras/<Collection name>.js exists it is merged into that
 * collection's build (see collection/plugin.js), so an update re-merges by
 * itself. local/ is gitignored: extras are one workspace's code.
 *
 * This REPLACES the collection's code. A named collection whose slot holds other
 * code is refused unless --force is given; move that code into an extras file.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SIGNATURE = 'registerOutlineViews';

const workspace = process.env.THYMER_WORKSPACE;
if (!workspace) { console.error('Set THYMER_WORKSPACE to the workspace GUID.'); process.exit(1); }
const args = process.argv.slice(2);
const force = args.includes('--force');
const all = args.includes('--all');
const named = args.filter(a => !a.startsWith('--'));
if (all === (named.length > 0)) { console.error('usage: deploy.mjs <collection>... | --all'); process.exit(1); }

const cli = (argv, input) => execFileSync(join(root, 'bin', 'thymercli'), [...argv, '-w', workspace],
	{ input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'inherit'] });
const show = (target) => JSON.parse(cli(['plugin', 'show', target, '--json']));
const isEmpty = (code) => !code || !code.trim() || code.includes('// Put your custom code here');

let targets = named;
if (all) {
	const list = JSON.parse(cli(['plugin', 'list', '--json']));
	targets = (list.collection_plugins || []).map(p => p.guid)
		.filter(guid => (show(guid).code || '').includes(SIGNATURE));
	if (!targets.length) console.log('No collection carries the Outline code yet.');
}

for (const target of targets) {
	const live = show(target);
	const name = live.config.name;
	const code = live.code || '';
	if (!force && !isEmpty(code) && !code.includes(SIGNATURE)) {
		console.error(`✗ ${name}: the slot holds other code. Move it into local/extras/${name}.js, then rerun with --force.`);
		process.exitCode = 1;
		continue;
	}
	const extras = join(root, 'local', 'extras', `${name}.js`);
	const out = build({
		extras: existsSync(extras) ? extras : undefined,
		out: join(root, 'local', 'dist', `${name}.js`),
	});
	const built = readFileSync(out, 'utf8');
	if (built === code) { console.log(`· ${name}: already up to date`); continue; }
	cli(['plugin', 'update', 'code', live.guid || target], built);
	console.log(`✓ ${name}: deployed${existsSync(extras) ? ' with extras' : ''}`);
}

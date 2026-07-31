/**
 * Outline installer — a global plugin that installs the Outline view into any
 * collection.
 *
 * The view itself is a CollectionPlugin, so it has to live in each collection's
 * own plugin slot. This walks your collections, shows what state each one is in,
 * and does the three steps for you: turn on nesting, add a Custom view, write
 * the view's code.
 *
 * The view source is embedded at build time by build.mjs — this file is a
 * template and will not run until built. Nothing is fetched at runtime.
 */

const VIEW_SOURCE = __VIEW_SOURCE__;

const PANEL_ID = 'outline-installer';

/** What a collection's plugin slot looks like when nobody has touched it. */
const STUB = 'class Plugin extends CollectionPlugin {\n  onLoad() {\n    // Put your custom code here...\n  }\n}\n';

const isStub = (code) => !code
	|| !code.trim()
	|| code.includes('// Put your custom code here');

class Plugin extends AppPlugin {

	onLoad() {
		this.ui.registerCustomPanelType(PANEL_ID, (panel) => {
			panel.setTitle('Install Outline view');
			this.render(panel);
		});
		this.ui.addCommandPaletteCommand({
			label: 'Outline: install into a collection...',
			icon: 'ti-list-tree',
			onSelected: () => this.open(),
		});
	}

	async open() {
		const panel = await this.ui.createPanel();
		if (panel) panel.navigateToCustomType(PANEL_ID);
	}

	// --- inspection ---------------------------------------------------------

	/**
	 * A record field pointing back at its own collection — what the view draws
	 * the tree from when sub-pages are off.
	 */
	selfRefField(api) {
		const guid = api.getGuid();
		return (api.getConfiguration().fields || []).find(f => f.type === 'record'
			&& f.active !== false
			&& f.filter_colguid === guid) || null;
	}

	customViews(api) {
		return (api.getConfiguration().views || []).filter(v => v.type === 'custom');
	}

	/**
	 * Why the code state matters: saveCode() REPLACES a collection's plugin code
	 * outright — there is no merge. Overwriting a collection that has formulas or
	 * a custom record title would delete them, so anything that isn't empty, the
	 * default stub, or our own source goes through the editor instead.
	 */
	codeState(api) {
		const code = (api.getExistingCodeAndConfig() || {}).code || '';
		if (code.trim() === VIEW_SOURCE.trim()) return 'installed';
		if (isStub(code)) return 'free';
		return 'occupied';
	}

	status(api) {
		return {
			guid: api.getGuid(),
			name: api.getName(),
			nests: api.hasSubPages() || !!this.selfRefField(api),
			subPages: api.hasSubPages(),
			views: this.customViews(api).length,
			code: this.codeState(api),
		};
	}

	// --- actions ------------------------------------------------------------

	/**
	 * Steps are idempotent: re-installing a half-installed collection finishes it
	 * rather than duplicating anything.
	 */
	async install(api, log) {
		if (!api.hasSubPages() && !this.selfRefField(api)) {
			log('Turning on sub-pages...');
			await api.enableSubPages(true);
		}

		// Re-read: enableSubPages() saves the config, so a copy taken earlier is
		// stale and would write the sub-page field back out.
		if (!this.customViews(api).length) {
			log('Adding a Custom view...');
			const conf = api.getConfiguration();
			conf.views = (conf.views || []).concat([{
				id: 'outline', label: 'Outline', type: 'custom',
				icon: 'ti-list-tree', shown: true, description: '', query: '',
				read_only: false, opts: {}, field_ids: ['title'],
				group_by_field_id: null, sort_field_id: 'title', sort_dir: 'asc',
			}]);
			await api.saveConfiguration(conf);
		}

		const state = this.codeState(api);
		if (state === 'installed') {
			log('Already installed. Nothing to write.');
			return 'done';
		}
		if (state === 'free') {
			log('Writing the view code...');
			await api.saveCode(VIEW_SOURCE);
			log('Installed. Open the collection and click the Outline tab.');
			return 'done';
		}

		// Occupied: hand it to the user rather than destroying their code.
		log('This collection already has plugin code, which installing would replace.');
		log('Opening the editor so you can review and merge it yourself. Nothing has been written.');
		const existing = api.getExistingCodeAndConfig() || {};
		api.previewPlugin(api.getConfiguration(), VIEW_SOURCE, existing.css || '', true);
		return 'review';
	}

	/**
	 * Removes the view. Leaves the code alone unless it is exactly ours, and
	 * never touches sub-pages — that field holds the nesting itself.
	 */
	async uninstall(api, log) {
		const views = this.customViews(api);
		if (views.length) {
			log(`Removing ${views.length} custom view(s)...`);
			const conf = api.getConfiguration();
			conf.views = (conf.views || []).filter(v => v.type !== 'custom');
			await api.saveConfiguration(conf);
		}

		if (this.codeState(api) === 'installed') {
			log('Clearing the view code...');
			await api.saveCode(STUB);
		} else {
			log('Leaving the plugin code alone — it is not the Outline source.');
		}
		log('Sub-pages and your nesting are untouched.');
		return 'done';
	}

	// --- panel --------------------------------------------------------------

	async render(panel) {
		const root = panel.getElement();
		if (!root) return;
		while (root.firstChild) root.removeChild(root.firstChild);

		const wrap = el('div', root);
		wrap.style.cssText = 'padding:24px;max-width:760px;margin:0 auto;';

		const h = el('h2', wrap, 'Install the Outline view');
		h.style.cssText = 'margin:0 0 4px;';
		const sub = el('p', wrap, 'Pick a collection. Installing turns on nesting if needed, adds a Custom view, and writes the view code.');
		sub.style.cssText = 'margin:0 0 20px;opacity:.7;';

		let collections = [];
		try {
			collections = await this.data.getAllCollections();
		} catch (err) {
			el('p', wrap, `Could not read collections: ${String(err)}`);
			return;
		}

		for (const api of collections) {
			if (api.isJournalPlugin && api.isJournalPlugin()) continue;
			this.renderRow(wrap, api);
		}
	}

	renderRow(parent, api) {
		const s = this.status(api);

		const row = el('div', parent);
		row.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid var(--border-color,rgba(128,128,128,.25));';

		const left = el('div', row);
		left.style.cssText = 'flex:1;min-width:0;';
		const title = el('div', left, s.name);
		title.style.cssText = 'font-weight:600;';

		const bits = [];
		bits.push(s.subPages ? 'sub-pages on'
			: s.nests ? 'nests via a self-linking property'
			: 'no nesting yet');
		bits.push(s.views ? `${s.views} custom view(s)` : 'no custom view');
		bits.push(s.code === 'installed' ? 'view code installed'
			: s.code === 'free' ? 'plugin slot empty'
			: 'HAS OTHER PLUGIN CODE');
		const meta = el('div', left, bits.join(' · '));
		meta.style.cssText = 'font-size:12px;opacity:.7;margin-top:2px;';

		if (s.code === 'occupied') {
			const warn = el('div', left, 'Installing here opens the code editor for you to merge by hand, so your existing code is not overwritten.');
			warn.style.cssText = 'font-size:12px;margin-top:4px;color:var(--enum-orange-fg,#c60);';
		}

		const log = (msg) => {
			const line = el('div', left, msg);
			line.style.cssText = 'font-size:12px;margin-top:4px;opacity:.85;';
		};

		const installed = s.code === 'installed' && s.views > 0;

		const act = el('button', row, installed ? 'Reinstall' : 'Install');
		act.className = 'button-primary';
		act.addEventListener('click', async () => {
			act.disabled = true;
			try { await this.install(api, log); }
			catch (err) { log(`Failed: ${String(err)}`); }
			act.disabled = false;
		});

		if (installed) {
			const rm = el('button', row, 'Remove');
			rm.addEventListener('click', async () => {
				rm.disabled = true;
				try { await this.uninstall(api, log); }
				catch (err) { log(`Failed: ${String(err)}`); }
				rm.disabled = false;
			});
		}
	}
}

/** Small DOM helper. textContent only — plugin code must never build markup. */
function el(tag, parent, text) {
	const node = document.createElement(tag);
	if (text !== undefined) node.textContent = text;
	if (parent) parent.appendChild(node);
	return node;
}

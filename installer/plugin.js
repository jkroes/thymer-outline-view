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

/**
 * A distinctive name from the view's source. Used to recognise OUR code in a
 * collection even when it is an older build — exact equality only ever answers
 * "is this the current version", and treating a previous version as somebody
 * else's code would send every upgrade through the merge path for no reason.
 */
const SIGNATURE = 'registerOutlineView';

/** The field enableSubPages() appends. The app fills in filter_colguid itself. */
const SUBPAGE_FIELD = {
	icon: 'ti-list-tree', id: 'parent_page', label: 'Sub-page of',
	many: false, read_only: false, active: true, type: 'record',
};

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
	 * Sub-pages, read from the config rather than from hasSubPages().
	 *
	 * hasSubPages() consults an internal field index that lags a config write, so
	 * straight after an install it still answers false while the config already
	 * has the property. This is the same test the app's own method makes, just
	 * against data that cannot be stale — and it is what the view itself uses.
	 */
	hasSubPages(api) {
		return (api.getConfiguration().fields || [])
			.some(f => f.id === 'parent_page' && f.active !== false);
	}

	/**
	 * A hand-made record property pointing back at its own collection — the other
	 * way a collection can nest. `parent_page` is excluded so the two are real
	 * alternatives: it satisfies this test too, and letting it match here would
	 * describe a sub-pages collection as using a property of your own.
	 */
	selfRefField(api) {
		const guid = api.getGuid();
		return (api.getConfiguration().fields || []).find(f => f.type === 'record'
			&& f.id !== 'parent_page'
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
		if (code.trim() === VIEW_SOURCE.trim()) return 'current';
		if (code.includes(SIGNATURE)) return 'outdated';
		if (isStub(code)) return 'free';
		return 'occupied';
	}

	status(api) {
		return {
			guid: api.getGuid(),
			name: api.getName(),
			nests: this.hasSubPages(api) || !!this.selfRefField(api),
			subPages: this.hasSubPages(api),
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
		const conf = api.getConfiguration();
		const needsNesting = !this.hasSubPages(api) && !this.selfRefField(api);
		const needsView = !this.customViews(api).length;

		// Both config changes go in ONE save. Writes are not readable in the same
		// tick, so calling enableSubPages() and then re-reading the config returns
		// the copy from BEFORE it — saving that back silently drops the sub-page
		// field again, which is exactly how a collection ends up with the view
		// installed and no nesting.
		if (needsNesting || needsView) {
			if (needsNesting) {
				log('Turning on sub-pages...');
				conf.fields = (conf.fields || []).concat([Object.assign({}, SUBPAGE_FIELD)]);
			}
			if (needsView) {
				log('Adding a Custom view...');
				conf.views = (conf.views || []).concat([{
					id: 'outline', label: 'Outline', type: 'custom',
					icon: 'ti-list-tree', shown: true, description: '', query: '',
					read_only: false, opts: {}, field_ids: ['title'],
					group_by_field_id: null, sort_field_id: 'title', sort_dir: 'asc',
				}]);
			}
			await api.saveConfiguration(conf);
		}

		const state = this.codeState(api);
		if (state === 'current') {
			log('Code is already up to date.');
			return;
		}
		if (state === 'free' || state === 'outdated') {
			log(state === 'outdated' ? 'Updating the view code...' : 'Writing the view code...');
			await api.saveCode(VIEW_SOURCE);
			log('Done. Open the collection and click the Outline tab.');
			return;
		}

		// Occupied: hand it to the user rather than destroying their code.
		log('This collection already has plugin code of its own.');
		log('Opening the editor so you can merge it yourself. Nothing was written.');
		const existing = api.getExistingCodeAndConfig() || {};
		api.previewPlugin(conf, VIEW_SOURCE, existing.css || '', true);
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

		const state = this.codeState(api);
		if (state === 'current' || state === 'outdated') {
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

	/**
	 * Each collection owns a box that repaints itself. Actions redraw it when they
	 * finish, so the summary and the buttons describe the collection as it is now
	 * rather than as it was when the panel opened.
	 */
	renderRow(parent, api) {
		const box = el('div', parent);
		box.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid var(--border-color,rgba(128,128,128,.25));';
		this.paintRow(box, api, []);
	}

	paintRow(box, api, notes) {
		while (box.firstChild) box.removeChild(box.firstChild);
		const s = this.status(api);

		const left = el('div', box);
		left.style.cssText = 'flex:1;min-width:0;';
		const title = el('div', left, s.name);
		title.style.cssText = 'font-weight:600;';

		const bits = [];
		bits.push(s.subPages ? 'sub-pages on'
			: s.nests ? 'nests via a self-linking property'
			: 'no nesting yet');
		bits.push(s.views ? `${s.views} custom view(s)` : 'no custom view');
		bits.push(s.code === 'current' ? 'view installed'
			: s.code === 'outdated' ? 'older version installed'
			: s.code === 'free' ? 'plugin slot empty'
			: 'has other plugin code');
		const meta = el('div', left, bits.join(' \u00b7 '));
		meta.style.cssText = 'font-size:12px;opacity:.7;margin-top:2px;';

		if (s.code === 'occupied') {
			const warn = el('div', left, 'Installing here opens the code editor so you can merge by hand. Your code is not overwritten.');
			warn.style.cssText = 'font-size:12px;margin-top:4px;color:var(--enum-orange-fg,#c60);';
		}

		for (const note of notes) {
			const line = el('div', left, note);
			line.style.cssText = 'font-size:12px;margin-top:4px;opacity:.85;';
		}

		const run = (label, fn, primary) => {
			const btn = el('button', box, label);
			if (primary) btn.className = 'button-primary';
			btn.addEventListener('click', async () => {
				btn.disabled = true;
				const log = [];
				const push = (m) => { log.push(m); this.paintRow(box, api, log); };
				try { await fn(api, push); }
				catch (err) { log.push(`Failed: ${String(err)}`); }
				// Repaint once more: the status above was computed before the writes.
				this.paintRow(box, api, log);
			});
			return btn;
		};

		// The action button says what it will actually do, and is dropped entirely
		// when there is nothing to do — a button whose only outcome is "already up
		// to date" is worse than no button.
		const ours = s.code === 'current' || s.code === 'outdated';
		const present = s.views > 0 && ours;
		const complete = present && s.nests && s.code === 'current';

		if (!complete) {
			run(s.code === 'outdated' ? 'Update' : present ? 'Repair' : 'Install',
				(a, l) => this.install(a, l), true);
		}
		if (present) run('Remove', (a, l) => this.uninstall(a, l), false);
		if (complete) {
			const ok = el('div', box, 'Installed');
			ok.style.cssText = 'font-size:12px;opacity:.6;align-self:center;';
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

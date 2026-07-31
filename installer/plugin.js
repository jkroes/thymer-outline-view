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

/**
 * The view entry install() writes, before its per-view bits are filled in.
 * Uninstall removes only views matching isOurView().
 */
const VIEW_ENTRY = {
	id: 'outline', label: 'Outline', type: 'custom',
	icon: 'ti-list-tree', shown: true, description: '', query: '',
	read_only: false, opts: {}, field_ids: ['title'],
	group_by_field_id: null, sort_field_id: 'title', sort_dir: 'asc',
};

/**
 * Ours if it carries a hierarchy binding — that key is written by nothing else —
 * or if it matches the single fixed id/label installs used before bindings
 * existed, so an older install is still recognised and removable.
 */
const isOurView = (v) => v.type === 'custom'
	&& (!!(v.opts && v.opts.hierarchy_field_id)
		|| v.id === VIEW_ENTRY.id || v.label === VIEW_ENTRY.label);

/**
 * View ids are silently sanitized — `_H(o) = o.replace(/[^a-zA-Z0-9_]/g, "")`
 * runs over every one, deleting hyphens, spaces and dots without warning. So the
 * id is built already-sanitized rather than discovering later that it was
 * rewritten. Ids only need to be unique within one collection.
 */
const viewIdFor = (fieldId) => ('outline_' + fieldId).replace(/[^a-zA-Z0-9_]/g, '');

/**
 * Sub-pages are the collection's default hierarchy, so their view is just
 * "Outline"; anything else is named after the property it draws.
 */
const labelFor = (field) => field.id === 'parent_page' ? 'Outline' : `Outline: ${field.label}`;

/**
 * A label this installer generated, as opposed to one the user typed. Only these
 * are re-synced when a property is renamed — a view you named yourself keeps the
 * name you gave it.
 *
 * Restricted to the `Outline: ` form on purpose. The bare "Outline" belongs to
 * sub-pages, whose label never changes, and matching it would mean renaming any
 * view that happens to be called that.
 */
const isGeneratedLabel = (label) => /^Outline: /.test(label || '');

/**
 * The properties a hierarchy can be read from — the same test the view makes.
 * Single-valued record links pointing back at this same collection: a
 * multi-valued link would give a record several parents, and a link to another
 * collection points at records this collection's views never see.
 */
const hierarchyCandidates = (api) => {
	const guid = api.getGuid();
	return (api.getConfiguration().fields || []).filter(f => f.type === 'record'
		&& f.active !== false
		&& f.many !== true
		&& (f.id === 'parent_page' || f.filter_colguid === guid));
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
	 * A FRESH handle on a collection's plugin. Never hold one across a write.
	 *
	 * getPluginByGuid() wraps a fixed reference to the live plugin instance, and
	 * every config save destroys that instance and builds a new one from the
	 * stored config. The old wrapper keeps answering from the config object it
	 * was born with — so a handle kept from panel-open time is a snapshot, and
	 * saving it back reverts anything the settings screen, another device or a
	 * collaborator changed in the meantime. Config saves are whole-object
	 * replaces, so that revert is silent and total.
	 *
	 * saveCode() has the same exposure even though it writes no config: it reads
	 * its plugin's current config and the app stamps that copy into local state
	 * regardless, so a stale handle re-asserts an old config locally and the next
	 * real save persists it.
	 */
	resolve(guid) {
		return this.data.getPluginByGuid(guid);
	}

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
	 * Hand-made record properties pointing back at their own collection — the
	 * other way a collection can nest. `parent_page` is excluded so the two are
	 * real alternatives: it satisfies the candidate test too, and letting it match
	 * here would describe a sub-pages collection as using a property of your own.
	 */
	selfRefFields(api) {
		return hierarchyCandidates(api).filter(f => f.id !== 'parent_page');
	}

	customViews(api) {
		return (api.getConfiguration().views || []).filter(v => v.type === 'custom');
	}

	ourViews(api) {
		return (api.getConfiguration().views || []).filter(isOurView);
	}

	/**
	 * The property a view of ours draws, resolved the same way the view resolves
	 * it: its binding, else sub-pages, else the first self-referencing property.
	 * An unbound view is a pre-bindings install, and reconcile adopts it by
	 * writing the binding it was already behaving as if it had.
	 */
	boundFieldId(api, view) {
		if (view.opts && view.opts.hierarchy_field_id) return view.opts.hierarchy_field_id;
		const candidates = hierarchyCandidates(api);
		if (candidates.some(f => f.id === 'parent_page')) return 'parent_page';
		return candidates.length ? candidates[0].id : null;
	}

	/**
	 * What Install would change: which eligible properties have no view, and which
	 * of our views point at a property that no longer exists.
	 */
	plan(api) {
		const candidates = hierarchyCandidates(api);
		const ours = this.ourViews(api);
		const taken = new Set();
		const orphaned = [];
		// Views whose property was renamed, so the generated label no longer says
		// what the view draws. The binding is by field id, so these still work —
		// only the name is wrong.
		const stale = [];
		for (const view of ours) {
			const fieldId = this.boundFieldId(api, view);
			if (fieldId && candidates.some(f => f.id === fieldId)) {
				taken.add(fieldId);
				const field = candidates.find(f => f.id === fieldId);
				const label = labelFor(field);
				if (view.label !== label && isGeneratedLabel(view.label)) {
					stale.push({ view, label });
				}
			} else {
				orphaned.push(view);
			}
		}
		return {
			candidates,
			missing: candidates.filter(f => !taken.has(f.id)),
			orphaned,
			stale,
			// Views that work but predate bindings, so reconcile writes theirs in.
			unbound: ours.filter(v => !(v.opts && v.opts.hierarchy_field_id)
				&& !orphaned.includes(v)),
		};
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
		const plan = this.plan(api);
		return {
			guid: api.getGuid(),
			name: api.getName(),
			nests: !!plan.candidates.length,
			subPages: this.hasSubPages(api),
			selfRef: this.selfRefFields(api).length,
			candidates: plan.candidates,
			missing: plan.missing,
			orphaned: plan.orphaned,
			unbound: plan.unbound,
			stale: plan.stale,
			views: this.customViews(api).length,
			ours: this.ourViews(api).length,
			code: this.codeState(api),
		};
	}

	/**
	 * A sanitizer-safe view id not already in use. Ids collide when two properties
	 * sanitize to the same string, and a duplicate id would make views.register()
	 * and the tab switcher pick whichever comes first.
	 */
	freeViewId(conf, fieldId) {
		const taken = new Set((conf.views || []).map(v => v.id));
		const base = viewIdFor(fieldId);
		if (!taken.has(base)) return base;
		let n = 2;
		while (taken.has(`${base}_${n}`)) n++;
		return `${base}_${n}`;
	}

	// --- actions ------------------------------------------------------------

	/**
	 * Install is a RECONCILE, not an add: it brings the collection to one Outline
	 * view per eligible nesting property — creating the ones that are missing and
	 * deleting the ones whose property no longer exists — then writes the code.
	 * Running it twice changes nothing the second time.
	 *
	 * That makes the property the source of truth and the view derived from it.
	 * The consequence to be aware of: deleting a view is not durable, since the
	 * next reconcile puts it back. Deleting the property is how you get rid of a
	 * view for good.
	 */
	async install(guid, log) {
		let api = this.resolve(guid);
		if (!api) { log('That collection is gone.'); return; }

		// The code is checked BEFORE anything is written. A collection whose plugin
		// slot belongs to somebody else gets no schema change at all — writing the
		// field and the view first and then bailing out left a half-installed
		// collection carrying a view its own plugin does not render.
		if (this.codeState(api) === 'occupied') {
			log('This collection already has plugin code of its own.');
			log('Opening the editor so you can merge it yourself. Nothing was written.');
			const existing = api.getExistingCodeAndConfig() || {};
			api.previewPlugin(api.getConfiguration(), VIEW_SOURCE, existing.css || '', true);
			return;
		}

		const conf = api.getConfiguration();

		// Nesting is provisioned only when the collection has NO way to nest at
		// all. A collection that already nests through a property of its own is
		// left alone — adding sub-pages there would invent a second hierarchy and
		// a second view nobody asked for.
		const needsNesting = !hierarchyCandidates(api).length;
		if (needsNesting) {
			log('Turning on sub-pages...');
			conf.fields = (conf.fields || []).concat([Object.assign({}, SUBPAGE_FIELD)]);
		}

		// Reconcile against the config being built, not the live one: with
		// sub-pages just appended above, `parent_page` is a candidate for this
		// save even though the collection does not have it yet.
		const pending = { getGuid: () => guid, getConfiguration: () => conf };
		const plan = this.plan(pending);

		// A view from before bindings existed is adopted rather than duplicated:
		// without this, reconcile would see `parent_page` as unclaimed and add a
		// second view alongside the one already drawing it.
		for (const view of plan.unbound) {
			const fieldId = this.boundFieldId(pending, view);
			if (!fieldId) continue;
			view.opts = Object.assign({}, view.opts, { hierarchy_field_id: fieldId });
		}

		if (plan.orphaned.length) {
			log(`Removing ${plan.orphaned.length} view(s) whose property is gone...`);
			conf.views = (conf.views || []).filter(v => !plan.orphaned.includes(v));
		}

		// Only labels this installer generated are re-synced, so a view you renamed
		// yourself keeps your name. The view kept working through the rename either
		// way — the binding is by field id — so this is cosmetic.
		for (const { view, label } of plan.stale) {
			log(`Renaming "${view.label}" to "${label}"...`);
			view.label = label;
		}

		for (const field of plan.missing) {
			log(`Adding a view for "${field.label}"...`);
			conf.views = (conf.views || []).concat([Object.assign({}, VIEW_ENTRY, {
				id: this.freeViewId(conf, field.id),
				label: labelFor(field),
				opts: { hierarchy_field_id: field.id },
			})]);
		}

		// Every config change goes in ONE save. Writes are not readable in the same
		// tick, so appending the sub-page field and then re-reading the config
		// returns the copy from BEFORE it — saving that back silently drops the
		// field again, which is exactly how a collection ends up with the view
		// installed and no nesting.
		if (needsNesting || plan.orphaned.length || plan.missing.length
			|| plan.unbound.length || plan.stale.length) {
			// A refused save is reported as a refusal. saveConfiguration() returns
			// false when the user lacks permission on this collection — it does not
			// throw — so an unchecked call reports success and writes nothing.
			if (!await api.saveConfiguration(conf)) {
				log('The workspace refused that change — you may not have permission to edit this collection.');
				return;
			}
			api = this.resolve(guid);
			if (!api) { log('That collection is gone.'); return; }
		}

		const state = this.codeState(api);
		if (state === 'current') {
			log('Code is already up to date.');
			return;
		}
		log(state === 'outdated' ? 'Updating the view code...' : 'Writing the view code...');
		if (!await api.saveCode(VIEW_SOURCE)) {
			log('The workspace refused that change — you may not have permission to edit this plugin.');
			return;
		}
		log('Done. Open the collection and click the Outline tab.');
	}

	/**
	 * Removes the view. Leaves the code alone unless it is exactly ours, and
	 * never touches sub-pages — that field holds the nesting itself.
	 */
	async uninstall(guid, log) {
		let api = this.resolve(guid);
		if (!api) { log('That collection is gone.'); return; }

		// Only the view this installer writes is removed. Filtering out every
		// type:"custom" entry also deleted custom views the user had made — their
		// label, columns and sort along with them — which is not what Remove means.
		const mine = this.ourViews(api);
		const others = this.customViews(api).length - mine.length;
		if (mine.length) {
			log(`Removing ${mine.length} Outline view(s)...`);
			const conf = api.getConfiguration();
			conf.views = (conf.views || []).filter(v => !isOurView(v));
			if (!await api.saveConfiguration(conf)) {
				log('The workspace refused that change — you may not have permission to edit this collection.');
				return;
			}
			api = this.resolve(guid);
			if (!api) { log('That collection is gone.'); return; }
		}
		if (others) log(`Leaving ${others} other custom view(s) alone.`);

		const state = this.codeState(api);
		if (state === 'current' || state === 'outdated') {
			log('Clearing the view code...');
			if (!await api.saveCode(STUB)) {
				log('The workspace refused that change — you may not have permission to edit this plugin.');
				return;
			}
		} else {
			log('Leaving the plugin code alone — it is not the Outline source.');
		}
		log('Sub-pages and your nesting are untouched.');
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
			this.renderRow(wrap, api.getGuid());
		}
	}

	/**
	 * Each collection owns a box that repaints itself. Actions redraw it when they
	 * finish, so the summary and the buttons describe the collection as it is now
	 * rather than as it was when the panel opened.
	 *
	 * Rows carry a GUID, never a plugin handle: a handle held across a write goes
	 * stale (see resolve()), so both the reads behind the summary and the writes
	 * behind the buttons have to start from a fresh one.
	 */
	renderRow(parent, guid) {
		const box = el('div', parent);
		box.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid var(--border-color,rgba(128,128,128,.25));';
		this.paintRow(box, guid, []);
	}

	paintRow(box, guid, notes) {
		while (box.firstChild) box.removeChild(box.firstChild);
		const api = this.resolve(guid);
		if (!api) return;
		const s = this.status(api);

		const left = el('div', box);
		left.style.cssText = 'flex:1;min-width:0;';
		const title = el('div', left, s.name);
		title.style.cssText = 'font-weight:600;';

		const bits = [];
		if (!s.candidates.length) bits.push('no nesting yet');
		else bits.push(`${s.candidates.length} nesting propert${s.candidates.length === 1 ? 'y' : 'ies'}`
			+ (s.subPages ? s.selfRef ? ' (sub-pages + your own)' : ' (sub-pages)' : ' (your own)'));
		bits.push(s.ours ? `${s.ours} Outline view(s)` : 'no Outline view');
		bits.push(s.code === 'current' ? 'view installed'
			: s.code === 'outdated' ? 'older version installed'
			: s.code === 'free' ? 'plugin slot empty'
			: 'has other plugin code');
		const meta = el('div', left, bits.join(' \u00b7 '));
		meta.style.cssText = 'font-size:12px;opacity:.7;margin-top:2px;';

		// The delta Install would apply, so the button's effect is legible before
		// it is pressed.
		const delta = [];
		if (s.missing.length) delta.push(`${s.missing.length} view(s) to add: `
			+ s.missing.map(f => f.label).join(', '));
		if (s.orphaned.length) delta.push(`${s.orphaned.length} view(s) to remove — their property is gone`);
		if (s.stale.length) delta.push(`${s.stale.length} view(s) to rename — their property was renamed`);
		if (delta.length && s.code !== 'occupied') {
			const line = el('div', left, delta.join(' · '));
			line.style.cssText = 'font-size:12px;margin-top:4px;opacity:.85;';
		}

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
				const push = (m) => { log.push(m); this.paintRow(box, guid, log); };
				try { await fn(guid, push); }
				catch (err) { log.push(`Failed: ${String(err)}`); }
				// Repaint once more: the status above was computed before the writes.
				this.paintRow(box, guid, log);
				// And again on a timer, because the CODE half of the status reads
				// back stale for a moment after saveCode() even from a freshly
				// resolved handle: the rebuilt plugin instance substitutes the
				// default stub when the code is not in place yet (`f || (f = ma)` in
				// the app's plugin factory), so the row claimed "plugin slot empty"
				// and offered Install on a collection it had just finished
				// installing — no Remove button until the panel was reopened. The
				// config half is current immediately; only this needs the wait.
				setTimeout(() => this.paintRow(box, guid, log), 500);
			});
			return btn;
		};

		// The action button says what it will actually do, and is dropped entirely
		// when there is nothing to do — a button whose only outcome is "already up
		// to date" is worse than no button.
		const ours = s.code === 'current' || s.code === 'outdated';
		const present = s.ours > 0 && ours;
		// Complete means there is nothing left to reconcile: a view per eligible
		// property, none orphaned, none unbound, and the code current.
		const complete = present && s.nests && s.code === 'current'
			&& !s.missing.length && !s.orphaned.length && !s.unbound.length
			&& !s.stale.length;

		if (!complete) {
			run(s.code === 'outdated' ? 'Update' : present ? 'Repair' : 'Install',
				(g, l) => this.install(g, l), true);
		}
		if (present) run('Remove', (g, l) => this.uninstall(g, l), false);
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

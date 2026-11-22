/**
 * Outline — the global half of the Outline plugin.
 *
 * The view itself is a CollectionPlugin, so it has to live in each collection's
 * own plugin slot (global plugins can't register views). This plugin installs it
 * — walks your collections, shows what state each one is in, and does the three
 * steps for you: turn on sub-pages, add a Custom view, write the view's code —
 * and, on every page of a collection with an Outline view, adds the hierarchy
 * features that work outside the view:
 *
 *   - Breadcrumb: Root › … › Parent, after the collection pill above the title.
 *   - Show this page: open the Outline view zoomed into the page, its row selected.
 *   - New child / New sibling page, and Move page under… (a picker showing paths).
 *
 * The hierarchy is always sub-pages ("Sub-page of" / `parent_page`), so there is
 * nothing to configure. Nothing derived is stored: ancestors are walked live
 * through linkedRecord().
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

/**
 * The sub-page field, as collection.enableSubPages(true) appends it. Added
 * through the config rather than enableSubPages() so it lands in the same single
 * save as the view (see install()).
 */
const subPageField = (collectionGuid) => ({
	id: 'parent_page', label: 'Sub-page of', many: false, read_only: false,
	active: true, type: 'record', filter_colguid: collectionGuid,
});

const SUBPAGE = 'parent_page';
// Cycle guard. Only setSubPageOf() refuses cycles; an MCP or Markdown Mirror
// edit to "Sub-page of" goes through the app's raw property write, which doesn't.
const MAX_DEPTH = 100;
const ROOT_CLASS = 'hier-crumbs';
const ACTIONS_CLASS = 'hier-actions';
const STYLE_ID = 'hier-style';
const PICKER_ID = 'hier-picker';

const CSS = `
.panel-context-row:has(.${ROOT_CLASS}) .panel-context-pill { flex-shrink: 0; }
.${ROOT_CLASS} { display: flex; align-items: center; flex: 1 1 auto; min-width: 0; overflow: hidden; }
.${ROOT_CLASS} .hier-sep { flex: none; opacity: .45; padding: 0 1px; font-size: 13px; }
.${ROOT_CLASS} .hier-crumb { display: inline-flex; flex: 0 1 auto; min-width: 3.5em; max-width: 14em; }
.${ROOT_CLASS} .hier-crumb.is-more { flex: none; min-width: 0; }
.${ROOT_CLASS} .hier-crumb > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.hier-menu { position: fixed; z-index: 10000; min-width: 220px; max-width: 420px; padding: 4px;
	background: var(--cmdpal-bg-color, var(--bg-color, #222)); border: 1px solid rgba(127,127,127,.25);
	border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,.4); }
.hier-menu button { display: block; width: 100%; text-align: left; white-space: nowrap; overflow: hidden;
	text-overflow: ellipsis; padding: 5px 8px; }
.${ACTIONS_CLASS} { display: none; }
#${PICKER_ID} { position: fixed; inset: 0; z-index: 10000; display: flex; justify-content: center;
	align-items: flex-start; padding-top: 12vh; background: rgba(0,0,0,.25); }
#${PICKER_ID} .hier-box { width: min(640px, 92vw); background: var(--cmdpal-bg-color, var(--bg-color, #222));
	color: inherit; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,.45); overflow: hidden;
	border: 1px solid rgba(127,127,127,.25); }
#${PICKER_ID} .hier-head { padding: 10px 14px 0; font-size: 12px; opacity: .6; }
#${PICKER_ID} input { width: 100%; box-sizing: border-box; padding: 10px 14px; font: inherit; font-size: 15px;
	background: transparent; color: inherit; border: 0; outline: 0; border-bottom: 1px solid rgba(127,127,127,.25); }
#${PICKER_ID} .hier-list { max-height: 50vh; overflow-y: auto; }
#${PICKER_ID} .hier-opt { padding: 6px 14px; cursor: pointer; }
#${PICKER_ID} .hier-opt.is-sel { background: var(--cmdpal-selected-bg-color, rgba(127,127,127,.2)); }
#${PICKER_ID} .hier-opt-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#${PICKER_ID} .hier-opt-path { font-size: 12px; opacity: .55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#${PICKER_ID} .hier-empty { padding: 10px 14px; opacity: .55; }
`;

/** The view entry install() writes. Uninstall removes only views matching isOurView(). */
const VIEW_ENTRY = {
	id: 'outline', label: 'Outline', type: 'custom',
	icon: 'ti-list-tree', shown: true, description: '', query: '',
	read_only: false, opts: {}, field_ids: ['title'],
	group_by_field_id: null, sort_field_id: 'title', sort_dir: 'asc',
};

/** Ours if it has the id or label install() writes (a renamed view keeps its id). */
const isOurView = (v) => v.type === 'custom'
	&& (v.id === VIEW_ENTRY.id || v.label === VIEW_ENTRY.label);

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
		this.loadHierarchy();
	}

	onUnload() {
		clearTimeout(this._timer);
		for (const id of this._handlers || []) this.events.off(id);
		for (const obs of this._observers?.values() || []) obs.disconnect();
		document.querySelectorAll(`.${ROOT_CLASS}, .${ACTIONS_CLASS}, #${PICKER_ID}, .hier-menu`).forEach((n) => n.remove());
		document.getElementById(STYLE_ID)?.remove();
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

	customViews(api) {
		return (api.getConfiguration().views || []).filter(v => v.type === 'custom');
	}

	ourViews(api) {
		return (api.getConfiguration().views || []).filter(isOurView);
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
			subPages: this.hasSubPages(api),
			ours: this.ourViews(api).length,
			code: this.codeState(api),
		};
	}

	// --- actions ------------------------------------------------------------

	/**
	 * Brings a collection to: sub-pages on, one Outline view, the current code.
	 * Running it twice changes nothing the second time.
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
		let changed = false;
		if (!this.hasSubPages(api)) {
			log('Turning on sub-pages...');
			// An archived field is reactivated in place: enableSubPages(false)
			// deletes the field outright, so this is only a hand-edited config.
			const old = (conf.fields || []).find(f => f.id === SUBPAGE);
			if (old) old.active = true;
			else conf.fields = (conf.fields || []).concat([subPageField(guid)]);
			changed = true;
		}
		if (!this.ourViews(api).length) {
			log('Adding the Outline view...');
			const taken = new Set((conf.views || []).map(v => v.id));
			let id = VIEW_ENTRY.id;
			for (let n = 2; taken.has(id); n++) id = `${VIEW_ENTRY.id}${n}`;
			conf.views = (conf.views || []).concat([Object.assign({}, VIEW_ENTRY, { id })]);
			changed = true;
		}

		// Every config change goes in ONE save. Writes are not readable in the same
		// tick, so appending the sub-page field and then re-reading the config
		// returns the copy from BEFORE it — saving that back silently drops the
		// field again, which is exactly how a collection ends up with the view
		// installed and no nesting.
		if (changed) {
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
		this.buildIndex();
	}

	/**
	 * Removes the view. Leaves the code alone unless it is exactly ours, and
	 * never touches the nesting property — that holds the nesting itself.
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
		log('Sub-pages are untouched.');
		this.buildIndex();
	}

	// --- hierarchy: breadcrumb and page commands -----------------------------

	loadHierarchy() {
		this._handlers = [];
		this._observers = new Map(); // panel id → MutationObserver
		this._timer = 0;
		this._index = new Map(); // record guid → collection guid, for collections with an Outline view

		if (!document.getElementById(STYLE_ID)) {
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = CSS;
			document.head.appendChild(style);
		}

		const commands = [
			['show', 'Show this page', 'ti-list-tree', () => this.openOutline()],
			['newchild', 'New child page…', 'ti-plus', () => this.newPage('child')],
			['newsibling', 'New sibling page…', 'ti-plus', () => this.newPage('sibling')],
			['move', 'Move page under…', 'ti-arrows-move', () => this.moveUnder()],
		];
		// Each also gets a hidden <button data-action="plugin.outline<id>"> in every
		// panel showing a hierarchy page, so it can be bound in "Change Keyboard Shortcuts".
		this._actions = commands.map(([id, , , run]) => [`plugin.outline${id}`, run]);
		for (const [, label, icon, run] of commands) {
			this.ui.addCommandPaletteCommand({ label: `Outline: ${label}`, icon, onSelected: run });
		}

		for (const ev of ['panel.navigated', 'panel.focused']) {
			this._handlers.push(this.events.on(ev, () => this.schedule()));
		}
		this._handlers.push(this.events.on('panel.closed', (ev) => {
			const id = ev.panel?.getId?.();
			this._observers.get(id)?.disconnect();
			this._observers.delete(id);
		}));
		// A rename or re-parent anywhere can change any crumb on screen.
		this._handlers.push(this.events.on('record.updated', () => this.schedule(), { collection: '*' }));
		for (const ev of ['record.created', 'record.moved']) {
			this._handlers.push(this.events.on(ev, (e) => this.onRecordPlaced(e), { collection: '*' }));
		}
		this.buildIndex();
	}

	/**
	 * A collection's hierarchy context: sub-pages on and an Outline view to open.
	 * Null otherwise.
	 */
	hierarchyOf(api) {
		if (!api || !this.hasSubPages(api)) return null;
		const view = this.ourViews(api)[0];
		return view ? { collection: api, viewId: view.id } : null;
	}

	/**
	 * The record's hierarchy context, or null. PluginRecord can't name its
	 * collection, so the index maps record → collection guid, and the collection
	 * is re-resolved every time (a held handle goes stale on any config write).
	 */
	context(record) {
		if (!record) return null;
		const guid = this._index.get(record.guid);
		return guid ? this.hierarchyOf(this.resolve(guid)) : null;
	}

	async buildIndex() {
		const index = new Map();
		for (const api of await this.data.getAllCollections()) {
			if (!this.hierarchyOf(api)) continue;
			for (const r of await api.getAllRecords()) index.set(r.guid, api.getGuid());
		}
		this._index = index;
		this.schedule();
	}

	onRecordPlaced(ev) {
		if (!ev.recordGuid) return;
		const guid = ev.collectionGuid;
		if (guid && this.hierarchyOf(this.resolve(guid))) this._index.set(ev.recordGuid, guid);
		else this._index.delete(ev.recordGuid);
		this.schedule();
	}

	parentOf(record) {
		return record.linkedRecord(SUBPAGE);
	}

	/** Ancestors, root first. */
	ancestors(record) {
		const chain = [];
		const seen = new Set([record.guid]);
		let parent = this.parentOf(record);
		while (parent && !seen.has(parent.guid) && chain.length < MAX_DEPTH) {
			seen.add(parent.guid);
			chain.unshift(parent);
			parent = this.parentOf(parent);
		}
		return chain;
	}

	schedule() {
		// A timer, not rAF: rAF stalls while the window is hidden or occluded.
		clearTimeout(this._timer);
		this._timer = setTimeout(() => this.renderCrumbs(), 30);
	}

	renderCrumbs() {
		for (const panel of this.ui.getPanels?.() ?? []) {
			let record = null, root = null;
			try { record = panel.getActiveRecord(); } catch {}
			try { root = panel.getElement(); } catch {}
			if (!root) continue;
			try {
				this.renderCrumb(panel, record, root, root.closest('.panel') ?? root);
			} catch (e) {
				console.warn('[outline]', e);
			}
		}
	}

	renderCrumb(panel, record, root, frame) {
		const ctx = this.context(record);
		const old = frame.querySelector(`.${ROOT_CLASS}`);
		const oldActions = root.querySelector(`.${ACTIONS_CLASS}`);
		if (!ctx) {
			old?.remove();
			oldActions?.remove();
			return;
		}
		this.observe(panel, frame);

		if (!oldActions) {
			const box = el('div', root);
			box.className = ACTIONS_CLASS;
			for (const [action, run] of this._actions) {
				const b = el('button', box);
				b.setAttribute('data-action', action);
				b.addEventListener('click', run);
			}
		}

		const ancestors = this.ancestors(record);
		const key = record.guid + '|' + ancestors.map((a) => a.guid + ':' + (a.getName() ?? '')).join('|');
		if (old && old.dataset.key === key && old.isConnected) return;

		const host = frame.querySelector('.panel-context-row');
		if (!host) return;
		const crumbs = el('span');
		crumbs.className = ROOT_CLASS;
		crumbs.dataset.key = key;
		// One line: root › … › last two. The header can't grow, so the middle folds into a menu.
		const hidden = ancestors.length > 3 ? ancestors.slice(1, -2) : [];
		const shown = hidden.length ? [ancestors[0], null, ...ancestors.slice(-2)] : ancestors;
		for (const a of shown) {
			const sep = el('span', crumbs);
			sep.className = 'hier-sep ti ti-chevron-right';
			const crumb = el('button', crumbs);
			crumb.type = 'button';
			crumb.className = 'button-minimal button-small hier-crumb' + (a ? '' : ' is-more');
			el('span', crumb, a ? a.getName() || 'Untitled' : '…');
			crumb.title = a ? a.getName() ?? '' : hidden.map((h) => h.getName()).join(' › ');
			crumb.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (a) this.openPage(panel, a.guid, e.metaKey || e.ctrlKey);
				else this.crumbMenu(crumb, hidden, panel);
			});
		}
		old?.remove();
		host.appendChild(crumbs);
	}

	/** Dropdown of the folded middle ancestors, under the "…" crumb. */
	crumbMenu(anchor, records, panel) {
		document.querySelector('.hier-menu')?.remove();
		const menu = el('div');
		menu.className = 'hier-menu';
		records.forEach((r, i) => {
			const b = el('button', menu, r.getName() || 'Untitled');
			b.type = 'button';
			b.className = 'button-minimal button-small';
			b.style.paddingLeft = `${8 + i * 12}px`;
			b.title = r.getName() ?? '';
			b.addEventListener('click', (e) => {
				close();
				this.openPage(panel, r.guid, e.metaKey || e.ctrlKey);
			});
		});
		const rect = anchor.getBoundingClientRect();
		menu.style.left = `${rect.left}px`;
		menu.style.top = `${rect.bottom + 4}px`;
		const close = () => {
			menu.remove();
			document.removeEventListener('mousedown', outside, true);
			document.removeEventListener('keydown', esc, true);
		};
		const outside = (e) => { if (!menu.contains(e.target)) close(); };
		const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
		document.addEventListener('mousedown', outside, true);
		document.addEventListener('keydown', esc, true);
		document.body.appendChild(menu);
	}

	/** Thymer re-renders the title area on its own schedule; put the crumb back when it drops. */
	observe(panel, frame) {
		const id = panel.getId();
		if (this._observers.has(id)) return;
		const obs = new MutationObserver(() => {
			const crumbs = frame.querySelector(`.${ROOT_CLASS}`);
			if (!crumbs || !crumbs.isConnected) this.schedule();
		});
		obs.observe(frame, { childList: true, subtree: true });
		this._observers.set(id, obs);
	}

	async openPage(panel, guid, aside) {
		let target = panel;
		if (aside) target = (await this.ui.createPanel({ afterPanel: panel })) ?? panel;
		target.navigateTo({ type: 'edit_panel', rootId: guid, subId: null, workspaceGuid: this.getWorkspaceGuid() });
		if (aside) this.ui.setActivePanel(target);
	}

	/** The active panel's page and its hierarchy context, or null (with a toast). */
	activePage() {
		const panel = this.ui.getActivePanel();
		const record = panel?.getActiveRecord() ?? null;
		const ctx = this.context(record);
		if (!ctx) {
			this.toast('This page isn\'t in a collection with an Outline view.');
			return null;
		}
		return { panel, record, ctx };
	}

	toast(message) {
		this.ui.addToaster({ title: 'Outline', message, dismissible: true, autoDestroyTime: 3500 });
	}

	async newPage(kind) {
		const a = this.activePage();
		if (!a) return;
		const parent = kind === 'child' ? a.record : this.parentOf(a.record);
		const where = parent ? `under ${parent.getName() || 'Untitled'}` : 'at the top level';
		const title = await this.prompt(`New page ${where}`);
		if (!title) return;
		const guid = a.ctx.collection.createRecord(title);
		if (!guid) return;
		// A record created this tick isn't readable yet; wait for it before the write.
		let record = null;
		for (let i = 0; i < 30; i++) {
			record = (await a.ctx.collection.getAllRecords()).find((r) => r.guid === guid);
			if (record) break;
			await new Promise((r) => setTimeout(r, 100));
		}
		if (record && parent) record.setSubPageOf(parent.guid);
		this.openPage(a.panel, guid, false);
	}

	async moveUnder() {
		const a = this.activePage();
		if (!a) return;
		const all = await a.ctx.collection.getAllRecords();
		// Its own subtree is off limits: moving under a descendant makes a cycle,
		// which setSubPageOf() would refuse anyway.
		const kids = new Map();
		for (const r of all) {
			const p = this.parentOf(r)?.guid;
			if (p) (kids.get(p) ?? kids.set(p, []).get(p)).push(r.guid);
		}
		const banned = new Set();
		const stack = [a.record.guid];
		while (stack.length) {
			const g = stack.pop();
			if (banned.has(g)) continue;
			banned.add(g);
			stack.push(...(kids.get(g) ?? []));
		}
		const current = this.parentOf(a.record)?.guid ?? null;
		const options = all
			.filter((r) => !banned.has(r.guid) && r.guid !== current)
			.map((r) => ({
				guid: r.guid,
				title: r.getName() || 'Untitled',
				path: this.ancestors(r).map((x) => x.getName() || 'Untitled').join(' › '),
			}));
		if (current) options.unshift({ guid: null, title: 'Top level', path: 'Remove the parent' });
		const pick = await this.pick(`Move "${a.record.getName() || 'Untitled'}" under…`, options);
		if (pick === undefined) return;
		a.record.setSubPageOf(pick);
		this.schedule();
	}

	/**
	 * Opens the collection's Outline view zoomed into this page: the view lists only
	 * this page's subtree, with the page's own row selected, ready for keyboard
	 * navigation (Thymer's Zoom Out key steps out to the siblings). The view runs as the collection's
	 * own plugin, so the request crosses over on <html data-outline-zoom> (see the
	 * view's takeZoomHandoff).
	 */
	openOutline() {
		const a = this.activePage();
		if (!a) return;
		const collection = a.ctx.collection.getGuid();
		document.documentElement.dataset.outlineZoom = JSON.stringify({ collection, guid: a.record.guid, at: Date.now() });
		a.panel.navigateTo({ type: 'overview', rootId: collection, subId: a.ctx.viewId, workspaceGuid: this.getWorkspaceGuid() });
	}

	/** Free-text prompt. Resolves to the trimmed text, or null on Escape / empty. */
	prompt(heading) {
		return this.overlay(heading, null).then((v) => (v === undefined ? null : v));
	}

	/** Fuzzy pick from [{guid, title, path}]. Resolves to the guid (null allowed), or undefined. */
	pick(heading, options) {
		return this.overlay(heading, options);
	}

	overlay(heading, options) {
		document.getElementById(PICKER_ID)?.remove();
		const prevFocus = document.activeElement;
		return new Promise((resolve) => {
			const wrap = el('div');
			wrap.id = PICKER_ID;
			const box = el('div', wrap);
			box.className = 'hier-box';
			el('div', box, heading).className = 'hier-head';
			const input = el('input', box);
			input.type = 'text';
			input.spellcheck = false;
			const list = el('div', box);
			list.className = 'hier-list';
			input.placeholder = options ? 'Search pages…' : 'Title';
			let shown = [];
			let sel = 0;

			// The nearest ancestors matter most, so long paths lose their root end.
			const tail = (path) => {
				const parts = path.split(' › ');
				let out = parts.pop() ?? '';
				while (parts.length && out.length + parts[parts.length - 1].length < 90) out = parts.pop() + ' › ' + out;
				return parts.length ? '… › ' + out : out;
			};
			const done = (value) => {
				wrap.remove();
				try { prevFocus?.focus?.(); } catch {}
				resolve(value);
			};
			const draw = () => {
				if (!options) return;
				const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
				const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const starts = terms.map((t) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(t)}`, 'iu'));
				shown = options.filter((o) => {
					const hay = (o.title + ' ' + o.path).toLowerCase();
					return terms.every((t) => hay.includes(t));
				});
				// Word-start hits in the title count most, then in the path; shallow before deep.
				const score = (o) => starts.reduce((n, re) => n + (re.test(o.title) ? 3 : re.test(o.path) ? 1 : 0), 0);
				for (const o of shown) o._score = score(o);
				shown.sort((x, y) => y._score - x._score || x.path.length - y.path.length);
				shown = shown.slice(0, 60);
				sel = Math.min(sel, Math.max(0, shown.length - 1));
				list.textContent = '';
				if (!shown.length) {
					el('div', list, 'No matches').className = 'hier-empty';
					return;
				}
				shown.forEach((o, i) => {
					const row = el('div', list);
					row.className = 'hier-opt' + (i === sel ? ' is-sel' : '');
					el('div', row, o.title).className = 'hier-opt-title';
					el('div', row, tail(o.path) || 'Top level').className = 'hier-opt-path';
					row.addEventListener('mousedown', (e) => {
						e.preventDefault();
						done(o.guid);
					});
				});
				list.children[sel]?.scrollIntoView({ block: 'nearest' });
			};

			input.addEventListener('input', () => { sel = 0; draw(); });
			input.addEventListener('keydown', (e) => {
				e.stopPropagation();
				if (e.key === 'Escape') { e.preventDefault(); done(undefined); }
				else if (e.key === 'Enter') {
					e.preventDefault();
					if (!options) done(input.value.trim() || undefined);
					else if (shown[sel]) done(shown[sel].guid);
				} else if (options && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
					e.preventDefault();
					sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(1, shown.length);
					draw();
				}
			});
			wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) done(undefined); });
			document.body.appendChild(wrap);
			draw();
			input.focus();
		});
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
		const sub = el('p', wrap, 'Pick a collection. Installing turns on sub-pages, adds an Outline view, and writes the view code.');
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
		bits.push(s.subPages ? 'sub-pages on' : 'sub-pages off');
		bits.push(s.ours ? 'Outline view' : 'no Outline view');
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
		const complete = present && s.subPages && s.code === 'current';

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

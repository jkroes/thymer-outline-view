/**
 * Outline — the global half of the Outline plugin: the installer, and page
 * features for every collection that has an Outline view.
 *
 * The view itself is collection code (../collection/plugin.js) in each
 * collection's own plugin slot. The installer panel walks your collections, shows
 * what state each one is in, and does the setup for you: turn on sub-pages, add
 * an Order property and an Outline view, write the collection code. It never
 * replaces code it didn't write. On every page of a collection with an Outline
 * view this plugin also adds what works outside the view:
 *
 *   - Breadcrumb: Root › … › Parent, after the collection pill above the title.
 *   - Show this page: open the Outline view zoomed into the page, its row selected.
 *   - New child / New sibling page, and Move page under… (a picker showing paths).
 *
 * The hierarchy is always sub-pages ("Sub-page of" / `parent_page`), so there is
 * nothing to configure. Nothing derived is stored: ancestors are walked live
 * through linkedRecord().
 *
 * Module-style source: `node global/build.mjs` bundles it with what it shares
 * with the view (../view.js) and embeds the built collection code, so it will
 * not run until built. Nothing is fetched at runtime.
 */

import { SUBPAGE, OUTLINE_SIGNATURE, ancestorsOf, isOutlineView, subPagesOn, subtreeRecords } from '../view.js';
// The built collection code (collection/dist/plugin.js) as text: what Install
// writes into a collection. global/build.mjs points this name at it.
import VIEW_SOURCE from 'outline-collection-code';

const PANEL_ID = 'outline-installer';

/** What a collection's plugin slot looks like when nobody has touched it. */
const STUB = 'class Plugin extends CollectionPlugin {\n  onLoad() {\n    // Put your custom code here...\n  }\n}\n';

const isStub = (code) => !code || !code.trim() || code.includes('// Put your custom code here');

/**
 * The comment collection/build.mjs puts at the top of a build made with
 * --extras. Such a slot holds the Outline code AND somebody's additions, so the
 * installer never writes over it; it is updated by rebuilding.
 */
const EXTRAS_MARKER = 'outline-extras:';

/**
 * The sub-page field, as collection.enableSubPages(true) appends it. Added
 * through the config rather than enableSubPages() so it lands in the same single
 * save as the view (see install()).
 */
const subPageField = (collectionGuid) => ({
	id: SUBPAGE, label: 'Sub-page of', many: false, read_only: false,
	active: true, type: 'record', filter_colguid: collectionGuid,
});

/**
 * The canonical position field: siblings are ordered by it, and the view's
 * rearranging keys write it. The view finds it by id through the Outline view's
 * opts.order_field_id, so a rename doesn't unbind it. Field ids look like the
 * app's own: "f" + 14 characters of Crockford base32.
 */
const ORDER_LABEL = 'Order';
const newFieldId = () => {
	const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
	const bytes = crypto.getRandomValues(new Uint8Array(14));
	return 'f' + Array.from(bytes, b => alphabet[b % 32]).join('');
};
const orderFieldEntry = (id) => ({
	id, label: ORDER_LABEL, icon: 'ti-list-tree',
	many: false, read_only: true, active: true, type: 'number',
});

/** The view entry Install writes. */
const VIEW_ENTRY = {
	id: 'outline', label: 'Outline', type: 'custom',
	icon: 'ti-list-tree', shown: true, description: '', query: '',
	read_only: false, opts: {}, field_ids: ['title'],
	group_by_field_id: null, sort_field_id: 'title', sort_dir: 'asc',
};

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

export class Plugin extends AppPlugin {

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

	async open() {
		const panel = await this.ui.createPanel();
		if (panel) panel.navigateToCustomType(PANEL_ID);
	}

	onUnload() {
		clearTimeout(this._timer);
		for (const id of this._handlers || []) this.events.off(id);
		for (const obs of this._observers?.values() || []) obs.disconnect();
		document.querySelectorAll(`.${ROOT_CLASS}, .${ACTIONS_CLASS}, #${PICKER_ID}, .hier-menu`).forEach((n) => n.remove());
		document.getElementById(STYLE_ID)?.remove();
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
		return subPagesOn(api.getConfiguration());
	}

	/** The collection's Outline views, if its code slot holds the Outline code. */
	ourViews(api) {
		if (!this.code(api).includes(OUTLINE_SIGNATURE)) return [];
		return (api.getConfiguration().views || []).filter(isOutlineView);
	}

	code(api) {
		return (api.getExistingCodeAndConfig() || {}).code || '';
	}

	/**
	 * What the collection's code slot holds:
	 *
	 *   'current'   this build of the Outline code
	 *   'outdated'  another build of it
	 *   'merged'    the Outline code with somebody's additions built in
	 *   'free'      nothing, or the app's placeholder
	 *   'occupied'  somebody else's code
	 *
	 * Why it matters: saveCode() REPLACES a collection's code outright, there is
	 * no merge. Writing over a collection that has formulas or a custom record
	 * title would delete them, so only 'free', 'outdated' and 'current' slots are
	 * ever written.
	 */
	codeState(api) {
		const code = this.code(api);
		if (code.trim() === VIEW_SOURCE.trim()) return 'current';
		if (code.includes(OUTLINE_SIGNATURE)) return code.includes(EXTRAS_MARKER) ? 'merged' : 'outdated';
		return isStub(code) ? 'free' : 'occupied';
	}

	status(api) {
		return {
			name: api.getName(),
			subPages: this.hasSubPages(api),
			views: (api.getConfiguration().views || []).filter(isOutlineView).length,
			// What Install would still change in the config; empty when it's all set up.
			steps: this.plan(api).steps,
			code: this.codeState(api),
		};
	}

	// --- installer actions --------------------------------------------------

	/**
	 * What Install would change in a collection's config to reach: sub-pages on,
	 * an active read-only Order property, and an Outline view sorted by it and
	 * bound to it (opts.order_field_id). `conf` is a copy of the config with those
	 * changes made, `steps` one entry per change: what it concerns and the line
	 * Install logs for it. No steps: nothing to change. The status row and
	 * install() both read this, so they can't disagree.
	 */
	plan(api) {
		const conf = JSON.parse(JSON.stringify(api.getConfiguration()));
		const steps = [];
		const ours = (conf.views || []).filter(isOutlineView);
		if (!subPagesOn(conf)) {
			steps.push({ what: 'subpages', log: 'Turning on sub-pages...' });
			// An archived field is reactivated in place: enableSubPages(false)
			// deletes the field outright, so this is only a hand-edited config.
			const old = (conf.fields || []).find(f => f.id === SUBPAGE);
			if (old) old.active = true;
			else conf.fields = (conf.fields || []).concat([subPageField(api.getGuid())]);
		}
		// The Order field: the one an Outline view is bound to, else an existing
		// number field named Order (reactivated if archived, so its values come
		// back), else a new one.
		const fields = conf.fields || [];
		const bound = ours.map(v => v.opts && v.opts.order_field_id).find(Boolean);
		let order = fields.find(f => f.id === bound && f.type === 'number')
			|| fields.find(f => f.type === 'number' && (f.label || '').trim().toLowerCase() === ORDER_LABEL.toLowerCase());
		if (!order) {
			steps.push({ what: 'order', log: `Adding the ${ORDER_LABEL} property...` });
			const taken = new Set(fields.map(f => f.id));
			let id;
			do id = newFieldId(); while (taken.has(id));
			order = orderFieldEntry(id);
			conf.fields = fields.concat([order]);
		} else if (order.active === false) {
			steps.push({ what: 'order', log: `Restoring the ${order.label} property...` });
			order.active = true;
		}
		// Read-only locks the app's own editors only: the view's rearranging keys
		// still write it, and nobody types over a position in a table cell.
		if (order.read_only !== true) {
			steps.push({ what: 'order', log: `Making the ${order.label} property read-only...` });
			order.read_only = true;
		}

		if (!ours.length) {
			steps.push({ what: 'view', log: `Adding the Outline view, sorted by ${order.label}...` });
			const taken = new Set((conf.views || []).map(v => v.id));
			let id = VIEW_ENTRY.id;
			for (let n = 2; taken.has(id); n++) id = `${VIEW_ENTRY.id}${n}`;
			conf.views = (conf.views || []).concat([Object.assign({}, VIEW_ENTRY, {
				id, sort_field_id: order.id, sort_dir: 'asc', opts: { order_field_id: order.id },
			})]);
		} else {
			// An Outline view not bound to Order yet: bind it, leaving its sort alone
			// (the user may have chosen one).
			for (const v of ours) {
				const opts = v.opts || {};
				if (opts.order_field_id === order.id) continue;
				steps.push({ what: 'order', log: `Binding the ${v.label} view to ${order.label}...` });
				v.opts = Object.assign({}, opts, { order_field_id: order.id });
			}
		}
		return { conf, steps };
	}

	/**
	 * Brings a collection to: sub-pages on, an Order property, one Outline view
	 * sorted by it and bound to it (opts.order_field_id), the current code.
	 * Running it twice changes nothing the second time.
	 */
	async install(guid, log) {
		let api = this.resolve(guid);
		if (!api) { log('That collection is gone.'); return; }

		// The code is checked BEFORE anything is written. A collection whose slot
		// belongs to somebody else gets no schema change at all: writing the field
		// and the view first and then bailing out left a half-installed collection
		// carrying a view its own code does not draw.
		if (this.codeState(api) === 'occupied') {
			log('This collection has code of its own, and installing would replace it. Nothing was written.');
			return;
		}

		// Every config change goes in ONE save. Writes are not readable in the same
		// tick, so appending the sub-page field and then re-reading the config
		// returns the copy from BEFORE it; saving that back silently drops the
		// field again, which is how a collection ends up with the view installed
		// and no nesting.
		const { conf, steps } = this.plan(api);
		for (const step of steps) log(step.log);
		if (steps.length) {
			api = await this.saveConfig(api, conf, guid, log);
			if (!api) return;
		}

		const state = this.codeState(api);
		if (state === 'merged') {
			log('Left the code alone: it has other code merged in. Update it by rebuilding with your additions.');
		} else if (state === 'current') {
			log('Code is already up to date.');
		} else {
			log(state === 'outdated' ? 'Updating the view code...' : 'Writing the view code...');
			if (!await this.writeCode(api, VIEW_SOURCE, log)) return;
			log('Done. Open the collection and click the Outline tab.');
		}
		this.buildIndex();
	}

	/**
	 * Save a collection config and hand back a fresh handle (the old one is
	 * stale after any write), or null after logging why not. A refused save is
	 * reported as a refusal: saveConfiguration() returns false when the user
	 * lacks permission on the collection, it does not throw, so an unchecked
	 * call reports success and writes nothing.
	 */
	async saveConfig(api, conf, guid, log) {
		if (!await api.saveConfiguration(conf)) {
			log('The workspace refused that change. You may not have permission to edit this collection.');
			return null;
		}
		const fresh = this.resolve(guid);
		if (!fresh) log('That collection is gone.');
		return fresh;
	}

	/** Write the collection's plugin code; false, after logging, when the app refuses. */
	async writeCode(api, source, log) {
		if (await api.saveCode(source)) return true;
		log('The workspace refused that change. You may not have permission to edit this plugin.');
		return false;
	}

	/**
	 * Removes the Outline views, and the code when it is only the Outline code.
	 * Never touches sub-pages or the Order property: they hold the data.
	 */
	async uninstall(guid, log) {
		let api = this.resolve(guid);
		if (!api) { log('That collection is gone.'); return; }

		// Read before the views go: without one, nothing says the slot is ours.
		const state = this.codeState(api);
		const conf = api.getConfiguration();
		const mine = (conf.views || []).filter(isOutlineView);
		if (mine.length) {
			log(`Removing ${mine.length} Outline view(s)...`);
			conf.views = conf.views.filter(v => !isOutlineView(v));
			api = await this.saveConfig(api, conf, guid, log);
			if (!api) return;
		}
		if (state === 'current' || state === 'outdated') {
			log('Clearing the view code...');
			if (!await this.writeCode(api, STUB, log)) return;
		} else {
			log('Left the code alone: it is not only the Outline code.');
		}
		log('Sub-pages and the Order property are untouched.');
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
		const apis = (await this.data.getAllCollections()).filter(api => this.hierarchyOf(api));
		const lists = await Promise.all(apis.map(api => api.getAllRecords()));
		apis.forEach((api, i) => {
			for (const r of lists[i]) index.set(r.guid, api.getGuid());
		});
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
		return [...ancestorsOf(record, SUBPAGE)].reverse();
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
			// Nothing to remount on this page; observe() re-attaches when there is.
			this._observers.get(panel.getId())?.disconnect();
			this._observers.delete(panel.getId());
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
		const banned = new Set(subtreeRecords(all, a.record, SUBPAGE).map((r) => r.guid));
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
					o._hay ??= (o.title + ' ' + o.path).toLowerCase();
					return terms.every((t) => o._hay.includes(t));
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
					if (!shown.length) return;
					// Only the highlight moves; the rows are as draw() left them.
					list.children[sel].classList.remove('is-sel');
					sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
					list.children[sel].classList.add('is-sel');
					list.children[sel].scrollIntoView({ block: 'nearest' });
				}
			});
			wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) done(undefined); });
			document.body.appendChild(wrap);
			draw();
			input.focus();
		});
	}

	// --- installer panel ----------------------------------------------------

	async render(panel) {
		const root = panel.getElement();
		if (!root) return;
		while (root.firstChild) root.removeChild(root.firstChild);

		const wrap = el('div', root);
		wrap.style.cssText = 'padding:24px;max-width:760px;margin:0 auto;';

		const h = el('h2', wrap, 'Install the Outline view');
		h.style.cssText = 'margin:0 0 4px;';
		const sub = el('p', wrap, 'Pick a collection. Installing turns on sub-pages, adds an Order property and an Outline view sorted by it, and writes the view code.');
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
		bits.push(s.views ? 'Outline view' : 'no Outline view');
		if (s.views && s.steps.some(step => step.what === 'order')) bits.push('Order property not set up');
		bits.push({
			current: 'view code installed',
			outdated: 'older view code installed',
			merged: 'view code installed, with other code merged in',
			free: 'no code',
			occupied: 'has other code',
		}[s.code]);
		const meta = el('div', left, bits.join(' \u00b7 '));
		meta.style.cssText = 'font-size:12px;opacity:.7;margin-top:2px;';

		const caution = s.code === 'occupied'
			? 'This collection has code of its own, and a collection holds only one piece of code, so Outline can\'t be installed here without replacing it. To have both, build the Outline code with yours merged in (README: "Other code in the same collection") and paste that in; this row then offers the rest of the setup.'
			: s.code === 'merged'
				? 'The installer sets up the properties and the view here but never writes this code. Update it by rebuilding with your additions.'
				: '';
		if (caution) {
			const warn = el('div', left, caution);
			warn.style.cssText = 'font-size:12px;margin-top:4px;color:var(--enum-orange-fg,#c60);';
		}

		for (const note of notes) {
			const line = el('div', left, note);
			line.style.cssText = 'font-size:12px;margin-top:4px;opacity:.85;';
		}
		if (s.code === 'occupied') return;

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
				// default stub when the code is not in place yet, so the row said
				// "no code" and offered Install on a collection it had just
				// finished installing. The config half is current immediately.
				setTimeout(() => this.paintRow(box, guid, log), 500);
			});
			return btn;
		};

		// The action button says what it will actually do, and is dropped entirely
		// when there is nothing to do.
		const hasCode = s.code !== 'free';
		const present = s.views > 0 && hasCode;
		const complete = present && !s.steps.length && s.code !== 'outdated';

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

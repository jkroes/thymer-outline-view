/**
 * Outline — the global half of the Outline plugin: page features for every
 * collection that has an Outline view.
 *
 * The view itself is collection code (../collection/plugin.js), pasted or
 * deployed into each collection's own plugin slot. This plugin adds what works
 * outside the view, on every page of such a collection:
 *
 *   - Breadcrumb: Root › … › Parent, after the collection pill above the title.
 *   - Show this page: open the Outline view zoomed into the page, its row selected.
 *   - New child / New sibling page, and Move page under… (a picker showing paths).
 *
 * The hierarchy is always sub-pages ("Sub-page of" / `parent_page`), so there is
 * nothing to configure. Nothing derived is stored: ancestors are walked live
 * through linkedRecord().
 *
 * Module-style source: `./build.sh global` bundles it with what it shares with
 * the view (../view.js), so it will not run until built.
 */

import { SUBPAGE, OUTLINE_SIGNATURE, ancestorsOf, isOutlineView, subPagesOn, subtreeRecords } from '../view.js';

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
		this.loadHierarchy();
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
		const code = (api.getExistingCodeAndConfig() || {}).code || '';
		if (!code.includes(OUTLINE_SIGNATURE)) return [];
		return (api.getConfiguration().views || []).filter(isOutlineView);
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

}

/** Small DOM helper. textContent only — plugin code must never build markup. */
function el(tag, parent, text) {
	const node = document.createElement(tag);
	if (text !== undefined) node.textContent = text;
	if (parent) parent.appendChild(node);
	return node;
}

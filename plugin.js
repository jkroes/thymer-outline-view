/// <reference path="./sdk/types.d.ts" />
/**
 * "Outline" — a native-list-style custom view of a collection's sub-pages.
 * Rows are indented by depth from the sub-page link ("Sub-page of" /
 * `parent_page`); each node expands/collapses. The view toolbar is the
 * app's own — custom views are given it, so this draws only the tree.
 *
 * Nothing here is bound to a particular collection: fields, views, sort and item
 * name are all read from the collection's config at runtime.
 */

/**
 * Choice-color index -> class/token name, lifted from the app bundle's own
 * palette array (`At`). The `--enum-<name>-bg/-fg` tokens follow these names,
 * so a pill styled from them matches the colors the native views use.
 */
const ENUM_COLORS = [
	'red', 'orange', 'green', 'cyan', 'blue', 'purple', 'pink', 'fuchsia',
	'rose', 'stone', 'teal', 'sky', 'indigo', 'zinc', 'yellow'
];

/** "9m ago" / "2h ago" / "3d ago", matching the native list view's stamp. */
function timeAgo(date) {
	if (!date) return '';
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	return `${Math.floor(months / 12)}y ago`;
}

/**
 * Re-add the ancestors of every record in `records` that the set is missing.
 *
 * The app's own search and filters narrow the record set BEFORE it reaches the
 * view, and they keep only the matches — so a matched grandchild arrives with
 * neither its parent nor its grandparent, which leaves the tree a flat list
 * with no twisties to expand. Walking `linkedRecord()` up from each match puts
 * the path back: that call resolves the linked record itself, not a lookup in
 * the delivered set, so ancestors filtered out are still reachable.
 *
 * Returns the completed set plus the guids that were added, which is also the
 * signal that a filter is on at all — an unfiltered set is already complete and
 * adds nothing.
 */
function withAncestors(records, parentFieldId) {
	const byGuid = new Map(records.map(record => [record.guid, record]));
	const added = new Set();
	if (parentFieldId) {
		records.forEach(record => {
			let parent = record.linkedRecord(parentFieldId);
			// A parent already in the map ends the walk: it carries its own
			// ancestors up from where it sits. The depth cap stops a cycle
			// spinning here (see buildHierarchy for how one can exist).
			for (let depth = 0; parent && !byGuid.has(parent.guid) && depth < 100; depth++) {
				byGuid.set(parent.guid, parent);
				added.add(parent.guid);
				parent = parent.linkedRecord(parentFieldId);
			}
		});
	}
	return { records: Array.from(byGuid.values()), added };
}

/**
 * Build a parent/child forest from records linked by `parentFieldId`.
 * Records whose parent is unset or points outside the set become roots.
 * Records caught in a cycle are promoted to roots so they stay visible. Only
 * setSubPageOf() refuses cycles: the app's raw property write doesn't check
 * (read in the bundle 2026-11-22), so an MCP or Markdown Mirror edit to
 * "Sub-page of" can still make one.
 */
function buildHierarchy(records, parentFieldId) {
	const nodes = new Map();
	records.forEach(record => {
		const parent = parentFieldId ? record.linkedRecord(parentFieldId) : null;
		nodes.set(record.guid, {
			id: record.guid,
			name: record.getName() || 'Unknown',
			parentGuid: parent ? parent.guid : null,
			record,
			children: [],
			level: 0,
			x: 0,
			y: 0
		});
	});

	const rootNodes = [];
	nodes.forEach(node => {
		if (node.parentGuid && nodes.has(node.parentGuid)) {
			nodes.get(node.parentGuid).children.push(node);
		} else {
			rootNodes.push(node);
		}
	});

	// A parent cycle leaves its members unreachable from any root. Promote them
	// rather than letting them vanish from the view.
	const reachable = new Set();
	const walk = node => {
		if (reachable.has(node.id)) return;
		reachable.add(node.id);
		node.children.forEach(walk);
	};
	rootNodes.forEach(walk);
	nodes.forEach(node => {
		if (!reachable.has(node.id)) {
			const parent = nodes.get(node.parentGuid);
			if (parent) {
				parent.children = parent.children.filter(c => c !== node);
			}
			rootNodes.push(node);
			walk(node);
		}
	});

	// Sibling order is left as the caller supplied it, which is the order the
	// view's own sort_field_id/sort_dir produced.
	return { nodes, rootNodes };
}

/**
 * The one hierarchy the view draws: sub-pages. `collection.enableSubPages(true)`
 * provisions it as a plain record field, "Sub-page of", filtered to this
 * collection, so reading it needs nothing special. Writes go through
 * setSubPageOf(), where the app's cycle and same-collection checks live.
 */
const SUBPAGE = 'parent_page';

// --- Thymer's fold, zoom and trash shortcuts ------------------------------
//
// (Plus one of ours, `plugin.outlinehints`, which pages the status-bar hints;
// it's bound the same way, in Thymer's custom shortcuts text.)
//
// The outline answers to Thymer's own fold, zoom and trash actions on whatever keys
// the user has them bound to. Plugins can't ask the app for its keymap, so it
// is rebuilt here from the same two sources the app uses (bundle `Ix`, client
// 1.0.20): the defaults below, then the account's custom shortcuts text for
// this platform and runtime.

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const KBD_SLOT = (IS_MAC ? 'mac' : 'win') + (window.thymerDesktopAPI ? '_electron' : '_web');

/**
 * The app's default keys for the actions the outline follows, action names
 * lowercased as the app compares them. The rest have no default and stay
 * unbound until the user binds them. ("Meta+Shift+?" never fires on a Mac:
 * with ⌘ held the key arrives as "/". That's the app's bug, kept as is.)
 */
const DEFAULT_KEYS = IS_MAC ? {
	'nav.togglefold': 'Meta+/',
	'nav.togglefolddescendants': 'Meta+Shift+?',
	'nav.foldchildren': 'Meta+,',
	'nav.unfoldchildren': 'Meta+.',
	'nav.foldcascade': 'Meta+Shift+,',
	'nav.unfoldcascade': 'Meta+Shift+.',
	'panel.zoom_out': 'Alt+ArrowUp',
	'panel.zoom_in': 'Alt+ArrowDown',
	'collection.trash_record': 'Meta+Backspace',
	'plugin.outlinehints': 'Shift+?',
} : {
	'nav.togglefold': 'Ctrl+/',
	'nav.togglefolddescendants': 'Ctrl+Shift+?',
	'nav.foldchildren': 'Ctrl+,',
	'nav.unfoldchildren': 'Ctrl+.',
	'nav.foldcascade': 'Ctrl+Shift+<',
	'nav.unfoldcascade': 'Ctrl+Shift+>',
	'panel.zoom_out': 'Alt+ArrowUp',
	'panel.zoom_in': 'Alt+ArrowDown',
	'collection.trash_record': 'Ctrl+Delete',
	'plugin.outlinehints': 'Shift+?',
};
for (const action of ['nav.unfolddescendants', 'nav.folddescendants', 'nav.togglefoldchildren',
	'nav.foldcontainer', 'nav.unfoldcontainer', 'nav.togglefoldcontainer']) {
	DEFAULT_KEYS[action] = '';
}

const KEY_MODIFIERS = ['Meta', 'Ctrl', 'Alt', 'Shift'];
const NAMED_KEYS = ['Escape', 'Enter', 'Tab', 'Space', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft',
	'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
	'F11', 'F12', 'NumpadEnter', 'Insert'];

/** The bundle's `r$`: a binding as typed ("shift+meta+k" → "Meta+Shift+K"), or null when invalid. */
function normalizeKey(s) {
	const parts = s.split('+').map(p => p.trim());
	if (parts.some(p => !p)) return null;
	const mods = new Set();
	for (const p of parts.slice(0, -1)) {
		const m = KEY_MODIFIERS.find(k => k.toLowerCase() === p.toLowerCase());
		if (!m) return null;
		mods.add(m);
	}
	let key = parts[parts.length - 1];
	if (/\p{So}/u.test(key)) return null;
	if (key.length === 1) key = key.toUpperCase();
	else key = { copy: 'C', cut: 'X', paste: 'V' }[key.toLowerCase()] || NAMED_KEYS.find(k => k.toLowerCase() === key.toLowerCase());
	return key ? [...KEY_MODIFIERS.filter(m => mods.has(m)), key].join('+') : null;
}

/** Punctuation by physical key, plain and shifted (the bundle's `RY` / `$Y`). */
const CODE_KEYS = {
	Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Backquote: '`',
	Backslash: '\\', Comma: ',', Period: '.', Slash: '/',
};
const SHIFTED_CODE_KEYS = {
	Minus: '_', Equal: '+', BracketLeft: '{', BracketRight: '}', Semicolon: ':', Quote: '"', Backquote: '~',
	Backslash: '|', Comma: '<', Period: '>', Slash: '?',
};

/**
 * A key event as the app names it (the bundle's `zi`). A printable ASCII key
 * is taken as typed; anything else (⌥/ types "÷" on a Mac) is named by its
 * physical key instead, which is how "Alt+/" can match at all.
 */
function eventKeyName(e) {
	if (e.isComposing || e.key === 'Dead') return '';
	const mods = (e.metaKey ? 'Meta+' : '') + (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '');
	if (e.code === 'BracketLeft') return mods + '[';
	if (e.code === 'BracketRight') return mods + ']';
	if (e.code === 'Space') return mods + 'Space';
	if (!e.key || e.key.length !== 1) return mods + e.key;
	const c = e.key.charCodeAt(0);
	if (c >= 32 && c <= 126) return mods + e.key.toUpperCase();
	let k = /^Key([A-Z])$/.exec(e.code)?.[1];
	const digit = /^Digit(\d)$/.exec(e.code)?.[1];
	if (digit) k = e.shiftKey ? ')!@#$%^&*('[Number(digit)] : digit;
	k ??= (e.shiftKey ? SHIFTED_CODE_KEYS : CODE_KEYS)[e.code];
	return mods + (k || e.key.toUpperCase());
}

/** The custom shortcuts text as `{action, key}` entries, or null if it has an error (the app then ignores all of it). */
function parseShortcuts(source) {
	const entries = [];
	if (/^\{\s*\}$/.test(source.trim())) return entries;
	for (const raw of source.split('\n')) {
		const line = raw.trim();
		if (!line || line.startsWith('//') || line === '{' || line === '}') continue;
		const m = line.match(/^(?:"(?<action>[^"]*)"|'(?<action>[^']*)')\s*:\s*(?:"(?<key>[^"]*)"|'(?<key>[^']*)')\s*,?/);
		const rest = m && line.slice(m[0].length).trim();
		if (!m || (rest && !rest.startsWith('//'))) return null;
		const { action, key } = m.groups;
		if (!action && !key) return null;
		if (action && !action.includes('.')) return null;
		const normalized = key ? normalizeKey(key) : '';
		if (normalized === null) return null;
		entries.push({ action: action.toLowerCase(), key: normalized });
	}
	return entries;
}

let keymapSource = null;
let keymap = null;

/**
 * The fold and zoom actions on their current keys: `keys` maps action → key
 * ('' when unbound), `byKey` the reverse. Each custom line rebinds an action,
 * unbinds it (`"action": ""`), frees a key (`"": "key"`), or takes a key away
 * from whatever had it. Re-read whenever the account's text changes.
 */
function foldKeymap() {
	let root = window.g_focusedComponent;
	while (root?.parent) root = root.parent;
	const source = root?.sideBar?.activeUser?.acct_json?.kbd?.[KBD_SLOT] || '';
	if (keymap && source === keymapSource) return keymap;
	const keys = { ...DEFAULT_KEYS };
	for (const { action, key } of parseShortcuts(source) || []) {
		if (key) for (const a in keys) if (keys[a] === key && a !== action) keys[a] = '';
		if (action in keys) keys[action] = key;
	}
	const byKey = new Map();
	for (const a in keys) if (keys[a]) byKey.set(keys[a], a);
	keymapSource = source;
	keymap = { keys, byKey };
	return keymap;
}

const KEY_GLYPHS = {
	Space: 'Space', ArrowRight: '→', ArrowLeft: '←', Escape: 'Esc', Enter: '↵', Tab: '⇥', ArrowUp: '↑',
	ArrowDown: '↓', PageUp: 'PgUp', PageDown: 'PgDn', Delete: 'Del', Backspace: IS_MAC ? '⌫' : 'Bksp',
};

const SHIFTED_CHARS = new Set([...Object.values(SHIFTED_CODE_KEYS), ...')!@#$%^&*(']);

/** A key as the status bar shows it, as plain text: "Meta+Shift+," → "⌘⇧," on a Mac. */
function keyLabel(key) {
	if (!key) return '';
	let parts = key.split('+');
	const last = parts.pop();
	// A character only typed with Shift already says so: "Shift+?" shows as "?".
	if (SHIFTED_CHARS.has(last)) parts = parts.filter(m => m !== 'Shift');
	const k = KEY_GLYPHS[last] || last;
	if (!IS_MAC) return [...parts.map(m => m === 'Meta' ? 'Ctrl' : m), k].join('+');
	const glyph = { Meta: '⌘', Ctrl: '⌃', Alt: '⌥', Shift: '⇧' };
	return parts.map(m => glyph[m]).join('') + k;
}

/** The glyphs the app sets as `kbdmod` (its `HY` set). */
const KBDMOD_GLYPHS = new Set(['⌫', '⌦', '↵', '⇧', '⌃', '⌥', '⌘', '→', '←', '↑', '↓', '↕', '↔', '⇥']);

/** Key text as markup, each glyph in a kbdmod span: the app's `_n()`, which every status-bar key goes through. */
function kbdHtml(text) {
	const esc = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
	return Array.from(text, c => KBDMOD_GLYPHS.has(c)
		? `<span class="kbdmod ${IS_MAC ? 'kbdmod-mac' : ''}">${c}</span>`
		: (esc[c] || c)).join('');
}

/** Set on <body> while an Outline view has focus; swaps in the view's key hints. */
const KEYS_BODY_CLASS = 'plg-outline-keys';

/**
 * The status-bar hints shown while an Outline view has focus, in the app's own
 * markup (.statusbar-item > .statusbar--kbd + .statusbar--kbd-label, read off
 * the live status bar 2026-11-15) so they pick up its styling.
 */
function keyHints(peeking, zoomed, itemName) {
	const cmd = IS_MAC ? '⌘' : 'Ctrl+';
	const shift = IS_MAC ? '⇧' : 'Shift+';
	const { keys } = foldKeymap();
	// Fold level: unfold then fold, the shared modifiers written once ("⌘⇧.,").
	const up = keys['nav.unfoldcascade'], down = keys['nav.foldcascade'];
	const modsOf = k => k.split('+').slice(0, -1).join('+');
	const cascade = up && down && modsOf(up) === modsOf(down)
		? keyLabel(up) + keyLabel(down.split('+').pop())
		: [up, down].filter(Boolean).map(keyLabel).join(' ');
	// statusbar--kbd-modifier on an item sets its key in the mono font
	// (`.statusbar--kbd-modifier .statusbar--kbd`). Native List gives it to every
	// hint; its reference view leaves it off user-rebindable fold keys, so the
	// fold and zoom hints go without it here.
	const mono = 'statusbar--kbd-modifier';
	// While peeking, the set the app's own views show then (getPeekStatusBarContext).
	// Otherwise native List's set first, in its order and wording, then ours.
	const hints = peeking ? [
		['Esc', 'Exit Peek', mono],
		['↵', 'Open', mono],
		['↕ ↔', 'Browse', mono],
	] : [
		['/', 'Search', mono],
		['Space', 'Peek', mono],
		['↵', 'Open', mono],
		['R', 'Rename', mono],
		[`${cmd}↵`, 'Open Aside', mono],
		[`${shift}↵`, `Create ${itemName}`, mono],
		[keyLabel(keys['collection.trash_record']), 'Trash', mono],
		['E', 'Edit', mono],
		['⇥', 'Indent', mono],
		[`${shift}⇥`, 'Outdent', mono],
		[`${cmd}${shift}↑↓`, 'Reorder', mono],
		[keyLabel(keys['panel.zoom_in']), 'Zoom'],
		...(zoomed ? [[keyLabel(keys['panel.zoom_out']), 'Zoom out']] : []),
		[keyLabel(keys['nav.togglefold']), 'Fold'],
		[keyLabel(keys['nav.togglefoldchildren']), 'Fold children'],
		[keyLabel(keys['nav.togglefolddescendants']), 'Fold descendants'],
		[cascade, 'Fold level'],
		[keyLabel(keys['nav.togglefoldcontainer']), 'Fold all'],
	];
	// An action with no key has no hint.
	return hints.filter(([k]) => k);
}

/** Hints as the status bar's own markup. */
function hintsHtml(hints) {
	return hints.map(([k, label, cls]) => `<span class="statusbar-item${cls ? ' ' + cls : ''}"><span class="statusbar--kbd">${kbdHtml(k)}</span> <span class="statusbar--kbd-label">${label}</span></span>`).join('');
}

export class Plugin extends CollectionPlugin {

	onLoad() {
		this.registerOutlineView();
	}

	onUnload() {
		document.body.classList.remove(KEYS_BODY_CLASS);
		if (this.keysObserver) this.keysObserver.disconnect();
		if (this.keysItem) this.keysItem.remove();
		this.keysItem = this.keysObserver = null;
	}

	/**
	 * Show or hide the Outline key hints. A plugin can only APPEND status-bar
	 * items (they land on the right), so the hints are one item of ours,
	 * pinned over the left edge by CSS while the body class hides the app's
	 * own hints there. One item per plugin, shared by every view instance.
	 */
	showKeyHints(on, peeking = false, zoomed = false, itemName = 'Page') {
		// The keymap object is replaced whenever the user's shortcuts change.
		const map = foldKeymap();
		if (map !== this.keysMap) {
			this.keysMap = map;
			this.keysEpoch = (this.keysEpoch || 0) + 1;
		}
		document.body.classList.toggle(KEYS_BODY_CLASS, on);
		if (!on) {
			this.keysStart = 0;
			return;
		}
		const state = `${peeking}|${zoomed}|${itemName}|${this.keysEpoch}`;
		if (!this.keysItem) {
			this.keysItem = this.ui.addStatusBarItem({ htmlLabel: '' });
			const $el = this.keysItem.getElement();
			if ($el) {
				$el.classList.add('outline-keys');
				// Pinned items don't shrink with the window, so stop the strip
				// where the right-hand items begin; hints that no longer fit wrap
				// onto a clipped second line and drop out whole, from the end.
				const $bar = $el.closest('.statusbar--status-bar');
				const $right = $bar && $bar.querySelector('.statusbar--right');
				if ($right) {
					const fit = () => {
						$el.style.right = `${$right.offsetWidth + 10}px`;
						// What fits changed, so whether More is needed may have too.
						this.renderKeyHints();
					};
					this.keysObserver = new ResizeObserver(fit);
					this.keysObserver.observe($right);
					this.keysObserver.observe($bar);
				}
			}
		}
		if (this.keysState !== state) {
			this.keysState = state;
			this.keysHints = keyHints(peeking, zoomed, itemName);
			this.keysStart = 0;
			this.renderKeyHints();
		}
	}

	/** The hint elements as laid out, or [] when the strip isn't showing. */
	keyHintItems() {
		const $el = this.keysItem && this.keysItem.getElement();
		const $label = $el && $el.querySelector('.statusbar-item--label');
		return $label ? Array.from($label.children) : [];
	}

	/** How many leading items sit on the strip's visible first line. */
	visibleKeyHints() {
		const items = this.keyHintItems();
		if (!items.length) return 0;
		const at = items.findIndex(i => i.offsetTop > items[0].offsetTop);
		return at === -1 ? items.length : at;
	}

	/**
	 * Draw the page of hints starting at `keysStart`. The More hint (the paging
	 * key) leads whenever anything is out of view, and is left off when the
	 * whole set fits without it.
	 */
	renderKeyHints() {
		if (!this.keysItem || !this.keysHints) return;
		const page = this.keysHints.slice(this.keysStart);
		const more = keyLabel(foldKeymap().keys['plugin.outlinehints']);
		this.keysMore = !!more;
		this.keysItem.setHtmlLabel(hintsHtml(more ? [[more, 'More'], ...page] : page));
		if (more && this.keysStart === 0 && this.visibleKeyHints() === page.length + 1) {
			this.keysMore = false;
			this.keysItem.setHtmlLabel(hintsHtml(page));
		}
	}

	/** Show the next page of hints: from the first one out of view, else from the top. */
	pageKeyHints() {
		if (!this.keysHints) return;
		const lead = this.keysMore ? 1 : 0;
		const shown = this.visibleKeyHints() - lead;
		const next = this.keysStart + Math.max(1, shown);
		this.keysStart = shown < this.keyHintItems().length - lead && next < this.keysHints.length ? next : 0;
		this.renderKeyHints();
	}

	/**
	 * Claim every custom view the collection has, rather than one hardcoded id.
	 *
	 * A collection has exactly one plugin, so its custom views can only be
	 * rendered by this code — there is nothing else they could belong to. Binding
	 * to whatever is there means the view id stops being load-bearing: renaming
	 * it, or letting the app's sanitizer rewrite it, can't unhook the view.
	 * `register()` is a Map.set keyed by view id, so calling it per view is fine.
	 *
	 * Views added after load aren't seen until the plugin reloads, which saving
	 * the collection config does anyway.
	 */
	registerOutlineView() {
		const views = (this.getConfiguration().views || [])
			.filter(v => v.type === 'custom');
		for (const view of views) this.registerOn(view.id);
	}

	/**
	 * Hand each view instance Thymer's own records-view object, for its native
	 * peek. Not SDK: the SDK plugin class EXTENDS the app's internal collection
	 * plugin, so `this.customViewHooks` is the very Map `views.register()`
	 * writes into, and the app calls its entries with the internal view
	 * (`customViewHooks.get(id)(view)`, read 2026-11-15). register() drops that
	 * argument before calling our factory, so wrap the entry and park the view
	 * where the factory, which runs synchronously inside it, can pick it up.
	 * Missing or changed internals leave `pendingNativeView` unset, and the view
	 * falls back to the SDK-only peek.
	 */
	captureNativeView(viewId) {
		const hooks = this.customViewHooks;
		const make = hooks instanceof Map ? hooks.get(viewId) : null;
		if (typeof make !== 'function') return;
		hooks.set(viewId, (view) => {
			this.pendingNativeView = view;
			try {
				return make(view);
			} finally {
				this.pendingNativeView = null;
			}
		});
	}

	registerOn(viewId) {
		this.views.register(viewId, (viewContext) => {
			const ui = this.ui;
			const plugin = this;
			/**
			 * The app's records-view object for this instance, when its native peek
			 * is usable (see captureNativeView). Native peek previews in the side
			 * panel without adding history and leaves focus here; Enter commits it
			 * in place and Escape restores what the side panel showed before. None of
			 * the SDK-only peek workarounds below run while this is set.
			 */
			const nativePeek = (() => {
				const view = plugin.pendingNativeView;
				const ok = view && ['startRecordPreview', 'commitRecordPreview',
					'dismissRecordPreview', 'getPeekStatusBarContext']
					.every(name => typeof view[name] === 'function');
				return ok ? view : null;
			})();
			/**
			 * Whether the app's record options menu (the native card's "⋯") can be
			 * shown. Not SDK: `showOptionsDropdown(anchor, guid)` lives on the same
			 * records-view object as native peek, and needs the record in its
			 * `cachedAllItems`. Without it the rows get no button.
			 */
			const canShowOptions = () => !!nativePeek
				&& typeof nativePeek.showOptionsDropdown === 'function';
			const collectionGuid = () => plugin.collection.getGuid();
			// Per VIEW, not per collection: two Outline views over different
			// properties are different trees, so a shared key would have
			// collapsing a row in one collapse an unrelated row in the other.
			const storageKey = `outline-collapsed:${this.getConfiguration().name}:${viewId}`;

			/** guids the user has collapsed; persisted per device */
			let collapsed = new Set();
			try {
				collapsed = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
			} catch (err) {
				collapsed = new Set();
			}
			/**
			 * While search text is on, the nodes that are open — and only
			 * those: it replaces `collapsed` rather than adding to it. Seeded with
			 * every node that has a match below it, so the tree opens down to the
			 * deepest match and no further. Folding by hand edits this set, not the
			 * saved collapse state, so a search never rearranges the normal tree.
			 * Null with no search text, even under a filter.
			 */
			let searchOpen = null;
			/** What `searchOpen` was seeded for, so a refresh mid-search keeps the user's folds. */
			let searchKey = null;
			/**
			 * Rows that are on screen but are not matches: the ancestors put back
			 * to hold a match's place, and records the app's search returned for
			 * something other than their name. Empty when no filter is on. Their
			 * rows are dimmed, so a search reads as its matches.
			 */
			let contextGuids = new Set();

			/**
			 * Whether the app considers this view the focused component, as told
			 * by onFocus/onBlur. The app's focus is its own, not DOM focus: with
			 * the sidebar focused (⌘0), activeElement is still document.body.
			 */
			let viewFocused = false;

			let hierarchy = null;
			/**
			 * The record the view is zoomed into, or null for the whole collection.
			 * Zoomed, only that record and its descendants are listed, and the app's
			 * search narrows within them — "search under this page".
			 */
			let zoomGuid = null;
			/** The last record set onRefresh delivered, so a zoom change can rebuild without one. */
			let lastRecords = null;
			let $zoom = null;
			/** flattened currently-visible nodes, in display order */
			let rows = [];
			let selectedIndex = 0;
			let $root = null;
			let $list = null;
			let $note = null;
			let $menu = null;
			/** id of the side panel opened by Space-to-peek, if any */
			let peekPanelId = null;
			/**
			 * The navigation the peek panel was showing before the peek borrowed it,
			 * or null when this view opened the panel itself. Dismissing restores it.
			 */
			let peekRestoreNav = null;
			/** guid of the record the peek panel was last pointed at */
			let peekedGuid = null;
			/**
			 * Records the current peek has shown. Each one after the first left a
			 * history entry in the peek panel, which is what commitPeek() cleans up.
			 */
			let peekSteps = 0;
			/** E-mode: {guid, index} — the row whose property list is open, and the highlighted field */
			let propMode = null;
			/** guid of a just-created record whose name opens for editing on the next render */
			let pendingNameEditGuid = null;

			// Windowed rendering: only the rows near the viewport exist in the DOM,
			// between two spacers sized from measured (or estimated) row heights.
			/** [start, end) of `rows` currently in the DOM */
			let win = { start: 0, end: 0 };
			/** measured row height by guid; unmeasured rows use rowEstimate */
			const heightCache = new Map();
			let rowEstimate = 30;
			let $topPad = null;
			let $bottomPad = null;
			/** the panel element that scrolls the view, and the target its scroll events fire on */
			let scroller = null;
			let scrollTarget = null;
			let scrollRaf = 0;
			/** visibleFields() for the current render, so window re-renders don't re-read config */
			let renderFields = [];

			// --- collection / view config -------------------------------------

			/** Config is re-read rather than cached: sorting and view edits mutate it. */
			const fieldsById = () => {
				const map = {};
				(plugin.getConfiguration().fields || []).forEach(f => { map[f.id] = f; });
				return map;
			};

			/**
			 * The parent field: sub-pages, or null while the collection has them
			 * off (the rows then list flat, with a note saying why). Read from the
			 * config, the app's own hasSubPages() test, rather than from
			 * hasSubPages(), whose field index lags a config write.
			 */
			const hierarchyFieldId = () => (plugin.getConfiguration().fields || [])
				.some(f => f.id === SUBPAGE && f.active !== false) ? SUBPAGE : null;

			const choiceColorsFor = (field) => {
				const map = {};
				(field.choices || []).forEach(c => {
					map[c.label] = ENUM_COLORS[Number(c.color)] || 'zinc';
				});
				return map;
			};

			/** The panel showing this collection, so peeks open beside the right one. */
			const ownPanel = () => ui.getPanels().find(panel => {
				const nav = panel.getNavigation();
				return nav && nav.type === 'overview' && nav.rootId === collectionGuid();
			}) || null;

			// --- data ----------------------------------------------------------

			/**
			 * The zoom root always shows open, without touching its saved fold,
			 * so zooming out finds it folded or not as it was — as the editor's
			 * zoom does. It can't be folded while zoomed (nor can the editor's).
			 */
			const isExpanded = (node) => node.id === zoomGuid
				|| (searchOpen ? searchOpen.has(node.id) : !collapsed.has(node.id));

			/** Properties the view is configured to show, minus what the row renders itself. */
			const visibleFields = () => {
				const byId = fieldsById();
				return viewContext.getVisiblePropertyIds()
					.map(id => byId[id])
					.filter(field => field
						&& field.id !== 'title'
						&& field.type !== 'datetime'
						&& field.type !== 'banner');
			};

			/** Display value for one property, or null when empty. */
			const propValue = (record, field) => {
				if (field.type === 'choice') {
					const label = record.prop(field.id).choiceLabel();
					if (!label) return null;
					return { text: label, color: choiceColorsFor(field)[label] || 'zinc' };
				}
				if (field.type === 'record') {
					const linked = record.linkedRecord(field.id);
					return linked ? { text: linked.getName(), guid: linked.guid } : null;
				}
				if (field.type === 'number') {
					const num = record.number(field.id);
					return num === null ? null : { text: String(num) };
				}
				const text = record.text(field.id);
				return text ? { text } : null;
			};

			/** Open every node with a match below it, and nothing else. */
			const openToMatches = (matches) => {
				const open = new Set();
				const visit = (node) => {
					const hasMatchBelow = node.children.map(visit).some(Boolean);
					if (hasMatchBelow) open.add(node.id);
					return hasMatchBelow || matches.has(node.id);
				};
				hierarchy.rootNodes.forEach(visit);
				return open;
			};

			/**
			 * Which delivered records are matches. The app's search returns more
			 * than the records whose names match — under sub-pages it brings back
			 * the descendants of a match too — so a match here is a record whose
			 * name holds every word of the query. When none does (a query matching
			 * only body text, or a filter with no search text), every delivered
			 * record counts, which is all the view can say about it.
			 */
			const findMatches = (delivered) => {
				const $input = appSearchInput();
				const words = ($input ? $input.value : '').toLowerCase().split(/\s+/).filter(Boolean);
				if (words.length) {
					const hits = delivered.filter(r => {
						const name = (r.getName() || '').toLowerCase();
						return words.every(w => name.includes(w));
					});
					if (hits.length) return { matches: new Set(hits.map(r => r.guid)), query: words.join(' ') };
				}
				return { matches: new Set(delivered.map(r => r.guid)), query: words.join(' ') };
			};

			const flatten = () => {
				const out = [];
				const visit = (node, depth, parent) => {
					out.push({ node, depth, parent });
					if (isExpanded(node)) {
						node.children.forEach(child => visit(child, depth + 1, node));
					}
				};
				hierarchy.rootNodes.forEach(root => visit(root, 0, null));
				return out;
			};

			const setSelection = (index) => {
				selectedIndex = Math.max(0, Math.min(index, rows.length - 1));
				if (!$list) return;
				ensureRendered(selectedIndex);
				// Selection is a class only. Native cards take no DOM focus (it stays on
				// document.body), so rows don't either: Tab and Shift+Tab then walk the
				// browser's focus order from the same place native's do.
				$list.querySelectorAll('.outline-row').forEach(($row) => {
					$row.classList.toggle('selected', Number($row.dataset.index) === selectedIndex);
				});
				const $selected = $list.querySelector(`.outline-row[data-index="${selectedIndex}"]`);
				if ($selected) $selected.scrollIntoView({ block: 'nearest' });
				// Native peek follows the focused card as you keep browsing — but only
				// while the peek panel is still open. The user may have closed it.
				//
				// Only when the selected record actually changed. setSelection() also
				// runs on every render and on onFocus, and showPeek() itself takes focus
				// back three times — re-peeking from here looped onFocus → showPeek
				// without end, each pass queueing two more timed grabs, and froze the app.
				if (isPeeking() && rows[selectedIndex] && rows[selectedIndex].node.id !== peekedGuid) {
					showPeek();
				}
			};

			const toggle = (node) => {
				if (node.id === zoomGuid) return;
				if (searchOpen) {
					if (searchOpen.has(node.id)) searchOpen.delete(node.id);
					else searchOpen.add(node.id);
				} else {
					if (isExpanded(node)) collapsed.add(node.id);
					else collapsed.delete(node.id);
					localStorage.setItem(storageKey, JSON.stringify([...collapsed]));
				}
				const keepGuid = rows[selectedIndex] ? rows[selectedIndex].node.id : null;
				renderRows();
				const restored = rows.findIndex(r => r.node.id === keepGuid);
				setSelection(restored === -1 ? 0 : restored);
			};

			// --- Thymer's fold and zoom actions --------------------------------
			//
			// Each mirrors the app's editor action of the same name (bundle
			// `ze.prototype` fold methods, read 2026-11-21), with the selected row
			// standing in for the line under the caret and the whole tree (or the
			// zoomed branch) for the page.

			const canFold = (node) => node.children.length > 0;

			/** Fold or unfold each node that has children; a search's folds stay temporary. */
			const setFolded = (nodes, fold) => {
				for (const node of nodes) {
					if (!canFold(node) || node.id === zoomGuid) continue;
					if (searchOpen) {
						if (fold) searchOpen.delete(node.id);
						else searchOpen.add(node.id);
					} else if (fold) collapsed.add(node.id);
					else collapsed.delete(node.id);
				}
				if (!searchOpen) localStorage.setItem(storageKey, JSON.stringify([...collapsed]));
			};

			const nodesUnder = (node) => {
				const out = [];
				const visit = (n) => n.children.forEach(child => { out.push(child); visit(child); });
				visit(node);
				return out;
			};

			/** The app's `ci`: fold, unfold, or toggle a set — toggle folds all if any is open. */
			const foldSet = (nodes, op) => {
				const foldable = nodes.filter(canFold);
				if (!foldable.length) return;
				setFolded(foldable, op === 'toggle' ? foldable.some(isExpanded) : op === 'fold');
			};

			/**
			 * The app's `Jc`, one step of a cascade under `node`. Folding closes
			 * the deepest open level that is showing; unfolding opens the
			 * shallowest-from-the-bottom level that is shut. Repeat to go on.
			 */
			const cascade = (node, op) => {
				const levels = [[node]];
				const walk = (n, depth) => {
					if (!isExpanded(n)) return;
					n.children.forEach(child => {
						(levels[depth + 1] ??= []).push(child);
						walk(child, depth + 1);
					});
				};
				walk(node, 0);
				if (op === 'fold') {
					for (let d = levels.length - 2; d >= 0; d--) {
						const open = levels[d].filter(n => canFold(n) && isExpanded(n));
						if (open.length) return setFolded(open, true);
					}
				} else {
					for (let d = levels.length - 1; d >= 0; d--) {
						const shut = levels[d].filter(n => canFold(n) && !isExpanded(n));
						if (shut.length) return setFolded(shut, false);
					}
				}
			};

			/** Redraw after a fold, keeping `guid` (or the selected row) selected. */
			const refold = (guid) => {
				const keep = guid || (rows[selectedIndex] ? rows[selectedIndex].node.id : null);
				renderRows();
				const restored = rows.findIndex(r => r.node.id === keep);
				setSelection(restored === -1 ? 0 : restored);
			};

			/** Run one of the actions in DEFAULT_KEYS on the selected row. */
			const runAction = (action) => {
				const current = rows[selectedIndex];
				if (!current) return;
				const node = current.node;
				// The tree as a whole: the zoomed branch below its root, or everything.
				const all = () => zoomGuid
					? hierarchy.rootNodes.flatMap(nodesUnder)
					: hierarchy.rootNodes.flatMap(root => [root, ...nodesUnder(root)]);
				const [scope, op] = {
					'nav.togglefold': ['item', 'toggle'],
					'nav.foldchildren': ['children', 'fold'],
					'nav.unfoldchildren': ['children', 'unfold'],
					'nav.togglefoldchildren': ['children', 'toggle'],
					'nav.folddescendants': ['descendants', 'fold'],
					'nav.unfolddescendants': ['descendants', 'unfold'],
					'nav.togglefolddescendants': ['descendants', 'toggle'],
					'nav.foldcontainer': ['all', 'fold'],
					'nav.unfoldcontainer': ['all', 'unfold'],
					'nav.togglefoldcontainer': ['all', 'toggle'],
				}[action] || [];
				if (scope) {
					foldSet({
						item: () => [node],
						children: () => node.children,
						descendants: () => nodesUnder(node),
						all,
					}[scope](), op);
					refold();
					return;
				}
				if (action === 'nav.foldcascade') {
					// A row with nothing open under it passes the fold to its
					// parent, and the selection goes with it. At the top level the
					// app folds every top-level line.
					if (canFold(node) && isExpanded(node)) {
						cascade(node, 'fold');
						refold();
					} else if (current.parent) {
						cascade(current.parent, 'fold');
						refold(current.parent.id);
					} else {
						setFolded(hierarchy.rootNodes.filter(isExpanded), true);
						refold();
					}
					return;
				}
				if (action === 'nav.unfoldcascade') {
					cascade(node, 'unfold');
					refold();
					return;
				}
				if (action === 'plugin.outlinehints') {
					plugin.pageKeyHints();
					return;
				}
				if (action === 'collection.trash_record') {
					// Trash the page and every page under it, then select the next row
					// past them, else the previous one (native picks next, else previous).
					// The subtree is walked over the whole collection, not the rows on
					// screen, so children a search or filter hides go too.
					const gone = new Set([node.id, ...nodesUnder(node).map(n => n.id)]);
					const next = rows.slice(selectedIndex + 1).find(r => !gone.has(r.node.id)) || rows[selectedIndex - 1];
					if (node.id === zoomGuid) {
						const parent = node.record.linkedRecord(hierarchyFieldId());
						zoomTo(parent ? parent.guid : null);
					}
					if (next) {
						followGuid = next.node.id;
						clearTimeout(followTimer);
						followTimer = setTimeout(() => { followGuid = null; }, 3000);
					}
					const fieldId = hierarchyFieldId();
					plugin.collection.getAllRecords().then((records) => {
						const children = new Map();
						for (const r of records) {
							const parent = r.linkedRecord(fieldId);
							if (!parent) continue;
							if (!children.has(parent.guid)) children.set(parent.guid, []);
							children.get(parent.guid).push(r);
						}
						// `seen` stops a cycle looping (see buildHierarchy for how one can exist).
						const subtree = [node.record];
						const seen = new Set([node.id]);
						for (let i = 0; i < subtree.length; i++) {
							for (const c of children.get(subtree[i].guid) || []) {
								if (!seen.has(c.guid)) { seen.add(c.guid); subtree.push(c); }
							}
						}
						// Deepest first, so no page is ever left under a trashed parent.
						subtree.reverse().forEach(r => r.trash());
						afterWrite();
					});
					return;
				}
				if (action === 'panel.zoom_in') {
					zoomTo(node.id);
				} else if (action === 'panel.zoom_out' && zoomGuid) {
					const zoomed = hierarchy && hierarchy.nodes.get(zoomGuid);
					const parent = zoomed ? zoomed.record.linkedRecord(hierarchyFieldId()) : null;
					const from = zoomGuid;
					zoomTo(parent ? parent.guid : null);
					const back = rows.findIndex(r => r.node.id === from);
					if (back !== -1) setSelection(back);
				}
			};

			/**
			 * Fold, zoom and trash keys are taken before the app sees them: its window
			 * handler runs the zoom actions itself (opening the record in place of
			 * the view), so the view's own key hook would never get them.
			 */
			const onShortcutKey = (e) => {
				if (!viewFocused || !$root || $menu || propMode || !rows.length) return;
				const $focused = document.activeElement;
				if ($focused && $focused !== document.body && !$root.contains($focused)) return;
				if ($focused && $focused.classList && $focused.classList.contains('outline-inline-input')) return;
				const action = foldKeymap().byKey.get(eventKeyName(e));
				if (!action) return;
				e.preventDefault();
				e.stopImmediatePropagation();
				runAction(action);
			};

			/**
			 * Rows are laid out single-line; any whose name had to ellipsise to make
			 * room for its chips is stacked onto two lines instead. Always resets to
			 * the single-line baseline first, otherwise a stacked row measures as
			 * fitting and would oscillate. Reads and writes are batched to keep this
			 * to one forced layout.
			 *
			 * Stacking MOVES the chips out of the title line rather than wrapping it.
			 * Wrapping let the name take the full width and pushed the timestamp onto
			 * a line of its own — a three-line row, where native ellipsises the name
			 * and keeps the stamp on line 1. A one-line flex container can't wrap, so
			 * the name has no choice but to shrink.
			 */
			const restack = () => {
				if (!$list) return;
				const $rows = Array.from($list.querySelectorAll('.outline-row'));
				$rows.forEach($r => {
					const $props = $r.querySelector('.outline-props');
					const $title = $r.querySelector('.outline-title');
					if ($props && $title && $props.parentElement !== $title) {
						$title.insertBefore($props, $r.querySelector('.outline-time'));
					}
					$r.classList.remove('is-stacked');
				});
				const needsStacking = $rows.map($r => {
					const $name = $r.querySelector('.outline-name');
					if (!$name || !$r.querySelector('.outline-props')) return false;
					return $name.scrollWidth > $name.clientWidth + 1;
				});
				$rows.forEach(($r, i) => {
					if (!needsStacking[i]) return;
					$r.classList.add('is-stacked');
					const $props = $r.querySelector('.outline-props');
					$props.style.paddingLeft = `${Number($r.dataset.indent) + TWISTY_W + ROW_GAP}px`;
					// Before the property list, when E has one open — chips belong to
					// the row above it, not below it.
					$r.insertBefore($props, $r.querySelector('.outline-propedit'));
				});
			};

			/**
			 * Step the selection, wrapping at the ends. The app's getNextCardGuid()
			 * does the same: an out-of-range index falls through to
			 * `(r % len + len) % len`. (Only the very first row is special-cased,
			 * and its ArrowUp goes to the search box instead of wrapping.)
			 */
			const selectNext = (delta) => {
				if (!rows.length) return;
				setSelection((selectedIndex + delta + rows.length) % rows.length);
			};

			const openSelected = (otherPanel) => {
				const current = rows[selectedIndex];
				if (!current) return;
				if (otherPanel) viewContext.openRecordInOtherPanel(current.node.id);
				else viewContext.openRecordInThisPanel(current.node.id);
			};

			// --- peek ------------------------------------------------------------

			/**
			 * Space-to-peek: open the focused record in the side panel, and let a
			 * second Space close that panel again. The app calls this a navigation
			 * preview; while it is up, arrows keep browsing and the side panel follows.
			 */

			/**
			 * Take DOM focus off whatever holds it (a menu, an inline input, the
			 * peeked aside's editor) so key hooks fire here again. Focus is left on
			 * document.body, where native leaves it, not on the view root: the root
			 * precedes the toolbar in document order, so Shift+Tab from it walked
			 * out of the view to the panel's breadcrumb.
			 */
			const focusView = () => {
				const $focused = document.activeElement;
				if ($focused instanceof HTMLElement && $focused !== document.body) $focused.blur();
			};

			/**
			 * The app's own view chrome — the toolbar and the search row it now gives
			 * a custom view. Both live in `.custom-view`, above the node this view
			 * draws into, so they are reachable from the view root.
			 *
			 * Focusing them is a read of the app's markup, not a write: nothing here
			 * creates, removes or rewrites an app node. It is still the app's DOM, so
			 * every lookup is a fresh query that fails quietly — a renamed class costs
			 * one key its effect, nothing more.
			 */
			const appChrome = () => ($root && $root.closest('.custom-view')) || null;

			/** The app's collection search box, or null if the markup moved. */
			const appSearchInput = () => {
				const $chrome = appChrome();
				return ($chrome && $chrome.querySelector('.records-view-query-wrap input')) || null;
			};

			/**
			 * Hand focus up to the app's search box, which is where native sends ↑
			 * from the first row. Its own key handling takes over from there: ↑ again
			 * goes to the active view tab, and ↑ from the tab to the page title.
			 */
			const focusAppSearch = () => {
				const $input = appSearchInput();
				if (!$input) return false;
				$input.focus();
				return true;
			};

			/**
			 * Whether a peek is up. Native: the app's own test (its peek status-bar
			 * context exists only while the panel previews), so a peek the user
			 * dismissed from the side panel itself reads as gone. SDK-only: the
			 * stored panel, dropped once the user has closed it.
			 */
			const isPeeking = () => {
				if (nativePeek) {
					try {
						return !!nativePeek.getPeekStatusBarContext();
					} catch (err) {
						return false;
					}
				}
				if (peekPanelId && !peekPanel()) peekPanelId = null;
				return !!peekPanelId;
			};

			/**
			 * The app shows peek hints only for its own views: the status bar asks
			 * the focused component for them through a minified method, which the
			 * custom-view host doesn't implement. So our strip switches to the peek
			 * set itself. A peek can end from the side panel too, with no event this
			 * view hears, so poll while focused — it's one cheap call.
			 */
			let hintTimer = null;
			const syncKeyHints = () => {
				if (viewFocused) plugin.showKeyHints(true, isPeeking(), !!zoomGuid, viewContext.getRecordTypeName());
			};
			const stopHintTimer = () => {
				if (hintTimer) clearInterval(hintTimer);
				hintTimer = null;
			};

			/** The peek panel, re-resolved each time — panel objects don't outlive much. */
			const peekPanel = () => {
				if (!peekPanelId) return null;
				return ui.getPanels().find(p => p.getId() === peekPanelId) || null;
			};

			/**
			 * Dismiss the peek. A panel this view opened is closed; a panel that was
			 * already there when the peek started is put back on whatever it was
			 * showing. Native peek is a preview layered over the panel's existing
			 * navigation, so dismissing it restores that navigation — closing the
			 * panel instead would throw away something the user had open.
			 */
			const hidePeek = () => {
				if (nativePeek) {
					if (isPeeking()) nativePeek.dismissRecordPreview();
					return;
				}
				const panel = peekPanel();
				const restore = peekRestoreNav;
				peekPanelId = null;
				peekRestoreNav = null;
				if (!panel) return;
				if (restore) {
					panel.navigateTo(restore);
					const self = ownPanel();
					if (self) ui.setActivePanel(self);
					focusView();
				} else {
					ui.closePanel(panel);
				}
			};

			/**
			 * Native's commit: the previewed panel stops being a preview and becomes
			 * the real navigation, focus included.
			 *
			 * Native peek replaces the panel's navigation on every step, so committing
			 * leaves one history entry and Cmd+[ closes the panel. Nothing in the SDK
			 * replaces a navigation — `navigateTo` takes no replace flag and forwards
			 * only the navigation object — so every arrow-key step here has pushed an
			 * entry, and Cmd+[ would walk back through every record peeked at before
			 * closing. Commit by throwing the panel away and opening a fresh one on
			 * the final record, which starts its history over.
			 */
			const commitPeek = () => {
				if (nativePeek) {
					nativePeek.commitRecordPreview();
					return;
				}
				const current = rows[selectedIndex];
				const panel = peekPanel();
				const borrowed = !!peekRestoreNav;
				peekPanelId = null;
				peekRestoreNav = null;
				// A panel that was already open is kept as it stands: the record is
				// already in it, and closing it to tidy up its history would destroy a
				// panel the user opened themselves. Its history keeps an entry per
				// record peeked at, which is the same limitation described below.
				if (borrowed) {
					if (panel) ui.setActivePanel(panel);
					return;
				}
				// A peek that showed only one record left no history to clean up: the
				// panel it opened started empty, and the app pushes no history entry
				// when navigating away from an empty panel (`_navigateTo`:
				// `state.view.type == Empty && (t = true)`, read 2026-11-15). Keep the
				// panel, which avoids the close-and-reopen blink in the common case.
				if (peekSteps <= 1) {
					if (panel) ui.setActivePanel(panel);
					return;
				}
				// Still required as of 1.0.18 / 2026-08-01: without this, ⌘[ after a
				// commit walks back through every record the peek passed over.
				if (panel) ui.closePanel(panel);
				// closePanel() only starts a 150ms zoomOut animation and removes the
				// panel on a timer afterwards, so it is still in the layout and still
				// the target for an "other panel" open until then. Reopen after it is
				// really gone, or the fresh navigation goes down with it.
				// Opening aside focuses the new panel, which is what a commit wants.
				if (current) {
					setTimeout(() => viewContext.openRecordInOtherPanel(current.node.id), 220);
				}
			};

			const showPeek = () => {
				const current = rows[selectedIndex];
				if (!current) return;
				if (nativePeek) {
					peekedGuid = current.node.id;
					nativePeek.startRecordPreview(current.node.id);
					return;
				}
				const self = ownPanel();
				const before = new Set(ui.getPanels().map(p => p.getId()));
				// Read the panel the peek is about to take over BEFORE taking it over.
				// `openRecordInOtherPanel()` reuses an existing side panel when there
				// is one, and by the time the open returns its previous navigation is
				// gone. Only on the first Space: the follow-the-selection path calls
				// this again on every arrow, and must not overwrite what it captured.
				if (!peekPanelId) {
					const borrowed = ui.getPanels().find(p => !p.isSidebar()
						&& (!self || p.getId() !== self.getId()));
					peekRestoreNav = borrowed ? borrowed.getNavigation() : null;
					peekSteps = 0;
				}
				// Re-peeking the record already shown is a no-op navigation (the app
				// skips a navigation equal to the current one) and adds no history.
				if (!peekPanelId || peekedGuid !== current.node.id) peekSteps++;
				peekedGuid = current.node.id;
				viewContext.openRecordInOtherPanel(current.node.id);
				// Opening aside hands focus to that panel's editor. The app only calls
				// a custom view's onKeyboardNavigation when its own component has focus
				// (`onKeyDown(e){ let t=Ze(); t && (t==this._() || t==this) &&
				// this.onKeyboardNavigation(e) }`), and the editor swallows Space as
				// text besides. Native peek keeps the list focused, so take focus back.
				// The aside renders asynchronously and focuses its editor afterwards,
				// so a synchronous grab alone loses the race — re-assert once the
				// panel has painted.
				const takeFocusBack = () => {
					if (self) ui.setActivePanel(self);
					focusView();
				};
				// Still required as of 1.0.18 / 2026-08-01: with only the synchronous
				// grab the aside's editor keeps the keyboard.
				takeFocusBack();
				requestAnimationFrame(takeFocusBack);
				setTimeout(takeFocusBack, 120);
				if (peekPanelId) return;
				// Whichever panel is new is the peek; if the app reused an existing one,
				// take the other non-sidebar panel.
				const panels = ui.getPanels().filter(p => !p.isSidebar());
				const opened = panels.find(p => !before.has(p.getId()))
					|| panels.find(p => !self || p.getId() !== self.getId());
				peekPanelId = opened ? opened.getId() : null;
			};

			/**
			 * Space peeks; a SECOND Space does not dismiss. Native dropped the toggle
			 * — Escape is the way out now — so pressing it again just re-peeks the
			 * focused row, which is what arrowing through a peek already does.
			 */
			const peekSelected = () => showPeek();

			/**
			 * Row geometry, in one place: a row is [pad][twisty][gap][icon...], and
			 * the create card's + has to land on the same x as those row icons.
			 * TWISTY_W / ROW_GAP mirror .outline-twisty width and .outline-title gap.
			 */
			const ROW_PAD_X = 8;
			const TWISTY_W = 16;
			const ROW_GAP = 6;
			const DEPTH_STEP = 20;
			const ICON_OFFSET = ROW_PAD_X + TWISTY_W + ROW_GAP;

			/**
			 * Native drops a new card into the list with its title in edit mode
			 * rather than navigating away, so this does the same: createRecord()
			 * fires onRefresh, and renderRows() picks the guid up from here.
			 */
			const createRecord = () => {
				const guid = viewContext.createRecord();
				if (!guid) return;
				pendingNameEditGuid = guid;
				// If the refresh already ran (or never comes), render once more so the
				// guid above is picked up rather than sitting there forever.
				setTimeout(() => { if (pendingNameEditGuid) renderRows(); }, 150);
			};

			// --- menus -----------------------------------------------------------

			/**
			 * Dismisses the open menu on any click outside it, like the app's own
			 * dropdowns. Registered on the document because clicks land all over the
			 * panel, not just inside the view root.
			 */
			const onDocumentClick = (e) => {
				if ($menu && !$menu.contains(e.target)) closeMenu();
			};

			const closeMenu = () => {
				if ($menu) {
					$menu.remove();
					$menu = null;
					document.removeEventListener('click', onDocumentClick, true);
				}
			};

			/**
			 * items: [{label, icon, active, onSelect}], positioned at viewport (x, y).
			 * Appended to the view root rather than to the trigger: the tab row copies
			 * native's overflow:hidden, which would clip a menu nested inside it.
			 *
			 * Keys follow the app's own dropdown: ↑/↓ move the highlight and wrap,
			 * Enter confirms, Escape closes, Tab does nothing. `active` marks the
			 * current value, which is separate from the keyboard highlight — the app
			 * draws them as `autocomplete--current` and `autocomplete--option-selected`.
			 */
			const showMenu = (items, x, y, filterPlaceholder) => {
				closeMenu();
				if (!$root) return;
				$menu = document.createElement('div');
				$menu.className = 'outline-menu';

				const $items = document.createElement('div');
				let $filter = null;
				/** items surviving the filter, and the highlighted one within them */
				let shown = items;
				let cursor = 0;

				const confirm = (index) => {
					const item = shown[index];
					if (!item) return;
					closeMenu();
					item.onSelect();
				};

				const move = (delta) => {
					if (!shown.length) return;
					cursor = (cursor + delta + shown.length) % shown.length;
					paint();
					const $sel = $items.querySelector('.is-selected');
					if ($sel) $sel.scrollIntoView({ block: 'nearest' });
				};

				const paint = () => {
					const needle = $filter ? $filter.value.trim().toLowerCase() : '';
					shown = items.filter(item => !needle || item.label.toLowerCase().includes(needle));
					if (cursor >= shown.length) cursor = 0;
					$items.innerHTML = '';
					shown.forEach((item, index) => {
						const $item = document.createElement('div');
						$item.className = 'outline-menu-item';
						if (item.active) $item.classList.add('is-active');
						if (index === cursor) $item.classList.add('is-selected');
						$item.appendChild(ui.createIcon(item.icon || 'ti-align-left'));
						const $label = document.createElement('span');
						$label.textContent = item.label;
						$item.appendChild($label);
						$item.addEventListener('click', (e) => {
							e.stopPropagation();
							confirm(index);
						});
						$items.appendChild($item);
					});
				};

				const onMenuKeyDown = (e) => {
					e.stopPropagation();
					switch (e.key) {
						case 'ArrowDown': e.preventDefault(); move(1); break;
						case 'ArrowUp': e.preventDefault(); move(-1); break;
						case 'Enter': e.preventDefault(); confirm(cursor); break;
						case 'Escape': e.preventDefault(); closeMenu(); break;
						case 'Tab': e.preventDefault(); break;
					}
				};
				$menu.addEventListener('keydown', onMenuKeyDown);

				if (filterPlaceholder) {
					$menu.classList.add('has-filter');
					$filter = document.createElement('input');
					$filter.type = 'text';
					$filter.spellcheck = false;
					$filter.className = 'form-input outline-menu-filter';
					$filter.placeholder = filterPlaceholder;
					$filter.addEventListener('input', () => { cursor = 0; paint(); });
					$filter.addEventListener('click', e => e.stopPropagation());
					$menu.appendChild($filter);
				}

				$menu.appendChild($items);
				paint();
				$root.appendChild($menu);
				// Clamp to the root's box: a menu opened near the right edge would
				// otherwise widen the panel's scroll area and shove the view sideways.
				const rootRect = $root.getBoundingClientRect();
				const menuW = $menu.offsetWidth;
				const left = Math.max(0, Math.min(x - rootRect.left, rootRect.width - menuW));
				$menu.style.left = `${left}px`;
				$menu.style.top = `${y - rootRect.top}px`;
				// Capture, so a click on the trigger closes this menu before the
				// trigger's own handler opens a fresh one — clicking the button again
				// re-renders rather than toggling off.
				document.addEventListener('click', onDocumentClick, true);
				// Something inside the menu must hold focus, or its keydown never fires.
				if ($filter) {
					$filter.focus();
				} else {
					$menu.tabIndex = -1;
					$menu.focus();
				}
			};

			/** Whether `record` is the zoom root or sits anywhere under it. */
			const inZoom = (record, parentFieldId) => {
				for (let r = record, d = 0; r && d < 100; r = r.linkedRecord(parentFieldId), d++) {
					if (r.guid === zoomGuid) return true;
				}
				return false;
			};

			const rebuild = () => {
				if (!lastRecords) return;
				const parentFieldId = hierarchyFieldId();
				if (zoomGuid && !parentFieldId) zoomGuid = null;
				const scoped = zoomGuid ? lastRecords.filter(r => inZoom(r, parentFieldId)) : lastRecords;
				// The app hands over the matches alone once its search or a filter
				// is on; the tree needs the path down to each of them back.
				const completed = withAncestors(scoped, parentFieldId);
				if (zoomGuid) {
					// ...but only down from the zoom root, never above it.
					completed.records = completed.records.filter(r => inZoom(r, parentFieldId));
					completed.added = new Set([...completed.added].filter(g => completed.records.some(r => r.guid === g)));
				}
				hierarchy = buildHierarchy(completed.records, parentFieldId);
				const { matches, query } = findMatches(scoped);
				// Ancestors put back mean the app narrowed the set, so they are
				// dimmed as context. But only search text swaps the saved folds
				// for search folds: a view's saved filter (say, one kind of page
				// whose parents are another kind) narrows the set for good, and
				// treating that as a search left the view fully unfolded on every
				// visit with no fold ever saved.
				contextGuids = completed.added.size || query
					? new Set(completed.records.map(r => r.guid).filter(g => !matches.has(g)))
					: new Set();
				if (query) {
					const key = `${zoomGuid}|${query}|${[...matches].sort().join(',')}`;
					if (key !== searchKey || !searchOpen) {
						searchOpen = openToMatches(matches);
						searchKey = key;
					}
				} else {
					searchOpen = null;
					searchKey = null;
				}
				if (!$list) mount();
				renderNote();
				renderZoomBar();
				renderRows();
			};

			const zoomTo = (guid) => {
				zoomGuid = guid || null;
				selectedIndex = 0;
				rebuild();
				if (rows.length) setSelection(0);
				syncKeyHints();
			};

			/**
			 * The global plugin ("Outline: Show this page") opens this view
			 * zoomed by leaving {collection, guid, at} on <html> just before
			 * navigating here. Taken once, and only while fresh, so a stale request
			 * can't re-zoom a later visit.
			 */
			const takeZoomHandoff = () => {
				const raw = document.documentElement.dataset.outlineZoom;
				if (!raw) return;
				let req = null;
				try { req = JSON.parse(raw); } catch (err) { req = null; }
				if (!req || req.collection !== collectionGuid()) return;
				delete document.documentElement.dataset.outlineZoom;
				if (Date.now() - (req.at || 0) > 10000) return;
				zoomGuid = req.guid || null;
				selectedIndex = 0;
			};

			/** "Root › … › Zoomed" above the rows, each step re-zooming; × shows everything. */
			const renderZoomBar = () => {
				if (!$zoom) return;
				$zoom.innerHTML = '';
				if (!zoomGuid) return;
				const parentFieldId = hierarchyFieldId();
				// Not from the delivered set: a search with no hits under the root
				// still has to say what the view is zoomed into.
				const target = plugin.data.getRecord(zoomGuid);
				if (!target) return;
				const chain = [target];
				for (let p = target.linkedRecord(parentFieldId), d = 0; p && d < 100; p = p.linkedRecord(parentFieldId), d++) {
					chain.unshift(p);
				}
				const $all = document.createElement('button');
				$all.type = 'button';
				$all.className = 'button-minimal button-small outline-zoom-step';
				$all.textContent = 'All';
				$all.title = 'Show the whole collection';
				$all.addEventListener('click', () => zoomTo(null));
				$zoom.appendChild($all);
				chain.forEach((record, i) => {
					const $sep = document.createElement('span');
					$sep.className = 'outline-zoom-sep ti ti-chevron-right';
					const $step = document.createElement('button');
					$step.type = 'button';
					$step.className = 'button-minimal button-small outline-zoom-step'
						+ (i === chain.length - 1 ? ' is-current' : '');
					const $label = document.createElement('span');
					$label.textContent = record.getName() || 'Untitled';
					$step.appendChild($label);
					$step.title = record.getName() || '';
					$step.addEventListener('click', () => zoomTo(record.guid));
					$zoom.append($sep, $step);
				});
			};

			/** With sub-pages off there is no tree, and the flat rows say why. */
			const renderNote = () => {
				if (!$note) return;
				$note.textContent = hierarchyFieldId() ? ''
					: 'Sub-pages are off in this collection, so rows are flat. '
						+ 'Run "Outline: install into a collection..." to turn them on.';
			};

			// --- inline editing --------------------------------------------------

			/**
			 * The fields E-mode walks: Title first (native puts the title at the top
			 * of a card's property list too), then the properties the row already
			 * shows as chips, minus the types there is no editor for.
			 *
			 * "Sub-page of" is deliberately NOT skipped: re-hanging a branch is the
			 * edit an outline is for.
			 */
			const EDITABLE_TYPES = ['text', 'number', 'choice', 'record'];
			const EDIT_SKIP_IDS = ['title', 'icon', 'collection'];
			const editableFields = () => {
				const canEdit = f => f && f.active !== false && !f.read_only
					&& EDITABLE_TYPES.includes(f.type) && !EDIT_SKIP_IDS.includes(f.id);
				// The fields the row already shows come first, then everything else
				// the collection has. Native property mode walks only the card's shown
				// properties; going wider is what puts "Sub-page of" in reach, since
				// it is usually not one of the row's chips.
				const shown = visibleFields().filter(canEdit);
				const rest = (plugin.getConfiguration().fields || [])
					.filter(f => canEdit(f) && !shown.some(s => s.id === f.id));
				const title = fieldsById()['title'];
				return title ? [title, ...shown, ...rest] : [...shown, ...rest];
			};

			/** Title is a field like any other here, but its value comes off the record. */
			const fieldText = (record, field) => {
				if (field.id === 'title') return record.getName() || '';
				const value = propValue(record, field);
				return value ? value.text : '';
			};

			/**
			 * A write is not readable in the same tick, and the refresh that follows
			 * arrives on its own schedule — re-render once it has landed.
			 */
			const afterWrite = () => setTimeout(() => renderRows(), 60);

			// --- Rearranging from the keyboard -----------------------------------
			//
			// Tab / Shift+Tab / ⌘⇧↑ / ⌘⇧↓ indent, outdent and move the selected row
			// the way the editor does with lines. A row's place is two properties:
			// its parent (the view's hierarchy field) and its position among its
			// siblings (the number property the view is sorted by). Each key writes
			// the parent, the position, or both.

			/**
			 * Writes from moves that the delivered records don't show yet: guid →
			 * { parent?, order? }. A write is not readable in the same tick, so a
			 * second key pressed before the refresh reads positions from here. And
			 * the refreshes that follow a move arrive while only some of its writes
			 * have landed: drawing those put the row back where it was, then
			 * forward again. So while this holds anything, a refresh is drawn only
			 * once it shows every write (or the wait runs out).
			 */
			const pending = new Map();
			let settleTimer = 0;
			const SETTLE_MS = 3000;
			const notePending = (guid, key, value) => {
				pending.set(guid, { ...pending.get(guid), [key]: value });
				clearTimeout(settleTimer);
				settleTimer = setTimeout(() => { pending.clear(); rebuild(); }, SETTLE_MS);
			};
			/** Whether `records` show every pending write; clears them if so. */
			const settled = (records) => {
				const byGuid = new Map(records.map(r => [r.guid, r]));
				const fieldId = hierarchyFieldId();
				const ord = orderField();
				for (const [guid, p] of pending) {
					const record = byGuid.get(guid);
					if (!record) continue;
					if ('parent' in p) {
						const linked = fieldId ? record.linkedRecord(fieldId) : null;
						if ((linked ? linked.guid : null) !== p.parent) return false;
					}
					if ('order' in p && ord && record.prop(ord.id).number() !== p.order) return false;
				}
				pending.clear();
				clearTimeout(settleTimer);
				return true;
			};
			/** The row to keep selected across the renders that follow a move. */
			let followGuid = null;
			let followTimer = 0;

			const toast = (title, message) => ui.addToaster({ title, message, dismissible: true, autoDestroyTime: 4000 });

			/** The view's sort when it is a writable number property: where sibling order lives. */
			const orderField = () => {
				const view = (plugin.getConfiguration().views || []).find(v => v.id === viewId);
				const field = view ? fieldsById()[view.sort_field_id] : null;
				if (!field || field.type !== 'number' || field.read_only || field.active === false) return null;
				return { id: field.id, label: field.label, dir: view.sort_dir === 'desc' ? -1 : 1 };
			};

			const orderOf = (node, ord) => {
				const p = pending.get(node.id);
				if (p && 'order' in p) return p.order;
				return node.record.prop(ord.id).number();
			};

			/** The node's parent in the tree as drawn (a cycle-promoted root has none; see buildHierarchy). */
			const parentOf = (node) => {
				const parent = node.parentGuid ? hierarchy.nodes.get(node.parentGuid) : null;
				return parent && parent.children.includes(node) ? parent : null;
			};
			const childList = (parent) => parent ? parent.children : hierarchy.rootNodes;

			/**
			 * Whether the rows arrived in the order the property says. The toolbar
			 * can sort by something else for the session without touching the
			 * config, and writing positions the screen doesn't follow would look
			 * like the key did nothing.
			 */
			const followsOrder = (list, ord) => {
				let last = null;
				for (const n of list) {
					const v = orderOf(n, ord);
					if (v === null) continue;
					if (last !== null && ord.dir * (v - last) < 0) return false;
					last = v;
				}
				return true;
			};

			/**
			 * The position writes that put `node` at `index` of `kids` (which does
			 * not contain it): the siblings renumbered 1, 2, 3… in their new order,
			 * writing only the values that change. The list it left keeps its
			 * order with a gap, which needs no write.
			 */
			const positionWrites = (node, kids, index, ord) => {
				const list = [...kids];
				list.splice(index, 0, node);
				const n = list.length;
				return list
					.map((m, i) => ({ node: m, value: ord.dir > 0 ? i + 1 : n - i }))
					.filter(({ node: m, value }) => orderOf(m, ord) !== value);
			};

			const writeParent = (node, parent) => node.record.setSubPageOf(parent ? parent.id : null) !== false;

			/** `op` is 'indent', 'outdent', 'up' or 'down', applied to the selected row. */
			const rearrange = (op) => {
				const current = rows[selectedIndex];
				if (!current || !hierarchy || !hierarchyFieldId()) return;
				const node = current.node;
				// With search text or a filter on, a level shows only some of its
				// pages, so "the row above" may not be the page above.
				if (contextGuids.size || searchOpen) {
					toast('Clear the search to rearrange', 'With a search or filter on, the outline shows only part of each level.');
					return;
				}
				// The zoom root's siblings aren't on screen, and nothing may leave it.
				if (node.id === zoomGuid) return;

				const parent = parentOf(node);
				const siblings = childList(parent);
				const at = siblings.indexOf(node);
				let target = parent;
				let index;
				if (op === 'indent') {
					if (at <= 0) return;
					target = siblings[at - 1];
					index = target.children.length;
				} else if (op === 'outdent') {
					if (!parent || parent.id === zoomGuid) return;
					target = parentOf(parent);
					index = childList(target).indexOf(parent) + 1;
				} else {
					index = at + (op === 'down' ? 1 : -1);
					if (index < 0 || index >= siblings.length) return;
				}

				const ord = orderField();
				if (!ord && (op === 'up' || op === 'down')) {
					toast('Sort by a number property to reorder', 'Sibling order is stored in the number property the view is sorted by.');
					return;
				}
				const kids = childList(target).filter(n => n !== node);
				if (ord && !(followsOrder(siblings, ord) && followsOrder(kids, ord))) {
					toast(`Sort by ${ord.label} to rearrange`, `The rows aren't in ${ord.label} order, so a new position wouldn't show.`);
					return;
				}
				const writes = ord ? positionWrites(node, kids, index, ord) : [];

				if (target !== parent) {
					if (!writeParent(node, target)) {
						toast("Couldn't move the page", 'The app refused the new parent.');
						return;
					}
					notePending(node.id, 'parent', target ? target.id : null);
				}
				writes.forEach(({ node: n, value }) => {
					n.record.prop(ord.id).set(value);
					notePending(n.id, 'order', value);
				});

				// Shown at once rather than after the refresh, so a second key
				// press works from the new place.
				const from = childList(parent);
				from.splice(from.indexOf(node), 1);
				childList(target).splice(index, 0, node);
				node.parentGuid = target ? target.id : null;
				if (target && collapsed.has(target.id)) {
					collapsed.delete(target.id);
					localStorage.setItem(storageKey, JSON.stringify([...collapsed]));
				}
				followGuid = node.id;
				clearTimeout(followTimer);
				followTimer = setTimeout(() => { followGuid = null; }, 3000);
				renderRows();
			};

			/**
			 * Swap an element for a text input. Enter and blur commit, Escape cancels.
			 * The input stops its own keys from bubbling: the view's key hook would
			 * otherwise read them as row navigation while the caret sits here.
			 */
			const editText = ($cell, value, { onCommit, onCancel }) => {
				const $input = document.createElement('input');
				$input.type = 'text';
				$input.className = 'outline-inline-input';
				$input.value = value || '';
				let done = false;
				const finish = (commit) => {
					if (done) return;
					done = true;
					if (commit) onCommit($input.value.trim());
					else if (onCancel) onCancel();
				};
				$input.addEventListener('keydown', (e) => {
					e.stopPropagation();
					if (e.key === 'Enter') { e.preventDefault(); finish(true); }
					else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
				});
				$input.addEventListener('blur', () => finish(true));
				$input.addEventListener('mouseup', e => e.stopPropagation());
				$cell.replaceWith($input);
				$input.focus();
				$input.select();
			};

			/**
			 * Edit a row's name in place. `isNew` marks a row that came from the
			 * create button: leaving it without a name discards the record, the way
			 * native cancels an untouched new card.
			 */
			const startNameEdit = (node, isNew) => {
				if (!$list) return;
				const $row = $list.querySelector(`.outline-row[data-guid="${node.id}"]`);
				const $name = $row && $row.querySelector('.outline-name');
				if (!$name) return;
				const discardIfEmpty = (text) => {
					if (isNew && !text) {
						node.record.trash();
						return true;
					}
					return false;
				};
				editText($name, node.record.getName(), {
					onCommit: (text) => {
						if (!discardIfEmpty(text)) node.record.prop('title').set(text);
						focusView();
						afterWrite();
					},
					onCancel: () => {
						discardIfEmpty('');
						focusView();
						afterWrite();
					},
				});
			};

			/** Descendants of a node, so the Sub-page of picker can't offer a cycle. */
			const descendantsOf = (node) => {
				const out = new Set();
				const visit = n => n.children.forEach(child => {
					out.add(child.id);
					visit(child);
				});
				visit(node);
				return out;
			};

			/**
			 * Candidates for a record-link field. A field pointing back at this
			 * collection (`filter_colguid`) is answered from the records already
			 * loaded; anything else has to be fetched from that collection. For
			 * sub-pages the row's own subtree is left out: it would make a cycle,
			 * which setSubPageOf() refuses.
			 */
			const recordCandidates = async (field, node) => {
				if (!field.filter_colguid || field.filter_colguid === collectionGuid()) {
					const banned = field.id === SUBPAGE ? descendantsOf(node) : new Set();
					return [...hierarchy.nodes.values()]
						.filter(n => n.id !== node.id && !banned.has(n.id))
						.map(n => ({ guid: n.id, name: n.name }));
				}
				const other = plugin.data.getPluginByGuid(field.filter_colguid);
				if (!other || !other.getAllRecords) return [];
				const records = await other.getAllRecords();
				return records.map(r => ({ guid: r.guid, name: r.getName() || 'Unknown' }));
			};

			/** Open the editor for one field of one row, anchored at its value cell. */
			const editField = (node, field, $cell) => {
				const record = node.record;
				const prop = () => record.prop(field.id);

				if (field.id === 'title' || field.type === 'text' || field.type === 'number') {
					editText($cell, fieldText(record, field), {
						onCommit: (text) => {
							if (field.type === 'number') {
								prop().set(text === '' ? null : Number(text));
							} else {
								prop().set(text);
							}
							focusView();
							afterWrite();
						},
						onCancel: () => { focusView(); renderRows(); },
					});
					return;
				}

				const rect = $cell.getBoundingClientRect();
				const icon = field.icon || 'ti-align-left';

				if (field.type === 'choice') {
					const current = prop().choiceLabel();
					const items = (field.choices || [])
						.filter(c => c.active !== false)
						.map(c => ({
							label: c.label,
							icon: c.icon || icon,
							active: c.label === current,
							onSelect: () => { prop().setChoice(c.label); focusView(); afterWrite(); },
						}));
					items.push({
						label: 'Clear', icon: 'ti-x',
						onSelect: () => { prop().set(null); focusView(); afterWrite(); },
					});
					showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);
					return;
				}

				if (field.type === 'record') {
					const linked = record.linkedRecord(field.id);
					// The sub-page link is written through its own setter, which is
					// where the app's cycle and same-collection checks live. Every
					// other record field is a plain property write.
					const link = (guid) => {
						if (field.id === SUBPAGE) record.setSubPageOf(guid);
						else prop().set(guid);
					};
					recordCandidates(field, node).then(candidates => {
						if (viewContext.isDestroyed()) return;
						const items = [{
							label: 'None', icon: 'ti-x',
							active: !linked,
							onSelect: () => { link(null); focusView(); afterWrite(); },
						}];
						candidates.forEach(c => items.push({
							label: c.name,
							icon,
							active: linked && linked.guid === c.guid,
							onSelect: () => { link(c.guid); focusView(); afterWrite(); },
						}));
						showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);
					});
				}
			};

			/** Start editing the selected field of the row E-mode is open on. */
			const editSelectedField = () => {
				if (!propMode || !$list) return;
				const $row = $list.querySelector(`.outline-row[data-guid="${propMode.guid}"]`);
				const current = rows.find(r => r.node.id === propMode.guid);
				const fields = editableFields();
				const field = fields[propMode.index];
				if (!$row || !current || !field) return;
				const $cell = $row.querySelector(`.outline-pe-row[data-index="${propMode.index}"] .outline-pe-value`);
				if ($cell) editField(current.node, field, $cell);
			};

			const paintPropSelection = () => {
				if (!$list) return;
				$list.querySelectorAll('.outline-pe-row').forEach($r => {
					$r.classList.toggle('is-selected', Number($r.dataset.index) === propMode.index);
				});
			};

			const exitPropMode = () => {
				propMode = null;
				renderRows();
				focusView();
			};

			/**
			 * The property list E opens under a row: one line per editable field,
			 * ↑/↓ to walk them and Enter to edit — the app's "property mode", except
			 * that a custom view has to draw and drive it itself.
			 */
			const buildPropEditor = (node, indent) => {
				const $panel = document.createElement('div');
				$panel.className = 'outline-propedit';
				$panel.style.paddingLeft = `${indent + TWISTY_W + ROW_GAP}px`;
				// A click anywhere in here is the panel's own; the row underneath
				// would otherwise take it as "open this record".
				$panel.addEventListener('mouseup', e => e.stopPropagation());
				const fields = editableFields();
				if (propMode.index >= fields.length) propMode.index = 0;
				fields.forEach((field, index) => {
					const $prow = document.createElement('div');
					$prow.className = 'outline-pe-row';
					$prow.dataset.index = String(index);
					if (index === propMode.index) $prow.classList.add('is-selected');

					const $icon = ui.createIcon(field.icon || 'ti-align-left');
					$icon.classList.add('outline-pe-icon');
					$prow.appendChild($icon);

					const $label = document.createElement('span');
					$label.className = 'outline-pe-label';
					$label.textContent = field.label;
					$prow.appendChild($label);

					const $value = document.createElement('span');
					$value.className = 'outline-pe-value';
					const text = fieldText(node.record, field);
					$value.textContent = text || 'Empty';
					if (!text) $value.classList.add('is-empty');
					$prow.appendChild($value);

					$prow.addEventListener('mouseup', (e) => {
						e.stopPropagation();
						if (e.button !== 0) return;
						propMode.index = index;
						paintPropSelection();
						editField(node, field, $value);
					});
					$panel.appendChild($prow);
				});
				return $panel;
			};

			// --- rows ----------------------------------------------------------

			/** One property chip: the field's own icon plus its value. */
			const propChip = (field, value) => {
				const $prop = document.createElement('span');
				$prop.className = 'outline-prop';

				const $icon = ui.createIcon(field.icon || 'ti-align-left');
				$icon.classList.add('outline-prop-icon');
				$prop.appendChild($icon);

				const $value = document.createElement('span');
				if (value.color) {
					$value.className = 'outline-pill';
					$value.style.background = `var(--enum-${value.color}-bg)`;
					$value.style.color = `var(--enum-${value.color}-fg)`;
				} else if (value.guid) {
					$value.className = 'outline-link';
				} else {
					$value.className = 'outline-prop-text';
				}
				$value.textContent = value.text;
				$prop.appendChild($value);

				if (value.guid) {
					const $arrow = document.createElement('span');
					$arrow.className = 'outline-link-arrow';
					$arrow.textContent = '↗';
					$value.appendChild($arrow);
					$prop.addEventListener('click', (e) => {
						e.stopPropagation();
						viewContext.openRecordInThisPanel(value.guid);
					});
				}

				return $prop;
			};

			// --- windowed rendering ----------------------------------------------
			//
			// A fully expanded tree can be thousands of rows, and building every one
			// on each render, toggle and refresh made the view crawl. Only rows within
			// OVERSCAN_PX of the viewport are built; spacers stand in for the rest.

			const OVERSCAN_PX = 1000;
			/** re-render once the rendered rows reach closer than this to an edge */
			const MARGIN_PX = 300;

			const rowHeight = (i) => heightCache.get(rows[i].node.id) ?? rowEstimate;

			const sumHeights = (from, to) => {
				let y = 0;
				for (let i = from; i < to; i++) y += rowHeight(i);
				return y;
			};

			/** The nearest scrolling ancestor; re-found if the view was re-parented. */
			const attachScroller = () => {
				if (scroller && scroller.contains($list)) return;
				detachScroller();
				let found = null;
				for (let el = $list.parentElement; el && el !== document.body; el = el.parentElement) {
					const oy = getComputedStyle(el).overflowY;
					if (oy === 'auto' || oy === 'scroll') { found = el; break; }
				}
				if (!found && !$list.isConnected) return;
				scroller = found || document.scrollingElement;
				scrollTarget = found || window;
				scrollTarget.addEventListener('scroll', onScroll, { passive: true });
			};

			const detachScroller = () => {
				if (scrollTarget) scrollTarget.removeEventListener('scroll', onScroll);
				if (scrollRaf) cancelAnimationFrame(scrollRaf);
				scroller = scrollTarget = null;
				scrollRaf = 0;
			};

			const onScroll = () => {
				if (scrollRaf) return;
				scrollRaf = requestAnimationFrame(() => {
					scrollRaf = 0;
					renderWindow(false);
				});
			};

			/** The scroller's visible band, in px from the top of the list. */
			const viewportInList = () => {
				const listTop = $list.getBoundingClientRect().top;
				if (!scroller || scroller === document.scrollingElement) {
					return { from: -listTop, to: window.innerHeight - listTop };
				}
				const top = scroller.getBoundingClientRect().top;
				return { from: top - listTop, to: top - listTop + scroller.clientHeight };
			};

			/** Row range covering the viewport plus `pad` px either side. */
			const rangeFor = (pad) => {
				const { from, to } = viewportInList();
				const lo = from - pad;
				const hi = to + pad;
				let y = 0;
				let start = -1;
				let end = rows.length;
				for (let i = 0; i < rows.length; i++) {
					if (y >= hi) { end = i; break; }
					const h = rowHeight(i);
					if (start === -1 && y + h > lo) start = i;
					y += h;
				}
				if (start === -1) start = Math.max(0, end - 1);
				return { start, end };
			};

			const updatePads = () => {
				$topPad.style.height = `${sumHeights(0, win.start)}px`;
				$bottomPad.style.height = `${sumHeights(win.end, rows.length)}px`;
			};

			/**
			 * Build the rows near the viewport. Without `force` this is a no-op while
			 * the rendered rows still cover the viewport with MARGIN_PX to spare.
			 */
			const renderWindow = (force, depth = 0) => {
				if (!$list || !$topPad || !rows.length) return;
				if (!force) {
					const need = rangeFor(MARGIN_PX);
					if (need.start >= win.start && need.end <= win.end) return;
				}
				win = rangeFor(OVERSCAN_PX);
				while ($topPad.nextSibling && $topPad.nextSibling !== $bottomPad) {
					$topPad.nextSibling.remove();
				}
				const $frag = document.createDocumentFragment();
				for (let i = win.start; i < win.end; i++) $frag.appendChild(buildRow(i));
				$list.insertBefore($frag, $bottomPad);
				restack();

				// Measure what was built. The first plain row also sets the estimate
				// for rows never rendered yet.
				let changed = false;
				let estimated = heightCache.size > 0;
				for (let $r = $topPad.nextSibling; $r && $r !== $bottomPad; $r = $r.nextSibling) {
					const h = $r.offsetHeight;
					if (!h) continue;
					if (!estimated && !$r.classList.contains('is-stacked')
						&& !$r.querySelector('.outline-propedit')) {
						estimated = true;
						rowEstimate = h;
					}
					if (heightCache.get($r.dataset.guid) !== h) {
						heightCache.set($r.dataset.guid, h);
						changed = true;
					}
				}
				updatePads();
				// Real heights can leave the viewport short of rows; one more pass fixes it.
				if (changed && depth < 2) renderWindow(false, depth + 1);
			};

			/** Bring a row into the DOM (and the viewport) before it is selected. */
			const ensureRendered = (index) => {
				if (!$topPad || !rows.length || (index >= win.start && index < win.end)) return;
				if (scroller) {
					const { from, to } = viewportInList();
					const top = sumHeights(0, index);
					const bottom = top + rowHeight(index);
					if (top < from) scroller.scrollTop -= from - top;
					else if (bottom > to) scroller.scrollTop += bottom - to;
				}
				renderWindow(true);
			};

			const renderRows = () => {
				if (!$list) return;
				renderFields = visibleFields();
				$list.innerHTML = '';
				$topPad = $bottomPad = null;
				win = { start: 0, end: 0 };
				rows = hierarchy ? flatten() : [];
				if (followGuid) {
					const at = rows.findIndex(r => r.node.id === followGuid);
					if (at !== -1) selectedIndex = at;
				}

				if (rows.length === 0) {
					const $empty = document.createElement('div');
					$empty.className = 'outline-empty';
					$empty.textContent = 'No records';
					$list.appendChild($empty);
					return;
				}

				$topPad = document.createElement('div');
				$bottomPad = document.createElement('div');
				$topPad.className = $bottomPad.className = 'outline-pad';
				$list.append($topPad, $bottomPad);
				attachScroller();
				renderWindow(true);
				// On the first render the view may not be in the document yet, so
				// there is no scroller to measure against; look again once it is.
				if (!scroller) {
					requestAnimationFrame(() => {
						if (!$list) return;
						attachScroller();
						renderWindow(false);
					});
				}

				setSelection(selectedIndex);

				// A record created from the create card or Shift+Enter
				// shows up here on the refresh that followed; open its name.
				if (pendingNameEditGuid) {
					const at = rows.findIndex(r => r.node.id === pendingNameEditGuid);
					pendingNameEditGuid = null;
					if (at !== -1) {
						setSelection(at);
						startNameEdit(rows[at].node, true);
					}
				}
			};

			const buildRow = (index) => {
				const { node, depth } = rows[index];
				const fields = renderFields;
				const hasChildren = node.children.length > 0;
				const indent = ROW_PAD_X + depth * DEPTH_STEP;

				const $row = document.createElement('div');
				$row.className = 'outline-row';
				// Only ever set while a filter is on: a context row is one the
				// filter dropped and the tree needed back.
				if (contextGuids.has(node.id)) $row.classList.add('is-context');
				$row.dataset.index = String(index);
				if (index === selectedIndex) $row.classList.add('selected');
				$row.dataset.guid = node.id;
				// restack() needs the depth indent to line the chips up under the
				// row icon once they are out of the title line.
				$row.dataset.indent = String(indent);

				const $title = document.createElement('div');
				$title.className = 'outline-title';
				$title.style.paddingLeft = `${indent}px`;

				const $twisty = document.createElement('span');
				$twisty.className = 'outline-twisty';
				if (hasChildren) {
					// The click target reaches back over the indent to the row edge;
					// see .outline-twisty::before.
					$twisty.style.setProperty('--twisty-reach', `${indent}px`);
					$twisty.appendChild(ui.createIcon('ti-chevron-right'));
					$twisty.classList.toggle('expanded', isExpanded(node));
					// On mouseup, not click: the row opens on mouseup, which fires
					// first, so a click-phase stopPropagation() here toggles the
					// node AND navigates to it. Left button only, so middle-click
					// still falls through to the row's open-aside.
					$twisty.addEventListener('mouseup', (e) => {
						if (e.button !== 0) return;
						e.stopPropagation();
						e.preventDefault();
						toggle(node);
					});
				}
				$title.appendChild($twisty);

				// The page's own icon, falling back to the collection's.
				const $icon = ui.createIcon(node.record.getIcon(true) || 'ti-file');
				$icon.classList.add('outline-icon');
				$title.appendChild($icon);

				const $name = document.createElement('span');
				$name.className = 'outline-name';
				$name.textContent = node.name;
				$title.appendChild($name);

				if (hasChildren && !isExpanded(node)) {
					const $count = document.createElement('span');
					$count.className = 'outline-count';
					$count.textContent = String(node.children.length);
					$title.appendChild($count);
				}

				const chips = fields
					.map(field => ({ field, value: propValue(node.record, field) }))
					.filter(entry => entry.value);
				if (chips.length) {
					const $props = document.createElement('span');
					$props.className = 'outline-props';
					chips.forEach(({ field, value }) => $props.appendChild(propChip(field, value)));
					$title.appendChild($props);
				}

				const $time = document.createElement('span');
				$time.className = 'outline-time';
				$time.textContent = timeAgo(node.record.date('Modified'));
				$title.appendChild($time);

				// The native list card's "⋯" Options button: hidden until the row is
				// hovered or selected in a focused view, and it opens the app's own
				// record options menu. Besides the menu it fixes Tab: native Tab out of
				// the search box lands on the first card's (invisible) button, so the
				// keyboard stays in the list; with nothing focusable in the rows the
				// browser skipped to the create card at the bottom and scrolled there.
				if (canShowOptions()) {
					const $opts = document.createElement('button');
					$opts.type = 'button';
					$opts.className = 'outline-row-menu button-none button-small button-minimal-hover tooltip';
					$opts.setAttribute('aria-label', 'Options');
					$opts.dataset.tooltip = 'Options';
					$opts.dataset.tooltipDir = 'top';
					$opts.appendChild(ui.createIcon('ti-dots'));
					// The row opens its record on mouseup; keep that off the button.
					$opts.addEventListener('mouseup', (e) => {
						e.stopPropagation();
						e.preventDefault();
					});
					$opts.addEventListener('click', (e) => {
						e.stopPropagation();
						e.preventDefault();
						setSelection(index);
						nativePeek.showOptionsDropdown($opts, node.id);
					});
					$title.appendChild($opts);
				}

				$row.appendChild($title);

				if (propMode && propMode.guid === node.id) {
					$row.appendChild(buildPropEditor(node, indent));
				}

				// Native list cards act on mouseup, not click, so middle-click is
				// caught too: shift = focus only, middle or cmd/ctrl = other panel,
				// plain left = this panel.
				$row.addEventListener('mouseup', (e) => {
					if (e.button !== 0 && e.button !== 1) return;
					hidePeek();
					setSelection(index);
					if (e.button === 0 && e.shiftKey) {
						e.preventDefault();
						return;
					}
					if (e.button === 1 || e.metaKey || e.ctrlKey) {
						viewContext.openRecordInOtherPanel(node.id);
					} else {
						viewContext.openRecordInThisPanel(node.id);
					}
					e.preventDefault();
				});

				return $row;
			};

			/** Build the chrome once; renderRows() then only swaps out the list body. */
			const mount = () => {
				const $element = viewContext.getElement();
				$element.innerHTML = '';

				$root = document.createElement('div');
				// collection-list-view carries the --list-* metrics (insets, row
				// overhang, gaps) that the native list rows and create card are
				// sized from; it only sets width:100%/position:relative itself.
				$root.className = 'outline-root collection-list-view';

				$zoom = document.createElement('div');
				$zoom.className = 'outline-zoom';
				$root.appendChild($zoom);

				$note = document.createElement('div');
				$note.className = 'outline-note';
				$root.appendChild($note);

				$list = document.createElement('div');
				$list.className = 'outline-list';
				$root.appendChild($list);

				if (viewContext.supportsCreateRecord()) {
					// Same markup the list view's renderCreateCard() emits.
					const $create = document.createElement('button');
					$create.type = 'button';
					$create.className = 'collection-list-create-card';
					$create.style.paddingLeft = `calc(var(--list-row-overhang) + ${ICON_OFFSET}px)`;
					$create.appendChild(ui.createIcon('ti-plus'));
					const $label = document.createElement('span');
					$label.textContent = `New ${viewContext.getRecordTypeName()}`;
					$create.appendChild($label);
					const $kbd = document.createElement('kbd');
					$kbd.className = 'collection-list-create-card-shortcut';
					$kbd.textContent = '⇧↵';
					$create.appendChild($kbd);
					$create.addEventListener('click', (e) => {
						e.stopPropagation();
						createRecord();
					});
					$root.appendChild($create);
				}

				$element.appendChild($root);
			};

			return {
				onLoad: () => {
					ui.injectCSS(/* css */`
						.outline-root {
							position: relative;
							display: flex;
							flex-direction: column;
							font-family: var(--font-sans);
							font-size: var(--text-size-normal);
							color: var(--text-default);
						}
						.outline-note {
							font-size: 12px;
							color: var(--enum-orange-fg, #c60);
						}
						.outline-note:empty {
							display: none;
						}
						.outline-zoom {
							display: flex;
							align-items: center;
							min-width: 0;
							overflow: hidden;
							margin-bottom: 6px;
						}
						.outline-zoom:empty {
							display: none;
						}
						.outline-zoom-sep {
							flex: none;
							opacity: .45;
							font-size: 13px;
						}
						.outline-zoom-step {
							display: inline-flex;
							flex: 0 1 auto;
							min-width: 3em;
							max-width: 16em;
						}
						.outline-zoom-step:first-child {
							flex: none;
							min-width: 0;
						}
						.outline-zoom-step.is-current {
							flex-shrink: 0.3;
							font-weight: 600;
						}
						.outline-zoom-step > span {
							overflow: hidden;
							text-overflow: ellipsis;
							white-space: nowrap;
							min-width: 0;
						}
						.outline-menu {
							position: absolute;
							z-index: 20;
							min-width: 180px;
							padding: 4px;
							background: var(--cmdpal-bg-color);
							border: 1px solid var(--cmdpal-border-color);
							border-radius: var(--radius-normal);
							box-shadow: var(--cmdpal-box-shadow);
						}
						.outline-menu.has-filter {
							min-width: 250px;
						}
						.outline-menu-filter {
							width: 100%;
							margin-bottom: 4px;
							background: transparent;
						}
						.outline-menu-item {
							display: flex;
							align-items: center;
							gap: 6px;
							padding: 5px 8px;
							border-radius: var(--radius-normal);
							color: var(--cmdpal-fg-color);
							font-size: var(--text-size-small);
							cursor: pointer;
						}
						.outline-menu-item:hover {
							background: var(--cmdpal-hover-bg-color);
							color: var(--cmdpal-hover-fg-color);
						}
						/* the current value, as the app's .autocomplete--current */
						.outline-menu-item.is-active {
							background: var(--cmdpal-current-bg-color);
							color: var(--cmdpal-current-fg-color);
							font-weight: 700;
						}
						/* the keyboard highlight, as .autocomplete--option-selected */
						.outline-menu-item.is-selected,
						.outline-menu-item.is-selected:hover {
							background: var(--cmdpal-selected-bg-color);
							color: var(--cmdpal-selected-fg-color);
						}
						.outline-pad { flex: none; }
						/*
						 * Key hints: our status-bar item is pinned over the bar's left
						 * edge while the app's own hints there are hidden. Absolute
						 * against the bar escapes .statusbar--right's overflow clip.
						 */
						.outline-keys { display: none !important; }
						body.${KEYS_BODY_CLASS} .statusbar--status-bar { position: relative; }
						body.${KEYS_BODY_CLASS} .statusbar--left > * { display: none !important; }
						body.${KEYS_BODY_CLASS} .outline-keys {
							display: flex !important;
							position: absolute;
							left: 0;
							top: 0;
							bottom: 0;
							align-items: center;
							margin: 0;
							padding: 0;
							overflow: hidden;
						}
						.outline-keys .statusbar-item--icon { display: none; }
						.outline-keys .statusbar-item--label {
							display: flex;
							flex-wrap: wrap;
							align-items: center;
							column-gap: 5px;
							row-gap: 20px;
							height: 19px;
							overflow: hidden;
							font-size: 12px;
						}
						.outline-list {
							display: flex;
							flex-direction: column;
						}
						.outline-row {
							padding: 4px 12px 4px 0;
							cursor: pointer;
							user-select: none;
							border-radius: var(--radius-normal);
						}
						.outline-row:hover {
							background: var(--prop-bg-hover);
						}
						.outline-row.selected {
							background: var(--cards-bg-focused);
						}
						.outline-title {
							display: flex;
							align-items: center;
							gap: 6px;
						}
						.outline-twisty {
							display: inline-flex;
							align-items: center;
							justify-content: center;
							width: 16px;
							height: 16px;
							flex: 0 0 16px;
							color: var(--text-muted);
							border-radius: 3px;
							position: relative;
						}
						/*
						 * The chevron alone is a 16px target beside a row that opens on
						 * click, so misses zoom into the page. This invisible box widens
						 * the target to the full row height, left across the indent to the
						 * row edge, and right across the gap to the page icon. The
						 * chevron rotates inside it, not the twisty, so the box stays put.
						 */
						.outline-twisty:not(:empty)::before {
							content: "";
							position: absolute;
							top: -7px;
							bottom: -7px;
							left: calc(-1 * var(--twisty-reach, 0px));
							right: -${ROW_GAP}px;
						}
						.outline-twisty > * {
							transition: transform 0.12s ease;
						}
						.outline-twisty.expanded > * {
							transform: rotate(90deg);
						}
						.outline-twisty:hover {
							background: var(--ed-fold-icon-hover-bg);
						}
						.outline-icon {
							color: var(--text-muted);
							flex: 0 0 auto;
						}
						/*
						 * Our collection-icons fork broadcasts its "Hide icons in
						 * collection views" switch as this body attribute; honor it so
						 * the Outline view matches the built-in List view. Inert when
						 * that plugin is absent — the attribute is never set.
						 */
						body[data-plg-collection-icons-listview-icons="hide"] .outline-icon {
							display: none;
						}
						.outline-name {
							flex: 0 1 auto;
							min-width: 0;
							font-weight: 600;
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
						}
						/*
						 * A row the filter dropped, kept only to hold a match's place.
						 * Dimmed rather than hidden: it still has to read as the path
						 * down to the match, and it is still a working row — clickable,
						 * foldable, editable. The matches themselves are left alone, so
						 * an unfiltered tree looks exactly as it always did.
						 *
						 * Recoloring the name alone was not enough to see, at either
						 * --text-subtle (text-500, one step off the default — invisible)
						 * or --text-muted (text-800). Fading the WHOLE row instead takes
						 * the name, the icon, the chips and the timestamp down together,
						 * which is what makes the matched rows pop out of the column; the
						 * name also loses its bold, so weight carries the same signal
						 * where a theme's colors are close together.
						 */
						.outline-row.is-context {
							opacity: .45;
						}
						.outline-row.is-context .outline-name {
							font-weight: 400;
						}
						/* Full strength again on hover or focus — a faded row is still a
						   working row, and it should not look inert while pointed at. */
						.outline-row.is-context:hover,
						.outline-row.is-context.selected {
							opacity: 1;
						}
						.outline-count {
							flex: 0 0 auto;
							font-size: var(--text-size-small);
							color: var(--text-subtle);
						}
						/*
						 * A fixed column, not shrink-to-fit: the chips are pushed up
						 * against the stamp, so a stamp that is one character shorter
						 * ("1h ago" against "16m ago") would otherwise leave that row's
						 * chips ending at a different x from every other row's.
						 */
						.outline-time {
							flex: 0 0 auto;
							min-width: 8ch;
							text-align: right;
							font-size: var(--text-size-small);
							color: var(--text-muted);
						}
						/* Native: .collection-list-card-menu, shown on hover or on the
						   focused card of a focused view. */
						/* At the right end of line 1, like native's top-right corner. The
						   chips already push themselves and the stamp right; with none on
						   the line, the button takes the free space instead (two auto
						   margins on one line would split it). */
						.outline-row-menu {
							flex: 0 0 auto;
							margin-left: auto;
							opacity: 0;
						}
						.outline-props ~ .outline-row-menu {
							margin-left: 0;
						}
						.outline-row:hover .outline-row-menu,
						.focused-component .outline-row.selected .outline-row-menu {
							opacity: 1;
						}
						/*
						 * Chips are pushed to the right, so they and the timestamp read
						 * as one right-hand column instead of trailing the name at a
						 * different x on every row.
						 *
						 * This is the ONLY auto margin on the line. Giving the stamp one
						 * as well splits the free space evenly between the two, which
						 * left the chips floating mid-row at a position that tracked the
						 * name's length — the opposite of aligned.
						 */
						.outline-props {
							display: inline-flex;
							align-items: center;
							flex: 0 0 auto;
							gap: 10px;
							margin-left: auto;
							padding-right: 10px;
						}
						/*
						 * Two-line fallback: the chips are moved out of the title line
						 * (restack()), which keeps that line unwrappable — the name
						 * ellipsises and the timestamp stays put, as native does. The
						 * left offset is set inline, since it follows the row's depth.
						 */
						/* Wrapped, the chips are left-aligned under the row icon: there
						   is no stamp on line 2 to align them against, and a lone
						   right-aligned run reads as belonging to the row below. */
						.outline-row.is-stacked .outline-props {
							display: flex;
							justify-content: flex-start;
							margin-left: 0;
							margin-top: 2px;
							padding-right: 0;
						}
						.outline-prop {
							display: inline-flex;
							align-items: center;
							gap: 4px;
							font-size: var(--text-size-small);
						}
						.outline-prop-icon {
							color: var(--text-xmuted);
						}
						.outline-prop-text {
							color: var(--text-muted);
						}
						.outline-pill {
							border-radius: 4px;
							padding: 1px 6px;
						}
						.outline-link {
							color: var(--ed-inlineref-fg);
							border-radius: 4px;
							padding: 1px 6px;
							background: var(--ed-backlink-bg);
						}
						.outline-link:hover {
							color: var(--ed-inlineref-hover-color);
						}
						.outline-link-arrow {
							margin-left: 3px;
							opacity: 0.7;
						}
						/* the property list E opens under a row */
						.outline-propedit {
							display: flex;
							flex-direction: column;
							gap: 1px;
							margin-top: 4px;
							padding-bottom: 2px;
						}
						.outline-pe-row {
							display: flex;
							align-items: center;
							gap: 6px;
							padding: 3px 6px;
							border-radius: var(--radius-normal);
							font-size: var(--text-size-small);
							cursor: pointer;
						}
						.outline-pe-row:hover {
							background: var(--prop-bg-hover);
						}
						.outline-pe-row.is-selected {
							background: var(--cmdpal-selected-bg-color);
							color: var(--cmdpal-selected-fg-color);
						}
						.outline-pe-icon {
							color: var(--text-xmuted);
							flex: 0 0 auto;
						}
						.outline-pe-label {
							flex: 0 0 140px;
							color: var(--text-muted);
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
						}
						.outline-pe-row.is-selected .outline-pe-label {
							color: inherit;
						}
						.outline-pe-value {
							flex: 1 1 auto;
							min-width: 0;
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
						}
						.outline-pe-value.is-empty {
							color: var(--text-xmuted);
						}
						.outline-inline-input {
							flex: 1 1 auto;
							min-width: 0;
							padding: 1px 4px;
							border: var(--input-border-focus);
							border-radius: 3px;
							background: var(--panel-bg-color);
							color: var(--text-default);
							font-family: var(--font-sans);
							font-size: inherit;
							font-weight: inherit;
							outline: none;
						}
						.outline-empty {
							padding: 40px;
							text-align: center;
							color: var(--text-muted);
						}
					`);
					// Despite the name, makeNormalLayout() applies the panel's
					// "layout-margin-overview" modifier (max 1200px) — the same width
					// the built-in list view uses. makeWideLayout() drops the cap.
					viewContext.makeNormalLayout();
					mount();
					document.addEventListener('keydown', onShortcutKey, true);
				},

				onRefresh: ({ records }) => {
					lastRecords = records;
					takeZoomHandoff();
					// Mid-move: the screen already shows the result; skip the
					// in-between states (see `pending`).
					if (pending.size && !settled(records)) return;
					rebuild();
				},

				// Width decides which rows stack onto two lines, so every measured
				// height is suspect after a resize.
				onPanelResize: () => {
					heightCache.clear();
					renderWindow(true);
				},

				onDestroy: () => {
					document.removeEventListener('keydown', onShortcutKey, true);
					stopHintTimer();
					if (viewFocused) plugin.showKeyHints(false);
					detachScroller();
					$topPad = $bottomPad = null;
					closeMenu();
					hidePeek();
					propMode = null;
					pendingNameEditGuid = null;
					hierarchy = null;
					rows = [];
					$root = null;
					$list = null;
					$note = null;
					$zoom = null;
					$menu = null;
					lastRecords = null;
				},

				// Enter from the sidebar, a click, or a panel switch lands here.
				onFocus: () => {
					viewFocused = true;
					syncKeyHints();
					if (!hintTimer) hintTimer = setInterval(syncKeyHints, 300);
					if (rows.length) setSelection(selectedIndex);
				},
				onBlur: () => {
					viewFocused = false;
					stopHintTimer();
					plugin.showKeyHints(false);
				},

				onKeyboardNavigation: ({ e }) => {
					// An open menu owns the keyboard; its own keydown drives it.
					if ($menu) return;

					// The hook still fires while something OUTSIDE this view holds
					// focus — the panel's breadcrumb button and the panel's own search
					// box, for two. Treating those keys as row navigation made Tab jump
					// into the rows from up there. Only act when the focused element is
					// ours, or when nothing in particular has focus (document.body),
					// which is the state the view sits in normally.
					const $focused = document.activeElement;
					if ($focused && $focused !== document.body
						&& $root && !$root.contains($focused)) return;
					// An open inline editor handles its own keys.
					if ($focused && $focused.classList
						&& $focused.classList.contains('outline-inline-input')) return;

					if (rows.length === 0) return;
					const current = rows[selectedIndex];
					if (!current) return;

					// Property mode owns the keyboard while it is open: ↑/↓ walk the
					// row's fields, Enter edits the highlighted one, Escape (or E
					// again) leaves. Everything else is swallowed rather than falling
					// through to row navigation, which would scroll the list out from
					// under the open property list.
					if (propMode) {
						const fields = editableFields();
						if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
							e.preventDefault();
							const step = e.key === 'ArrowDown' ? 1 : -1;
							propMode.index = (propMode.index + step + fields.length) % fields.length;
							paintPropSelection();
							return;
						}
						if (e.key === 'Enter') {
							e.preventDefault();
							editSelectedField();
							return;
						}
						if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
							e.preventDefault();
							exitPropMode();
							return;
						}
						return;
					}

					// E opens the focused row's properties, as it does on a native card.
					if ((e.key === 'e' || e.key === 'E')
						&& !e.metaKey && !e.ctrlKey && !e.altKey) {
						e.preventDefault();
						if (editableFields().length) {
							propMode = { guid: current.node.id, index: 0 };
							renderRows();
						}
						return;
					}

					// R or F2 renames, as on a native card (the bundle's `SH`).
					if ((e.key === 'r' || e.key === 'R' || e.key === 'F2')
						&& !e.metaKey && !e.ctrlKey && !e.altKey) {
						e.preventDefault();
						startNameEdit(current.node, false);
						return;
					}

					if (e.key === 'Enter' && e.shiftKey) {
						e.preventDefault();
						createRecord();
						return;
					}

					// "/" focuses the collection search box, as it does in the native
					// views. The app binds this key inside its CARD views
					// (`onKeyboardNavigation` → `focusCollectionSearch()`), not app-wide,
					// so a custom view is handed nothing and has to do it itself.
					if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
						if (focusAppSearch()) e.preventDefault();
						return;
					}

					// Cmd/Ctrl+Enter opens aside, matching the native card handler.
					if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						// A peek already put the record aside; keep that panel.
						if (isPeeking()) commitPeek();
						else openSelected(true);
						return;
					}

					// While peeking, Escape exits and Enter commits — the same pair
					// the app puts in the status bar during a peek.
					if (e.key === 'Escape' && isPeeking()) {
						e.preventDefault();
						hidePeek();
						return;
					}
					if (e.key === ' ') {
						e.preventDefault();
						peekSelected();
						return;
					}

					// The editor's line keys, on rows: Tab / Shift+Tab indent and
					// outdent, ⌘⇧↑ / ⌘⇧↓ move among siblings.
					if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
						e.preventDefault();
						rearrange(e.shiftKey ? 'outdent' : 'indent');
						return;
					}
					if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey
						&& (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
						e.preventDefault();
						rearrange(e.key === 'ArrowDown' ? 'down' : 'up');
						return;
					}

					// ⌘/Ctrl + ↑/↓, kept alongside Thymer's fold keys: ↓ opens a
					// folded node and moves down (onto its first child), or just moves
					// down. ↑ closes an open node; with nothing to close it folds the
					// parent and lands on it. (A fold or zoom action bound to these
					// keys wins: onShortcutKey takes them first.)
					if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
						e.preventDefault();
						const hasChildren = current.node.children.length > 0;
						if (e.key === 'ArrowDown') {
							if (hasChildren && !isExpanded(current.node)) toggle(current.node);
							selectNext(1);
						} else if (hasChildren && isExpanded(current.node)) {
							toggle(current.node);
						} else if (current.parent) {
							// Nothing to close here: close the parent and land on it.
							setFolded([current.parent], true);
							refold(current.parent.id);
						} else if (selectedIndex === 0) {
							// Same as plain ↑: the top row hands off to the search box.
							focusAppSearch();
						} else {
							selectNext(-1);
						}
						return;
					}

					switch (e.key) {
						case 'ArrowDown':
							e.preventDefault();
							selectNext(1);
							break;
						case 'ArrowUp':
							e.preventDefault();
							// ↑ does NOT wrap, unlike ↓: from the first row native hands
							// focus up to the search box, then the view tabs, then the
							// title. Only the first step is ours to make — the app's own
							// toolbar handler covers the rest. With no search box to be
							// found, the selection simply stays put.
							if (selectedIndex === 0) focusAppSearch();
							else selectNext(-1);
							break;
						// ←/→ cycle rows like ↑/↓ do. They also have to be swallowed:
						// left alone, the app moves the panel left/right.
						case 'ArrowRight':
							e.preventDefault();
							selectNext(1);
							break;
						case 'ArrowLeft':
							e.preventDefault();
							selectNext(-1);
							break;
						case 'Home':
							e.preventDefault();
							setSelection(0);
							break;
						case 'End':
							e.preventDefault();
							setSelection(rows.length - 1);
							break;
						case 'Enter':
							e.preventDefault();
							// Enter during a peek commits it: the side panel stays.
							if (isPeeking()) commitPeek();
							else openSelected(false);
							break;
					}
				},
			};
		});
		this.captureNativeView(viewId);
	}

}

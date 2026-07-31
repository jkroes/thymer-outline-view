/**
 * "Outline" — a native-list-style custom view for a self-referencing collection.
 * Rows are indented by depth from the collection's sub-page link ("Sub-page of"
 * / `parent_page`), falling back to the first record-link field that points back
 * at this collection; each node expands/collapses. Includes a rebuilt view
 * toolbar, since custom views are not given the app's own.
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
 * Build a parent/child forest from records linked by `parentFieldId`.
 * Records whose parent is unset or points outside the set become roots.
 * Records caught in a cycle are promoted to roots so they stay visible — the
 * app's own sub-page writes refuse cycles, but a record-link field is free to
 * hold one, and so is a sub-page link written before this view existed.
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

class Plugin extends CollectionPlugin {

	onLoad() {
		this.registerOutlineView();
	}

	registerOutlineView() {
		this.views.register("outline", (viewContext) => {
			const ui = this.ui;
			const plugin = this;
			const collectionGuid = () => plugin.collection.getGuid();
			const storageKey = `outline-collapsed:${this.getConfiguration().name}`;

			/** guids the user has collapsed; persisted per device */
			let collapsed = new Set();
			try {
				collapsed = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
			} catch (err) {
				collapsed = new Set();
			}
			/** guids held open to reveal search hits, recomputed as the filter changes */
			let forceExpanded = new Set();

			let hierarchy = null;
			/** flattened currently-visible nodes, in display order */
			let rows = [];
			let selectedIndex = 0;
			let filter = '';
			let $root = null;
			let $list = null;
			let $search = null;
			let $toolbar = null;
			let $menu = null;
			/** id of the side panel opened by Space-to-peek, if any */
			let peekPanelId = null;
			/**
			 * The navigation the peek panel was showing before the peek borrowed it,
			 * or null when this view opened the panel itself. Dismissing restores it.
			 */
			let peekRestoreNav = null;
			/** E-mode: {guid, index} — the row whose property list is open, and the highlighted field */
			let propMode = null;
			/** guid of a just-created record whose name opens for editing on the next render */
			let pendingNameEditGuid = null;
			/**
			 * setSortColumn() only sets the view's runtime sort — it never writes back
			 * to sort_field_id in the config — so the current sort is tracked here,
			 * seeded once from the config.
			 */
			let sortFieldId = null;
			let sortDir = null;

			// --- collection / view config -------------------------------------

			/** Config is re-read rather than cached: sorting and view edits mutate it. */
			const fieldsById = () => {
				const map = {};
				(plugin.getConfiguration().fields || []).forEach(f => { map[f.id] = f; });
				return map;
			};

			/**
			 * The field the tree is read from: the collection's own sub-page link if
			 * sub-pages are on, otherwise the first record field pointing back at this
			 * collection. `parent_page` is what `collection.enableSubPages(true)`
			 * provisions — a plain record field labelled "Sub-page of", filtered to
			 * this collection — so it needs no special handling to READ. Writes go
			 * through setSubPageOf(), which is what refuses cycles.
			 */
			const hierarchyFieldId = () => {
				const fields = plugin.getConfiguration().fields || [];
				if (fields.some(f => f.id === 'parent_page' && f.active !== false)) return 'parent_page';
				const self = fields.find(f => f.type === 'record'
					&& f.active !== false
					&& f.filter_colguid === collectionGuid());
				return self ? self.id : null;
			};

			const choiceColorsFor = (field) => {
				const map = {};
				(field.choices || []).forEach(c => {
					map[c.label] = ENUM_COLORS[Number(c.color)] || 'zinc';
				});
				return map;
			};

			/** The panel showing this collection, so tab clicks navigate the right one. */
			const ownPanel = () => ui.getPanels().find(panel => {
				const nav = panel.getNavigation();
				return nav && nav.type === 'overview' && nav.rootId === collectionGuid();
			}) || null;

			const currentViewId = () => {
				const panel = ownPanel();
				const nav = panel ? panel.getNavigation() : null;
				if (nav && nav.subId) return nav.subId;
				const views = plugin.getConfiguration().views || [];
				const mine = views.find(v => v.id === 'outline');
				return mine ? mine.id : null;
			};

			const currentView = () => {
				const id = currentViewId();
				return (plugin.getConfiguration().views || []).find(v => v.id === id) || null;
			};

			// CollectionPlugin has no getWorkspaceGuid() (that lives on AppPlugin),
			// so the guid comes off the panel's own current navigation.
			const navigate = (type, subId) => {
				const panel = ownPanel();
				if (!panel) return;
				const nav = panel.getNavigation();
				panel.navigateTo({
					type,
					rootId: collectionGuid(),
					subId,
					workspaceGuid: nav ? nav.workspaceGuid : null,
				});
			};

			const navigateToView = (viewId) => navigate('overview', viewId);

			// --- data ----------------------------------------------------------

			const isExpanded = (node) => !collapsed.has(node.id) || forceExpanded.has(node.id);

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

			const matches = (node, fields) => {
				if (!filter) return true;
				const needle = filter.toLowerCase();
				if (node.name.toLowerCase().includes(needle)) return true;
				return fields.some(field => {
					const value = propValue(node.record, field);
					return value && value.text.toLowerCase().includes(needle);
				});
			};

			/** Ancestors of every match, so a deep hit still shows the path down to it. */
			const computeFilterState = (fields) => {
				forceExpanded = new Set();
				if (!hierarchy || !filter) return null;
				const keep = new Set();
				const visit = (node, ancestors) => {
					if (matches(node, fields)) {
						keep.add(node.id);
						ancestors.forEach(a => {
							keep.add(a.id);
							forceExpanded.add(a.id);
						});
					}
					node.children.forEach(child => visit(child, [...ancestors, node]));
				};
				hierarchy.rootNodes.forEach(root => visit(root, []));
				return keep;
			};

			const flatten = (keep) => {
				const out = [];
				const visit = (node, depth, parent) => {
					if (keep && !keep.has(node.id)) return;
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
				$list.querySelectorAll('.outline-row').forEach(($row, i) => {
					$row.classList.toggle('selected', i === selectedIndex);
				});
				const $selected = $list.querySelector(`.outline-row[data-index="${selectedIndex}"]`);
				if ($selected) {
					$selected.scrollIntoView({ block: 'nearest' });
					// Put DOM focus on the row itself, the way native focuses a card.
					// It matters for unhandled keys: Shift+Tab is the browser's, and
					// from the view root — which precedes everything inside it in
					// document order — it walks OUT of the view to the panel's
					// breadcrumb. From the row it reaches the search box, as native does.
					if (document.activeElement !== $search) {
						$selected.focus({ preventScroll: true });
					}
				}
				// Native peek follows the focused card as you keep browsing — but only
				// while the peek panel is still open. The user may have closed it.
				if (peekPanelId) {
					if (peekPanel()) showPeek();
					else peekPanelId = null;
				}
			};

			const toggle = (node) => {
				if (isExpanded(node)) {
					collapsed.add(node.id);
					forceExpanded.delete(node.id);
				} else {
					collapsed.delete(node.id);
				}
				localStorage.setItem(storageKey, JSON.stringify([...collapsed]));
				const keepGuid = rows[selectedIndex] ? rows[selectedIndex].node.id : null;
				renderRows();
				const restored = rows.findIndex(r => r.node.id === keepGuid);
				setSelection(restored === -1 ? 0 : restored);
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

			/** Pull DOM focus back into the view root so key hooks fire here again. */
			const focusView = () => {
				if (!$root) return;
				$root.tabIndex = -1;
				$root.focus({ preventScroll: true });
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
				}
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

			const togglePeek = () => {
				if (peekPanelId) hidePeek();
				else showPeek();
			};

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

			// --- toolbar -------------------------------------------------------

			const toolbarButton = (iconName, tooltip, onClick, label) => {
				const $btn = document.createElement('button');
				$btn.className = 'outline-tb-btn';
				$btn.title = tooltip;
				if (iconName) $btn.appendChild(ui.createIcon(iconName));
				if (label) {
					const $label = document.createElement('span');
					$label.textContent = label;
					$btn.appendChild($label);
				}
				$btn.addEventListener('click', (e) => {
					e.stopPropagation();
					onClick(e);
				});
				return $btn;
			};

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

			const ensureSortState = () => {
				if (sortFieldId !== null) return;
				const view = currentView();
				sortDir = (view && view.sort_dir) || 'asc';
				sortFieldId = (view && view.sort_field_id) || '';
				if (!sortFieldId) {
					// An empty sort field means custom order, which this view has no
					// way to set. Fall back to Title and actually apply it, so the
					// toolbar never reports a sort the menu can't offer.
					sortFieldId = 'title';
					viewContext.setSortColumn(sortFieldId, sortDir);
				}
			};

			const applySort = (fieldId, dir) => {
				sortFieldId = fieldId;
				sortDir = dir;
				viewContext.setSortColumn(fieldId, dir);
				renderToolbar();
			};

			/**
			 * Which fields the app offers as sort keys, from its own predicate:
			 * active, not the `icon` field, and not a file/image/banner type; plus
			 * `parent_page` always excluded and `collection` excluded outside a
			 * dynamic collection.
			 *
			 * The app also offers "Custom Order" (the empty field id), which sorts on
			 * a per-view drag position stored at record.j["$o:<viewId>"]. This view
			 * has no drag-reorder, so no record ever gets an "$o:outline" key and it
			 * would only ever mean creation order — it is deliberately not offered.
			 */
			const SORT_SKIP_IDS = ['icon', 'parent_page', 'collection'];
			const SORT_SKIP_TYPES = ['file', 'image', 'banner'];
			const sortableFields = () => (plugin.getConfiguration().fields || []).filter(f =>
				f.active !== false
				&& !SORT_SKIP_IDS.includes(f.id)
				&& !SORT_SKIP_TYPES.includes(f.type));

			const openSortMenu = ($anchor) => {
				const rect = $anchor.getBoundingClientRect();
				const items = [];
				sortableFields().forEach(field => items.push({
					label: field.label,
					icon: field.icon || 'ti-align-left',
					active: field.id === sortFieldId,
					onSelect: () => applySort(field.id, sortDir),
				}));
				showMenu(items, rect.left, rect.bottom + 2, 'Sort by property...');
			};

			const renderToolbar = () => {
				if (!$toolbar) return;
				$toolbar.innerHTML = '';
				closeMenu();

				ensureSortState();
				const conf = plugin.getConfiguration();
				const activeId = currentViewId();

				const $views = document.createElement('div');
				$views.className = 'outline-tb-views';
				(conf.views || []).filter(v => v.shown !== false).forEach(v => {
					const $tab = toolbarButton(v.icon || 'ti-table-dashed', v.label, () => {
						if (v.id !== activeId) navigateToView(v.id);
					}, v.label);
					$tab.classList.add('outline-tb-tab');
					if (v.id === activeId) $tab.classList.add('is-active');
					$views.appendChild($tab);
				});
				$toolbar.appendChild($views);

				const $actions = document.createElement('div');
				$actions.className = 'outline-tb-actions';

				if (viewContext.supportsCreateRecord()) {
					const $create = toolbarButton(null, `New ${viewContext.getRecordTypeName()}`,
						createRecord, `New ${viewContext.getRecordTypeName()}`);
					$actions.appendChild($create);
					const $divider = document.createElement('span');
					$divider.className = 'outline-tb-divider';
					$actions.appendChild($divider);
				}

				const $sortWrap = document.createElement('span');
				$sortWrap.className = 'outline-sort-wrap';
				const sortField = (conf.fields || []).find(f => f.id === sortFieldId);
				const $sortBtn = toolbarButton('ti-selector', 'Change sort field', () => {
					openSortMenu($sortWrap);
				}, sortField ? sortField.label : 'Sort');
				$sortWrap.appendChild($sortBtn);
				$actions.appendChild($sortWrap);

				$actions.appendChild(toolbarButton(
					sortDir === 'asc' ? 'ti-arrow-up' : 'ti-arrow-down',
					sortDir === 'asc' ? 'Ascending' : 'Descending',
					() => applySort(sortFieldId, sortDir === 'asc' ? 'desc' : 'asc')
				));

				$toolbar.appendChild($actions);
			};

			// --- inline editing --------------------------------------------------

			/**
			 * The fields E-mode walks: Title first (native puts the title at the top
			 * of a card's property list too), then the properties the row already
			 * shows as chips, minus the types there is no editor for.
			 */
			const EDITABLE_TYPES = ['text', 'number', 'choice', 'record'];
			const EDIT_SKIP_IDS = ['title', 'icon', 'collection', 'parent_page'];
			const editableFields = () => {
				const canEdit = f => f && f.active !== false && !f.read_only
					&& EDITABLE_TYPES.includes(f.type) && !EDIT_SKIP_IDS.includes(f.id);
				// The fields the row already shows come first, then everything else
				// the collection has. Native property mode walks only the card's shown
				// properties, but the field that shapes the tree (Parent) is usually
				// NOT one of them, and not being able to reparent from here would miss
				// the point of editing on an outline.
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

			/** Descendants of a node, so the Parent picker can't offer a cycle. */
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
			 * loaded; anything else has to be fetched from that collection.
			 */
			const recordCandidates = async (field, node) => {
				if (!field.filter_colguid || field.filter_colguid === collectionGuid()) {
					const banned = descendantsOf(node);
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
						if (field.id === 'parent_page') record.setSubPageOf(guid);
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

			const renderRows = () => {
				if (!$list) return;
				const fields = visibleFields();
				const keep = computeFilterState(fields);
				$list.innerHTML = '';
				rows = hierarchy ? flatten(keep) : [];

				if (rows.length === 0) {
					const $empty = document.createElement('div');
					$empty.className = 'outline-empty';
					$empty.textContent = filter ? 'No matches' : 'No records';
					$list.appendChild($empty);
					return;
				}

				rows.forEach(({ node, depth }, index) => {
					const hasChildren = node.children.length > 0;
					const indent = ROW_PAD_X + depth * DEPTH_STEP;

					const $row = document.createElement('div');
					$row.className = 'outline-row';
					$row.dataset.index = String(index);
					// Focusable but not in the Tab order: Tab is handled explicitly,
					// while unhandled keys (Shift+Tab) need a focused node here so the
					// browser walks focus from the row, not from the view root.
					$row.tabIndex = -1;
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
						$twisty.appendChild(ui.createIcon('ti-chevron-right'));
						$twisty.classList.toggle('expanded', isExpanded(node));
						$twisty.addEventListener('click', (e) => {
							e.stopPropagation();
							toggle(node);
						});
					}
					$title.appendChild($twisty);

					const $icon = ui.createIcon(plugin.getConfiguration().icon || 'ti-file');
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

					$list.appendChild($row);
				});

				restack();
				setSelection(selectedIndex);

				// A record created from the toolbar, the create card or Shift+Enter
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

			/** Build the chrome once; renderRows() then only swaps out the list body. */
			const mount = () => {
				const $element = viewContext.getElement();
				$element.innerHTML = '';

				$root = document.createElement('div');
				// collection-list-view carries the --list-* metrics (insets, row
				// overhang, gaps) that the native list rows and create card are
				// sized from; it only sets width:100%/position:relative itself.
				$root.className = 'outline-root collection-list-view';

				$toolbar = document.createElement('div');
				$toolbar.className = 'outline-toolbar';
				$root.appendChild($toolbar);

				const $searchRow = document.createElement('div');
				$searchRow.className = 'outline-search-row';
				const $searchIcon = ui.createIcon('ti-search');
				$searchIcon.classList.add('outline-search-icon');
				$searchRow.appendChild($searchIcon);

				$search = document.createElement('input');
				$search.type = 'text';
				$search.className = 'outline-search-input';
				$search.placeholder = `Search in ${plugin.getConfiguration().name}`;
				$search.addEventListener('input', () => {
					filter = $search.value.trim();
					selectedIndex = 0;
					renderRows();
				});
				// Arrow keys must still drive the list while the caret is in the box.
				$search.addEventListener('keydown', (e) => {
					if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
						// Native hands focus from the search box to the FIRST row
						// (focusFromCollectionSearch), and the box gives up focus. Tab
						// does the same: the search box is the last stop in the
						// toolbar-then-search-then-rows order, so Tab enters the list.
						e.preventDefault();
						$search.blur();
						focusView();
						setSelection(0);
					} else if (e.key === 'ArrowUp') {
						// Up out of the search box goes to the ACTIVE view tab (and from
						// there the app's title, which this view can't focus).
						e.preventDefault();
						const $active = $toolbar && $toolbar.querySelector('.outline-tb-tab.is-active');
						if ($active) $active.focus();
					} else if (e.key === 'Enter') {
						e.preventDefault();
						openSelected(e.metaKey || e.ctrlKey);
					} else if (e.key === 'Escape') {
						e.preventDefault();
						$search.value = '';
						filter = '';
						renderRows();
					}
				});
				$searchRow.appendChild($search);
				$root.appendChild($searchRow);

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
						.outline-toolbar {
							display: flex;
							align-items: center;
							gap: 8px;
							min-height: 34px;
						}
						.outline-tb-views {
							display: flex;
							align-items: center;
							gap: 3px;
							flex: 1 1 auto;
							min-width: 0;
							overflow: hidden;
						}
						.outline-tb-actions {
							display: flex;
							align-items: center;
							gap: 2px;
							flex: 0 0 auto;
							margin-left: auto;
						}
						.outline-tb-btn {
							display: inline-flex;
							align-items: center;
							gap: 5px;
							flex: 0 0 auto;
							max-width: 240px;
							padding: 4px 8px;
							background: transparent;
							border: 1px solid transparent;
							border-radius: var(--radius-normal);
							color: var(--text-muted);
							font-family: var(--font-sans);
							font-size: var(--text-size-small);
							white-space: nowrap;
							cursor: pointer;
						}
						.outline-tb-btn:hover {
							background: var(--button-minimal-bg-color);
							color: var(--button-minimal-fg-color);
						}
						.outline-tb-btn.is-active {
							background: var(--button-minimal-bg-active-color);
							color: var(--text-default);
						}
						.outline-tb-divider {
							width: 1px;
							height: 18px;
							margin: 0 3px 0 0;
							background: var(--divider-color);
						}
						.outline-sort-wrap {
							position: relative;
							display: inline-flex;
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
						.outline-search-row {
							position: relative;
							display: flex;
							align-items: center;
							width: 100%;
							margin-top: 8px;
							margin-bottom: 8px;
						}
						.outline-search-icon {
							position: absolute;
							left: 12px;
							top: 50%;
							z-index: 3;
							transform: translateY(-50%);
							color: var(--text-muted);
							font-size: 17px;
							pointer-events: none;
						}
						.outline-search-input {
							width: 100%;
							min-height: 36px;
							padding: 7px 36px 7px 34px;
							border: var(--input-border);
							border-radius: var(--radius-normal);
							background: color-mix(in srgb, var(--panel-bg-color) 80%, var(--color-bg-500));
							color: var(--text-default);
							font-family: var(--font-sans);
							font-size: var(--text-size-normal);
						}
						.outline-search-input:focus {
							border: var(--input-border-focus);
							outline: none;
							box-shadow: var(--input-border-shadow);
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
							transition: transform 0.12s ease;
						}
						.outline-twisty.expanded {
							transform: rotate(90deg);
						}
						.outline-twisty:hover {
							background: var(--ed-fold-icon-hover-bg);
						}
						.outline-icon {
							color: var(--text-muted);
							flex: 0 0 auto;
						}
						.outline-name {
							flex: 0 1 auto;
							min-width: 0;
							font-weight: 600;
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
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
				},

				onRefresh: ({ records }) => {
					hierarchy = buildHierarchy(records, hierarchyFieldId());
					if (!$list) mount();
					renderToolbar();
					renderRows();
				},

				onPanelResize: () => restack(),

				onDestroy: () => {
					closeMenu();
					hidePeek();
					propMode = null;
					pendingNameEditGuid = null;
					hierarchy = null;
					rows = [];
					$root = null;
					$list = null;
					$search = null;
					$toolbar = null;
					$menu = null;
				},

				onFocus: () => {},
				onBlur: () => {},

				onKeyboardNavigation: ({ e }) => {
					// An open menu owns the keyboard; its own keydown drives it.
					if ($menu) return;

					// The hook still fires while something OUTSIDE this view holds
					// focus — the panel's breadcrumb button, for one. Treating those
					// keys as row navigation made Tab jump into the rows from up
					// there, and Shift+Tab land in the search box. Only act when the
					// focused element is ours, or when nothing in particular has focus
					// (document.body), which is the state the view sits in normally.
					const $focused = document.activeElement;
					if ($focused && $focused !== document.body
						&& $root && !$root.contains($focused)) return;
					// The search box handles its own keys via its keydown listener,
					// and so does an open inline editor.
					if ($search && document.activeElement === $search) return;
					if ($focused && $focused.classList
						&& $focused.classList.contains('outline-inline-input')) return;

					// While a toolbar button holds focus, the arrows belong to the
					// toolbar, not the rows. The chain going down is
					// title -> active view tab -> search -> rows; going up reverses it,
					// and above the tabs it is the app's title, out of reach here.
					if ($toolbar && $toolbar.contains(document.activeElement)) {
						if (e.key === 'ArrowDown' && $search) {
							e.preventDefault();
							$search.focus();
							return;
						}
						// Left/Right cycle along the toolbar. They must be swallowed:
						// unhandled, the app reads them as move-panel-left/right.
						if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
							e.preventDefault();
							const $buttons = Array.from($toolbar.querySelectorAll('button'));
							const at = $buttons.indexOf(document.activeElement);
							if (at !== -1 && $buttons.length) {
								const step = e.key === 'ArrowRight' ? 1 : -1;
								$buttons[(at + step + $buttons.length) % $buttons.length].focus();
							}
							return;
						}
						// Tab is driven by hand rather than left to the browser: the
						// default never arrives here (Shift+Tab's does), so relying on
						// it dropped straight into the rows.
						if (e.key === 'Tab' && !e.shiftKey) {
							e.preventDefault();
							const $buttons = Array.from($toolbar.querySelectorAll('button'));
							const at = $buttons.indexOf(document.activeElement);
							const $next = at === -1 ? null : $buttons[at + 1];
							if ($next) $next.focus();
							else if ($search) $search.focus();
							return;
						}
						return;
					}

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

					if (e.key === 'Enter' && e.shiftKey) {
						e.preventDefault();
						createRecord();
						return;
					}

					// "/" jumps to the search box, as it does in the native views.
					if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
						e.preventDefault();
						if ($search) $search.focus();
						return;
					}

					// Cmd/Ctrl+Enter opens aside, matching the native card handler.
					if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						// A peek already put the record aside; keep that panel.
						if (peekPanelId) commitPeek();
						else openSelected(true);
						return;
					}

					// While peeking, Escape exits and Enter commits — the same pair
					// the app puts in the status bar during a peek.
					if (peekPanelId && e.key === 'Escape') {
						e.preventDefault();
						hidePeek();
						return;
					}
					if (e.key === ' ') {
						e.preventDefault();
						togglePeek();
						return;
					}

					// Collapse/expand lives on Cmd/Ctrl + ↑/↓, leaving ←/→ free to
					// walk rows. ↓ opens a node, ↑ closes it or climbs to the parent.
					// With nothing to open or close they fall back to plain ↑/↓, so
					// the key never feels dead on a leaf.
					if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
						e.preventDefault();
						const hasChildren = current.node.children.length > 0;
						if (e.key === 'ArrowDown') {
							if (hasChildren && !isExpanded(current.node)) toggle(current.node);
							else selectNext(1);
						} else if (hasChildren && isExpanded(current.node)) {
							toggle(current.node);
						} else if (current.parent) {
							const up = rows.findIndex(r => r.node.id === current.parent.id);
							if (up !== -1) setSelection(up);
						} else {
							selectNext(-1);
						}
						return;
					}

					switch (e.key) {
						case 'Tab':
							// Only plain Tab is row navigation. The native card handler
							// normalizes the event first, and its switch has no
							// "Shift+Tab" case, so that one falls through with no
							// preventDefault and the browser's own focus order takes
							// over — which is why native Shift+Tab looks erratic.
							if (e.shiftKey) return;
							e.preventDefault();
							selectNext(1);
							break;
						case 'ArrowDown':
							e.preventDefault();
							selectNext(1);
							break;
						case 'ArrowUp':
							e.preventDefault();
							// From the first row the native views hand focus back to
							// the search box rather than wrapping.
							if (selectedIndex === 0 && $search) $search.focus();
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
							if (peekPanelId) commitPeek();
							else openSelected(false);
							break;
					}
				},
			};
		});
	}

}

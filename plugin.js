/**
 * "Outline" — a native-list-style custom view for a self-referencing collection.
 * Rows are indented by depth from a "Parent" record-link property, and each
 * node expands/collapses. Includes a rebuilt view toolbar, since custom views
 * are not given the app's own.
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
 * Build a parent/child forest from records linked by a "Parent" property.
 * Records whose Parent is unset or points outside the set become roots.
 * Records caught in a Parent cycle are promoted to roots so they stay visible.
 */
function buildHierarchy(records) {
	const nodes = new Map();
	records.forEach(record => {
		const parent = record.linkedRecord('Parent');
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

	// A Parent cycle leaves its members unreachable from any root. Promote them
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

export class Plugin extends CollectionPlugin {

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
			const openCollectionSettings = () => navigate('collection_settings', null);

			/**
			 * "Edit View..." — collection settings scoped to one view, the same shape
			 * the app's own context menu uses (openCollectionSettings with openViewId).
			 */
			const openViewEditor = (viewId) => {
				const panel = ownPanel();
				if (!panel) return;
				const nav = panel.getNavigation();
				panel.navigateTo({
					type: 'collection_settings',
					rootId: collectionGuid(),
					subId: null,
					workspaceGuid: nav ? nav.workspaceGuid : null,
					state: { openViewId: viewId },
				});
			};

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
				if ($selected) $selected.scrollIntoView({ block: 'nearest' });
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
			 */
			const restack = () => {
				if (!$list) return;
				const $rows = Array.from($list.querySelectorAll('.outline-row'));
				$rows.forEach($r => $r.classList.remove('is-stacked'));
				const needsStacking = $rows.map($r => {
					const $name = $r.querySelector('.outline-name');
					if (!$name || !$r.querySelector('.outline-props')) return false;
					return $name.scrollWidth > $name.clientWidth + 1;
				});
				$rows.forEach(($r, i) => {
					if (needsStacking[i]) $r.classList.add('is-stacked');
				});
			};

			const openSelected = () => {
				const current = rows[selectedIndex];
				if (current) viewContext.openRecordInThisPanel(current.node.id);
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

			const createRecord = () => {
				const guid = viewContext.createRecord();
				if (guid) viewContext.openRecordInThisPanel(guid);
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

			const closeMenu = () => {
				if ($menu) {
					$menu.remove();
					$menu = null;
				}
			};

			/**
			 * items: [{label, icon, active, onSelect}], positioned at viewport (x, y).
			 * Appended to the view root rather than to the trigger: the tab row copies
			 * native's overflow:hidden, which would clip a menu nested inside it.
			 */
			const showMenu = (items, x, y) => {
				closeMenu();
				if (!$root) return;
				$menu = document.createElement('div');
				$menu.className = 'outline-menu';
				items.forEach(item => {
					const $item = document.createElement('div');
					$item.className = 'outline-menu-item';
					if (item.active) $item.classList.add('is-active');
					$item.appendChild(ui.createIcon(item.icon || 'ti-align-left'));
					const $label = document.createElement('span');
					$label.textContent = item.label;
					$item.appendChild($label);
					$item.addEventListener('click', (e) => {
						e.stopPropagation();
						closeMenu();
						item.onSelect();
					});
					$menu.appendChild($item);
				});
				$root.appendChild($menu);
				const rootRect = $root.getBoundingClientRect();
				$menu.style.left = `${x - rootRect.left}px`;
				$menu.style.top = `${y - rootRect.top}px`;
			};

			/**
			 * Tabler icon names, read from the app's own stylesheet so the picker
			 * stays in step with whatever the build ships.
			 */
			let iconNames = null;
			const allIconNames = () => {
				if (iconNames) return iconNames;
				const found = new Set();
				for (const sheet of Array.from(document.styleSheets)) {
					let rules;
					try {
						rules = sheet.cssRules;
					} catch (err) {
						continue; // cross-origin sheet
					}
					for (const rule of Array.from(rules || [])) {
						const sel = rule.selectorText;
						if (!sel) continue;
						const hits = sel.match(/\.ti-[a-z0-9-]+:+before/g);
						if (hits) hits.forEach(h => found.add(h.slice(1).split(':')[0]));
					}
				}
				iconNames = Array.from(found).sort();
				return iconNames;
			};

			/**
			 * Rename prompt matching the app's own (function `tl`, the
			 * "prompt-text-and-icon" widget), reusing its markup and classes.
			 * The native dialog itself is internal to the app and not callable here.
			 */
			const renameView = (viewId, $tab) => {
				const view = (plugin.getConfiguration().views || []).find(v => v.id === viewId);
				if (!view || !$root) return;

				closeMenu();
				const originalLabel = view.label || '';
				const originalIcon = view.icon || '';
				let chosenIcon = originalIcon;

				const $popover = document.createElement('div');
				$popover.className = 'outline-popover';
				$popover.innerHTML = /* html */ `
					<div class='input-widget' style='padding: 10px; display: flex; flex-direction: column; gap: 10px'>
						<div class="form-field" style="margin-top: 0px; display: flex; align-items: center;">
							<div class='input-widget--icon' style="flex: 0 0 auto; margin-right: 5px">
								<button class='id--icon-btn button-normal button-normal-hover' style="height: 100%; align-items: center">
									<span class='id--icon'></span> <span class='ti ti-selector'></span>
								</button>
							</div>
							<input maxlength="100" spellcheck="false" class='input-widget--input w-full form-input'
								style="background: transparent; flex: 1 1 0px;" type='text' placeholder='Enter text...'>
						</div>
						<div class='input-widget--buttons' style='display: flex; justify-content: space-between; align-items: center; user-select: none'>
							<span>
								<button class='id--cancel button-minimal button-minimal-hover'>Cancel</button>
								<span class='kbd'>Esc</span>
							</span>
							<span>
								<span class='kbd'>↵</span>
								<button class='id--ok button-primary'>OK</button>
							</span>
						</div>
					</div>
					<div class='outline-iconpicker' hidden>
						<input class='form-input outline-iconsearch' type='text' placeholder='Search icons...' spellcheck='false'>
						<div class='outline-icongrid'></div>
					</div>
				`;

				const $body = $popover.querySelector('.input-widget');
				const $input = $popover.querySelector('.input-widget--input');
				const $iconBtn = $popover.querySelector('.id--icon-btn');
				const $iconSlot = $popover.querySelector('.id--icon');
				const $picker = $popover.querySelector('.outline-iconpicker');
				const $iconSearch = $popover.querySelector('.outline-iconsearch');
				const $iconGrid = $popover.querySelector('.outline-icongrid');

				const paintIcon = () => {
					$iconSlot.innerHTML = '';
					$iconSlot.appendChild(ui.createIcon(chosenIcon || 'ti-table-dashed'));
				};
				paintIcon();
				$input.value = originalLabel;

				let settled = false;
				const finish = (save) => {
					if (settled) return;
					settled = true;
					const name = $input.value.trim();
					const changed = name && (name !== originalLabel || chosenIcon !== originalIcon);
					closeMenu();
					if (save && changed) {
						const next = structuredClone(plugin.getConfiguration());
						const target = (next.views || []).find(v => v.id === viewId);
						if (target) {
							target.label = name;
							target.icon = chosenIcon;
							// Reloads the plugin, which re-renders the toolbar for us.
							plugin.collection.saveConfiguration(next);
							return;
						}
					}
					renderToolbar();
				};

				const renderIconGrid = () => {
					const needle = $iconSearch.value.trim().toLowerCase();
					const list = allIconNames()
						.filter(n => !needle || n.includes(needle))
						.slice(0, 160);
					$iconGrid.innerHTML = '';
					list.forEach(name => {
						const $btn = document.createElement('button');
						$btn.className = 'outline-iconcell button-minimal-hover';
						if (name === chosenIcon) $btn.classList.add('is-active');
						$btn.title = name;
						$btn.appendChild(ui.createIcon(name));
						$btn.addEventListener('click', () => {
							chosenIcon = name;
							paintIcon();
							$picker.hidden = true;
							$body.hidden = false;
							$input.focus();
						});
						$iconGrid.appendChild($btn);
					});
				};

				$iconBtn.addEventListener('click', () => {
					$body.hidden = true;
					$picker.hidden = false;
					$iconSearch.value = '';
					renderIconGrid();
					$iconSearch.focus();
				});
				$iconSearch.addEventListener('input', renderIconGrid);
				$iconSearch.addEventListener('keydown', (e) => {
					e.stopPropagation();
					if (e.key === 'Escape') {
						e.preventDefault();
						$picker.hidden = true;
						$body.hidden = false;
						$input.focus();
					}
				});

				$popover.querySelector('.id--ok').addEventListener('click', () => finish(true));
				$popover.querySelector('.id--cancel').addEventListener('click', () => finish(false));
				$popover.addEventListener('click', e => e.stopPropagation());
				$input.addEventListener('keydown', (e) => {
					e.stopPropagation();
					if (e.key === 'Enter') {
						e.preventDefault();
						finish(true);
					} else if (e.key === 'Escape') {
						e.preventDefault();
						finish(false);
					}
				});

				$menu = $popover;
				$root.appendChild($popover);
				const rootRect = $root.getBoundingClientRect();
				const tabRect = $tab.getBoundingClientRect();
				$popover.style.left = `${Math.max(0, tabRect.left - rootRect.left)}px`;
				$popover.style.top = `${tabRect.bottom - rootRect.top + 2}px`;

				$input.focus();
				$input.select();
			};

			const ensureSortState = () => {
				if (sortFieldId !== null) return;
				const view = currentView();
				sortFieldId = (view && view.sort_field_id) || '';
				sortDir = (view && view.sort_dir) || 'asc';
			};

			const applySort = (fieldId, dir) => {
				sortFieldId = fieldId;
				sortDir = dir;
				viewContext.setSortColumn(fieldId, dir);
				renderToolbar();
			};

			const openSortMenu = ($anchor) => {
				if ($menu) return closeMenu();
				const rect = $anchor.getBoundingClientRect();
				const sortable = (plugin.getConfiguration().fields || []).filter(f => f.type !== 'banner');
				showMenu(sortable.map(field => ({
					label: field.label,
					icon: field.icon,
					active: field.id === sortFieldId,
					onSelect: () => applySort(field.id, sortDir),
				})), rect.left, rect.bottom + 2);
			};

			const openTabMenu = ($tab, view, e) => {
				if ($menu) return closeMenu();
				const items = [];
				// The app hides Rename when the plugin manages its own views.
				if (plugin.getConfiguration().managed?.views !== true) {
					items.push({
						label: 'Rename View',
						icon: 'ti-pencil',
						onSelect: () => renameView(view.id, $tab),
					});
				}
				items.push({
					label: 'Edit View ...',
					icon: 'ti-settings',
					onSelect: () => openViewEditor(view.id),
				});
				showMenu(items, e.clientX, e.clientY);
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
					$tab.addEventListener('contextmenu', (e) => {
						e.preventDefault();
						e.stopPropagation();
						openTabMenu($tab, v, e);
					});
					$views.appendChild($tab);
				});
				$views.appendChild(toolbarButton('ti-plus', 'Add view', openCollectionSettings));
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

				$actions.appendChild(toolbarButton('ti-adjustments', 'Configure view', () => {
					if (activeId) openViewEditor(activeId);
					else openCollectionSettings();
				}));

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
					$row.dataset.guid = node.id;

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

					$row.addEventListener('click', () => {
						setSelection(index);
						viewContext.openRecordInThisPanel(node.id);
					});

					$list.appendChild($row);
				});

				restack();
				setSelection(selectedIndex);
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
				$root.addEventListener('click', closeMenu);

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
					if (e.key === 'ArrowDown') {
						e.preventDefault();
						setSelection(selectedIndex + 1);
					} else if (e.key === 'ArrowUp') {
						e.preventDefault();
						setSelection(selectedIndex - 1);
					} else if (e.key === 'Enter') {
						e.preventDefault();
						openSelected();
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
						.outline-popover {
							position: absolute;
							z-index: 20;
							width: 500px;
							max-width: 92%;
							background: var(--cmdpal-bg-color);
							border: 1px solid var(--cmdpal-border-color);
							border-radius: var(--radius-normal);
							box-shadow: var(--cmdpal-box-shadow);
						}
						.outline-iconpicker {
							padding: 10px;
							display: flex;
							flex-direction: column;
							gap: 8px;
						}
						.outline-icongrid {
							display: grid;
							grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
							gap: 2px;
							max-height: 240px;
							overflow-y: auto;
						}
						.outline-iconcell {
							display: inline-flex;
							align-items: center;
							justify-content: center;
							height: 32px;
							background: transparent;
							border: 1px solid transparent;
							border-radius: var(--radius-normal);
							color: var(--text-muted);
							cursor: pointer;
						}
						.outline-iconcell.is-active {
							background: var(--cmdpal-selected-bg-color);
							color: var(--cmdpal-selected-fg-color);
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
						.outline-menu-item.is-active {
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
						.outline-time {
							margin-left: auto;
							flex: 0 0 auto;
							font-size: var(--text-size-small);
							color: var(--text-muted);
						}
						.outline-props {
							display: inline-flex;
							align-items: center;
							flex: 0 0 auto;
							gap: 10px;
							margin-left: 4px;
						}
						/* Two-line fallback: chips drop below, timestamp stays on line 1. */
						.outline-row.is-stacked .outline-title {
							flex-wrap: wrap;
						}
						.outline-row.is-stacked .outline-time {
							order: 1;
						}
						.outline-row.is-stacked .outline-props {
							order: 2;
							flex-basis: 100%;
							margin-left: ${TWISTY_W + ROW_GAP}px;
							margin-top: 2px;
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
					hierarchy = buildHierarchy(records);
					if (!$list) mount();
					renderToolbar();
					renderRows();
				},

				onPanelResize: () => restack(),

				onDestroy: () => {
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
					// The search box handles its own keys via its keydown listener.
					if ($search && document.activeElement === $search) return;
					if (rows.length === 0) return;
					const current = rows[selectedIndex];
					if (!current) return;

					if (e.key === 'Enter' && e.shiftKey) {
						e.preventDefault();
						createRecord();
						return;
					}

					switch (e.key) {
						case 'ArrowDown':
							e.preventDefault();
							setSelection(selectedIndex + 1);
							break;
						case 'ArrowUp':
							e.preventDefault();
							setSelection(selectedIndex - 1);
							break;
						case 'ArrowRight':
							e.preventDefault();
							if (current.node.children.length && !isExpanded(current.node)) {
								toggle(current.node);
							} else if (current.node.children.length) {
								setSelection(selectedIndex + 1);
							}
							break;
						case 'ArrowLeft':
							e.preventDefault();
							if (current.node.children.length && isExpanded(current.node)) {
								toggle(current.node);
							} else if (current.parent) {
								const up = rows.findIndex(r => r.node.id === current.parent.id);
								if (up !== -1) setSelection(up);
							}
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
						case ' ':
							e.preventDefault();
							openSelected();
							break;
					}
				},
			};
		});
	}

}

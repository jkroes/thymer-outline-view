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

const VIEW_SOURCE = "/**\n * \"Outline\" — a native-list-style custom view for a self-referencing collection.\n * Rows are indented by depth from the collection's sub-page link (\"Sub-page of\"\n * / `parent_page`), falling back to the first record-link field that points back\n * at this collection; each node expands/collapses. The view toolbar is the\n * app's own — custom views are given it, so this draws only the tree.\n *\n * Nothing here is bound to a particular collection: fields, views, sort and item\n * name are all read from the collection's config at runtime.\n */\n\n/**\n * Choice-color index -> class/token name, lifted from the app bundle's own\n * palette array (`At`). The `--enum-<name>-bg/-fg` tokens follow these names,\n * so a pill styled from them matches the colors the native views use.\n */\nconst ENUM_COLORS = [\n\t'red', 'orange', 'green', 'cyan', 'blue', 'purple', 'pink', 'fuchsia',\n\t'rose', 'stone', 'teal', 'sky', 'indigo', 'zinc', 'yellow'\n];\n\n/** \"9m ago\" / \"2h ago\" / \"3d ago\", matching the native list view's stamp. */\nfunction timeAgo(date) {\n\tif (!date) return '';\n\tconst seconds = Math.floor((Date.now() - date.getTime()) / 1000);\n\tif (seconds < 60) return 'just now';\n\tconst minutes = Math.floor(seconds / 60);\n\tif (minutes < 60) return `${minutes}m ago`;\n\tconst hours = Math.floor(minutes / 60);\n\tif (hours < 24) return `${hours}h ago`;\n\tconst days = Math.floor(hours / 24);\n\tif (days < 30) return `${days}d ago`;\n\tconst months = Math.floor(days / 30);\n\tif (months < 12) return `${months}mo ago`;\n\treturn `${Math.floor(months / 12)}y ago`;\n}\n\n/**\n * Re-add the ancestors of every record in `records` that the set is missing.\n *\n * The app's own search and filters narrow the record set BEFORE it reaches the\n * view, and they keep only the matches — so a matched grandchild arrives with\n * neither its parent nor its grandparent, which leaves the tree a flat list\n * with no twisties to expand. Walking `linkedRecord()` up from each match puts\n * the path back: that call resolves the linked record itself, not a lookup in\n * the delivered set, so ancestors filtered out are still reachable.\n *\n * Returns the completed set plus the guids that were added, which is also the\n * signal that a filter is on at all — an unfiltered set is already complete and\n * adds nothing.\n */\nfunction withAncestors(records, parentFieldId) {\n\tconst byGuid = new Map(records.map(record => [record.guid, record]));\n\tconst added = new Set();\n\tif (parentFieldId) {\n\t\trecords.forEach(record => {\n\t\t\tlet parent = record.linkedRecord(parentFieldId);\n\t\t\t// A parent already in the map ends the walk: it carries its own\n\t\t\t// ancestors up from where it sits. The depth cap is what stops a\n\t\t\t// cyclic link from spinning here (buildHierarchy handles the cycle\n\t\t\t// itself, but only once it has the records).\n\t\t\tfor (let depth = 0; parent && !byGuid.has(parent.guid) && depth < 100; depth++) {\n\t\t\t\tbyGuid.set(parent.guid, parent);\n\t\t\t\tadded.add(parent.guid);\n\t\t\t\tparent = parent.linkedRecord(parentFieldId);\n\t\t\t}\n\t\t});\n\t}\n\treturn { records: Array.from(byGuid.values()), added };\n}\n\n/**\n * Build a parent/child forest from records linked by `parentFieldId`.\n * Records whose parent is unset or points outside the set become roots.\n * Records caught in a cycle are promoted to roots so they stay visible — the\n * app's own sub-page writes refuse cycles, but a record-link field is free to\n * hold one, and so is a sub-page link written before this view existed.\n */\nfunction buildHierarchy(records, parentFieldId) {\n\tconst nodes = new Map();\n\trecords.forEach(record => {\n\t\tconst parent = parentFieldId ? record.linkedRecord(parentFieldId) : null;\n\t\tnodes.set(record.guid, {\n\t\t\tid: record.guid,\n\t\t\tname: record.getName() || 'Unknown',\n\t\t\tparentGuid: parent ? parent.guid : null,\n\t\t\trecord,\n\t\t\tchildren: [],\n\t\t\tlevel: 0,\n\t\t\tx: 0,\n\t\t\ty: 0\n\t\t});\n\t});\n\n\tconst rootNodes = [];\n\tnodes.forEach(node => {\n\t\tif (node.parentGuid && nodes.has(node.parentGuid)) {\n\t\t\tnodes.get(node.parentGuid).children.push(node);\n\t\t} else {\n\t\t\trootNodes.push(node);\n\t\t}\n\t});\n\n\t// A parent cycle leaves its members unreachable from any root. Promote them\n\t// rather than letting them vanish from the view.\n\tconst reachable = new Set();\n\tconst walk = node => {\n\t\tif (reachable.has(node.id)) return;\n\t\treachable.add(node.id);\n\t\tnode.children.forEach(walk);\n\t};\n\trootNodes.forEach(walk);\n\tnodes.forEach(node => {\n\t\tif (!reachable.has(node.id)) {\n\t\t\tconst parent = nodes.get(node.parentGuid);\n\t\t\tif (parent) {\n\t\t\t\tparent.children = parent.children.filter(c => c !== node);\n\t\t\t}\n\t\t\trootNodes.push(node);\n\t\t\twalk(node);\n\t\t}\n\t});\n\n\t// Sibling order is left as the caller supplied it, which is the order the\n\t// view's own sort_field_id/sort_dir produced.\n\treturn { nodes, rootNodes };\n}\n\n/**\n * The properties a hierarchy can be read from: a record link, active, single\n * valued, pointing back at this same collection.\n *\n * Multi-valued links are excluded because they give a record several parents —\n * a graph, not a tree — and a record would have to appear in more than one\n * place, which the guid-keyed collapse state and selection both assume it never\n * does. Links to a DIFFERENT collection are excluded because their targets are\n * not in this collection's record set, so they can't nest anything here; that\n * is a grouping, not an outline.\n *\n * `parent_page` is accepted whether or not it carries `filter_colguid`: the app\n * fills that in itself, so a config read in the same tick as the write that\n * added the field does not have it yet.\n */\nfunction hierarchyCandidates(fields, collectionGuid) {\n\treturn (fields || []).filter(field => field.type === 'record'\n\t\t&& field.active !== false\n\t\t&& field.many !== true\n\t\t&& (field.id === 'parent_page' || field.filter_colguid === collectionGuid));\n}\n\nclass Plugin extends CollectionPlugin {\n\n\tonLoad() {\n\t\tthis.registerOutlineView();\n\t}\n\n\t/**\n\t * Claim every custom view the collection has, rather than one hardcoded id.\n\t *\n\t * A collection has exactly one plugin, so its custom views can only be\n\t * rendered by this code — there is nothing else they could belong to. Binding\n\t * to whatever is there means the view id stops being load-bearing: renaming\n\t * it, or letting the app's sanitizer rewrite it, can't unhook the view.\n\t * `register()` is a Map.set keyed by view id, so calling it per view is fine.\n\t *\n\t * Views added after load aren't seen until the plugin reloads, which saving\n\t * the collection config does anyway.\n\t */\n\tregisterOutlineView() {\n\t\tconst views = (this.getConfiguration().views || [])\n\t\t\t.filter(v => v.type === 'custom');\n\t\tfor (const view of views) this.registerOn(view.id);\n\t}\n\n\tregisterOn(viewId) {\n\t\tthis.views.register(viewId, (viewContext) => {\n\t\t\tconst ui = this.ui;\n\t\t\tconst plugin = this;\n\t\t\tconst collectionGuid = () => plugin.collection.getGuid();\n\t\t\t// Per VIEW, not per collection: two Outline views over different\n\t\t\t// properties are different trees, so a shared key would have\n\t\t\t// collapsing a row in one collapse an unrelated row in the other.\n\t\t\tconst storageKey = `outline-collapsed:${this.getConfiguration().name}:${viewId}`;\n\n\t\t\t/** guids the user has collapsed; persisted per device */\n\t\t\tlet collapsed = new Set();\n\t\t\ttry {\n\t\t\t\tcollapsed = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));\n\t\t\t} catch (err) {\n\t\t\t\tcollapsed = new Set();\n\t\t\t}\n\t\t\t/**\n\t\t\t * Guids held open so a filtered-in record is not buried under a\n\t\t\t * collapsed ancestor. Recomputed on every refresh, and dropped from a\n\t\t\t * node the moment the user collapses it by hand — searching and then\n\t\t\t * folding the results has to work.\n\t\t\t */\n\t\t\tlet forceExpanded = new Set();\n\t\t\t/**\n\t\t\t * Guids present only to hold a filtered-in record's place in the tree.\n\t\t\t * Empty when no filter is on. Their rows are dimmed, so a search reads as\n\t\t\t * its matches with a path down to them rather than as an ordinary tree.\n\t\t\t */\n\t\t\tlet contextGuids = new Set();\n\n\t\t\tlet hierarchy = null;\n\t\t\t/** flattened currently-visible nodes, in display order */\n\t\t\tlet rows = [];\n\t\t\tlet selectedIndex = 0;\n\t\t\tlet $root = null;\n\t\t\tlet $list = null;\n\t\t\tlet $note = null;\n\t\t\tlet $menu = null;\n\t\t\t/** id of the side panel opened by Space-to-peek, if any */\n\t\t\tlet peekPanelId = null;\n\t\t\t/**\n\t\t\t * The navigation the peek panel was showing before the peek borrowed it,\n\t\t\t * or null when this view opened the panel itself. Dismissing restores it.\n\t\t\t */\n\t\t\tlet peekRestoreNav = null;\n\t\t\t/** E-mode: {guid, index} — the row whose property list is open, and the highlighted field */\n\t\t\tlet propMode = null;\n\t\t\t/** guid of a just-created record whose name opens for editing on the next render */\n\t\t\tlet pendingNameEditGuid = null;\n\n\t\t\t// --- collection / view config -------------------------------------\n\n\t\t\t/** Config is re-read rather than cached: sorting and view edits mutate it. */\n\t\t\tconst fieldsById = () => {\n\t\t\t\tconst map = {};\n\t\t\t\t(plugin.getConfiguration().fields || []).forEach(f => { map[f.id] = f; });\n\t\t\t\treturn map;\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * The property THIS view draws its tree from, and whether the one it was\n\t\t\t * told to draw has gone missing.\n\t\t\t *\n\t\t\t * The binding lives in the view's own config entry, under\n\t\t\t * `opts.hierarchy_field_id` — verified to survive the app's\n\t\t\t * collection-settings screen, so editing the view in the UI does not\n\t\t\t * erase it. That is what lets one collection carry several Outline\n\t\t\t * views, each over a different self-referencing property.\n\t\t\t *\n\t\t\t * With no binding the old collection-wide behavior stands: sub-pages if\n\t\t\t * present, else the first self-referencing property. That keeps views\n\t\t\t * predating this — and any custom view a user adds by hand — working.\n\t\t\t *\n\t\t\t * A binding pointing at a property that is gone reports `orphaned`\n\t\t\t * instead of silently falling back. Falling back would leave a view\n\t\t\t * labelled for one property quietly drawing another, with nothing on\n\t\t\t * screen saying so. The installer's reconcile is what clears these up;\n\t\t\t * until it runs the view says what happened and lists rows flat.\n\t\t\t *\n\t\t\t * `parent_page` is what `collection.enableSubPages(true)` provisions — a\n\t\t\t * plain record field labelled \"Sub-page of\", filtered to this collection\n\t\t\t * — so it needs no special handling to READ. Writes go through\n\t\t\t * setSubPageOf(), which is what refuses cycles.\n\t\t\t */\n\t\t\tconst hierarchyBinding = () => {\n\t\t\t\tconst conf = plugin.getConfiguration();\n\t\t\t\tconst candidates = hierarchyCandidates(conf.fields, collectionGuid());\n\t\t\t\tconst view = (conf.views || []).find(v => v.id === viewId);\n\t\t\t\tconst bound = view && view.opts ? view.opts.hierarchy_field_id : null;\n\t\t\t\tif (bound) {\n\t\t\t\t\tconst field = candidates.find(f => f.id === bound);\n\t\t\t\t\tif (field) return { fieldId: field.id, orphaned: null };\n\t\t\t\t\treturn { fieldId: null, orphaned: bound };\n\t\t\t\t}\n\t\t\t\tif (candidates.some(f => f.id === 'parent_page')) {\n\t\t\t\t\treturn { fieldId: 'parent_page', orphaned: null };\n\t\t\t\t}\n\t\t\t\tconst self = candidates.find(f => f.id !== 'parent_page');\n\t\t\t\treturn { fieldId: self ? self.id : null, orphaned: null };\n\t\t\t};\n\n\t\t\tconst hierarchyFieldId = () => hierarchyBinding().fieldId;\n\n\t\t\tconst choiceColorsFor = (field) => {\n\t\t\t\tconst map = {};\n\t\t\t\t(field.choices || []).forEach(c => {\n\t\t\t\t\tmap[c.label] = ENUM_COLORS[Number(c.color)] || 'zinc';\n\t\t\t\t});\n\t\t\t\treturn map;\n\t\t\t};\n\n\t\t\t/** The panel showing this collection, so peeks open beside the right one. */\n\t\t\tconst ownPanel = () => ui.getPanels().find(panel => {\n\t\t\t\tconst nav = panel.getNavigation();\n\t\t\t\treturn nav && nav.type === 'overview' && nav.rootId === collectionGuid();\n\t\t\t}) || null;\n\n\t\t\t// --- data ----------------------------------------------------------\n\n\t\t\tconst isExpanded = (node) => !collapsed.has(node.id) || forceExpanded.has(node.id);\n\n\t\t\t/** Properties the view is configured to show, minus what the row renders itself. */\n\t\t\tconst visibleFields = () => {\n\t\t\t\tconst byId = fieldsById();\n\t\t\t\treturn viewContext.getVisiblePropertyIds()\n\t\t\t\t\t.map(id => byId[id])\n\t\t\t\t\t.filter(field => field\n\t\t\t\t\t\t&& field.id !== 'title'\n\t\t\t\t\t\t&& field.type !== 'datetime'\n\t\t\t\t\t\t&& field.type !== 'banner');\n\t\t\t};\n\n\t\t\t/** Display value for one property, or null when empty. */\n\t\t\tconst propValue = (record, field) => {\n\t\t\t\tif (field.type === 'choice') {\n\t\t\t\t\tconst label = record.prop(field.id).choiceLabel();\n\t\t\t\t\tif (!label) return null;\n\t\t\t\t\treturn { text: label, color: choiceColorsFor(field)[label] || 'zinc' };\n\t\t\t\t}\n\t\t\t\tif (field.type === 'record') {\n\t\t\t\t\tconst linked = record.linkedRecord(field.id);\n\t\t\t\t\treturn linked ? { text: linked.getName(), guid: linked.guid } : null;\n\t\t\t\t}\n\t\t\t\tif (field.type === 'number') {\n\t\t\t\t\tconst num = record.number(field.id);\n\t\t\t\t\treturn num === null ? null : { text: String(num) };\n\t\t\t\t}\n\t\t\t\tconst text = record.text(field.id);\n\t\t\t\treturn text ? { text } : null;\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * With a filter on, every node on a path down to a filtered-in record\n\t\t\t * opens, so the matches are all on screen. `contextGuids` are the\n\t\t\t * ancestors put back by withAncestors(); an empty set means no filter is\n\t\t\t * on, and then nothing is forced and the user's own collapse state is all\n\t\t\t * that decides.\n\t\t\t */\n\t\t\tconst computeForceExpanded = (contextGuids) => {\n\t\t\t\tforceExpanded = new Set();\n\t\t\t\tif (!hierarchy || !contextGuids.size) return;\n\t\t\t\tconst visit = (node) => {\n\t\t\t\t\tconst hasMatchBelow = node.children\n\t\t\t\t\t\t.map(visit)\n\t\t\t\t\t\t.some(Boolean);\n\t\t\t\t\tif (hasMatchBelow) forceExpanded.add(node.id);\n\t\t\t\t\treturn hasMatchBelow || !contextGuids.has(node.id);\n\t\t\t\t};\n\t\t\t\thierarchy.rootNodes.forEach(visit);\n\t\t\t};\n\n\t\t\tconst flatten = () => {\n\t\t\t\tconst out = [];\n\t\t\t\tconst visit = (node, depth, parent) => {\n\t\t\t\t\tout.push({ node, depth, parent });\n\t\t\t\t\tif (isExpanded(node)) {\n\t\t\t\t\t\tnode.children.forEach(child => visit(child, depth + 1, node));\n\t\t\t\t\t}\n\t\t\t\t};\n\t\t\t\thierarchy.rootNodes.forEach(root => visit(root, 0, null));\n\t\t\t\treturn out;\n\t\t\t};\n\n\t\t\tconst setSelection = (index) => {\n\t\t\t\tselectedIndex = Math.max(0, Math.min(index, rows.length - 1));\n\t\t\t\tif (!$list) return;\n\t\t\t\t$list.querySelectorAll('.outline-row').forEach(($row, i) => {\n\t\t\t\t\t$row.classList.toggle('selected', i === selectedIndex);\n\t\t\t\t});\n\t\t\t\tconst $selected = $list.querySelector(`.outline-row[data-index=\"${selectedIndex}\"]`);\n\t\t\t\tif ($selected) {\n\t\t\t\t\t$selected.scrollIntoView({ block: 'nearest' });\n\t\t\t\t\t// Put DOM focus on the row itself, the way native focuses a card.\n\t\t\t\t\t// It matters for unhandled keys: Shift+Tab is the browser's, and\n\t\t\t\t\t// from the view root — which precedes everything inside it in\n\t\t\t\t\t// document order — it walks OUT of the view to the panel's\n\t\t\t\t\t// breadcrumb. From the row it reaches the search box, as native does.\n\t\t\t\t\tif (document.activeElement !== $search) {\n\t\t\t\t\t\t$selected.focus({ preventScroll: true });\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\t// Native peek follows the focused card as you keep browsing — but only\n\t\t\t\t// while the peek panel is still open. The user may have closed it.\n\t\t\t\tif (peekPanelId) {\n\t\t\t\t\tif (peekPanel()) showPeek();\n\t\t\t\t\telse peekPanelId = null;\n\t\t\t\t}\n\t\t\t};\n\n\t\t\tconst toggle = (node) => {\n\t\t\t\tif (isExpanded(node)) {\n\t\t\t\t\tcollapsed.add(node.id);\n\t\t\t\t\tforceExpanded.delete(node.id);\n\t\t\t\t} else {\n\t\t\t\t\tcollapsed.delete(node.id);\n\t\t\t\t}\n\t\t\t\tlocalStorage.setItem(storageKey, JSON.stringify([...collapsed]));\n\t\t\t\tconst keepGuid = rows[selectedIndex] ? rows[selectedIndex].node.id : null;\n\t\t\t\trenderRows();\n\t\t\t\tconst restored = rows.findIndex(r => r.node.id === keepGuid);\n\t\t\t\tsetSelection(restored === -1 ? 0 : restored);\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * Rows are laid out single-line; any whose name had to ellipsise to make\n\t\t\t * room for its chips is stacked onto two lines instead. Always resets to\n\t\t\t * the single-line baseline first, otherwise a stacked row measures as\n\t\t\t * fitting and would oscillate. Reads and writes are batched to keep this\n\t\t\t * to one forced layout.\n\t\t\t *\n\t\t\t * Stacking MOVES the chips out of the title line rather than wrapping it.\n\t\t\t * Wrapping let the name take the full width and pushed the timestamp onto\n\t\t\t * a line of its own — a three-line row, where native ellipsises the name\n\t\t\t * and keeps the stamp on line 1. A one-line flex container can't wrap, so\n\t\t\t * the name has no choice but to shrink.\n\t\t\t */\n\t\t\tconst restack = () => {\n\t\t\t\tif (!$list) return;\n\t\t\t\tconst $rows = Array.from($list.querySelectorAll('.outline-row'));\n\t\t\t\t$rows.forEach($r => {\n\t\t\t\t\tconst $props = $r.querySelector('.outline-props');\n\t\t\t\t\tconst $title = $r.querySelector('.outline-title');\n\t\t\t\t\tif ($props && $title && $props.parentElement !== $title) {\n\t\t\t\t\t\t$title.insertBefore($props, $r.querySelector('.outline-time'));\n\t\t\t\t\t}\n\t\t\t\t\t$r.classList.remove('is-stacked');\n\t\t\t\t});\n\t\t\t\tconst needsStacking = $rows.map($r => {\n\t\t\t\t\tconst $name = $r.querySelector('.outline-name');\n\t\t\t\t\tif (!$name || !$r.querySelector('.outline-props')) return false;\n\t\t\t\t\treturn $name.scrollWidth > $name.clientWidth + 1;\n\t\t\t\t});\n\t\t\t\t$rows.forEach(($r, i) => {\n\t\t\t\t\tif (!needsStacking[i]) return;\n\t\t\t\t\t$r.classList.add('is-stacked');\n\t\t\t\t\tconst $props = $r.querySelector('.outline-props');\n\t\t\t\t\t$props.style.paddingLeft = `${Number($r.dataset.indent) + TWISTY_W + ROW_GAP}px`;\n\t\t\t\t\t// Before the property list, when E has one open — chips belong to\n\t\t\t\t\t// the row above it, not below it.\n\t\t\t\t\t$r.insertBefore($props, $r.querySelector('.outline-propedit'));\n\t\t\t\t});\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * Step the selection, wrapping at the ends. The app's getNextCardGuid()\n\t\t\t * does the same: an out-of-range index falls through to\n\t\t\t * `(r % len + len) % len`. (Only the very first row is special-cased,\n\t\t\t * and its ArrowUp goes to the search box instead of wrapping.)\n\t\t\t */\n\t\t\tconst selectNext = (delta) => {\n\t\t\t\tif (!rows.length) return;\n\t\t\t\tsetSelection((selectedIndex + delta + rows.length) % rows.length);\n\t\t\t};\n\n\t\t\tconst openSelected = (otherPanel) => {\n\t\t\t\tconst current = rows[selectedIndex];\n\t\t\t\tif (!current) return;\n\t\t\t\tif (otherPanel) viewContext.openRecordInOtherPanel(current.node.id);\n\t\t\t\telse viewContext.openRecordInThisPanel(current.node.id);\n\t\t\t};\n\n\t\t\t// --- peek ------------------------------------------------------------\n\n\t\t\t/**\n\t\t\t * Space-to-peek: open the focused record in the side panel, and let a\n\t\t\t * second Space close that panel again. The app calls this a navigation\n\t\t\t * preview; while it is up, arrows keep browsing and the side panel follows.\n\t\t\t */\n\n\t\t\t/** Pull DOM focus back into the view root so key hooks fire here again. */\n\t\t\tconst focusView = () => {\n\t\t\t\tif (!$root) return;\n\t\t\t\t$root.tabIndex = -1;\n\t\t\t\t$root.focus({ preventScroll: true });\n\t\t\t};\n\n\t\t\t/** The peek panel, re-resolved each time — panel objects don't outlive much. */\n\t\t\tconst peekPanel = () => {\n\t\t\t\tif (!peekPanelId) return null;\n\t\t\t\treturn ui.getPanels().find(p => p.getId() === peekPanelId) || null;\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * Dismiss the peek. A panel this view opened is closed; a panel that was\n\t\t\t * already there when the peek started is put back on whatever it was\n\t\t\t * showing. Native peek is a preview layered over the panel's existing\n\t\t\t * navigation, so dismissing it restores that navigation — closing the\n\t\t\t * panel instead would throw away something the user had open.\n\t\t\t */\n\t\t\tconst hidePeek = () => {\n\t\t\t\tconst panel = peekPanel();\n\t\t\t\tconst restore = peekRestoreNav;\n\t\t\t\tpeekPanelId = null;\n\t\t\t\tpeekRestoreNav = null;\n\t\t\t\tif (!panel) return;\n\t\t\t\tif (restore) {\n\t\t\t\t\tpanel.navigateTo(restore);\n\t\t\t\t\tconst self = ownPanel();\n\t\t\t\t\tif (self) ui.setActivePanel(self);\n\t\t\t\t\tfocusView();\n\t\t\t\t} else {\n\t\t\t\t\tui.closePanel(panel);\n\t\t\t\t}\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * Native's commit: the previewed panel stops being a preview and becomes\n\t\t\t * the real navigation, focus included.\n\t\t\t *\n\t\t\t * Native peek replaces the panel's navigation on every step, so committing\n\t\t\t * leaves one history entry and Cmd+[ closes the panel. Nothing in the SDK\n\t\t\t * replaces a navigation — `navigateTo` takes no replace flag and forwards\n\t\t\t * only the navigation object — so every arrow-key step here has pushed an\n\t\t\t * entry, and Cmd+[ would walk back through every record peeked at before\n\t\t\t * closing. Commit by throwing the panel away and opening a fresh one on\n\t\t\t * the final record, which starts its history over.\n\t\t\t */\n\t\t\tconst commitPeek = () => {\n\t\t\t\tconst current = rows[selectedIndex];\n\t\t\t\tconst panel = peekPanel();\n\t\t\t\tconst borrowed = !!peekRestoreNav;\n\t\t\t\tpeekPanelId = null;\n\t\t\t\tpeekRestoreNav = null;\n\t\t\t\t// A panel that was already open is kept as it stands: the record is\n\t\t\t\t// already in it, and closing it to tidy up its history would destroy a\n\t\t\t\t// panel the user opened themselves. Its history keeps an entry per\n\t\t\t\t// record peeked at, which is the same limitation described below.\n\t\t\t\tif (borrowed) {\n\t\t\t\t\tif (panel) ui.setActivePanel(panel);\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\tif (panel) ui.closePanel(panel);\n\t\t\t\t// closePanel() only starts a 150ms zoomOut animation and removes the\n\t\t\t\t// panel on a timer afterwards, so it is still in the layout and still\n\t\t\t\t// the target for an \"other panel\" open until then. Reopen after it is\n\t\t\t\t// really gone, or the fresh navigation goes down with it.\n\t\t\t\t// Opening aside focuses the new panel, which is what a commit wants.\n\t\t\t\tif (current) {\n\t\t\t\t\tsetTimeout(() => viewContext.openRecordInOtherPanel(current.node.id), 220);\n\t\t\t\t}\n\t\t\t};\n\n\t\t\tconst showPeek = () => {\n\t\t\t\tconst current = rows[selectedIndex];\n\t\t\t\tif (!current) return;\n\t\t\t\tconst self = ownPanel();\n\t\t\t\tconst before = new Set(ui.getPanels().map(p => p.getId()));\n\t\t\t\t// Read the panel the peek is about to take over BEFORE taking it over.\n\t\t\t\t// `openRecordInOtherPanel()` reuses an existing side panel when there\n\t\t\t\t// is one, and by the time the open returns its previous navigation is\n\t\t\t\t// gone. Only on the first Space: the follow-the-selection path calls\n\t\t\t\t// this again on every arrow, and must not overwrite what it captured.\n\t\t\t\tif (!peekPanelId) {\n\t\t\t\t\tconst borrowed = ui.getPanels().find(p => !p.isSidebar()\n\t\t\t\t\t\t&& (!self || p.getId() !== self.getId()));\n\t\t\t\t\tpeekRestoreNav = borrowed ? borrowed.getNavigation() : null;\n\t\t\t\t}\n\t\t\t\tviewContext.openRecordInOtherPanel(current.node.id);\n\t\t\t\t// Opening aside hands focus to that panel's editor. The app only calls\n\t\t\t\t// a custom view's onKeyboardNavigation when its own component has focus\n\t\t\t\t// (`onKeyDown(e){ let t=Ze(); t && (t==this._() || t==this) &&\n\t\t\t\t// this.onKeyboardNavigation(e) }`), and the editor swallows Space as\n\t\t\t\t// text besides. Native peek keeps the list focused, so take focus back.\n\t\t\t\t// The aside renders asynchronously and focuses its editor afterwards,\n\t\t\t\t// so a synchronous grab alone loses the race — re-assert once the\n\t\t\t\t// panel has painted.\n\t\t\t\tconst takeFocusBack = () => {\n\t\t\t\t\tif (self) ui.setActivePanel(self);\n\t\t\t\t\tfocusView();\n\t\t\t\t};\n\t\t\t\ttakeFocusBack();\n\t\t\t\trequestAnimationFrame(takeFocusBack);\n\t\t\t\tsetTimeout(takeFocusBack, 120);\n\t\t\t\tif (peekPanelId) return;\n\t\t\t\t// Whichever panel is new is the peek; if the app reused an existing one,\n\t\t\t\t// take the other non-sidebar panel.\n\t\t\t\tconst panels = ui.getPanels().filter(p => !p.isSidebar());\n\t\t\t\tconst opened = panels.find(p => !before.has(p.getId()))\n\t\t\t\t\t|| panels.find(p => !self || p.getId() !== self.getId());\n\t\t\t\tpeekPanelId = opened ? opened.getId() : null;\n\t\t\t};\n\n\t\t\tconst togglePeek = () => {\n\t\t\t\tif (peekPanelId) hidePeek();\n\t\t\t\telse showPeek();\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * Row geometry, in one place: a row is [pad][twisty][gap][icon...], and\n\t\t\t * the create card's + has to land on the same x as those row icons.\n\t\t\t * TWISTY_W / ROW_GAP mirror .outline-twisty width and .outline-title gap.\n\t\t\t */\n\t\t\tconst ROW_PAD_X = 8;\n\t\t\tconst TWISTY_W = 16;\n\t\t\tconst ROW_GAP = 6;\n\t\t\tconst DEPTH_STEP = 20;\n\t\t\tconst ICON_OFFSET = ROW_PAD_X + TWISTY_W + ROW_GAP;\n\n\t\t\t/**\n\t\t\t * Native drops a new card into the list with its title in edit mode\n\t\t\t * rather than navigating away, so this does the same: createRecord()\n\t\t\t * fires onRefresh, and renderRows() picks the guid up from here.\n\t\t\t */\n\t\t\tconst createRecord = () => {\n\t\t\t\tconst guid = viewContext.createRecord();\n\t\t\t\tif (!guid) return;\n\t\t\t\tpendingNameEditGuid = guid;\n\t\t\t\t// If the refresh already ran (or never comes), render once more so the\n\t\t\t\t// guid above is picked up rather than sitting there forever.\n\t\t\t\tsetTimeout(() => { if (pendingNameEditGuid) renderRows(); }, 150);\n\t\t\t};\n\n\t\t\t// --- menus -----------------------------------------------------------\n\n\t\t\t/**\n\t\t\t * Dismisses the open menu on any click outside it, like the app's own\n\t\t\t * dropdowns. Registered on the document because clicks land all over the\n\t\t\t * panel, not just inside the view root.\n\t\t\t */\n\t\t\tconst onDocumentClick = (e) => {\n\t\t\t\tif ($menu && !$menu.contains(e.target)) closeMenu();\n\t\t\t};\n\n\t\t\tconst closeMenu = () => {\n\t\t\t\tif ($menu) {\n\t\t\t\t\t$menu.remove();\n\t\t\t\t\t$menu = null;\n\t\t\t\t\tdocument.removeEventListener('click', onDocumentClick, true);\n\t\t\t\t}\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * items: [{label, icon, active, onSelect}], positioned at viewport (x, y).\n\t\t\t * Appended to the view root rather than to the trigger: the tab row copies\n\t\t\t * native's overflow:hidden, which would clip a menu nested inside it.\n\t\t\t *\n\t\t\t * Keys follow the app's own dropdown: ↑/↓ move the highlight and wrap,\n\t\t\t * Enter confirms, Escape closes, Tab does nothing. `active` marks the\n\t\t\t * current value, which is separate from the keyboard highlight — the app\n\t\t\t * draws them as `autocomplete--current` and `autocomplete--option-selected`.\n\t\t\t */\n\t\t\tconst showMenu = (items, x, y, filterPlaceholder) => {\n\t\t\t\tcloseMenu();\n\t\t\t\tif (!$root) return;\n\t\t\t\t$menu = document.createElement('div');\n\t\t\t\t$menu.className = 'outline-menu';\n\n\t\t\t\tconst $items = document.createElement('div');\n\t\t\t\tlet $filter = null;\n\t\t\t\t/** items surviving the filter, and the highlighted one within them */\n\t\t\t\tlet shown = items;\n\t\t\t\tlet cursor = 0;\n\n\t\t\t\tconst confirm = (index) => {\n\t\t\t\t\tconst item = shown[index];\n\t\t\t\t\tif (!item) return;\n\t\t\t\t\tcloseMenu();\n\t\t\t\t\titem.onSelect();\n\t\t\t\t};\n\n\t\t\t\tconst move = (delta) => {\n\t\t\t\t\tif (!shown.length) return;\n\t\t\t\t\tcursor = (cursor + delta + shown.length) % shown.length;\n\t\t\t\t\tpaint();\n\t\t\t\t\tconst $sel = $items.querySelector('.is-selected');\n\t\t\t\t\tif ($sel) $sel.scrollIntoView({ block: 'nearest' });\n\t\t\t\t};\n\n\t\t\t\tconst paint = () => {\n\t\t\t\t\tconst needle = $filter ? $filter.value.trim().toLowerCase() : '';\n\t\t\t\t\tshown = items.filter(item => !needle || item.label.toLowerCase().includes(needle));\n\t\t\t\t\tif (cursor >= shown.length) cursor = 0;\n\t\t\t\t\t$items.innerHTML = '';\n\t\t\t\t\tshown.forEach((item, index) => {\n\t\t\t\t\t\tconst $item = document.createElement('div');\n\t\t\t\t\t\t$item.className = 'outline-menu-item';\n\t\t\t\t\t\tif (item.active) $item.classList.add('is-active');\n\t\t\t\t\t\tif (index === cursor) $item.classList.add('is-selected');\n\t\t\t\t\t\t$item.appendChild(ui.createIcon(item.icon || 'ti-align-left'));\n\t\t\t\t\t\tconst $label = document.createElement('span');\n\t\t\t\t\t\t$label.textContent = item.label;\n\t\t\t\t\t\t$item.appendChild($label);\n\t\t\t\t\t\t$item.addEventListener('click', (e) => {\n\t\t\t\t\t\t\te.stopPropagation();\n\t\t\t\t\t\t\tconfirm(index);\n\t\t\t\t\t\t});\n\t\t\t\t\t\t$items.appendChild($item);\n\t\t\t\t\t});\n\t\t\t\t};\n\n\t\t\t\tconst onMenuKeyDown = (e) => {\n\t\t\t\t\te.stopPropagation();\n\t\t\t\t\tswitch (e.key) {\n\t\t\t\t\t\tcase 'ArrowDown': e.preventDefault(); move(1); break;\n\t\t\t\t\t\tcase 'ArrowUp': e.preventDefault(); move(-1); break;\n\t\t\t\t\t\tcase 'Enter': e.preventDefault(); confirm(cursor); break;\n\t\t\t\t\t\tcase 'Escape': e.preventDefault(); closeMenu(); break;\n\t\t\t\t\t\tcase 'Tab': e.preventDefault(); break;\n\t\t\t\t\t}\n\t\t\t\t};\n\t\t\t\t$menu.addEventListener('keydown', onMenuKeyDown);\n\n\t\t\t\tif (filterPlaceholder) {\n\t\t\t\t\t$menu.classList.add('has-filter');\n\t\t\t\t\t$filter = document.createElement('input');\n\t\t\t\t\t$filter.type = 'text';\n\t\t\t\t\t$filter.spellcheck = false;\n\t\t\t\t\t$filter.className = 'form-input outline-menu-filter';\n\t\t\t\t\t$filter.placeholder = filterPlaceholder;\n\t\t\t\t\t$filter.addEventListener('input', () => { cursor = 0; paint(); });\n\t\t\t\t\t$filter.addEventListener('click', e => e.stopPropagation());\n\t\t\t\t\t$menu.appendChild($filter);\n\t\t\t\t}\n\n\t\t\t\t$menu.appendChild($items);\n\t\t\t\tpaint();\n\t\t\t\t$root.appendChild($menu);\n\t\t\t\t// Clamp to the root's box: a menu opened near the right edge would\n\t\t\t\t// otherwise widen the panel's scroll area and shove the view sideways.\n\t\t\t\tconst rootRect = $root.getBoundingClientRect();\n\t\t\t\tconst menuW = $menu.offsetWidth;\n\t\t\t\tconst left = Math.max(0, Math.min(x - rootRect.left, rootRect.width - menuW));\n\t\t\t\t$menu.style.left = `${left}px`;\n\t\t\t\t$menu.style.top = `${y - rootRect.top}px`;\n\t\t\t\t// Capture, so a click on the trigger closes this menu before the\n\t\t\t\t// trigger's own handler opens a fresh one — clicking the button again\n\t\t\t\t// re-renders rather than toggling off.\n\t\t\t\tdocument.addEventListener('click', onDocumentClick, true);\n\t\t\t\t// Something inside the menu must hold focus, or its keydown never fires.\n\t\t\t\tif ($filter) {\n\t\t\t\t\t$filter.focus();\n\t\t\t\t} else {\n\t\t\t\t\t$menu.tabIndex = -1;\n\t\t\t\t\t$menu.focus();\n\t\t\t\t}\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * A view whose property was deleted says so rather than passing for a\n\t\t\t * working outline that happens to be flat. Transient by design: the\n\t\t\t * installer's reconcile removes orphaned views.\n\t\t\t */\n\t\t\tconst renderOrphanNote = () => {\n\t\t\t\tif (!$note) return;\n\t\t\t\tconst orphaned = hierarchyBinding().orphaned;\n\t\t\t\t$note.textContent = orphaned\n\t\t\t\t\t? 'The property this view nested by is gone, so rows are flat. '\n\t\t\t\t\t\t+ 'Run \"Outline: install into a collection...\" to clean this up.'\n\t\t\t\t\t: '';\n\t\t\t};\n\n\t\t\t// --- inline editing --------------------------------------------------\n\n\t\t\t/**\n\t\t\t * The fields E-mode walks: Title first (native puts the title at the top\n\t\t\t * of a card's property list too), then the properties the row already\n\t\t\t * shows as chips, minus the types there is no editor for.\n\t\t\t *\n\t\t\t * The hierarchy field is deliberately NOT skipped, whether it is\n\t\t\t * `parent_page` or a hand-made one: re-hanging a branch is the edit an\n\t\t\t * outline is for. `parent_page` was in the skip list from the commit that\n\t\t\t * added E-mode, back when the tree came from a hand-made `Parent` field\n\t\t\t * and the sub-page field was unused; moving the hierarchy onto\n\t\t\t * `parent_page` turned that skip into a silent regression.\n\t\t\t */\n\t\t\tconst EDITABLE_TYPES = ['text', 'number', 'choice', 'record'];\n\t\t\tconst EDIT_SKIP_IDS = ['title', 'icon', 'collection'];\n\t\t\tconst editableFields = () => {\n\t\t\t\tconst canEdit = f => f && f.active !== false && !f.read_only\n\t\t\t\t\t&& EDITABLE_TYPES.includes(f.type) && !EDIT_SKIP_IDS.includes(f.id);\n\t\t\t\t// The fields the row already shows come first, then everything else\n\t\t\t\t// the collection has. Native property mode walks only the card's shown\n\t\t\t\t// properties; going wider is what puts a hand-made hierarchy field in\n\t\t\t\t// reach, since it is usually not one of the row's chips.\n\t\t\t\tconst shown = visibleFields().filter(canEdit);\n\t\t\t\tconst rest = (plugin.getConfiguration().fields || [])\n\t\t\t\t\t.filter(f => canEdit(f) && !shown.some(s => s.id === f.id));\n\t\t\t\tconst title = fieldsById()['title'];\n\t\t\t\treturn title ? [title, ...shown, ...rest] : [...shown, ...rest];\n\t\t\t};\n\n\t\t\t/** Title is a field like any other here, but its value comes off the record. */\n\t\t\tconst fieldText = (record, field) => {\n\t\t\t\tif (field.id === 'title') return record.getName() || '';\n\t\t\t\tconst value = propValue(record, field);\n\t\t\t\treturn value ? value.text : '';\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * A write is not readable in the same tick, and the refresh that follows\n\t\t\t * arrives on its own schedule — re-render once it has landed.\n\t\t\t */\n\t\t\tconst afterWrite = () => setTimeout(() => renderRows(), 60);\n\n\t\t\t/**\n\t\t\t * Swap an element for a text input. Enter and blur commit, Escape cancels.\n\t\t\t * The input stops its own keys from bubbling: the view's key hook would\n\t\t\t * otherwise read them as row navigation while the caret sits here.\n\t\t\t */\n\t\t\tconst editText = ($cell, value, { onCommit, onCancel }) => {\n\t\t\t\tconst $input = document.createElement('input');\n\t\t\t\t$input.type = 'text';\n\t\t\t\t$input.className = 'outline-inline-input';\n\t\t\t\t$input.value = value || '';\n\t\t\t\tlet done = false;\n\t\t\t\tconst finish = (commit) => {\n\t\t\t\t\tif (done) return;\n\t\t\t\t\tdone = true;\n\t\t\t\t\tif (commit) onCommit($input.value.trim());\n\t\t\t\t\telse if (onCancel) onCancel();\n\t\t\t\t};\n\t\t\t\t$input.addEventListener('keydown', (e) => {\n\t\t\t\t\te.stopPropagation();\n\t\t\t\t\tif (e.key === 'Enter') { e.preventDefault(); finish(true); }\n\t\t\t\t\telse if (e.key === 'Escape') { e.preventDefault(); finish(false); }\n\t\t\t\t});\n\t\t\t\t$input.addEventListener('blur', () => finish(true));\n\t\t\t\t$input.addEventListener('mouseup', e => e.stopPropagation());\n\t\t\t\t$cell.replaceWith($input);\n\t\t\t\t$input.focus();\n\t\t\t\t$input.select();\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * Edit a row's name in place. `isNew` marks a row that came from the\n\t\t\t * create button: leaving it without a name discards the record, the way\n\t\t\t * native cancels an untouched new card.\n\t\t\t */\n\t\t\tconst startNameEdit = (node, isNew) => {\n\t\t\t\tif (!$list) return;\n\t\t\t\tconst $row = $list.querySelector(`.outline-row[data-guid=\"${node.id}\"]`);\n\t\t\t\tconst $name = $row && $row.querySelector('.outline-name');\n\t\t\t\tif (!$name) return;\n\t\t\t\tconst discardIfEmpty = (text) => {\n\t\t\t\t\tif (isNew && !text) {\n\t\t\t\t\t\tnode.record.trash();\n\t\t\t\t\t\treturn true;\n\t\t\t\t\t}\n\t\t\t\t\treturn false;\n\t\t\t\t};\n\t\t\t\teditText($name, node.record.getName(), {\n\t\t\t\t\tonCommit: (text) => {\n\t\t\t\t\t\tif (!discardIfEmpty(text)) node.record.prop('title').set(text);\n\t\t\t\t\t\tfocusView();\n\t\t\t\t\t\tafterWrite();\n\t\t\t\t\t},\n\t\t\t\t\tonCancel: () => {\n\t\t\t\t\t\tdiscardIfEmpty('');\n\t\t\t\t\t\tfocusView();\n\t\t\t\t\t\tafterWrite();\n\t\t\t\t\t},\n\t\t\t\t});\n\t\t\t};\n\n\t\t\t/** Descendants of a node, so the Parent picker can't offer a cycle. */\n\t\t\tconst descendantsOf = (node) => {\n\t\t\t\tconst out = new Set();\n\t\t\t\tconst visit = n => n.children.forEach(child => {\n\t\t\t\t\tout.add(child.id);\n\t\t\t\t\tvisit(child);\n\t\t\t\t});\n\t\t\t\tvisit(node);\n\t\t\t\treturn out;\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * Candidates for a record-link field. A field pointing back at this\n\t\t\t * collection (`filter_colguid`) is answered from the records already\n\t\t\t * loaded; anything else has to be fetched from that collection.\n\t\t\t */\n\t\t\tconst recordCandidates = async (field, node) => {\n\t\t\t\tif (!field.filter_colguid || field.filter_colguid === collectionGuid()) {\n\t\t\t\t\tconst banned = descendantsOf(node);\n\t\t\t\t\treturn [...hierarchy.nodes.values()]\n\t\t\t\t\t\t.filter(n => n.id !== node.id && !banned.has(n.id))\n\t\t\t\t\t\t.map(n => ({ guid: n.id, name: n.name }));\n\t\t\t\t}\n\t\t\t\tconst other = plugin.data.getPluginByGuid(field.filter_colguid);\n\t\t\t\tif (!other || !other.getAllRecords) return [];\n\t\t\t\tconst records = await other.getAllRecords();\n\t\t\t\treturn records.map(r => ({ guid: r.guid, name: r.getName() || 'Unknown' }));\n\t\t\t};\n\n\t\t\t/** Open the editor for one field of one row, anchored at its value cell. */\n\t\t\tconst editField = (node, field, $cell) => {\n\t\t\t\tconst record = node.record;\n\t\t\t\tconst prop = () => record.prop(field.id);\n\n\t\t\t\tif (field.id === 'title' || field.type === 'text' || field.type === 'number') {\n\t\t\t\t\teditText($cell, fieldText(record, field), {\n\t\t\t\t\t\tonCommit: (text) => {\n\t\t\t\t\t\t\tif (field.type === 'number') {\n\t\t\t\t\t\t\t\tprop().set(text === '' ? null : Number(text));\n\t\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\t\tprop().set(text);\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\tfocusView();\n\t\t\t\t\t\t\tafterWrite();\n\t\t\t\t\t\t},\n\t\t\t\t\t\tonCancel: () => { focusView(); renderRows(); },\n\t\t\t\t\t});\n\t\t\t\t\treturn;\n\t\t\t\t}\n\n\t\t\t\tconst rect = $cell.getBoundingClientRect();\n\t\t\t\tconst icon = field.icon || 'ti-align-left';\n\n\t\t\t\tif (field.type === 'choice') {\n\t\t\t\t\tconst current = prop().choiceLabel();\n\t\t\t\t\tconst items = (field.choices || [])\n\t\t\t\t\t\t.filter(c => c.active !== false)\n\t\t\t\t\t\t.map(c => ({\n\t\t\t\t\t\t\tlabel: c.label,\n\t\t\t\t\t\t\ticon: c.icon || icon,\n\t\t\t\t\t\t\tactive: c.label === current,\n\t\t\t\t\t\t\tonSelect: () => { prop().setChoice(c.label); focusView(); afterWrite(); },\n\t\t\t\t\t\t}));\n\t\t\t\t\titems.push({\n\t\t\t\t\t\tlabel: 'Clear', icon: 'ti-x',\n\t\t\t\t\t\tonSelect: () => { prop().set(null); focusView(); afterWrite(); },\n\t\t\t\t\t});\n\t\t\t\t\tshowMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);\n\t\t\t\t\treturn;\n\t\t\t\t}\n\n\t\t\t\tif (field.type === 'record') {\n\t\t\t\t\tconst linked = record.linkedRecord(field.id);\n\t\t\t\t\t// The sub-page link is written through its own setter, which is\n\t\t\t\t\t// where the app's cycle and same-collection checks live. Every\n\t\t\t\t\t// other record field is a plain property write.\n\t\t\t\t\tconst link = (guid) => {\n\t\t\t\t\t\tif (field.id === 'parent_page') record.setSubPageOf(guid);\n\t\t\t\t\t\telse prop().set(guid);\n\t\t\t\t\t};\n\t\t\t\t\trecordCandidates(field, node).then(candidates => {\n\t\t\t\t\t\tif (viewContext.isDestroyed()) return;\n\t\t\t\t\t\tconst items = [{\n\t\t\t\t\t\t\tlabel: 'None', icon: 'ti-x',\n\t\t\t\t\t\t\tactive: !linked,\n\t\t\t\t\t\t\tonSelect: () => { link(null); focusView(); afterWrite(); },\n\t\t\t\t\t\t}];\n\t\t\t\t\t\tcandidates.forEach(c => items.push({\n\t\t\t\t\t\t\tlabel: c.name,\n\t\t\t\t\t\t\ticon,\n\t\t\t\t\t\t\tactive: linked && linked.guid === c.guid,\n\t\t\t\t\t\t\tonSelect: () => { link(c.guid); focusView(); afterWrite(); },\n\t\t\t\t\t\t}));\n\t\t\t\t\t\tshowMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);\n\t\t\t\t\t});\n\t\t\t\t}\n\t\t\t};\n\n\t\t\t/** Start editing the selected field of the row E-mode is open on. */\n\t\t\tconst editSelectedField = () => {\n\t\t\t\tif (!propMode || !$list) return;\n\t\t\t\tconst $row = $list.querySelector(`.outline-row[data-guid=\"${propMode.guid}\"]`);\n\t\t\t\tconst current = rows.find(r => r.node.id === propMode.guid);\n\t\t\t\tconst fields = editableFields();\n\t\t\t\tconst field = fields[propMode.index];\n\t\t\t\tif (!$row || !current || !field) return;\n\t\t\t\tconst $cell = $row.querySelector(`.outline-pe-row[data-index=\"${propMode.index}\"] .outline-pe-value`);\n\t\t\t\tif ($cell) editField(current.node, field, $cell);\n\t\t\t};\n\n\t\t\tconst paintPropSelection = () => {\n\t\t\t\tif (!$list) return;\n\t\t\t\t$list.querySelectorAll('.outline-pe-row').forEach($r => {\n\t\t\t\t\t$r.classList.toggle('is-selected', Number($r.dataset.index) === propMode.index);\n\t\t\t\t});\n\t\t\t};\n\n\t\t\tconst exitPropMode = () => {\n\t\t\t\tpropMode = null;\n\t\t\t\trenderRows();\n\t\t\t\tfocusView();\n\t\t\t};\n\n\t\t\t/**\n\t\t\t * The property list E opens under a row: one line per editable field,\n\t\t\t * ↑/↓ to walk them and Enter to edit — the app's \"property mode\", except\n\t\t\t * that a custom view has to draw and drive it itself.\n\t\t\t */\n\t\t\tconst buildPropEditor = (node, indent) => {\n\t\t\t\tconst $panel = document.createElement('div');\n\t\t\t\t$panel.className = 'outline-propedit';\n\t\t\t\t$panel.style.paddingLeft = `${indent + TWISTY_W + ROW_GAP}px`;\n\t\t\t\t// A click anywhere in here is the panel's own; the row underneath\n\t\t\t\t// would otherwise take it as \"open this record\".\n\t\t\t\t$panel.addEventListener('mouseup', e => e.stopPropagation());\n\t\t\t\tconst fields = editableFields();\n\t\t\t\tif (propMode.index >= fields.length) propMode.index = 0;\n\t\t\t\tfields.forEach((field, index) => {\n\t\t\t\t\tconst $prow = document.createElement('div');\n\t\t\t\t\t$prow.className = 'outline-pe-row';\n\t\t\t\t\t$prow.dataset.index = String(index);\n\t\t\t\t\tif (index === propMode.index) $prow.classList.add('is-selected');\n\n\t\t\t\t\tconst $icon = ui.createIcon(field.icon || 'ti-align-left');\n\t\t\t\t\t$icon.classList.add('outline-pe-icon');\n\t\t\t\t\t$prow.appendChild($icon);\n\n\t\t\t\t\tconst $label = document.createElement('span');\n\t\t\t\t\t$label.className = 'outline-pe-label';\n\t\t\t\t\t$label.textContent = field.label;\n\t\t\t\t\t$prow.appendChild($label);\n\n\t\t\t\t\tconst $value = document.createElement('span');\n\t\t\t\t\t$value.className = 'outline-pe-value';\n\t\t\t\t\tconst text = fieldText(node.record, field);\n\t\t\t\t\t$value.textContent = text || 'Empty';\n\t\t\t\t\tif (!text) $value.classList.add('is-empty');\n\t\t\t\t\t$prow.appendChild($value);\n\n\t\t\t\t\t$prow.addEventListener('mouseup', (e) => {\n\t\t\t\t\t\te.stopPropagation();\n\t\t\t\t\t\tif (e.button !== 0) return;\n\t\t\t\t\t\tpropMode.index = index;\n\t\t\t\t\t\tpaintPropSelection();\n\t\t\t\t\t\teditField(node, field, $value);\n\t\t\t\t\t});\n\t\t\t\t\t$panel.appendChild($prow);\n\t\t\t\t});\n\t\t\t\treturn $panel;\n\t\t\t};\n\n\t\t\t// --- rows ----------------------------------------------------------\n\n\t\t\t/** One property chip: the field's own icon plus its value. */\n\t\t\tconst propChip = (field, value) => {\n\t\t\t\tconst $prop = document.createElement('span');\n\t\t\t\t$prop.className = 'outline-prop';\n\n\t\t\t\tconst $icon = ui.createIcon(field.icon || 'ti-align-left');\n\t\t\t\t$icon.classList.add('outline-prop-icon');\n\t\t\t\t$prop.appendChild($icon);\n\n\t\t\t\tconst $value = document.createElement('span');\n\t\t\t\tif (value.color) {\n\t\t\t\t\t$value.className = 'outline-pill';\n\t\t\t\t\t$value.style.background = `var(--enum-${value.color}-bg)`;\n\t\t\t\t\t$value.style.color = `var(--enum-${value.color}-fg)`;\n\t\t\t\t} else if (value.guid) {\n\t\t\t\t\t$value.className = 'outline-link';\n\t\t\t\t} else {\n\t\t\t\t\t$value.className = 'outline-prop-text';\n\t\t\t\t}\n\t\t\t\t$value.textContent = value.text;\n\t\t\t\t$prop.appendChild($value);\n\n\t\t\t\tif (value.guid) {\n\t\t\t\t\tconst $arrow = document.createElement('span');\n\t\t\t\t\t$arrow.className = 'outline-link-arrow';\n\t\t\t\t\t$arrow.textContent = '↗';\n\t\t\t\t\t$value.appendChild($arrow);\n\t\t\t\t\t$prop.addEventListener('click', (e) => {\n\t\t\t\t\t\te.stopPropagation();\n\t\t\t\t\t\tviewContext.openRecordInThisPanel(value.guid);\n\t\t\t\t\t});\n\t\t\t\t}\n\n\t\t\t\treturn $prop;\n\t\t\t};\n\n\t\t\tconst renderRows = () => {\n\t\t\t\tif (!$list) return;\n\t\t\t\tconst fields = visibleFields();\n\t\t\t\t$list.innerHTML = '';\n\t\t\t\trows = hierarchy ? flatten() : [];\n\n\t\t\t\tif (rows.length === 0) {\n\t\t\t\t\tconst $empty = document.createElement('div');\n\t\t\t\t\t$empty.className = 'outline-empty';\n\t\t\t\t\t$empty.textContent = 'No records';\n\t\t\t\t\t$list.appendChild($empty);\n\t\t\t\t\treturn;\n\t\t\t\t}\n\n\t\t\t\trows.forEach(({ node, depth }, index) => {\n\t\t\t\t\tconst hasChildren = node.children.length > 0;\n\t\t\t\t\tconst indent = ROW_PAD_X + depth * DEPTH_STEP;\n\n\t\t\t\t\tconst $row = document.createElement('div');\n\t\t\t\t\t$row.className = 'outline-row';\n\t\t\t\t\t// Only ever set while a filter is on: a context row is one the\n\t\t\t\t\t// filter dropped and the tree needed back.\n\t\t\t\t\tif (contextGuids.has(node.id)) $row.classList.add('is-context');\n\t\t\t\t\t$row.dataset.index = String(index);\n\t\t\t\t\t// Focusable but not in the Tab order: Tab is handled explicitly,\n\t\t\t\t\t// while unhandled keys (Shift+Tab) need a focused node here so the\n\t\t\t\t\t// browser walks focus from the row, not from the view root.\n\t\t\t\t\t$row.tabIndex = -1;\n\t\t\t\t\t$row.dataset.guid = node.id;\n\t\t\t\t\t// restack() needs the depth indent to line the chips up under the\n\t\t\t\t\t// row icon once they are out of the title line.\n\t\t\t\t\t$row.dataset.indent = String(indent);\n\n\t\t\t\t\tconst $title = document.createElement('div');\n\t\t\t\t\t$title.className = 'outline-title';\n\t\t\t\t\t$title.style.paddingLeft = `${indent}px`;\n\n\t\t\t\t\tconst $twisty = document.createElement('span');\n\t\t\t\t\t$twisty.className = 'outline-twisty';\n\t\t\t\t\tif (hasChildren) {\n\t\t\t\t\t\t$twisty.appendChild(ui.createIcon('ti-chevron-right'));\n\t\t\t\t\t\t$twisty.classList.toggle('expanded', isExpanded(node));\n\t\t\t\t\t\t// On mouseup, not click: the row opens on mouseup, which fires\n\t\t\t\t\t\t// first, so a click-phase stopPropagation() here toggles the\n\t\t\t\t\t\t// node AND navigates to it. Left button only, so middle-click\n\t\t\t\t\t\t// still falls through to the row's open-aside.\n\t\t\t\t\t\t$twisty.addEventListener('mouseup', (e) => {\n\t\t\t\t\t\t\tif (e.button !== 0) return;\n\t\t\t\t\t\t\te.stopPropagation();\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\ttoggle(node);\n\t\t\t\t\t\t});\n\t\t\t\t\t}\n\t\t\t\t\t$title.appendChild($twisty);\n\n\t\t\t\t\tconst $icon = ui.createIcon(plugin.getConfiguration().icon || 'ti-file');\n\t\t\t\t\t$icon.classList.add('outline-icon');\n\t\t\t\t\t$title.appendChild($icon);\n\n\t\t\t\t\tconst $name = document.createElement('span');\n\t\t\t\t\t$name.className = 'outline-name';\n\t\t\t\t\t$name.textContent = node.name;\n\t\t\t\t\t$title.appendChild($name);\n\n\t\t\t\t\tif (hasChildren && !isExpanded(node)) {\n\t\t\t\t\t\tconst $count = document.createElement('span');\n\t\t\t\t\t\t$count.className = 'outline-count';\n\t\t\t\t\t\t$count.textContent = String(node.children.length);\n\t\t\t\t\t\t$title.appendChild($count);\n\t\t\t\t\t}\n\n\t\t\t\t\tconst chips = fields\n\t\t\t\t\t\t.map(field => ({ field, value: propValue(node.record, field) }))\n\t\t\t\t\t\t.filter(entry => entry.value);\n\t\t\t\t\tif (chips.length) {\n\t\t\t\t\t\tconst $props = document.createElement('span');\n\t\t\t\t\t\t$props.className = 'outline-props';\n\t\t\t\t\t\tchips.forEach(({ field, value }) => $props.appendChild(propChip(field, value)));\n\t\t\t\t\t\t$title.appendChild($props);\n\t\t\t\t\t}\n\n\t\t\t\t\tconst $time = document.createElement('span');\n\t\t\t\t\t$time.className = 'outline-time';\n\t\t\t\t\t$time.textContent = timeAgo(node.record.date('Modified'));\n\t\t\t\t\t$title.appendChild($time);\n\n\t\t\t\t\t$row.appendChild($title);\n\n\t\t\t\t\tif (propMode && propMode.guid === node.id) {\n\t\t\t\t\t\t$row.appendChild(buildPropEditor(node, indent));\n\t\t\t\t\t}\n\n\t\t\t\t\t// Native list cards act on mouseup, not click, so middle-click is\n\t\t\t\t\t// caught too: shift = focus only, middle or cmd/ctrl = other panel,\n\t\t\t\t\t// plain left = this panel.\n\t\t\t\t\t$row.addEventListener('mouseup', (e) => {\n\t\t\t\t\t\tif (e.button !== 0 && e.button !== 1) return;\n\t\t\t\t\t\thidePeek();\n\t\t\t\t\t\tsetSelection(index);\n\t\t\t\t\t\tif (e.button === 0 && e.shiftKey) {\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\treturn;\n\t\t\t\t\t\t}\n\t\t\t\t\t\tif (e.button === 1 || e.metaKey || e.ctrlKey) {\n\t\t\t\t\t\t\tviewContext.openRecordInOtherPanel(node.id);\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\tviewContext.openRecordInThisPanel(node.id);\n\t\t\t\t\t\t}\n\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t});\n\n\t\t\t\t\t$list.appendChild($row);\n\t\t\t\t});\n\n\t\t\t\trestack();\n\t\t\t\tsetSelection(selectedIndex);\n\n\t\t\t\t// A record created from the create card or Shift+Enter\n\t\t\t\t// shows up here on the refresh that followed; open its name.\n\t\t\t\tif (pendingNameEditGuid) {\n\t\t\t\t\tconst at = rows.findIndex(r => r.node.id === pendingNameEditGuid);\n\t\t\t\t\tpendingNameEditGuid = null;\n\t\t\t\t\tif (at !== -1) {\n\t\t\t\t\t\tsetSelection(at);\n\t\t\t\t\t\tstartNameEdit(rows[at].node, true);\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t};\n\n\t\t\t/** Build the chrome once; renderRows() then only swaps out the list body. */\n\t\t\tconst mount = () => {\n\t\t\t\tconst $element = viewContext.getElement();\n\t\t\t\t$element.innerHTML = '';\n\n\t\t\t\t$root = document.createElement('div');\n\t\t\t\t// collection-list-view carries the --list-* metrics (insets, row\n\t\t\t\t// overhang, gaps) that the native list rows and create card are\n\t\t\t\t// sized from; it only sets width:100%/position:relative itself.\n\t\t\t\t$root.className = 'outline-root collection-list-view';\n\n\t\t\t\t$note = document.createElement('div');\n\t\t\t\t$note.className = 'outline-note';\n\t\t\t\t$root.appendChild($note);\n\n\t\t\t\t$list = document.createElement('div');\n\t\t\t\t$list.className = 'outline-list';\n\t\t\t\t$root.appendChild($list);\n\n\t\t\t\tif (viewContext.supportsCreateRecord()) {\n\t\t\t\t\t// Same markup the list view's renderCreateCard() emits.\n\t\t\t\t\tconst $create = document.createElement('button');\n\t\t\t\t\t$create.type = 'button';\n\t\t\t\t\t$create.className = 'collection-list-create-card';\n\t\t\t\t\t$create.style.paddingLeft = `calc(var(--list-row-overhang) + ${ICON_OFFSET}px)`;\n\t\t\t\t\t$create.appendChild(ui.createIcon('ti-plus'));\n\t\t\t\t\tconst $label = document.createElement('span');\n\t\t\t\t\t$label.textContent = `New ${viewContext.getRecordTypeName()}`;\n\t\t\t\t\t$create.appendChild($label);\n\t\t\t\t\tconst $kbd = document.createElement('kbd');\n\t\t\t\t\t$kbd.className = 'collection-list-create-card-shortcut';\n\t\t\t\t\t$kbd.textContent = '⇧↵';\n\t\t\t\t\t$create.appendChild($kbd);\n\t\t\t\t\t$create.addEventListener('click', (e) => {\n\t\t\t\t\t\te.stopPropagation();\n\t\t\t\t\t\tcreateRecord();\n\t\t\t\t\t});\n\t\t\t\t\t$root.appendChild($create);\n\t\t\t\t}\n\n\t\t\t\t$element.appendChild($root);\n\t\t\t};\n\n\t\t\treturn {\n\t\t\t\tonLoad: () => {\n\t\t\t\t\tui.injectCSS(/* css */`\n\t\t\t\t\t\t.outline-root {\n\t\t\t\t\t\t\tposition: relative;\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t\tfont-family: var(--font-sans);\n\t\t\t\t\t\t\tfont-size: var(--text-size-normal);\n\t\t\t\t\t\t\tcolor: var(--text-default);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-note {\n\t\t\t\t\t\t\tfont-size: 12px;\n\t\t\t\t\t\t\tcolor: var(--enum-orange-fg, #c60);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-note:empty {\n\t\t\t\t\t\t\tdisplay: none;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu {\n\t\t\t\t\t\t\tposition: absolute;\n\t\t\t\t\t\t\tz-index: 20;\n\t\t\t\t\t\t\tmin-width: 180px;\n\t\t\t\t\t\t\tpadding: 4px;\n\t\t\t\t\t\t\tbackground: var(--cmdpal-bg-color);\n\t\t\t\t\t\t\tborder: 1px solid var(--cmdpal-border-color);\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tbox-shadow: var(--cmdpal-box-shadow);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu.has-filter {\n\t\t\t\t\t\t\tmin-width: 250px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-filter {\n\t\t\t\t\t\t\twidth: 100%;\n\t\t\t\t\t\t\tmargin-bottom: 4px;\n\t\t\t\t\t\t\tbackground: transparent;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-item {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t\tpadding: 5px 8px;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-fg-color);\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-item:hover {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-hover-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-hover-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the current value, as the app's .autocomplete--current */\n\t\t\t\t\t\t.outline-menu-item.is-active {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-current-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-current-fg-color);\n\t\t\t\t\t\t\tfont-weight: 700;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the keyboard highlight, as .autocomplete--option-selected */\n\t\t\t\t\t\t.outline-menu-item.is-selected,\n\t\t\t\t\t\t.outline-menu-item.is-selected:hover {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-selected-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-selected-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-list {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row {\n\t\t\t\t\t\t\tpadding: 4px 12px 4px 0;\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t\tuser-select: none;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row:hover {\n\t\t\t\t\t\t\tbackground: var(--prop-bg-hover);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row.selected {\n\t\t\t\t\t\t\tbackground: var(--cards-bg-focused);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-title {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tjustify-content: center;\n\t\t\t\t\t\t\twidth: 16px;\n\t\t\t\t\t\t\theight: 16px;\n\t\t\t\t\t\t\tflex: 0 0 16px;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\tborder-radius: 3px;\n\t\t\t\t\t\t\ttransition: transform 0.12s ease;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty.expanded {\n\t\t\t\t\t\t\ttransform: rotate(90deg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty:hover {\n\t\t\t\t\t\t\tbackground: var(--ed-fold-icon-hover-bg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-icon {\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-name {\n\t\t\t\t\t\t\tflex: 0 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\tfont-weight: 600;\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * A row the filter dropped, kept only to hold a match's place.\n\t\t\t\t\t\t * Dimmed rather than hidden: it still has to read as the path\n\t\t\t\t\t\t * down to the match, and it is still a working row — clickable,\n\t\t\t\t\t\t * foldable, editable. The matches themselves are left alone, so\n\t\t\t\t\t\t * an unfiltered tree looks exactly as it always did.\n\t\t\t\t\t\t *\n\t\t\t\t\t\t * Recoloring the name alone was not enough to see, at either\n\t\t\t\t\t\t * --text-subtle (text-500, one step off the default — invisible)\n\t\t\t\t\t\t * or --text-muted (text-800). Fading the WHOLE row instead takes\n\t\t\t\t\t\t * the name, the icon, the chips and the timestamp down together,\n\t\t\t\t\t\t * which is what makes the matched rows pop out of the column; the\n\t\t\t\t\t\t * name also loses its bold, so weight carries the same signal\n\t\t\t\t\t\t * where a theme's colors are close together.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-row.is-context {\n\t\t\t\t\t\t\topacity: .45;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row.is-context .outline-name {\n\t\t\t\t\t\t\tfont-weight: 400;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* Full strength again on hover or focus — a faded row is still a\n\t\t\t\t\t\t   working row, and it should not look inert while pointed at. */\n\t\t\t\t\t\t.outline-row.is-context:hover,\n\t\t\t\t\t\t.outline-row.is-context.selected {\n\t\t\t\t\t\t\topacity: 1;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-count {\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcolor: var(--text-subtle);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * A fixed column, not shrink-to-fit: the chips are pushed up\n\t\t\t\t\t\t * against the stamp, so a stamp that is one character shorter\n\t\t\t\t\t\t * (\"1h ago\" against \"16m ago\") would otherwise leave that row's\n\t\t\t\t\t\t * chips ending at a different x from every other row's.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-time {\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tmin-width: 8ch;\n\t\t\t\t\t\t\ttext-align: right;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * Chips are pushed to the right, so they and the timestamp read\n\t\t\t\t\t\t * as one right-hand column instead of trailing the name at a\n\t\t\t\t\t\t * different x on every row.\n\t\t\t\t\t\t *\n\t\t\t\t\t\t * This is the ONLY auto margin on the line. Giving the stamp one\n\t\t\t\t\t\t * as well splits the free space evenly between the two, which\n\t\t\t\t\t\t * left the chips floating mid-row at a position that tracked the\n\t\t\t\t\t\t * name's length — the opposite of aligned.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-props {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tgap: 10px;\n\t\t\t\t\t\t\tmargin-left: auto;\n\t\t\t\t\t\t\tpadding-right: 10px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * Two-line fallback: the chips are moved out of the title line\n\t\t\t\t\t\t * (restack()), which keeps that line unwrappable — the name\n\t\t\t\t\t\t * ellipsises and the timestamp stays put, as native does. The\n\t\t\t\t\t\t * left offset is set inline, since it follows the row's depth.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t/* Wrapped, the chips are left-aligned under the row icon: there\n\t\t\t\t\t\t   is no stamp on line 2 to align them against, and a lone\n\t\t\t\t\t\t   right-aligned run reads as belonging to the row below. */\n\t\t\t\t\t\t.outline-row.is-stacked .outline-props {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tjustify-content: flex-start;\n\t\t\t\t\t\t\tmargin-left: 0;\n\t\t\t\t\t\t\tmargin-top: 2px;\n\t\t\t\t\t\t\tpadding-right: 0;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 4px;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop-icon {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop-text {\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pill {\n\t\t\t\t\t\t\tborder-radius: 4px;\n\t\t\t\t\t\t\tpadding: 1px 6px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link {\n\t\t\t\t\t\t\tcolor: var(--ed-inlineref-fg);\n\t\t\t\t\t\t\tborder-radius: 4px;\n\t\t\t\t\t\t\tpadding: 1px 6px;\n\t\t\t\t\t\t\tbackground: var(--ed-backlink-bg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link:hover {\n\t\t\t\t\t\t\tcolor: var(--ed-inlineref-hover-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link-arrow {\n\t\t\t\t\t\t\tmargin-left: 3px;\n\t\t\t\t\t\t\topacity: 0.7;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the property list E opens under a row */\n\t\t\t\t\t\t.outline-propedit {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t\tgap: 1px;\n\t\t\t\t\t\t\tmargin-top: 4px;\n\t\t\t\t\t\t\tpadding-bottom: 2px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t\tpadding: 3px 6px;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row:hover {\n\t\t\t\t\t\t\tbackground: var(--prop-bg-hover);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row.is-selected {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-selected-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-selected-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-icon {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-label {\n\t\t\t\t\t\t\tflex: 0 0 140px;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row.is-selected .outline-pe-label {\n\t\t\t\t\t\t\tcolor: inherit;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-value {\n\t\t\t\t\t\t\tflex: 1 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-value.is-empty {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-inline-input {\n\t\t\t\t\t\t\tflex: 1 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\tpadding: 1px 4px;\n\t\t\t\t\t\t\tborder: var(--input-border-focus);\n\t\t\t\t\t\t\tborder-radius: 3px;\n\t\t\t\t\t\t\tbackground: var(--panel-bg-color);\n\t\t\t\t\t\t\tcolor: var(--text-default);\n\t\t\t\t\t\t\tfont-family: var(--font-sans);\n\t\t\t\t\t\t\tfont-size: inherit;\n\t\t\t\t\t\t\tfont-weight: inherit;\n\t\t\t\t\t\t\toutline: none;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-empty {\n\t\t\t\t\t\t\tpadding: 40px;\n\t\t\t\t\t\t\ttext-align: center;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t`);\n\t\t\t\t\t// Despite the name, makeNormalLayout() applies the panel's\n\t\t\t\t\t// \"layout-margin-overview\" modifier (max 1200px) — the same width\n\t\t\t\t\t// the built-in list view uses. makeWideLayout() drops the cap.\n\t\t\t\t\tviewContext.makeNormalLayout();\n\t\t\t\t\tmount();\n\t\t\t\t},\n\n\t\t\t\tonRefresh: ({ records }) => {\n\t\t\t\t\tconst parentFieldId = hierarchyFieldId();\n\t\t\t\t\t// The app hands over the matches alone once its search or a filter\n\t\t\t\t\t// is on; the tree needs the path down to each of them back.\n\t\t\t\t\tconst completed = withAncestors(records, parentFieldId);\n\t\t\t\t\thierarchy = buildHierarchy(completed.records, parentFieldId);\n\t\t\t\t\tcontextGuids = completed.added;\n\t\t\t\t\tcomputeForceExpanded(contextGuids);\n\t\t\t\t\tif (!$list) mount();\n\t\t\t\t\trenderOrphanNote();\n\t\t\t\t\trenderRows();\n\t\t\t\t},\n\n\t\t\t\tonPanelResize: () => restack(),\n\n\t\t\t\tonDestroy: () => {\n\t\t\t\t\tcloseMenu();\n\t\t\t\t\thidePeek();\n\t\t\t\t\tpropMode = null;\n\t\t\t\t\tpendingNameEditGuid = null;\n\t\t\t\t\thierarchy = null;\n\t\t\t\t\trows = [];\n\t\t\t\t\t$root = null;\n\t\t\t\t\t$list = null;\n\t\t\t\t\t$note = null;\n\t\t\t\t\t$menu = null;\n\t\t\t\t},\n\n\t\t\t\tonFocus: () => {},\n\t\t\t\tonBlur: () => {},\n\n\t\t\t\tonKeyboardNavigation: ({ e }) => {\n\t\t\t\t\t// An open menu owns the keyboard; its own keydown drives it.\n\t\t\t\t\tif ($menu) return;\n\n\t\t\t\t\t// The hook still fires while something OUTSIDE this view holds\n\t\t\t\t\t// focus — the panel's breadcrumb button and the panel's own search\n\t\t\t\t\t// box, for two. Treating those keys as row navigation made Tab jump\n\t\t\t\t\t// into the rows from up there. Only act when the focused element is\n\t\t\t\t\t// ours, or when nothing in particular has focus (document.body),\n\t\t\t\t\t// which is the state the view sits in normally.\n\t\t\t\t\tconst $focused = document.activeElement;\n\t\t\t\t\tif ($focused && $focused !== document.body\n\t\t\t\t\t\t&& $root && !$root.contains($focused)) return;\n\t\t\t\t\t// An open inline editor handles its own keys.\n\t\t\t\t\tif ($focused && $focused.classList\n\t\t\t\t\t\t&& $focused.classList.contains('outline-inline-input')) return;\n\n\t\t\t\t\tif (rows.length === 0) return;\n\t\t\t\t\tconst current = rows[selectedIndex];\n\t\t\t\t\tif (!current) return;\n\n\t\t\t\t\t// Property mode owns the keyboard while it is open: ↑/↓ walk the\n\t\t\t\t\t// row's fields, Enter edits the highlighted one, Escape (or E\n\t\t\t\t\t// again) leaves. Everything else is swallowed rather than falling\n\t\t\t\t\t// through to row navigation, which would scroll the list out from\n\t\t\t\t\t// under the open property list.\n\t\t\t\t\tif (propMode) {\n\t\t\t\t\t\tconst fields = editableFields();\n\t\t\t\t\t\tif (e.key === 'ArrowDown' || e.key === 'ArrowUp') {\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\tconst step = e.key === 'ArrowDown' ? 1 : -1;\n\t\t\t\t\t\t\tpropMode.index = (propMode.index + step + fields.length) % fields.length;\n\t\t\t\t\t\t\tpaintPropSelection();\n\t\t\t\t\t\t\treturn;\n\t\t\t\t\t\t}\n\t\t\t\t\t\tif (e.key === 'Enter') {\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\teditSelectedField();\n\t\t\t\t\t\t\treturn;\n\t\t\t\t\t\t}\n\t\t\t\t\t\tif (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\texitPropMode();\n\t\t\t\t\t\t\treturn;\n\t\t\t\t\t\t}\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\n\t\t\t\t\t// E opens the focused row's properties, as it does on a native card.\n\t\t\t\t\tif ((e.key === 'e' || e.key === 'E')\n\t\t\t\t\t\t&& !e.metaKey && !e.ctrlKey && !e.altKey) {\n\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\tif (editableFields().length) {\n\t\t\t\t\t\t\tpropMode = { guid: current.node.id, index: 0 };\n\t\t\t\t\t\t\trenderRows();\n\t\t\t\t\t\t}\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\n\t\t\t\t\tif (e.key === 'Enter' && e.shiftKey) {\n\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\tcreateRecord();\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\n\t\t\t\t\t// \"/\" is left alone: the search box it jumps to is the panel's own\n\t\t\t\t\t// now, and the app already binds the key to it.\n\n\t\t\t\t\t// Cmd/Ctrl+Enter opens aside, matching the native card handler.\n\t\t\t\t\tif (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {\n\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t// A peek already put the record aside; keep that panel.\n\t\t\t\t\t\tif (peekPanelId) commitPeek();\n\t\t\t\t\t\telse openSelected(true);\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\n\t\t\t\t\t// While peeking, Escape exits and Enter commits — the same pair\n\t\t\t\t\t// the app puts in the status bar during a peek.\n\t\t\t\t\tif (peekPanelId && e.key === 'Escape') {\n\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\thidePeek();\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\t\t\t\t\tif (e.key === ' ') {\n\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\ttogglePeek();\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\n\t\t\t\t\t// Collapse/expand lives on Cmd/Ctrl + ↑/↓, leaving ←/→ free to\n\t\t\t\t\t// walk rows. ↓ opens a node, ↑ closes it or climbs to the parent.\n\t\t\t\t\t// With nothing to open or close they fall back to plain ↑/↓, so\n\t\t\t\t\t// the key never feels dead on a leaf.\n\t\t\t\t\tif ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {\n\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\tconst hasChildren = current.node.children.length > 0;\n\t\t\t\t\t\tif (e.key === 'ArrowDown') {\n\t\t\t\t\t\t\tif (hasChildren && !isExpanded(current.node)) toggle(current.node);\n\t\t\t\t\t\t\telse selectNext(1);\n\t\t\t\t\t\t} else if (hasChildren && isExpanded(current.node)) {\n\t\t\t\t\t\t\ttoggle(current.node);\n\t\t\t\t\t\t} else if (current.parent) {\n\t\t\t\t\t\t\tconst up = rows.findIndex(r => r.node.id === current.parent.id);\n\t\t\t\t\t\t\tif (up !== -1) setSelection(up);\n\t\t\t\t\t\t} else {\n\t\t\t\t\t\t\tselectNext(-1);\n\t\t\t\t\t\t}\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\n\t\t\t\t\tswitch (e.key) {\n\t\t\t\t\t\tcase 'Tab':\n\t\t\t\t\t\t\t// Only plain Tab is row navigation. The native card handler\n\t\t\t\t\t\t\t// normalizes the event first, and its switch has no\n\t\t\t\t\t\t\t// \"Shift+Tab\" case, so that one falls through with no\n\t\t\t\t\t\t\t// preventDefault and the browser's own focus order takes\n\t\t\t\t\t\t\t// over — which is why native Shift+Tab looks erratic.\n\t\t\t\t\t\t\tif (e.shiftKey) return;\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\tselectNext(1);\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase 'ArrowDown':\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\tselectNext(1);\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase 'ArrowUp':\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\t// Native hands focus back to the panel's search box from the\n\t\t\t\t\t\t\t// first row. That box belongs to the app, and plugin code has\n\t\t\t\t\t\t\t// no business reaching into the app's DOM to focus it, so the\n\t\t\t\t\t\t\t// selection wraps to the last row instead.\n\t\t\t\t\t\t\tselectNext(-1);\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\t// ←/→ cycle rows like ↑/↓ do. They also have to be swallowed:\n\t\t\t\t\t\t// left alone, the app moves the panel left/right.\n\t\t\t\t\t\tcase 'ArrowRight':\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\tselectNext(1);\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase 'ArrowLeft':\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\tselectNext(-1);\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase 'Home':\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\tsetSelection(0);\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase 'End':\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\tsetSelection(rows.length - 1);\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase 'Enter':\n\t\t\t\t\t\t\te.preventDefault();\n\t\t\t\t\t\t\t// Enter during a peek commits it: the side panel stays.\n\t\t\t\t\t\t\tif (peekPanelId) commitPeek();\n\t\t\t\t\t\t\telse openSelected(false);\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t}\n\t\t\t\t},\n\t\t\t};\n\t\t});\n\t}\n\n}\n";

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

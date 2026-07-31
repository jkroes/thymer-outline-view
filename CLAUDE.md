# outline-view — implementation notes

Working notes for anyone (human or agent) changing this code. The user-facing
description lives in `README.md`; this file is the *why*, and the record of
undocumented app behavior the view leans on.

A `CollectionPlugin` that adds one custom view, **Outline** (view id `outline`):
a collection rendered as an indented, collapsible tree, styled to sit alongside
the built-in List view.

**Nothing in `plugin.js` is bound to a particular collection.** It reads the
collection's own config at runtime — fields, views, sort, item name — so the
same code drops onto any self-referencing collection unchanged. It was developed
against a collection of organizations, which is all the old
`organizations-outline` name meant.

Hierarchy comes from **sub-pages** — `parent_page`, the field the app itself
provisions. Records with no parent (or one outside the result set) become
roots. `hierarchyFieldId()` picks the field: `parent_page` when the collection
has sub-pages on, otherwise the first `record` field whose `filter_colguid` is
this collection, so the view still works on a collection that nests through a
hand-made field. See "Sub-pages" below for what that field is and what it does
not do.

## Files

`plugin.js` is the whole plugin. It declares a bare `class Plugin`, no `export`,
so the file is paste-ready for the in-app Custom Code editor with no edit step.
That also means `plugins/build.sh` can't bundle it — that script's
`--format=iife --global-name=plugins` needs an export. Nothing here uses it;
deploy is the `thymercli` path below.

**There is deliberately no `plugin.json`.** A collection config is one
workspace's schema — its guids, field ids and choice ids — not part of the
plugin, and it is re-readable from the live app any time (see below), so
committing one only ships a snapshot that goes stale and that nobody else can
apply. The view's own config entry is small enough to write by hand:

```json
{ "id": "outline", "label": "Outline", "type": "custom",
  "icon": "ti-list-tree", "shown": true, "field_ids": [...],
  "sort_field_id": "title", "sort_dir": "asc" }
```

## Deploy

`thymercli` talks to the desktop app's built-in MCP server on port 13100.
`<Collection>` is the target collection's name, `<workspace-guid>` its
workspace's guid.

```bash
bin/thymercli plugin update code <Collection> \
  -w <workspace-guid> < plugins/outline-view/plugin.js
```

**Pass the workspace GUID, not the name.** A name fails with "MCP access is
disabled for this workspace"; the GUID works.

The view id has to already exist in the collection's config, and code and config
must go out **together** when that id changes — see the registration note below.
Read the live config, edit it, push it back:

```bash
bin/thymercli plugin show <Collection> -w <workspace-guid> --json | jq '.config' > /tmp/config.json
# edit /tmp/config.json
bin/thymercli plugin update config <Collection> -w <workspace-guid> --file /tmp/config.json
```

`update config` replaces the collection's entire schema and view list, so read
before you write and don't push a config from a different collection.

## What the view does

- **Indented rows** by depth, each node expandable. Collapse state persists per
  device in `localStorage` under `outline-collapsed:<collection name>`.
- **Search** filters on the record name and every visible property. A match
  keeps its ancestors visible so the path down to it stays readable; those
  ancestors are force-expanded via a separate set, so the twisty still works
  mid-search. Arrow keys drive the list while the caret is in the box.
- **Properties** come from the view's own settings (`getVisiblePropertyIds()`),
  rendered by type — choice as a colored pill, record as a link chip with `↗`,
  number/text as plain text. Editing visible properties in view settings
  changes the rows.
- **Rows adapt** between one and two lines: chips sit on line 1 when they fit,
  **right-aligned** against the timestamp so every row's chips end at the same
  x, and drop to a second line — **left-aligned** under the row icon — when
  they don't. The name ellipsises rather than wrapping, and the stamp holds
  line 1 either way. See `restack()` below.
- **Rebuilt toolbar** (custom views get none — see below): view tabs, New
  <item>, sort field, sort direction. View management — add, rename, configure —
  is left to the app's own collection-settings screen.
- **Sort menu** offers the same fields the app does, from its own predicate (see
  below). It does *not* offer Custom Order — that sorts on a per-view drag
  position this view has no way to write, so it could only ever mean creation
  order. A view left with no sort field falls back to Title.
- **Peek** on Space: opens the focused record in the side panel and follows the
  selection as you keep arrowing. A second Space closes that panel — or, if the
  peek borrowed a panel the user already had open, puts it back on what it was
  showing.
- **Property mode on E**: the focused row's fields open as an indented list
  under it, ↑/↓ walk them, Enter edits the highlighted one, Escape or E closes.
  Text and number get an inline input; choice and record-link get the same
  filter menu the sort button uses. See below for how the field list is chosen
  and how the writes are made.
- **New \<item\> leaves the row in place** with its name in edit mode, rather
  than navigating to the new page. Leaving it unnamed discards the record, as
  native does with an untouched new card.
- **Collapse/expand is ⌘↑/⌘↓**, not ←/→ — those cycle rows, matching the way
  the arrows behave everywhere else in the panel.
- **Keys and mouse follow the native list view**, read out of the bundle rather
  than guessed — see the table below for what matches and what can't.

## Native list-view keys and mouse, and what this view does

The app's card views handle keys in `onKeyboardNavigation` (a shared cards base
plus a list-view override) and mouse in `mouseup`/`dblclick` delegates on
`this.cardSelector()`. Both were read out of the bundle. `Wi(e)` normalizes an
event into a string like `"Shift+Enter"`, so anything not in those switches
falls through untouched.

| input | native list view | here |
|---|---|---|
| ↓ | next row, wrapping past the last via `(r % len + len) % len`; upstream of the rows it walks the chain below | same |
| ↑ | previous row; from the **first** row the search box, then the active view tab, then the panel title | same up to the view tab. The title is the app's, so ArrowUp there is left alone |
| Tab | view tabs → the buttons to their right → search box → rows, then steps down the rows and wraps | same. Toolbar Tab is moved by hand: the browser default never reaches the view, though Shift+Tab's does |
| Shift+Tab | **no defined behavior.** `Wi(e)` normalizes it to `"Shift+Tab"`, which matches no case in the cards switch, so it falls through with no `preventDefault` and the browser's focus order decides — starting from the card, its title, or a property row, whichever holds focus. Lands on the toolbar or the search box seemingly at random | same: left unhandled on purpose. Reaching the *same* elements needed the selected row to hold real DOM focus — see below |
| ← / → | move by one grid column — a no-op in a 1-column list, so the app reads them as move-panel-left/right | cycle rows, ← up and → down, both wrapping. On a toolbar button they cycle along the buttons instead. Swallowed either way, or the panel shifts |
| ⌘/Ctrl + ↑ / ↓ | — | collapse / expand. ⌘↓ opens a collapsed node, ⌘↑ closes an open one or climbs to the parent; with nothing to open or close, both fall back to plain ↑/↓ so the key is never dead on a leaf |
| Home / End | first / last card | same |
| Enter | open focused record in this panel; during a peek, *commit* the preview | same |
| ⌘/Ctrl+Enter | open aside (other panel); during a peek, commit | same |
| Shift+Enter | create a card below | create (position not controllable), then the new row's name opens for editing in place |
| Alt+Enter | create a card above | — no SDK call for positioned create |
| Space | peek — put the record in the side panel; Space again closes it | same, and a side panel that was already open is restored to its own contents rather than closed |
| Escape | exit peek, or cancel an untouched new card | closes the peek panel |
| ⌘+[ / ⌘+] | panel history back / forward | the app's own, but see the peek history note |
| `/` | focus the collection search box | same |
| M | move mode — keyboard drag-reorder, refused while sorted | — no SDK write for the per-view `$o:<viewId>` order key |
| E | property mode — ↑/↓ through a card's properties, Enter edits | same, drawn and driven here: the app's card editor is unreachable, so the field list, the highlight and the editors are all rebuilt. See "Property mode" below |
| trash shortcut | trash the focused record | — not implemented |
| left click | focus the card, then open in this panel | same |
| Shift+click | focus only, no open | same |
| ⌘/Ctrl+click, middle click | open aside | same |
| double click | open in this panel | same (single click already opens) |
| click a property row or the title | focus that field for inline editing | opens the linked record for `record` chips; other types are inert |
| drag | reorder (writes custom order) | — not implemented |

Three details worth keeping in mind.

Native acts on **`mouseup`**, not `click`, which is how it catches middle-click
at all.

The search box is part of the navigation loop in both directions — ↓ from the
box focuses the **first** row (`focusFromCollectionSearch`), not the row after
the current one.

**The selected row has to hold real DOM focus** (`tabIndex = -1` — focusable,
but out of the Tab order this view drives itself). Keys the view leaves
unhandled are resolved by the browser from whatever has focus, and with focus
parked on the view root those walked *out* of the view: the root precedes
everything inside it in document order, so Shift+Tab jumped to the panel
breadcrumb rather than back to the search box.

**Keys aimed at something else must be let through.** The hook fires even while
a node outside the view holds focus — the panel's breadcrumb button being the
one you'll hit. Treating those as row navigation made Tab jump into the rows
from up there and swallowed the breadcrumb's own Space. The handler now returns
unless the focused element is inside the view root, or is `document.body` (the
state the view sits in normally, where arrows still have to work).

**Peek is rebuilt from panel calls.** Native peek is a panel navigation preview
— `previewItemWithHighlight()`, `hasNavigationPreview()`,
`dismissNavigationPreview()`, `commitNavigationPreview(true)` — all on the panel
component, none of them on the SDK's `PluginPanel`. What it does here:

| key | what happens |
|---|---|
| Space | opens the focused record aside via `openRecordInOtherPanel()` and stores that panel's id |
| ↑ / ↓ while peeking | selection moves and the aside re-opens onto the new record, so it follows |
| Space or Escape | closes the panel if the peek opened it, otherwise navigates it back to what it was showing |
| Enter or ⌘/Ctrl+Enter | commits: the aside becomes a real open and takes focus |

The stored id is re-resolved through `ui.getPanels()` before every use, because
the user may have closed the panel by hand — without that check, the next arrow
key reopens a panel they just dismissed.

**A peek borrows an open side panel; it must give it back.** `openRecordInOtherPanel()`
reuses an existing side panel rather than adding one, so a peek taken while the
user has something open aside overwrites it. Native peek is a preview *layered
over* that panel's navigation, and dismissing restores it — so `showPeek()`
reads the panel's `getNavigation()` **before** the takeover and `hidePeek()`
either closes the panel (it was ours) or `navigateTo()`s it back (it wasn't).
Closing unconditionally destroyed a panel the user had opened themselves.

The capture happens on the first Space only. Following the selection re-enters
`showPeek()` on every arrow key, and capturing again would record the peeked
record as the thing to restore.

Committing a *borrowed* panel keeps it as it stands rather than running the
close-and-reopen below: that dance exists only to collapse history entries, and
throwing away a user's panel to tidy its history is the worse trade.

Three limitations, all from the same missing primitive:

- **Focus has to be stolen back, on a timer.** `openRecordInOtherPanel()` gives
  focus to the aside's editor, and a custom view only receives keys while its
  own component has focus (`onKeyDown(e){ let t=Ze(); t && (t==this._() ||
  t==this) && this.onKeyboardNavigation(e) }`) — the editor also eats Space as
  text. `showPeek()` calls `setActivePanel` + `focus()` on the view root
  immediately, on the next frame, and again at 120ms, because the aside paints
  and focuses its editor after the call returns. A single synchronous grab loses
  that race.
- **Committing makes the panel blink.** Native peek *replaces* the panel's
  navigation each step, so a commit leaves one history entry and ⌘+[ closes the
  panel. Nothing in the SDK replaces a navigation — `navigateTo` takes no
  replace flag and its wrapper forwards only the navigation object — so every
  arrow while peeking pushes an entry, and ⌘+[ would walk back through every
  record peeked at. `commitPeek()` works around it by closing the panel and
  reopening it on the final record, which starts history over — but only for a
  panel the peek opened; a borrowed one is left alone and keeps those entries.
  That reopen has
  to wait ~220ms: `closePanel()` only kicks off a 150ms `zoomOut` animation and
  removes the panel on a timer afterwards, so an earlier reopen lands in the
  panel that is on its way out and goes down with it. **The visible cost is a
  flicker** — the aside disappears and comes back. If a replace-navigation call
  ever lands in the SDK, drop this whole dance.
- **No peek indicator.** A previewing panel carries `panel-navigation-preview`,
  which the stylesheet cashes in for exactly one thing —
  `.panel-navigation-preview .panel-tab--title{font-style:italic}` — and the
  view swaps the status bar to Escape/Enter/Browse via
  `getPeekStatusBarContext()`. Neither is reachable: the class goes on a panel
  node a plugin has no business touching, and the status-bar *shortcut context*
  comes from a view's `qe()` (see the status-bar note below). As it stands a
  peeked panel looks like a normally-opened one.

## Property mode

Native property mode belongs to the card component: E flips card state, ↑/↓
walk its property rows and Enter focuses that row's inline field editor. None
of it is reachable — `UIAPI` offers `createDropdown`, `createButton`, panels
and toasters, and nothing that edits a property — so all of it is rebuilt here.
What *is* complete is the write side: `PluginProperty` has `set()`,
`setChoice()`, `choices()`, and writes sync without a plugin reload.

**The field list is not the row's chips.** Native walks only a card's shown
properties. `editableFields()` walks Title, then the shown ones, then every
other active editable field — because the field that shapes the tree
(`parent_page`, or a hand-made one) is usually not one the view displays, and
not being able to reparent from the outline would miss the point of editing
here. `EDIT_SKIP_IDS` is `['title', 'icon', 'collection']`; read-only fields and
the types with no editor are dropped too (`EDITABLE_TYPES` is text, number,
choice, record).

`parent_page` sat in that skip list from `a458354`, the commit that added
E-mode. That was right at the time — the tree came from a hand-made `Parent`
field and the sub-page field was unused — but `0e435b2` moved the hierarchy onto
`parent_page` without revisiting it, which silently cost the view its
reparenting. Removed and verified live 2026-07-30: the field appears in E-mode,
the write re-hangs the branch with its descendants, and the timed `afterWrite()`
re-render is enough to show it.

**Writes go through the field's own setter where it has one.** A record-link
field is a plain `prop().set(guid)` — except `parent_page`, which uses
`record.setSubPageOf(guid)` (`sdk/types.d.ts:3634`, synchronous, `null` clears),
since that is where the app's cycle and same-collection checks live. The picker
also drops the row's own descendants, so a cycle can't be offered in the first
place — that applies to any field pointing back at this collection, hand-made or
not, since `recordCandidates()` keys off `filter_colguid` rather than the field
id. For a field pointing at a *different* collection the candidates are fetched
from that collection
(`data.getPluginByGuid(field.filter_colguid).getAllRecords()`).

**A write is not readable in the same tick** (see the SDK's write/read model),
and the refresh that follows arrives when it arrives, so `afterWrite()`
re-renders on a short timer rather than immediately.

**Inline inputs must stop their own keys.** While the caret is in one, the
view's key hook would otherwise read Enter and the arrows as row navigation;
the input calls `stopPropagation()`, and `onKeyboardNavigation` ignores any
event that arrives while an `.outline-inline-input` holds focus.

## Sub-pages

Sub-pages are not a separate mechanism. `collection.enableSubPages(true)`
appends **one ordinary field** to the collection config and nothing else:

```json
{ "id": "parent_page", "label": "Sub-page of", "type": "record",
  "filter_colguid": "<this collection's guid>", "many": false }
```

The field's presence *is* the switch — there is no separate flag. Verified live
2026-07-30 on the development collection, which had been nesting through a
hand-made `Parent` field until then; its 8 records were migrated to
`parent_page` over MCP and `Parent` was archived (`active: false`, which keeps
its data).

The bundle confirms both halves (read 2026-07-30, `app-M2F5L26A.js`, where
`et = "parent_page"`):

```js
hasSubPages(){ let e=this._fieldsById.get(et); return !!e && e.active!==!1 }
enableSubPages(e){ ... if(e&&!s) i.fields.push({id:et,label:"Sub-page of",many:!1,type:record,active:!0})
                   else if(!e&&s) i.fields=i.fields.filter(n=>n.id!==et) ... }
```

**`hierarchyFieldId()`'s first line is the app's own test**, character for
character — `collection.hasSubPages()` exists on the SDK's collection API and
says the same thing, so prefer it if that line is ever touched.

Disabling deletes the field from the config rather than deactivating it, but
that is a schema change only: **the stored parent values survive and come back
intact.** Round-tripped live on Organizations 2026-07-30 — filtered
`parent_page` out of the config, confirmed the records no longer carried a
`Sub-page of` property, pushed the field back, and all 5 links returned pointing
at the same records. Two details from that run:

- **The app normalizes the field.** `enableSubPages(true)` pushes it *without*
  `filter_colguid`; the live config comes back with
  `filter_colguid: <this collection>` added. So the restriction is applied by
  the app, not carried in the write.
- **Re-adding appends it to the end of the field order.** Harmless for the view
  (`parent_page` is found by id, and E-mode's trailing block is unordered
  anyway), but it moves the property's position on the record page, so restoring
  an exact prior config means restoring the order too.

What that run established, all of it verified rather than assumed:

- **Enabling sub-pages does not touch the sidebar.** `sidebar_display_mode`
  stayed `hidden_records`. The native sidebar tree that `Notes` gets comes from
  `"mode": "nested"`, which is a separate setting — and nothing about the
  relation depends on it.
- **Sub-pages are not hidden from the collection's record set.** With a record
  nested, all 8 still enumerate. The view sees children.
- **Trashing a parent does not cascade.** The child stays live with its
  `Sub-page of` pointing at a trashed guid — a dangling link, exactly as a
  hand-made record field behaves. Untrashing restores both sides. That was MCP
  trash; **trashing from the app's own UI is untested** and may well differ.
- **The Markdown Mirror treats it as an ordinary field**: frontmatter
  `Sub-page of: "[Name](Name.md)"`, files stay **flat** in the collection folder
  (sub-pages produce no directory nesting), and editing that line on disk sets
  the real relation.
- **MCP writes it**: `update_record_property` with `parent_page` works and `""`
  clears it. It is single-valued, so the multi-value transport bug doesn't
  apply — a `Parent` → `parent_page` migration is scriptable over MCP alone.

The one thing given up versus a hand-made field: exactly one hierarchy per
collection, single-valued, same-collection only.

## Things the app does that aren't in the SDK docs

Most of these were found by reading the shipped bundle
(`https://app.thymer.com/js/frontend/app-*.js`) and stylesheet. All are
load-bearing here; several were bugs first.

**`views.register()` keys hooks by view id, not label.**

```js
register(e,t){ let s = i.getViewByLabelOrId(e); s && i.customViewHooks.set(s.id, ...) }
```

It resolves the argument once, matching labels first (exactly, `===`, so
case-sensitively) and falling back to ids. Either way the resolution happens at
load: rename the thing you registered against and the next load finds nothing,
leaving the tab on the app's fallback text.

**So this plugin registers no fixed id at all.** `registerOutlineView()` walks
`getConfiguration().views`, takes every `type === 'custom'` entry, and registers
each one. A collection has exactly one plugin, so its custom views cannot belong
to anything else — claiming all of them is correct, and it makes the view id
non-load-bearing: a hand edit, a rename, or the `_H()` sanitizer rewriting the
id can no longer unhook the view. `customViewHooks` is a plain `Map` on the
plugin instance, so one `set` per view is all this costs, and ids only need to
be unique within a collection.

The gap: a view added *after* load isn't registered until the plugin reloads.
Saving the collection config reloads it, which covers the install path; a
`collection.updated` subscription would close the rest.

**Custom views get no toolbar and no search row.** The host is a bare
`<div class='custom-view'>` and declares `supportsViewFilterStatus() → false`.
The whole `records-view-toolbar-inner` component — tabs, add view, create,
configure, sort, *and* the search field — belongs to the panel, not the view,
and is absent. Hence the hand-built toolbar and search box.

**`makeNormalLayout()` is the overview layout, not the narrow one.**

| SDK call | panel modifier | width |
|---|---|---|
| `makeWideLayout()` | `layout-margin-wide` | uncapped |
| `makeNormalLayout()` | `layout-margin-overview` | `--max-layout-overview-width` (1200px) |

The built-in list view uses the overview modifier, so `makeNormalLayout()` is
what matches its width. Don't hand-roll margins from
`--layout-margin-size` / `--layout-large-margin-size`: they are responsive
(16/24/40 and 30/50 in 0.0.18) and the `thymer-css-tokens` catalog lists only
one value each.

**`setSortColumn()` does not persist.** It sets `this.sortColumn` on the view
instance and refreshes; `sort_field_id` in the config is read once by
`setInitView()` and never written back. Anything reflecting the current sort
has to track it in view state, seeded from the config. Sort therefore resets
when the view is re-created — native custom views behave the same way.

**`getWorkspaceGuid()` is on `AppPlugin` only.** `CollectionPlugin` is a
separate class and does not have it. Take the guid from the panel's own
`getNavigation().workspaceGuid`. Anything that throws at view-factory scope
takes down the entire view with no error in the UI, so keep that scope to
declarations.

**Navigation shape** for the view tabs, via `panel.navigateTo()` — this is what
the native switcher does:

```js
{ workspaceGuid, type: 'overview', rootId: collectionGuid, subId: viewId }
```

The app also reaches collection settings with
`{ type: 'collection_settings', rootId: collectionGuid, subId: null, state }`,
where `state` is `{ openViewId }` for "Edit View..." or `{ openAddView: true }`
for the toolbar's `+`. This view no longer navigates there — see the panel note
below for why driving that screen from a plugin is awkward.

**Which fields the app offers as sort keys** — its predicate, not the schema:

```js
fp(f) = f.active && f.id !== 'icon'
        && f.type !== 'file' && f.type !== 'image' && f.type !== 'banner'
// plus f.id !== 'parent_page', and f.id !== 'collection' unless a dynamic collection
```

`parent_page` and `collection` are hardcoded id constants in the bundle. The app
also offers "Custom Order" as the empty field id, which sorts on
`record.j["$o:<viewId>"]` — a fractional-index string written on drag, synced,
and independent per view. A record without one falls back to a key derived from
its creation time, which is why an untouched view in Custom Order looks like
creation order.

**Driving collection settings from a plugin is awkward.** Dismissing settings
runs:

```js
function P5(o){
  let e = o.getNavigation().state?.returnToNavigation;
  if (e) { o.navigateTo(e, true); return; }
  o.getType() === q.CollectionSettings && o.navigateBack() || o.closePanel();
}
```

It only closes the panel when `navigateBack()` *fails*. A panel from
`ui.createPanel()` arrives with its own placeholder already in history, so back
succeeds and you are left with an empty stray panel — and there is no SDK way to
create a panel without that history entry (`createPanel` takes only
`afterPanel`, `navigateTo` has no replace flag, `PluginPanel` has no history
API) and no reliable signal to clean it up afterwards. Navigating the view's own
panel works, but then settings replaces the view. Community plugins only close
panels from their own buttons, where they own the trigger. Hence: no settings
navigation here at all.

**The status bar can be added to, never replaced.** Native views own their
status bar: `qe()` returns a shortcut list plus `skipDefaultShortcuts: true`, so
List advertises its own set (Search, Peek, Edit cell, Open Aside, Insert Row,
Trash Row) *instead of* the app defaults, and swaps in a different set again
while peeking via `getPeekStatusBarContext()`. There is no `qe()` equivalent for
a custom view and no SDK call for the shortcut context, so this view always
shows the app's default shortcuts — which is why its status bar doesn't match
List's, peeking or not. The only lever is `ui.addStatusBarItem({label, icon,
tooltip, onClick})`, which *appends* an item and cannot remove or override what
is already there.

**Choice colors.** `color` on a choice is an index into the bundle's palette
array (`At`), whose `className` values feed `.enum-color-*` and the
`--enum-<name>-bg` / `-fg` tokens:

```
0 red, 1 orange, 2 green, 3 cyan, 4 blue, 5 purple, 6 pink, 7 fuchsia,
8 rose, 9 stone, 10 teal, 11 sky, 12 indigo, 13 zinc, 14 yellow
```

This is *not* the order the classes appear in the stylesheet — that order is
different and produces wrong colors.

**The app's own CSS classes work inside a custom view.** Plugin view DOM lives
in the app document, so `.button-primary`, `.kbd`, `.form-input`,
`.collection-list-create-card`, `.input-widget` etc. all apply. The create row
reuses the app's markup verbatim rather than approximating it. The `--list-*` metrics are scoped to `.collection-list-view`,
so the root carries that class to pick them up (the class itself is only
`width:100%; position:relative`).

**Menus must not be nested in the tab row.** It copies native's
`overflow: hidden`, which clips an absolutely-positioned dropdown down to a
sliver. The app appends its dropdown to the panel root and positions it at the
cursor; menus here do the same against `.outline-root`.

## Gotchas in this code

- `ROW_PAD_X` / `TWISTY_W` / `ROW_GAP` / `DEPTH_STEP` drive row indentation,
  the property-row indent, and the create card's left padding. `TWISTY_W` and
  `ROW_GAP` must match `.outline-twisty`'s width and `.outline-title`'s gap in
  the injected CSS — that pairing is not enforced.
- `restack()` decides one-vs-two-line rows by whether the name had to
  ellipsise (`scrollWidth > clientWidth`), which works only because chips are
  `flex: 0 0 auto` and the name is the one thing allowed to shrink. It **must**
  put the chips back inline and clear `.is-stacked` from every row before
  measuring: a stacked row has a full-width name, so it measures as fitting and
  rows would oscillate. Reads and writes are batched to keep it at one forced
  layout per pass.
- Stacking **moves** the chips out of `.outline-title` rather than wrapping it.
  Wrapping let the name claim the full width and pushed the timestamp onto a
  third line; a one-line flex container leaves the name no choice but to
  shrink. Because the chips leave the title element, their depth indent has to
  be re-applied from `$row.dataset.indent`.
- **One auto margin per line.** `.outline-props` carries `margin-left: auto` and
  the stamp carries none. Giving both one splits the free space evenly between
  them, which leaves the chips floating mid-row at an x that tracks the name's
  length. The stamp is also a fixed `8ch` column, or a shorter stamp ("1h ago"
  against "17m ago") shifts that row's chips out of line with the rest.
- `buildHierarchy()` promotes any record caught in a parent cycle to a root.
  Without it those records are unreachable from any root and vanish silently.
  `setSubPageOf()` refuses to create one, but a hand-made record field is free
  to hold a cycle and so is a sub-page link written before this view existed.
- Sibling order is whatever the app hands over, so the view's sort actually
  applies. Don't re-sort inside `buildHierarchy()`.

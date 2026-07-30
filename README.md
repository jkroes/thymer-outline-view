# organizations-outline

A `CollectionPlugin` for the **Organizations** collection that adds one custom
view, **Outline** (view id `outline`): the collection rendered as an indented,
collapsible tree, styled to sit alongside the built-in List view.

Hierarchy comes from `Parent`, a `record` property pointing back at
Organizations. Records with no `Parent` (or one outside the result set) become
roots.

## Files

| file | what |
|---|---|
| `plugin.js` | the view. `export class Plugin` — the `export` is stripped on deploy |
| `plugin.json` | the deployed collection config (schema + views), mirrored from the app |

## Deploy

`thymercli` talks to the desktop app's built-in MCP server on port 13100.

```bash
sed 's/^export class/class/' plugins/organizations-outline/plugin.js \
  | bin/thymercli plugin update code Organizations -w W3TZX0YZ4FRCMSHGB976K32N4D

bin/thymercli plugin update config Organizations \
  -w W3TZX0YZ4FRCMSHGB976K32N4D --file plugins/organizations-outline/plugin.json
```

**Pass the workspace GUID, not the name.** `-w justinkroes` fails with
"MCP access is disabled for this workspace"; the GUID works.

Code and config must go out **together** when the view id changes — see the
registration note below.

To re-read the live state (this is how `plugin.json` is kept in sync):

```bash
bin/thymercli plugin show Organizations -w W3TZX0YZ4FRCMSHGB976K32N4D --json | jq '.config'
```

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
- **Rows adapt** between one and two lines: chips sit inline after the name
  when they fit, and drop to a second line (indented under the row icon, with
  the timestamp held on line 1) when they don't. See `restack()` below.
- **Rebuilt toolbar** (custom views get none — see below): view tabs, New
  <item>, sort field, sort direction. View management — add, rename, configure —
  is left to the app's own collection-settings screen.
- **Sort menu** offers the same fields the app does, from its own predicate (see
  below). It does *not* offer Custom Order — that sorts on a per-view drag
  position this view has no way to write, so it could only ever mean creation
  order. A view left with no sort field falls back to Title.
- **Peek** on Space: opens the focused record in the side panel, follows the
  selection as you keep arrowing, and a second Space closes that panel.
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
| Shift+Enter | create a card below | create (position not controllable) |
| Alt+Enter | create a card above | — no SDK call for positioned create |
| Space | peek — put the record in the side panel; Space again closes it | same |
| Escape | exit peek, or cancel an untouched new card | closes the peek panel |
| ⌘+[ / ⌘+] | panel history back / forward | the app's own, but see the peek history note |
| `/` | focus the collection search box | same |
| M | move mode — keyboard drag-reorder, refused while sorted | — no SDK write for the per-view `$o:<viewId>` order key |
| E | property mode — ↑/↓ through a card's properties, Enter edits | — no SDK inline property editor |
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
| Space or Escape | `ui.closePanel()` on the stored panel |
| Enter or ⌘/Ctrl+Enter | commits: the aside becomes a real open and takes focus |

The stored id is re-resolved through `ui.getPanels()` before every use, because
the user may have closed the panel by hand — without that check, the next arrow
key reopens a panel they just dismissed.

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
  reopening it on the final record, which starts history over. That reopen has
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

## Things the app does that aren't in the SDK docs

Most of these were found by reading the shipped bundle
(`https://app.thymer.com/js/frontend/app-*.js`) and stylesheet. All are
load-bearing here; several were bugs first.

**`views.register()` keys hooks by view id, not label.**

```js
register(e,t){ let s = i.getViewByLabelOrId(e); s && i.customViewHooks.set(s.id, ...) }
```

It resolves the argument once, by label *or* id. Registering by label works
until someone renames the view, after which the next load finds nothing and the
tab renders the app's fallback text. Register by id (`"outline"`).

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
  clear `.is-stacked` from every row before measuring: a stacked row has a
  full-width name, so it measures as fitting and rows would oscillate. Reads
  and writes are batched to keep it at one forced layout per pass.
- `buildHierarchy()` promotes any record caught in a `Parent` cycle to a root.
  Without it those records are unreachable from any root and vanish silently.
- Sibling order is whatever the app hands over, so the view's sort actually
  applies. Don't re-sort inside `buildHierarchy()`.

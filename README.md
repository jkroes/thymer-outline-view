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
- **Rebuilt toolbar** (custom views get none — see below): view tabs, Add view,
  New <item>, Configure view, sort field, sort direction. Right-clicking a tab
  gives Rename View / Edit View, mirroring the app's own context menu.
- **Sort menu** offers the same fields the app does, from its own predicate (see
  below). It does *not* offer Custom Order — that sorts on a per-view drag
  position this view has no way to write, so it could only ever mean creation
  order. A view left with no sort field falls back to Title.
- **Keyboard**: ↑/↓ move, → expand or descend, ← collapse or go to parent,
  Home/End, Enter opens, Shift+Enter creates.

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

**Navigation shapes** the app uses, both reachable via `panel.navigateTo()`:

```js
// switch view (this is what the native switcher does)
{ workspaceGuid, type: 'overview', rootId: collectionGuid, subId: viewId }

// "Edit View..." — collection settings scoped to one view
{ workspaceGuid, type: 'collection_settings', rootId: collectionGuid, subId: null,
  state: { openViewId: viewId } }
```

`collection_settings` is a real nav type in the app's enum but is not in the
SDK types, so treat it as liable to change. `{ openAddView: true }` is what the
toolbar's `+` passes.

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

**Do not `ui.createPanel()` for collection settings.** Dismissing settings runs:

```js
function P5(o){
  let e = o.getNavigation().state?.returnToNavigation;
  if (e) { o.navigateTo(e, true); return; }
  o.getType() === q.CollectionSettings && o.navigateBack() || o.closePanel();
}
```

It only closes the panel when `navigateBack()` *fails*. A panel from
`createPanel()` arrives with its own placeholder already in history, so back
succeeds and you are left with an empty stray panel. There is no SDK option to
create a panel without that history entry (`createPanel` takes only
`afterPanel`, `navigateTo` has no replace flag, `PluginPanel` has no history
API), and no reliable signal to clean it up afterwards — `panel.navigated` is
`panel/navigateComplete`, emitted per panel-body component, and the placeholder
does not appear to emit it. Four attempts at detect-and-close all failed. This
view reuses an existing panel or its own instead, which cannot orphan anything.
No plugin in the 79 vendored community examples solves this either; they only
close panels from their own buttons, where they own the trigger.

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
`.collection-list-create-card`, `.input-widget` etc. all apply. The rename
prompt and the create row reuse the app's markup verbatim rather than
approximating it. The `--list-*` metrics are scoped to `.collection-list-view`,
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
- Renaming a view calls `saveConfiguration()`, which reloads the plugin and
  flickers the UI. Fine for a deliberate action, not for anything frequent.
- The icon picker enumerates `.ti-*` rules out of `document.styleSheets` at
  runtime rather than embedding a list, so it tracks whatever the app ships.

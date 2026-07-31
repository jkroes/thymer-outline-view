# Outline view for Thymer

A collection view that shows your records as an indented, collapsible tree instead of a flat list, modeled on Thymer's List view. It works on any collection with a property that references itself. 

## Features

- **A real tree.** Indented rows, one toggle per parent, collapse state remembered
  per device.
- **Search that keeps its place.** Filtering matches record names and every visible
  property, and keeps a hit's parents on screen so you can see where in the tree
  it lives. `Enter` opens the top hit without leaving the box, and `↓` drops you
  into the results.
- **Row properties.** Whichever properties the view is set to show
  appear as chips — choices as colored pills, links as clickable chips. Chips
  line up in a right-hand column, and wrap to a second line when space is limited.
- **A working toolbar.** Thymer doesn't give custom views the usual toolbar, so this
  rebuilds it: view tabs, a create button, sort field and direction.
- **So many shortcuts.** You'll forget this isn't a built-in view. See [Keys](#keys).

## Install

Open a collection where you want this view, then go to its settings.

### 1. Give the collection a way to nest

The tree is drawn from a record-link property that points back at the same
collection. Turning on sub-pages is how you get one — it adds a "Sub-page of"
property, and Thymer's own writes through that property refuse to create loops.

A property you made yourself works just as well, so skip this step if the
collection already nests. The view takes "Sub-page of" when the collection has
it, and otherwise falls back to the first active record-link property whose
target is this same collection. First means first in the collection's field
order, and there is no way to choose, so keep it to one such property. If that
property holds several links, only the first is read. See [Known limitations](#known-limits).

Turning sub-pages back off removes the "Sub-page of" property from the
collection, so the view loses that hierarchy and falls back to a self-pointing
property if you have one. The links survive: turn sub-pages on again and every
parent comes back exactly as it was.

### 2. Add a Custom view

In the collection's settings, add a view and choose the type **Custom**. Name it
whatever you like — "Outline" is the obvious choice. Remember exactly what you
typed, capitals included; the next step needs it.

### 3. Paste in the code and point it at your view

Open the collection's plugin code editor and paste in the whole of
[`plugin.js`](plugin.js). No other edits are needed — the file is written to be
pasted as-is.

Near the top you will find this line:

```js
this.views.register("outline", (viewContext) => {
```

Change `"outline"` to your view's name:

```js
this.views.register("Outline", (viewContext) => {
```

Save, then open the view's tab. The tree renders.

That string is how Thymer finds your view. It is matched against view names
first and internal ids second, and the match is exact, so `Outline` and
`outline` are two different things. If you later rename the view, come back and
change this string to match, or the tab will go blank.

Only views that are switched on are searched, so make sure the new view is
visible in the collection's view list.

If you drive Thymer over MCP or the CLI, there is another route: set the view's
`"id"` to `"outline"` in the collection config and leave the code alone. Note
that Thymer strips anything outside letters, digits and underscore from a view
id as it saves, without saying so — ask for `my-outline` and you get
`myoutline` — so keep ids to those characters and read back what you got.

Once it renders: to change which properties show on the rows, edit the view's
shown fields the normal way — the rows follow.

## Keys

| Key | Action |
|---|---|
| `↑` `↓` | Move between rows. From the top row, `↑` goes to the search box. |
| `←` `→` | Cycle through rows, or through the toolbar buttons when one of them has focus. |
| `⌘↑` `⌘↓` | Collapse or expand the focused node. When there is nothing to open, `⌘↓` moves to the next row. When there is nothing to close, `⌘↑` climbs to the parent, or moves to the previous row if the node is already a root. |
| `Tab` | Move to the next row, wrapping at the end. From the search box, move into the list. `Shift+Tab` is left to the browser, as it is in Thymer's own list view. |
| `Home` `End` | Go to the first or last row. |
| `Enter` | Open the focused record in this panel. |
| `⌘Enter` | Open the focused record in the side panel. |
| `Shift+Enter` | Create a record and open its name for typing in place, rather than navigating to a new page. Leave it unnamed and it goes to the trash, recoverable like any other trashed record. |
| `Space` | Peek the focused record in the side panel. The peek follows the selection as you arrow, so you can walk a branch without opening anything. A side panel you already had open is borrowed, then put back on what it was showing. `Enter` or `⌘Enter` commits the peek to a real open. `Space` again or `Escape` dismisses it. |
| `E` | **Property mode.** The focused record's fields open as a list underneath it: Title, then the properties shown on the row, then every other editable field. Text, number, choice and record-link fields can all be edited, including the one the tree is built from, so you can move a whole branch without opening the record. That field's menu leaves out the row's own descendants, so you cannot create a loop. `↑` `↓` move between fields. `Enter` edits the highlighted field, as an inline box for text and number or as a filter menu for choice and record link. `Escape` or `E` leaves. |
| `/` | Focus the search box. `Escape` there clears what you typed. |
| Click | Open the record. `⌘`-click or middle-click opens it in the side panel. `Shift`-click focuses the row without opening it. |

## Known limits

In the future, sub-pages will be used as a fallback instead of an existing property, in order to support multiple hierarchies per collection--one for each self-referencing property in the same collection. 

Currently, hierarchies like sub-pages assume a single "parent" record, which can't model actual familial parents (each person has two parents).

Some parts of Thymer's plugin API that aren't open yet, so custom views can't mimic or alter every feature available to built-in views:

- No drag-to-reorder and no move mode (`M`). The per-view custom order isn't
  writable from a plugin, so "Custom Order" isn't offered as a sort either.
- No `Alt+Enter` (create above) — there's no positioned-create call.
- No trash shortcut.
- Committing a peek makes the side panel blink. Closing and reopening the panel
  is the only way to keep the back-button history tidy.
- The status bar shows Thymer's default shortcuts, not this view's — a custom
  view can add status bar items but can't replace the set.
- Sort resets when the view is rebuilt. Thymer's native views do the same;
  the sort you pick isn't written back to the view's config.

## Contributing / hacking

`CLAUDE.md` in this repo is the implementation write-up: how the tree is built,
what the built-in list view does key-for-key and where this deviates, what
sub-pages actually are underneath, and a long list of app behavior that isn't in
the SDK docs (most of it read out of the shipped bundle). Read it before
changing anything — a fair amount of this code looks arbitrary until you know
what it's working around.

## License

MIT — see [LICENSE](LICENSE).

# Outline view for Thymer

A collection view that shows your records as an indented, collapsible tree instead of a flat list, modeled on Thymer's List view. It works on any collection with a property that references itself. 

## Features

- **A real tree.** Indented rows, one toggle per parent, collapse state remembered
  per device.
- **Search that keeps its place.** Filtering matches record names and every visible
  property, and keeps a hit's parents on screen so you can see where in the tree
  it lives. Arrow keys drive the list while you're still typing.
- **Row properties.** Whichever properties the view is set to show
  appear as chips — choices as colored pills, links as clickable chips. Chips
  line up in a right-hand column, and wrap to a second line when space is limited.
- **A working toolbar.** Thymer doesn't give custom views the usual toolbar, so this
  rebuilds it: view tabs, a create button, sort field and direction.
- **So many shortcuts.** You'll forget this isn't a built-in view. Peek a branch
  with `Space`, edit properties in place with `E`, create without leaving the
  tree. See [Keys](#keys).

## Install

Everything happens in the settings for the collection you want the outline on.
Open that collection, then go to its settings.

### 1. Give the collection a way to nest

The tree is drawn from a record-link property that points back at the same
collection. Turning on sub-pages is how you get one — it adds a "Sub-page of"
property, and Thymer's own writes through that property refuse to create loops.

If the collection already nests through a link property you made yourself, that
works too and you can skip this step. Sub-pages win if both exist.

### 2. Add a Custom view

Add a view and choose type Custom. Name it whatever you like; "Outline" is the
obvious choice.

### 3. Set that view's id to `outline`

The fiddly step. The plugin registers itself against the view id `outline`, so
the two have to match or the tab comes up empty.

Open the collection's config JSON, find your new view in the `views` array, and
set its `"id"`:

```json
{ "id": "outline", "label": "Outline", "type": "custom", ... }
```

If you'd rather not touch the JSON, do the reverse — leave the id Thymer
generated and change the `this.views.register("outline", …)` line near the top
of `plugin.js` to that id.

### 4. Paste in the code

Plugin → Edit Code. Paste the whole of [`plugin.js`](plugin.js) into Custom
Code and save. No edits needed; the file is written to be pasted as-is.

Open the view's tab and the tree renders. To change which properties show on the
rows, edit the view's shown fields the normal way — the rows follow.

`plugin.json` in this repo is one workspace's exported collection config,
included only as an example of the shape. Its ids are that workspace's, so don't
paste it into yours.

## Keys

| key | does |
|---|---|
| `↑` `↓` | move between rows; `↑` from the top row goes to the search box |
| `←` `→` | cycle through rows or buttons on the toolbar |
| `⌘↑` `⌘↓` | collapse / expand the focused node (`Ctrl` on Windows/Linux) if possible; falls back to `↑` `↓` |
| `Home` `End` | first / last row |
| `Enter` | open the focused record in this panel |
| `⌘Enter` | open it in the side panel |
| `Shift+Enter` | create a record and name it in place |
| `Space` | peek the focused record in the side panel; `Space` again to dismiss |
| `E` | open the focused record's properties for editing |
| `/` | jump to the search box |
| `Escape` | close a peek, or leave property mode |
| Click | open the record; `⌘`-click or middle-click opens it aside; `Shift`-click just focuses |

Three of those do more than the one-liner suggests.

### `E` — edit properties in place

The focused record's fields open as an indented list underneath it. `↑`/`↓` walk
them, `Enter` edits the highlighted one, `Escape` or `E` again closes. Text,
number, choice and record-link fields are all editable, and choices and links get
the same filter menu the sort button uses.

The list isn't limited to the properties shown on the row — it's Title, then the
row's chips, then every other editable field. That includes the parent, so you
can re-hang a whole branch of the tree without ever opening the record. The
picker leaves out the row's own descendants, so you can't accidentally make a
loop.

### `Space` — peek

Opens the focused record in the side panel. Keep arrowing and the panel follows
the selection, so you can skim a branch without committing to any of it.
`Space` again or `Escape` dismisses; `Enter` or `⌘Enter` turns the peek into a
real open and moves focus there.

If you already had something open in the side panel, the peek borrows it and
puts it back on whatever it was showing when you dismiss — it doesn't close a
panel you opened yourself.

### `Shift+Enter` — create in place

Adds a record and opens its name for typing right there in the tree, rather than
navigating you off to a new blank page. Walk away without naming it and it's
discarded, the same as an untouched new card in Thymer's own views.

## Known limits

Some parts of Thymer's plugin API that aren't open yet, so custom views can't mimic or alter every feature available to built-in views:

- No drag-to-reorder and no move mode (`M`). The per-view custom order isn't
  writable from a plugin, so "Custom Order" isn't offered as a sort either.
- No `Alt+Enter` (create above) — there's no positioned-create call.
- No trash shortcut.
- Committing a peek makes the side panel blink. Closing and reopening the panel
  is the only way to keep the back-button history tidy.
- The status bar shows Thymer's default shortcuts, not this view's — a custom
  view can add status bar items but can't replace the set.
- Sort resets when the view is rebuilt. Thymer's own custom views do the same;
  the sort you pick isn't written back to the view's config.

## Contributing / hacking

`CLAUDE.md` in this repo is the implementation write-up: how the tree is built,
what the native list view does key-for-key and where this deviates, what
sub-pages actually are underneath, and a long list of app behavior that isn't in
the SDK docs (most of it read out of the shipped bundle). Read it before
changing anything — a fair amount of this code looks arbitrary until you know
what it's working around.

## License

MIT — see [LICENSE](LICENSE).

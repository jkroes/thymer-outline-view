# Outline view for Thymer

A custom collection view that shows your records as an indented, collapsible tree instead of a flat list. Modeled on Thymer's native List view. It works on any self-referencing collection. Nothing in it is specific to one collection. Nesting comes from sub-pages.

## Features

- A real tree. Indented rows, one toggle per parent, collapse state remembered
  per device.
- Search that keeps its place. Filtering matches record names and every visible
  property, and keeps a hit's parents on screen so you can see where in the tree
  it lives. Arrow keys drive the list while you're still typing.
- Your properties on the rows. Whichever properties the view is set to show
  appear as chips — choices as colored pills, links as clickable chips. Chips
  line up in a right-hand column, and drop to a second line only when the name
  needs the room.
- Edit in place, with `E`. The focused record's fields open underneath it.
  `↑`/`↓` to pick one, `Enter` to edit, `Escape` to close. Text, number, choice
  and record-link fields are all editable, including the parent, so you can
  re-hang a branch of the tree without opening the record.
- Peek, with `Space`. Opens the focused record in the side panel, and the panel
  follows as you keep arrowing. `Enter` turns the peek into a real open. If you
  already had something open on the side, it's put back when the peek ends.
- Create in place. `Shift+Enter` adds a record and opens its name for typing
  right there in the tree, instead of jumping you to a new blank page. Walk away
  without naming it and it's discarded.
- A working toolbar. Thymer doesn't give custom views the usual toolbar, so this
  rebuilds it: view tabs, a create button, sort field and direction.

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
| `←` `→` | cycle through rows (Thymer uses these for panels elsewhere, so they're taken over here) |
| `⌘↑` `⌘↓` | collapse / expand the focused node (`Ctrl` on Windows/Linux) |
| `Home` `End` | first / last row |
| `Enter` | open the focused record in this panel |
| `⌘Enter` | open it in the side panel |
| `Shift+Enter` | create a record and name it in place |
| `Space` | peek the focused record in the side panel; `Space` again to dismiss |
| `E` | open the focused record's properties for editing |
| `/` | jump to the search box |
| `Escape` | close a peek, or leave property mode |
| click | open the record; `⌘`-click or middle-click opens it aside; `Shift`-click just focuses |

## Known limits

These come from parts of Thymer's plugin API that aren't open yet, not from
choices made here:

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

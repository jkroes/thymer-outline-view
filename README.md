# Outline view for Thymer

A custom collection view that shows your records as an **indented, collapsible
tree** instead of a flat list — built to look and behave like Thymer's own List
view, so it doesn't feel like a bolt-on.

The nesting comes from **sub-pages**. Turn sub-pages on for a collection, make
one record a sub-page of another, and the Outline view draws the whole structure
at once: every level, expandable and collapsible, searchable, and editable
without leaving the page.

It works on **any** collection that can point at itself — projects and
sub-projects, an org chart, an area/topic tree, a book with its chapters.
Nothing in it is specific to one collection.

> Thymer is in alpha and its plugin API is still moving. This has been used
> daily against client 0.0.18 / desktop 1.0.18. Expect to re-check it after a
> Thymer update.

## What you get

- **A real tree.** Indented rows, one twisty per node, collapse state remembered
  per device.
- **Search that keeps its place.** Filtering matches record names *and* every
  visible property, and keeps a hit's parents on screen so you can see where in
  the tree it lives. Arrow keys drive the list while you're still typing.
- **Your properties on the rows.** Whichever properties the view is set to show
  appear as chips — choices as colored pills, links as clickable chips. Chips
  line up in a right-hand column, and drop to a second line only when the name
  needs the room.
- **Edit in place — press `E`.** The focused record's fields open underneath it.
  `↑`/`↓` to pick one, `Enter` to edit, `Escape` to close. Text, number, choice
  and record-link fields are all editable, **including the parent**, so you can
  re-hang a branch of the tree without opening the record.
- **Peek — press `Space`.** Opens the focused record in the side panel, and the
  panel follows as you keep arrowing. `Enter` turns the peek into a real open.
  If you already had something open on the side, it's put back when the peek
  ends.
- **Create in place.** `Shift+Enter` adds a record and opens its name for typing
  right there in the tree, instead of jumping you to a new blank page. Walk away
  without naming it and it's discarded.
- **A working toolbar.** Thymer doesn't give custom views the usual toolbar, so
  this rebuilds it: view tabs, a create button, sort field and direction.

## Requirements

- Thymer with plugins enabled (Settings → Plugins).
- A collection whose records can nest — either **sub-pages turned on**
  (Collection settings → enable sub-pages, which adds a "Sub-page of" field), or
  a record-link property on the collection that points back at the same
  collection. Sub-pages are preferred: the view uses Thymer's own write path for
  them, which refuses to create loops.

## Install

1. Open the collection you want the outline for → its settings → **Plugin** →
   **Edit Code**.
2. Paste in the contents of [`plugin.js`](plugin.js). **Delete the word
   `export`** from `export class Plugin` — the in-app editor doesn't accept it.
3. Add a view: collection settings → add view → type **Custom**.
4. Give that view the id `outline`, which is the id the plugin registers under.
   The reliable way is the collection's config JSON — find your new view in the
   `views` array and set its `"id"` to `"outline"`. (Alternatively, leave the id
   alone and change the `this.views.register("outline", …)` line near the top of
   `plugin.js` to your view's id.)
5. Save. The view tab now renders the tree.

To choose which properties show on the rows, edit the view's shown fields the
normal way — the rows follow.

`plugin.json` in this repo is **one workspace's exported collection config**,
included as an example of the shape. Its ids are that workspace's; don't paste
it into yours.

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

- **No drag-to-reorder and no move mode (`M`).** The per-view custom order isn't
  writable from a plugin, so "Custom Order" isn't offered as a sort either.
- **No `Alt+Enter`** (create above) — there's no positioned-create call.
- **No trash shortcut.**
- **Committing a peek makes the side panel blink.** Closing and reopening the
  panel is the only way to keep the back-button history tidy.
- **The status bar shows Thymer's default shortcuts**, not this view's — a
  custom view can add status bar items but can't replace the set.
- **Sort resets when the view is rebuilt.** Thymer's own custom views do the
  same; the sort you pick isn't written back to the view's config.

## Contributing / hacking

`CLAUDE.md` in this repo is the implementation write-up: how the tree is built,
what the native list view does key-for-key and where this deviates, what
sub-pages actually are underneath, and a long list of app behavior that isn't in
the SDK docs (most of it read out of the shipped bundle). Read it before
changing anything — a fair amount of this code looks arbitrary until you know
what it's working around.

## License

MIT — see [LICENSE](LICENSE).

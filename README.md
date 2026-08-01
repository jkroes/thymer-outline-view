# Outline view for Thymer

A collection view that shows your records as an indented, collapsible tree instead of a flat list, modeled on Thymer's List view. It works on any collection with a property that references itself. 

## Features

- **A real tree.** Indented rows, one toggle per parent, collapse state remembered
  per device.
- **Search that keeps its place.** Thymer's own search box narrows the view to the
  matches alone, which would leave the tree flat and unfoldable. This puts each
  match's parents back, so you can still see where in the tree a hit lives, and
  still fold the branches while the search is on. Those parents are faded, so
  the matches themselves stay easy to pick out; point at one, or select it, and
  it comes back to full strength.
- **Row properties.** Whichever properties the view is set to show
  appear as chips — choices as colored pills, links as clickable chips. Chips
  line up in a right-hand column, and wrap to a second line when space is limited.
- **So many shortcuts.** You'll forget this isn't a built-in view. See [Keys](#keys).

## Install

Two ways: a global plugin that does it for you, or three steps by hand.

### With the installer

`installer/dist/plugin.js` is a global plugin that sets up any collection for
you. Install it once:

1. Create a global plugin in Thymer's Plugins screen, named whatever you like.
2. Paste in the whole of [`installer/dist/plugin.js`](installer/dist/plugin.js)
   and save.

Then run **"Outline: install into a collection..."** from the command palette. A
panel lists your collections, each with a line saying where it stands — whether
it can nest, whether it has a Custom view, whether its plugin slot is free — and
a button that says what it will do:

| Button | Meaning |
|---|---|
| Install | Nothing is set up yet. Turns on sub-pages if the collection has no way to nest, adds one Outline view per nesting property, writes the view code. |
| Repair | The views are there but something is out of step — a property with no view, or a view whose property was deleted. Fixes just that, and leaves each view's name, shown properties and sort alone. |
| Update | An older build of the view is installed. Overwrites just the code. |
| Remove | Takes out the Outline views and clears the code. Leaves custom views you made yourself, and never touches sub-pages or your nesting — those hold real data. |

The line above the button says what Install would change, so you can see which
views it would add or remove before pressing it.

A collection that is complete and up to date shows "Installed" and offers only
Remove.

**If a collection already has plugin code of its own**, the installer will not
overwrite it. Thymer gives each collection a single plugin, and writing code
replaces whatever is there — so a collection with formulas or a custom record
title would lose them. Those are flagged in the panel, and installing opens the
code editor with the view's source loaded so you can merge it yourself. Nothing
is written until you save.

The view's source is baked into the installer when it's built, so installing
doesn't fetch anything from the internet.

### By hand

1. **Give the collection a way to nest.** Turn on sub-pages, which adds a
   "Sub-page of" property. A record-link property you made yourself that points
   back at the same collection works too.
2. **Add a Custom view.** In the collection's settings, add a view of type
   Custom and name it whatever you like.
3. **Paste in the code.** Open the collection's plugin code editor, paste the
   whole of [`plugin.js`](plugin.js), save.

Open the view's tab and the tree renders. Nothing to configure — the plugin
claims whatever Custom views the collection has, so the view's name and id are
yours to change freely.

### Either way

The tree is drawn from a record-link property pointing back at the same
collection — "Sub-page of", or one you made yourself.

**A collection can have several of these, and each is its own hierarchy.** The
installer gives you one Outline view per property, so you can keep, say, a
sub-page tree and a "Reports to" tree side by side and switch between them with
the view tabs. Each view remembers which property it draws, and keeps its own
name, columns, sort and collapsed rows.

The sub-page view is named **Outline**; every other one is named after its
property, as **Outline: Reports to**. Rename a property and Install brings that
name up to date — unless you renamed the view yourself, in which case your name
is kept. Either way the view goes on drawing the right tree.

Only properties that hold a **single** link and point back at the **same**
collection can be nested by. A property that holds several links would give a
record more than one parent, which is no longer a tree; one pointing at a
different collection points at records this view never sees.

A view added by hand, with no property assigned, falls back to "Sub-page of", or
to the first eligible property if the collection has no sub-pages.

**The property is what a view is made from.** Running Install again re-creates a
view you deleted, because the property is still there. To get rid of a view for
good, delete its property — the next Install clears the view away. Until you run
it, a view whose property is gone lists everything flat and says so in a line
above the rows.

Turning sub-pages back off removes the "Sub-page of" property, so its view loses
that hierarchy. The links survive: turn sub-pages on again and every parent
comes back exactly as it was.

## Keys

| Key | Action |
|---|---|
| `↑` `↓` | Move between rows. `↓` wraps at the last row; `↑` stops at the first and hands focus up to the search box, then the view tabs, then the page title. |
| `←` `→` | Cycle through rows. |
| `⌘↑` `⌘↓` | Collapse or expand the focused node. When there is nothing to open, `⌘↓` moves to the next row. When there is nothing to close, `⌘↑` climbs to the parent, or moves to the previous row if the node is already a root. |
| `Tab` | Move to the next row, wrapping at the end. Tab out of the search box lands on the row you left. `Shift+Tab` is left to the browser, as it is in Thymer's own list view. |
| `Home` `End` | Go to the first or last row. |
| `Enter` | Open the focused record in this panel. |
| `⌘Enter` | Open the focused record in the side panel. |
| `Shift+Enter` | Create a record and open its name for typing in place, rather than navigating to a new page. Leave it unnamed and it goes to the trash, recoverable like any other trashed record. |
| `Space` | Peek the focused record in the side panel. The peek follows the selection as you arrow, so you can walk a branch without opening anything. A side panel you already had open is borrowed, then put back on what it was showing. `Enter` or `⌘Enter` commits the peek to a real open. `Escape` dismisses it. |
| `E` | **Property mode.** The focused record's fields open as a list underneath it: Title, then the properties shown on the row, then every other editable field. Text, number, choice and record-link fields can all be edited, including the one the tree is built from, so you can move a whole branch without opening the record. That field's menu leaves out the row's own descendants, so you cannot create a loop. `↑` `↓` move between fields. `Enter` edits the highlighted field, as an inline box for text and number or as a filter menu for choice and record link. `Escape` or `E` leaves. |
| `/` | Focus the search box. |
| Click | Open the record. `⌘`-click or middle-click opens it in the side panel. `Shift`-click focuses the row without opening it. |

## Known limits

A hierarchy assumes each record has a single parent, so it can't model something
like familial parents, where each person has two. A property holding several
links is skipped rather than drawn wrong.

Some parts of Thymer's plugin API that aren't open yet, so custom views can't mimic or alter every feature available to built-in views:

- Every Custom view in the collection becomes an outline. That is what frees you
  from naming the view or minding its id, but it means a collection running this
  can't also have a Custom view doing something else — a collection has only one
  plugin, so there is nothing else for those views to be.
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

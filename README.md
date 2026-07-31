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
| Install | Nothing is set up yet. Turns on sub-pages if the collection has no way to nest, adds a Custom view, writes the view code. |
| Repair | The view is there but a piece is missing, such as the nesting. Adds only what's absent and leaves your view's name, shown properties and sort alone. |
| Update | An older build of the view is installed. Overwrites just the code. |
| Remove | Takes out the Custom views and clears the code. Never touches sub-pages or your nesting — those hold real data. |

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
   back at the same collection works too — skip this step if you already have
   one.
2. **Add a Custom view.** In the collection's settings, add a view of type
   Custom and name it whatever you like.
3. **Paste in the code.** Open the collection's plugin code editor, paste the
   whole of [`plugin.js`](plugin.js), save.

Open the view's tab and the tree renders. Nothing to configure — the plugin
claims whatever Custom views the collection has, so the view's name and id are
yours to change freely.

### Either way

The tree is drawn from a record-link property pointing back at the same
collection. "Sub-page of" is used when the collection has it; otherwise the
first such property in field order is used, and there's no way to choose among
several, so keep it to one. If that property holds several links, only the first
is read.

Turning sub-pages back off removes the "Sub-page of" property, so the view loses
that hierarchy. The links survive: turn sub-pages on again and every parent
comes back exactly as it was.

To change which properties show on the rows, edit the view's shown fields the
normal way and the rows follow.

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

# Outline view

An **Outline** view for [Thymer](https://thymer.com) collections: your records as an
indented, collapsible tree instead of a flat list, with the look and keys of Thymer's
own List view. It works on any collection that nests, through a single-value property that links
back to the same collection (a "Parent" property, or Thymer's sub-pages). Your records
and properties stay exactly as they are; the view only changes how they're shown, and
writes only when you edit something from it.

The plugin's global half also follows you onto every page of those collections: a
breadcrumb of the page's ancestors above its title, and commands to show the
page in the outline, add a child or sibling page, or move the page somewhere else. See
[On every page](#on-every-page).

## Install

Install the global plugin, which sets the view up in any collection for you and
provides the page features.

1. In Thymer, open the command palette (⌘P), choose **Plugins → Create Plugin**, and
   name it **Outline**.
2. Open **Edit Code → Custom Code**, paste the contents of
   [`installer/dist/plugin.js`](installer/dist/plugin.js), and save.
3. Open ⌘P → **Outline: install into a collection…**. A panel lists your collections,
   each with a line saying where it stands and a button saying what it will do:

| Button | What it does |
|---|---|
| Install | Turns on **sub-pages** if the collection has no way to nest, adds an Outline view, and writes the view's code. Sub-pages keep child pages out of their parent's Backlinks. |
| Repair | Brings the views back in step with your properties (see [one view per property](#one-view-per-nesting-property)). Leaves each view's name, columns and sort alone. |
| Update | Replaces an older version of the view's code. |
| Remove | Takes the Outline views and their code out again. |

The installer never overwrites code it didn't write. Thymer gives each collection one
plugin, so a collection that already has code of its own (formulas, a custom record
title) is flagged, and Install opens the code editor with the view loaded so you can
merge the two yourself. Nothing is saved until you save.

**By hand** instead: add a single-value record property linking to the collection
itself (or turn on sub-pages), add a view of type **Custom** (any name), then paste [`dist/plugin.js`](dist/plugin.js) into the
collection's plugin code and save.

Other devices pick the view up after a reload (⌘R).

## On every page

On any page of a collection with an Outline view:

- **Breadcrumb.** The page's ancestors appear after the collection name above the
  title: the top-level page, then the last two. Levels in between fold into a **…**
  menu. Click a level to open it, or ⌘-click to open it in the side panel.
- **Commands** in the palette (⌘P), each one bindable to a key in ⌘P → Change Keyboard
  Shortcuts:

| Command | What it does | Shortcut action |
|---|---|---|
| Outline: Show this page | Opens the Outline view zoomed into this page, with its row selected so the arrow keys work right away. Zoom Out steps out to its siblings. | `plugin.outlineshow` |
| Outline: New child page… | Asks for a title and creates a page under this one. | `plugin.outlinenewchild` |
| Outline: New sibling page… | The same, next to this page. | `plugin.outlinenewsibling` |
| Outline: Move page under… | Picks a new parent from a list that shows each page's path, so same-named pages are easy to tell apart. Leaves out this page's own branch. | `plugin.outlinemove` |

Nothing extra is stored: the breadcrumb and the commands read the parent links as they
go.

## What's different from the native List view

### Records nest under their parents

Each record sits under its parent, with a toggle to fold or unfold its children.
Records with no parent are the top level. Folds are remembered on each device.

### Thymer's fold and zoom keys

The outline answers to Thymer's own fold and zoom shortcuts, on the keys you've
bound them to in ⌘P → Change Keyboard Shortcuts, or Thymer's defaults if you haven't.
Each does to the selected row what it does to the line under the caret in a page:

| Shortcut action | In the outline |
|---|---|
| `nav.toggleFold` | Fold or unfold the selected row. |
| `nav.foldChildren`, `nav.unfoldChildren`, `nav.toggleFoldChildren` | The same for each of the row's children. |
| `nav.foldDescendants`, `nav.unfoldDescendants`, `nav.toggleFoldDescendants` | The same for everything under the row. |
| `nav.foldContainer`, `nav.unfoldContainer`, `nav.toggleFoldContainer` | The whole tree (or the zoomed branch). |
| `nav.foldCascade` | Fold the deepest open level under the row. On a row with nothing open, fold at its parent and move there. |
| `nav.unfoldCascade` | Unfold one more level under the row. |
| `panel.zoom_in`, `panel.zoom_out` | Zoom into the selected row, or step back out (below). |

Change a binding and the outline follows it, status-bar hints included.

### Search shows where each match lives

Thymer's search box works as usual, but instead of a flat list of hits you see each
match in its place in the tree, with the path down to it. Pages whose **names** match
are at full strength; the parents leading to them are faded, so the matches stand out.
The tree opens down to the deepest match and stops there. A matching page's own
children stay folded until you open them.

<img src="docs/search.png" alt="Searching &quot;department&quot;: pages with Department in their names at full strength, their parent pages faded, matches with children of their own left folded" width="700">

Folding and unfolding while you search is temporary: clear the search and the tree is
folded the way you left it.

### Zoom into a branch

Press Zoom In (`panel.zoom_in`, ⌥↓ by default) to show only the selected record and everything under it. A bar above the
rows shows the path to it; click any step to zoom there, or **All** for the whole
collection. Zoom Out (⌥↑) steps out one level. While zoomed, search looks only inside the
branch, at any depth. Zooming into a folded record opens it while you're zoomed in; zoom back out and
it's folded again, as in the editor.

### Properties on the row

The properties you choose in the view's settings appear on each row: choices as colored
pills, links as chips you can click to open. They line up in a column at the right and
move to a second line when the name needs the room.

### Edit fields without opening the record

Press **E** and the selected record's fields open in a list underneath it: the title,
the properties shown on the row, then every other editable field. **↑ / ↓** pick one,
**Enter** edits it, **Escape** or **E** closes the list. Text and numbers get a small
input; choices and links get a filter menu.

That includes the parent field, so you can move a whole branch somewhere else without
leaving the outline. The menu leaves out the record's own descendants, so you can't
create a loop.

### Peek while you browse

**Space** shows the selected record in the side panel, and the side panel follows as you
arrow up and down, so you can read through a branch without opening anything. **Enter**
keeps the page open; **Escape** closes the peek. If you already had something open in
the side panel, the peek borrows it and puts it back afterwards.

### New pages are named in place

**⇧Enter**, or the **New …** card at the bottom, adds a row and puts the cursor in its
name, rather than taking you to a new page. Leave the name empty and the page goes to
the trash.

### Keys

Most keys are the List view's own. The differences:

| Key | Action |
|---|---|
| `↑` `↓` | Move between rows. `↑` from the top row goes up to the search box, as in List. |
| `←` `→` | Also move between rows, wrapping at either end. |
| Fold and zoom | Thymer's own shortcuts (above). |
| `⌘↑` `⌘↓` | Fold or unfold the selected row. On a row with nothing to fold, `⌘↑` folds its parent and moves there; `⌘↓` always moves down a row, unfolding first if the row is folded, so it lands on the first child. |
| `E` | Edit the selected record's fields (above). |
| `Space` | Peek (above). |

The rest work as in List: `Enter` opens, `⌘Enter` opens in the side panel, `Home` /
`End`, `Tab`, `/` for the search box, click, `⌘`-click and `⇧`-click, and the `⋯` menu
on a hovered row.

While the outline has focus, the status bar at the bottom of the window lists these
keys in place of Thymer's usual hints: move, fold, fold level (cascade), fold all, open,
peek, edit, new, zoom (and zoom out while zoomed), search. Fold and zoom hints show your
own bindings, and an action with no key has no hint. During a peek it switches to the peek keys,
**Esc** Exit Peek, **↵** Open, **↑↓** Browse, as Thymer's own views do. Hints that
don't fit the window's width are left off the end.

A few List features have no counterpart, because Thymer doesn't let plugins do them
yet: dragging rows, move mode (`M`), **Custom Order** sorting, `⌥Enter` (new page
above), and the trash shortcut. The sort you pick resets when you leave the view, as it
does for every custom view.

### One view per nesting property

A collection can nest in more than one way: a Parent property, and say a "Reports to"
property linking to the same collection. Each is its own tree, and Install gives each
its own view, side by side in the view tabs. The Parent (or sub-page) view is called
**Outline**, the others **Outline: Reports to** and so on, and each keeps its own
columns, sort and folds. The page features follow the collection's first Outline view.

Only a property that holds **one** link qualifies. Several links would give a record
several parents, which isn't a tree.

The property decides whether its view exists: Repair brings back a view you deleted, and
removes a view whose property you deleted. If a view's property is gone before you run
Repair, the view lists its records flat and says why above the rows.

## Turning it off

Run **Outline: install into a collection…** and press **Remove**, or delete the Outline
view and the collection's plugin code yourself. Your records and parent links are
untouched. Remove leaves alone any Custom views you made yourself. Without an Outline
view, the collection's pages lose the breadcrumb and commands too.

## How it works (for the curious)

1. **Thymer hands the view its records.** A Custom view receives the collection's
   records already sorted and filtered by Thymer's own toolbar, so sort, filters and
   search are Thymer's. The view draws the tree from that list.
2. **It follows each record's parent link** to place it under its parent. A record
   whose parent isn't in the list becomes a top-level row, and records caught in a loop
   of parents are shown at the top level rather than disappearing.
3. **It puts search results back in context.** Thymer's search returns the matching
   pages without their parents, and also returns pages *under* a match. The view walks
   up from each result to restore the path, then checks each name against your search
   words to decide which rows are real matches and which are context.
4. **It uses Thymer's own pieces where it can reach them:** the toolbar and search box,
   the record options menu, and Thymer's peek. Peek isn't officially open to plugins, so
   the view checks for it first and falls back to a peek of its own built from the side
   panel (which blinks briefly when you keep a page you arrowed to). Plugins can add to
   the status bar but not change what's there, so the view's key hints are drawn over
   Thymer's, which are hidden only while the outline has focus.
5. **It draws only what's on screen.** Rows outside the visible area aren't built until
   you scroll to them, so a collection with thousands of records stays quick.
6. **Each view remembers its property** in the view's own settings, which is why it
   syncs and survives renaming the view.

[`CLAUDE.md`](CLAUDE.md) has the full implementation notes, including the Thymer
behavior this relies on that isn't in the plugin docs. Read it before changing the code.

## License

MIT, see [LICENSE](LICENSE).

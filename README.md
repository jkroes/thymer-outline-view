# Outline view

An outline view for [Thymer](https://thymer.com) collections: your records as an
indented, collapsible tree instead of a flat list, with the look and keys of Thymer's
own List view. It nests pages through Thymer's sub-pages ("Sub-page of"), which also
keeps child pages out of their parent's Backlinks. Your records
and properties stay exactly as they are; the view only changes how they're shown, and
writes only when you edit something from it.

The plugin's global half also follows you onto every page of those collections: a
breadcrumb of the page's ancestors above its title, and commands to show the
page in the outline, add a child or sibling page, or move the page somewhere else. See
[On every page](#on-every-page).

## On every page

These come from the global plugin. On any page of a collection with an Outline view:

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
Clicking a toggle selects that row and leaves the view where it is. The selection
stays with its page: when rows are added, moved or trashed above it the same page
stays selected, and folding a row away moves the selection to the parent you folded.
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
collection. Zoom Out (⌥↑) steps out one level and puts the branch you left at the top of the view. While zoomed, search looks only inside the
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

**⇧Enter** adds a page just below the selected row, as its sibling, and puts the
cursor in its name rather than taking you to a new page. **⌥Enter** does the same just
above the row. The **New …** card at the bottom adds one at the top level. Leave the
name empty and the page goes to the trash.

### Keys

The view's keys come from the collection code and work without the global plugin. Most
are the List view's own. The differences:

| Key | Action |
|---|---|
| `↑` `↓` | Move between rows. `↑` from the top row goes up to the search box, as in List. |
| `←` `→` | Also move between rows, wrapping at either end. |
| Fold and zoom | Thymer's own shortcuts (above). |
| `⌘↑` `⌘↓` | Fold or unfold the selected row. On a row with nothing to fold, `⌘↑` folds its parent and moves there; `⌘↓` always moves down a row, unfolding first if the row is folded, so it lands on the first child. |
| `E` | Edit the selected record's fields (above). |
| `Tab` `⇧Tab` | Indent the selected row under the row above it, or outdent it to follow its parent. Changes the page's Sub-page of. |
| `R` `F2` | Rename the selected row in place, as in List. |
| Trash (`⌘⌫`) | Trash the selected page **and every page under it**, then select the next row. Your own key if you rebound Thymer's trash shortcut. Each page goes to the trash separately. |
| `⌘⇧↑` `⌘⇧↓` | Move the selected row up or down among its siblings. The position is stored in the collection's **Order** property, numbered 1, 2, 3… under each parent, so the view has to be sorted by Order. Indent and outdent write it too. None of these work during a search. |
| `Space` | Peek (above). |

The rest work as in List: `Enter` opens, `⌘Enter` opens in the side panel, `Home` /
`End`, `/` for the search box, click, `⌘`-click and `⇧`-click, and the `⋯` menu
on a hovered row.

While the outline has focus, the status bar at the bottom of the window shows List's
hints first, in its order and wording (search, peek, open, rename, open aside, create,
trash), then the outline's own: create above, edit, indent, outdent, reorder, zoom (and zoom out
while zoomed), and last the folds: fold, fold children, fold descendants, fold level,
fold all. Fold, zoom and trash hints show your own
bindings, and an action with no key has no hint. During a peek it switches to the peek
keys, **Esc** Exit Peek, **↵** Open, **↕ ↔** Browse, as Thymer's own views do. In property
mode (`E`) it shows **↕** Previous / next property, **↵** Edit / save, **Esc** Exit, and
while a field or a name is being edited **↵** Save, **Esc** Exit, matching List.

When the hints don't all fit the window's width, a **? More** hint leads the strip:
press `?` to page to the hints that were cut off, and again to come back round to the
start. To use another key, add `"plugin.outlinehints": "<key>"` to your custom keyboard
shortcuts (⌘P → Change Keyboard Shortcuts).

**Why an Order property?** Thymer already has a manual order of its own: sort a view
by **Custom Order** and rows stay where you drag them. But Thymer's plugin API gives a
plugin no way to read or change that order, so the outline can't follow it. It keeps
each page's position in the Order property instead, which is why the view is sorted by
Order and why List's dragging and move mode (`M`) are replaced by the rearranging keys
above.

## How it works (for the curious)

1. **Thymer hands the view its records.** A Custom view receives the collection's
   records already sorted and filtered by Thymer's own toolbar, so sort, filters and
   search are Thymer's. The view draws the tree from that list.
2. **It follows each record's Sub-page of link** to place it under its parent. A record
   whose parent isn't in the list becomes a top-level row. Thymer refuses a loop of
   parents when you nest a page in the app, but an edit made outside it (the Markdown
   Mirror, say) can still create one; those pages show at the top level rather than
   disappearing.
3. **It puts search results back in context.** Thymer's search returns the matching
   pages without their parents, and also returns pages *under* a match. The view walks
   up from each result to restore the path, then checks each name against your search
   words to decide which rows are real matches and which are context.
4. **It uses Thymer's own pieces where it can reach them:** the toolbar and search box,
   the record options menu, and Thymer's peek. The menu, peek and your custom shortcuts
   aren't officially open to plugins, so the view checks for each first. If a Thymer
   update takes one away, that feature stops working and an "Outline needs updating"
   message names it. Plugins can add to
   the status bar but not change what's there, so the view's key hints are drawn over
   Thymer's, which are hidden only while the outline has focus.
5. **It draws only what's on screen.** Rows outside the visible area aren't built until
   you scroll to them, so a collection with thousands of records stays quick.

## Install

Outline comes in two parts. The **collection code** draws the view and goes into each
collection that should have one. It handles every key that works inside the view
([Keys](#keys), fold and zoom, the `?` hint paging). The **global plugin** installs
that code for you and adds the [page features](#on-every-page): the breadcrumb and the
page commands, with their four `plugin.outline…` shortcut actions.

**Global plugin:**

1. Open the command palette (⌘P), choose **Plugins → Create Plugin**, name it
   **Outline**, and paste the contents of
   [`global/dist/plugin.js`](global/dist/plugin.js) into **Edit Code → Custom Code**.
2. Open ⌘P → **Outline: install into a collection…**. A panel lists your collections,
   each with a line saying where it stands and a button saying what it will do:

| Button | What it does |
|---|---|
| Install | Turns on **sub-pages**, adds an **Order** property and an Outline view sorted by it, and writes the collection code. An existing number property named Order is reused. Order is made read-only, so it changes only through the outline's rearranging keys. |
| Repair | Puts back whichever of those is missing: sub-pages, the Order property, the Outline view, or the code. |
| Update | Replaces an older version of the collection code. |
| Remove | Takes the Outline view and the collection code out again. Sub-pages and Order keep their values. |

To update, paste the new `global/dist/plugin.js` into the global plugin, then press
**Update** on each collection in the panel.

**The installer never replaces code it didn't write.** A collection that already has
code of its own (formulas, a custom record title) gets no button and nothing written;
see [Other code in the same collection](#other-code-in-the-same-collection) to have
both. Once the merged code is in place, the panel sets up the properties and the view
there but leaves the code to you.

**Collection plugin, by hand** (instead of the installer):

1. In the collection's settings, turn on **sub-pages**.
2. Add a **number** property named **Order**. It stores each page's position under its
   parent, and changes through the outline's rearranging keys.
3. Add a view of type **Custom** and sort it by Order.
4. Open the collection's config JSON. Find the Order property's `id`, and set the Custom
   view's `opts` to `{ "order_field_id": "<that id>" }`. Optionally set
   `"read_only": true` on the Order property, so nobody types over a position by hand.
5. Open **Edit Code → Custom Code**, paste the contents of
   [`collection/dist/plugin.js`](collection/dist/plugin.js), and save. This replaces
   any code the collection already has.

### Other code in the same collection

Thymer gives each collection one piece of code, so a collection with an Outline view
can't simply have a second plugin pasted in. To add a formula, a custom record title or
another plugin's custom view to the same collection, merge it in when building, so
updates don't wipe it:

1. Clone this repo and run `./setup.sh`.
2. Write your additions as a small module:

   ```js
   // my-extras.js
   export default function (plugin) {
   	plugin.properties.formula('Total', ({ record }) => record.number('Price') * 2);
   }
   ```

   It runs when the collection loads, with the collection's plugin as its argument.
3. Build with it and paste the result into the collection:
   `node collection/build.mjs --extras my-extras.js --out my-collection.js`

The installer recognises a build made this way and never writes over it, so update such
a collection by rebuilding and pasting again, not with the panel's Update button.

Every Custom view in the collection is drawn as an outline unless its `opts.kind` says
otherwise. If your additions register a Custom view of their own, give that view a
different `kind` in its `opts`.

With the Thymer desktop app's MCP server on, `collection/deploy.mjs` does the build and
the paste for you: it merges `local/extras/<Collection name>.js` if you have one and
writes the result into the collection (`THYMER_WORKSPACE=<workspace guid> node
collection/deploy.mjs "<Collection>"`, or `--all` to update every collection that
already has the Outline code).

Other devices pick the view up after a reload (⌘R).

## Turning it off

Press **Remove** on the collection in the installer panel. By hand: delete the Outline
view in the collection's settings and clear the collection's code (or rebuild it with
only your additions). Your records, sub-pages and Order values are
untouched. Without an Outline view, the collection's pages lose the breadcrumb and
commands too.

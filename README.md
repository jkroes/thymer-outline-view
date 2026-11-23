# Outline view

Outline view is a collection plugin for [Thymer](https://thymer.com) that shows pages as a tree, paired with an optional global plugin that provides page breadcrumbs and utility commands. The view preserves most features of Thymer's built-in views and borrows outline-based features from Thymer's editor. 

https://github.com/user-attachments/assets/1e905529-98fa-4f0b-be8e-06ed3bebc914

## Collection plugin

### Navigation

Pages are nested based on sub-pages (the **Sub-page of** property) with a fold toggle. Selection stays on the same page when rows above it are added, moved or trashed, and moves to the parent when a fold hides it.

| Key | Action |
|---|---|
| `↑↓←→` | Move between rows. `↑` from the top row goes to the search box. |
| `Home` `End` | First or last row. |
| `Enter`, click | Open the page. |
| `⌘Enter`, `⌘`-click | Open the page in the side panel. |
| `⇧`-click | Select without opening. |
| Hover | Shows the `⋯` button that opens Thymer's page menu. |

### Fold

The view reuses Thymer's fold and zoom shortcuts for the editor, on the keys you've bound in ⌘P → Change Keyboard Shortcuts or Thymer's defaults. Folds are remembered on each device.

| Default (macOS) | Action | Action name |
|---|---|---|
| `⌘/` | Fold or unfold the selected row. | `nav.toggleFold` |
| `⌘,`, `⌘.`, none | Fold or unfold each of the row's children. | `nav.foldChildren`, `nav.unfoldChildren`, `nav.toggleFoldChildren` |
| none, none, `⌘⇧?` | Fold or unfold everything under the row. On a Mac, Thymer's default for `nav.toggleFoldDescendants` (`⌘⇧?`) never fires, here or in the editor. To enable the default, bind it to `"Meta+Shift+/"`. | `nav.foldDescendants`, `nav.unfoldDescendants`, `nav.toggleFoldDescendants` |
| none | Fold or unfold the whole tree, or the zoomed branch. | `nav.foldContainer`, `nav.unfoldContainer`, `nav.toggleFoldContainer` |
| `⌘⇧,` | Fold the deepest open level under the row. On a row with nothing open, fold its parent and move there. | `nav.foldCascade` |
| `⌘⇧.` | Unfold one more level under the row. | `nav.unfoldCascade` |

The plugin provides one fold command that has no analog in Thymer's editor:

| Key | Action |
|---|---|
| `⌘↑` `⌘↓` | Fold or unfold the selected row. With nothing to fold, `⌘↑` folds the parent and moves there; `⌘↓` always moves down a row, unfolding first so it lands on the first child. |

### Zoom

Zoom uses Thymer's shortcuts in the same way as fold. A folded page opens while you're zoomed into it and is folded again when you zoom out.

| Default (macOS) | Action | Action name |
|---|---|---|
| `⌥↓` | Zoom in, showing only the selected page and everything under it. A bar above the rows shows the path to it: click a step to zoom there, or **All** for the whole collection. | `panel.zoom_in` |
| `⌥↑` | Zoom out, putting the branch you left at the top of the view. | `panel.zoom_out` |

### Search

During search, the tree expands to the deepest matches, and a matching page's children stay folded until you open them. Non-matching ancestors are still shown in a faded font. While zoomed, search looks only inside the branch. Folds during a search are temporary.

| Key | Action |
|---|---|
| `/` | Jump to search box. |

### Rearranging

Plugins can't access **Custom Order**, which is Thymer's way of manually ordering pages within collections. As a workaround, position is automatically stored and updated in the collection's **Order** property, numbered sequentially under each parent. Rearranging needs the view sorted by Order and is unavailable during a search. Dragging and move mode (`M`) aren't possible without **Custom Order**.

| Key | Action |
|---|---|
| `Tab` `⇧Tab` | Indent or outdent (updates the **Sub-page of** property) |
| `⌘⇧↑` `⌘⇧↓` | Move up or down among siblings (updates the **Order** property) |

### Creating, renaming and trashing pages

| Key | Action | Action name |
|---|---|---|
| `⇧Enter` `⌥Enter` | New page below or above. The **New …** card at the bottom adds a page at the top level. The new row's name opens for typing in place, and a page left unnamed goes to the trash. | |
| `R` | Rename. | |
| `⌘⌫` | Trash the page and <u>every page under it</u>. | `collection.trash_record` |

### Properties

The properties chosen in the view's settings appear on each row: choices as colored pills, links as chips you can click to open. They align right and wrap to a second line when the panel is narrow. Properties can be edited inline.

| Key | Action |
|---|---|
| `E` | Toggles the page property list. `↑` / `↓` navigates. `Enter` toggles editing. `Escape` hides the list or discards any edits and stops editing. Text and numbers get an input; choices and links get a filter menu. **Sub-page of** is among the properties, so a whole branch can be moved from here; its menu leaves out the page's own descendants. (The only other way to edit this property is to include it in a property set and edit it directly from the page's properties section.) |

### Peek

| Key | Action |
|---|---|
| `Space` | Peek: Shows the selected page in the side panel, which then follows the selection as you move. `Enter` keeps the page open and `Escape` closes the peek, putting back whatever the side panel showed before. |

### Status bar

While the view has focus, the status bar shows its keys, with your own bindings for fold, zoom and trash. The status bar updates while peeking and editing properties. When the hints don't fit the window, `?` pages or cycles the hints.

| Key | Action | Action name |
|---|---|---|
| `?` | Page the status-bar hints. | `plugin.outlinehints` |

## Global plugin

The global plugin provides a command to easily install the outline view into a collection (see below). 

When viewing a page whose collection has installed an outline view, the global plugin displays **breadcrumbs** after the collection shown above the title: the top-level page, then the last two. Levels in between fold into a **…** menu. Click a level to open it, or ⌘-click to open it in the side panel.

The following commands are also available while viewing a page:

| Command | What it does | Action name |
|---|---|---|
| Outline: Show this page | Opens the Outline view and zooms to this page. | `plugin.outlineshow` |
| Outline: New child page… | Asks for a title and creates a page under this one. | `plugin.outlinenewchild` |
| Outline: New sibling page… | The same, next to this page. | `plugin.outlinenewsibling` |
| Outline: Move page under… | Picks a new parent from a list that shows each page's path, so same-named pages are easy to tell apart. Leaves out this page's own branch. | `plugin.outlinemove` |

## Installation

### With the global plugin

1. Open the command palette (⌘P), choose **Plugins → Create Plugin**, name it **Outline**, and paste the contents of [`global/dist/plugin.js`](global/dist/plugin.js) into **Edit Code → Custom Code**.
2. Open ⌘P → **Outline: install into a collection…**. A panel lists your collections, each with a line saying where it stands and a button saying what it will do:

| Button | What it does |
|---|---|
| Install | Enables sub-pages, adds a numeric **Order** property (reusing one that already exists) and an outline view sorted by it, and writes the collection code. **Order** is made read-only, so it changes only through the outline's rearranging keys. |
| Repair | Reinstalls anything missing: sub-pages, the **Order** property, the Outline view, or the code. |
| Update | Replaces an older version of the collection code. |
| Remove | Removes the Outline view and the collection code. **Sub-pages of** and **Order** keep their values. |

**The installer never replaces code it didn't write.** A collection that already has code of its own (formulas, a custom record title) gets no button and nothing written. See [Other code in the same collection](#other-code-in-the-same-collection) to have both. Once the merged code is in place, the panel sets up the properties and the view there but leaves the code to you.

### Without the global plugin

1. In the collection's settings, turn on **sub-pages**.
2. Add a number property named **Order**. 
3. Add a view of type **Custom** and sort it by **Order**. 
5. Open the collection's settings, click **Edit as code**, and click the **Configuration** tab. Find the **Order** property's ID within the JSON. Optionally set `"read_only": true` on the Order property, so nobody types over a position by hand.
7. Then find your custom outline view (look under `views`) and set `opts` to `{ "order_field_id": "<your order id here>" }`. 
8. Click the **Custom Code** tab, paste the contents of [`collection/dist/plugin.js`](collection/dist/plugin.js), and save. This replaces any code the collection already has.

### Other code in the same collection

Thymer gives each collection one piece of code, so a collection with an Outline view can't simply have a second plugin pasted in. To add a formula, a custom record title or another plugin's custom view to the same collection, merge it in when building, so updates don't wipe it:

1. Clone this repo and run `./setup.sh`.
2. Write your additions as a small module:

   ```js
   // my-extras.js
   export default function (plugin) {
   	plugin.properties.formula('Total', ({ record }) => record.number('Price') * 2);
   }
   ```

   It runs when the collection loads, with the collection's plugin as its argument.
3. Build with it and paste the result into the collection: `node collection/build.mjs --extras my-extras.js --out my-collection.js`

The installer recognises a build made this way and never writes over it, so update such a collection by rebuilding and pasting again, not with the panel's Update button.

Every Custom view in the collection is drawn as an outline unless `opts.kind` is set to something other than `"outline"`. If your additions register a Custom view of their own, give that view a different `kind` in its `opts`.

With the Thymer desktop app's MCP server on, `collection/deploy.mjs` does the build and the paste for you: it merges `local/extras/<Collection name>.js` if you have one and writes the result into the collection (`THYMER_WORKSPACE=<workspace guid> node collection/deploy.mjs "<Collection>"`, or `--all` to update every collection that already has the Outline code).

Other devices pick the view up after a reload (`⌘R`).

## How it works (for the curious)

1. **Thymer hands the view its records.** A Custom view receives the collection's records already sorted and filtered by Thymer's own toolbar, so sort, filters and search are Thymer's. The view draws the tree from that list.
2. **It follows each record's Sub-page of link** to place it under its parent. A record whose parent isn't in the list becomes a top-level row. Thymer refuses a loop of parents when you nest a page in the app, but an edit made outside it (the Markdown Mirror, say) can still create one; those pages show at the top level rather than disappearing.
3. **It puts search results back in context.** Thymer's search returns the matching pages without their parents, and also returns pages *under* a match. The view walks up from each result to restore the path, then checks each name against your search words to decide which rows are real matches and which are context.
4. **It uses Thymer's own pieces where it can reach them:** the toolbar and search box, the page menu, and Thymer's peek. The menu, peek and your custom shortcuts aren't officially open to plugins, so the view checks for each first. If a Thymer update takes one away, that feature stops working and an "Outline needs updating" message is shown. Plugins can add to the status bar but not change what's there, so the view's key hints are drawn over Thymer's, which are hidden only while the outline has focus.
5. **It draws only what's on screen.** Rows outside the visible area aren't built until you scroll to them, so a collection with thousands of records stays quick.

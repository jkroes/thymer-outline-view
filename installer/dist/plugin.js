/**
 * Outline installer — a global plugin that installs the Outline view into any
 * collection.
 *
 * The view itself is a CollectionPlugin, so it has to live in each collection's
 * own plugin slot. This walks your collections, shows what state each one is in,
 * and does the three steps for you: turn on nesting, add a Custom view, write
 * the view's code.
 *
 * The view source is embedded at build time by build.mjs — this file is a
 * template and will not run until built. Nothing is fetched at runtime.
 */

const VIEW_SOURCE = "\"use strict\";\nvar plugins = (() => {\n  var __defProp = Object.defineProperty;\n  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;\n  var __getOwnPropNames = Object.getOwnPropertyNames;\n  var __hasOwnProp = Object.prototype.hasOwnProperty;\n  var __name = (target, value) => __defProp(target, \"name\", { value, configurable: true });\n  var __export = (target, all) => {\n    for (var name in all)\n      __defProp(target, name, { get: all[name], enumerable: true });\n  };\n  var __copyProps = (to, from, except, desc) => {\n    if (from && typeof from === \"object\" || typeof from === \"function\") {\n      for (let key of __getOwnPropNames(from))\n        if (!__hasOwnProp.call(to, key) && key !== except)\n          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });\n    }\n    return to;\n  };\n  var __toCommonJS = (mod) => __copyProps(__defProp({}, \"__esModule\", { value: true }), mod);\n\n  // plugin.js\n  var plugin_exports = {};\n  __export(plugin_exports, {\n    Plugin: () => Plugin\n  });\n  var ENUM_COLORS = [\n    \"red\",\n    \"orange\",\n    \"green\",\n    \"cyan\",\n    \"blue\",\n    \"purple\",\n    \"pink\",\n    \"fuchsia\",\n    \"rose\",\n    \"stone\",\n    \"teal\",\n    \"sky\",\n    \"indigo\",\n    \"zinc\",\n    \"yellow\"\n  ];\n  function timeAgo(date) {\n    if (!date) return \"\";\n    const seconds = Math.floor((Date.now() - date.getTime()) / 1e3);\n    if (seconds < 60) return \"just now\";\n    const minutes = Math.floor(seconds / 60);\n    if (minutes < 60) return `${minutes}m ago`;\n    const hours = Math.floor(minutes / 60);\n    if (hours < 24) return `${hours}h ago`;\n    const days = Math.floor(hours / 24);\n    if (days < 30) return `${days}d ago`;\n    const months = Math.floor(days / 30);\n    if (months < 12) return `${months}mo ago`;\n    return `${Math.floor(months / 12)}y ago`;\n  }\n  __name(timeAgo, \"timeAgo\");\n  function withAncestors(records, parentFieldId) {\n    const byGuid = new Map(records.map((record) => [record.guid, record]));\n    const added = /* @__PURE__ */ new Set();\n    if (parentFieldId) {\n      records.forEach((record) => {\n        let parent = record.linkedRecord(parentFieldId);\n        for (let depth = 0; parent && !byGuid.has(parent.guid) && depth < 100; depth++) {\n          byGuid.set(parent.guid, parent);\n          added.add(parent.guid);\n          parent = parent.linkedRecord(parentFieldId);\n        }\n      });\n    }\n    return { records: Array.from(byGuid.values()), added };\n  }\n  __name(withAncestors, \"withAncestors\");\n  function buildHierarchy(records, parentFieldId) {\n    const nodes = /* @__PURE__ */ new Map();\n    records.forEach((record) => {\n      const parent = parentFieldId ? record.linkedRecord(parentFieldId) : null;\n      nodes.set(record.guid, {\n        id: record.guid,\n        name: record.getName() || \"Unknown\",\n        parentGuid: parent ? parent.guid : null,\n        record,\n        children: [],\n        level: 0,\n        x: 0,\n        y: 0\n      });\n    });\n    const rootNodes = [];\n    nodes.forEach((node) => {\n      if (node.parentGuid && nodes.has(node.parentGuid)) {\n        nodes.get(node.parentGuid).children.push(node);\n      } else {\n        rootNodes.push(node);\n      }\n    });\n    const reachable = /* @__PURE__ */ new Set();\n    const walk = /* @__PURE__ */ __name((node) => {\n      if (reachable.has(node.id)) return;\n      reachable.add(node.id);\n      node.children.forEach(walk);\n    }, \"walk\");\n    rootNodes.forEach(walk);\n    nodes.forEach((node) => {\n      if (!reachable.has(node.id)) {\n        const parent = nodes.get(node.parentGuid);\n        if (parent) {\n          parent.children = parent.children.filter((c) => c !== node);\n        }\n        rootNodes.push(node);\n        walk(node);\n      }\n    });\n    return { nodes, rootNodes };\n  }\n  __name(buildHierarchy, \"buildHierarchy\");\n  function hierarchyCandidates(fields, collectionGuid) {\n    return (fields || []).filter((field) => field.type === \"record\" && field.active !== false && field.many !== true && (field.id === \"parent_page\" || field.filter_colguid === collectionGuid));\n  }\n  __name(hierarchyCandidates, \"hierarchyCandidates\");\n  var Plugin = class extends CollectionPlugin {\n    static {\n      __name(this, \"Plugin\");\n    }\n    onLoad() {\n      this.registerOutlineView();\n    }\n    /**\n     * Claim every custom view the collection has, rather than one hardcoded id.\n     *\n     * A collection has exactly one plugin, so its custom views can only be\n     * rendered by this code — there is nothing else they could belong to. Binding\n     * to whatever is there means the view id stops being load-bearing: renaming\n     * it, or letting the app's sanitizer rewrite it, can't unhook the view.\n     * `register()` is a Map.set keyed by view id, so calling it per view is fine.\n     *\n     * Views added after load aren't seen until the plugin reloads, which saving\n     * the collection config does anyway.\n     */\n    registerOutlineView() {\n      const views = (this.getConfiguration().views || []).filter((v) => v.type === \"custom\");\n      for (const view of views) this.registerOn(view.id);\n    }\n    registerOn(viewId) {\n      this.views.register(viewId, (viewContext) => {\n        const ui = this.ui;\n        const plugin = this;\n        const collectionGuid = /* @__PURE__ */ __name(() => plugin.collection.getGuid(), \"collectionGuid\");\n        const storageKey = `outline-collapsed:${this.getConfiguration().name}:${viewId}`;\n        let collapsed = /* @__PURE__ */ new Set();\n        try {\n          collapsed = new Set(JSON.parse(localStorage.getItem(storageKey) || \"[]\"));\n        } catch (err) {\n          collapsed = /* @__PURE__ */ new Set();\n        }\n        let forceExpanded = /* @__PURE__ */ new Set();\n        let contextGuids = /* @__PURE__ */ new Set();\n        let hierarchy = null;\n        let rows = [];\n        let selectedIndex = 0;\n        let $root = null;\n        let $list = null;\n        let $note = null;\n        let $menu = null;\n        let peekPanelId = null;\n        let peekRestoreNav = null;\n        let propMode = null;\n        let pendingNameEditGuid = null;\n        const fieldsById = /* @__PURE__ */ __name(() => {\n          const map = {};\n          (plugin.getConfiguration().fields || []).forEach((f) => {\n            map[f.id] = f;\n          });\n          return map;\n        }, \"fieldsById\");\n        const hierarchyBinding = /* @__PURE__ */ __name(() => {\n          const conf = plugin.getConfiguration();\n          const candidates = hierarchyCandidates(conf.fields, collectionGuid());\n          const view = (conf.views || []).find((v) => v.id === viewId);\n          const bound = view && view.opts ? view.opts.hierarchy_field_id : null;\n          if (bound) {\n            const field = candidates.find((f) => f.id === bound);\n            if (field) return { fieldId: field.id, orphaned: null };\n            return { fieldId: null, orphaned: bound };\n          }\n          if (candidates.some((f) => f.id === \"parent_page\")) {\n            return { fieldId: \"parent_page\", orphaned: null };\n          }\n          const self = candidates.find((f) => f.id !== \"parent_page\");\n          return { fieldId: self ? self.id : null, orphaned: null };\n        }, \"hierarchyBinding\");\n        const hierarchyFieldId = /* @__PURE__ */ __name(() => hierarchyBinding().fieldId, \"hierarchyFieldId\");\n        const choiceColorsFor = /* @__PURE__ */ __name((field) => {\n          const map = {};\n          (field.choices || []).forEach((c) => {\n            map[c.label] = ENUM_COLORS[Number(c.color)] || \"zinc\";\n          });\n          return map;\n        }, \"choiceColorsFor\");\n        const ownPanel = /* @__PURE__ */ __name(() => ui.getPanels().find((panel) => {\n          const nav = panel.getNavigation();\n          return nav && nav.type === \"overview\" && nav.rootId === collectionGuid();\n        }) || null, \"ownPanel\");\n        const isExpanded = /* @__PURE__ */ __name((node) => !collapsed.has(node.id) || forceExpanded.has(node.id), \"isExpanded\");\n        const visibleFields = /* @__PURE__ */ __name(() => {\n          const byId = fieldsById();\n          return viewContext.getVisiblePropertyIds().map((id) => byId[id]).filter((field) => field && field.id !== \"title\" && field.type !== \"datetime\" && field.type !== \"banner\");\n        }, \"visibleFields\");\n        const propValue = /* @__PURE__ */ __name((record, field) => {\n          if (field.type === \"choice\") {\n            const label = record.prop(field.id).choiceLabel();\n            if (!label) return null;\n            return { text: label, color: choiceColorsFor(field)[label] || \"zinc\" };\n          }\n          if (field.type === \"record\") {\n            const linked = record.linkedRecord(field.id);\n            return linked ? { text: linked.getName(), guid: linked.guid } : null;\n          }\n          if (field.type === \"number\") {\n            const num = record.number(field.id);\n            return num === null ? null : { text: String(num) };\n          }\n          const text = record.text(field.id);\n          return text ? { text } : null;\n        }, \"propValue\");\n        const computeForceExpanded = /* @__PURE__ */ __name((contextGuids2) => {\n          forceExpanded = /* @__PURE__ */ new Set();\n          if (!hierarchy || !contextGuids2.size) return;\n          const visit = /* @__PURE__ */ __name((node) => {\n            const hasMatchBelow = node.children.map(visit).some(Boolean);\n            if (hasMatchBelow) forceExpanded.add(node.id);\n            return hasMatchBelow || !contextGuids2.has(node.id);\n          }, \"visit\");\n          hierarchy.rootNodes.forEach(visit);\n        }, \"computeForceExpanded\");\n        const flatten = /* @__PURE__ */ __name(() => {\n          const out = [];\n          const visit = /* @__PURE__ */ __name((node, depth, parent) => {\n            out.push({ node, depth, parent });\n            if (isExpanded(node)) {\n              node.children.forEach((child) => visit(child, depth + 1, node));\n            }\n          }, \"visit\");\n          hierarchy.rootNodes.forEach((root) => visit(root, 0, null));\n          return out;\n        }, \"flatten\");\n        const setSelection = /* @__PURE__ */ __name((index) => {\n          selectedIndex = Math.max(0, Math.min(index, rows.length - 1));\n          if (!$list) return;\n          $list.querySelectorAll(\".outline-row\").forEach(($row, i) => {\n            $row.classList.toggle(\"selected\", i === selectedIndex);\n            $row.tabIndex = i === selectedIndex ? 0 : -1;\n          });\n          const $selected = $list.querySelector(`.outline-row[data-index=\"${selectedIndex}\"]`);\n          if ($selected) {\n            $selected.scrollIntoView({ block: \"nearest\" });\n            if (document.activeElement !== appSearchInput()) {\n              $selected.focus({ preventScroll: true });\n            }\n          }\n          if (peekPanelId) {\n            if (peekPanel()) showPeek();\n            else peekPanelId = null;\n          }\n        }, \"setSelection\");\n        const toggle = /* @__PURE__ */ __name((node) => {\n          if (isExpanded(node)) {\n            collapsed.add(node.id);\n            forceExpanded.delete(node.id);\n          } else {\n            collapsed.delete(node.id);\n          }\n          localStorage.setItem(storageKey, JSON.stringify([...collapsed]));\n          const keepGuid = rows[selectedIndex] ? rows[selectedIndex].node.id : null;\n          renderRows();\n          const restored = rows.findIndex((r) => r.node.id === keepGuid);\n          setSelection(restored === -1 ? 0 : restored);\n        }, \"toggle\");\n        const restack = /* @__PURE__ */ __name(() => {\n          if (!$list) return;\n          const $rows = Array.from($list.querySelectorAll(\".outline-row\"));\n          $rows.forEach(($r) => {\n            const $props = $r.querySelector(\".outline-props\");\n            const $title = $r.querySelector(\".outline-title\");\n            if ($props && $title && $props.parentElement !== $title) {\n              $title.insertBefore($props, $r.querySelector(\".outline-time\"));\n            }\n            $r.classList.remove(\"is-stacked\");\n          });\n          const needsStacking = $rows.map(($r) => {\n            const $name = $r.querySelector(\".outline-name\");\n            if (!$name || !$r.querySelector(\".outline-props\")) return false;\n            return $name.scrollWidth > $name.clientWidth + 1;\n          });\n          $rows.forEach(($r, i) => {\n            if (!needsStacking[i]) return;\n            $r.classList.add(\"is-stacked\");\n            const $props = $r.querySelector(\".outline-props\");\n            $props.style.paddingLeft = `${Number($r.dataset.indent) + TWISTY_W + ROW_GAP}px`;\n            $r.insertBefore($props, $r.querySelector(\".outline-propedit\"));\n          });\n        }, \"restack\");\n        const selectNext = /* @__PURE__ */ __name((delta) => {\n          if (!rows.length) return;\n          setSelection((selectedIndex + delta + rows.length) % rows.length);\n        }, \"selectNext\");\n        const openSelected = /* @__PURE__ */ __name((otherPanel) => {\n          const current = rows[selectedIndex];\n          if (!current) return;\n          if (otherPanel) viewContext.openRecordInOtherPanel(current.node.id);\n          else viewContext.openRecordInThisPanel(current.node.id);\n        }, \"openSelected\");\n        const focusView = /* @__PURE__ */ __name(() => {\n          if (!$root) return;\n          $root.tabIndex = -1;\n          $root.focus({ preventScroll: true });\n        }, \"focusView\");\n        const appChrome = /* @__PURE__ */ __name(() => $root && $root.closest(\".custom-view\") || null, \"appChrome\");\n        const appSearchInput = /* @__PURE__ */ __name(() => {\n          const $chrome = appChrome();\n          return $chrome && $chrome.querySelector(\".records-view-query-wrap input\") || null;\n        }, \"appSearchInput\");\n        const focusAppSearch = /* @__PURE__ */ __name(() => {\n          const $input = appSearchInput();\n          if (!$input) return false;\n          $input.focus();\n          return true;\n        }, \"focusAppSearch\");\n        const peekPanel = /* @__PURE__ */ __name(() => {\n          if (!peekPanelId) return null;\n          return ui.getPanels().find((p) => p.getId() === peekPanelId) || null;\n        }, \"peekPanel\");\n        const hidePeek = /* @__PURE__ */ __name(() => {\n          const panel = peekPanel();\n          const restore = peekRestoreNav;\n          peekPanelId = null;\n          peekRestoreNav = null;\n          if (!panel) return;\n          if (restore) {\n            panel.navigateTo(restore);\n            const self = ownPanel();\n            if (self) ui.setActivePanel(self);\n            focusView();\n          } else {\n            ui.closePanel(panel);\n          }\n        }, \"hidePeek\");\n        const commitPeek = /* @__PURE__ */ __name(() => {\n          const current = rows[selectedIndex];\n          const panel = peekPanel();\n          const borrowed = !!peekRestoreNav;\n          peekPanelId = null;\n          peekRestoreNav = null;\n          if (borrowed) {\n            if (panel) ui.setActivePanel(panel);\n            return;\n          }\n          if (panel) ui.closePanel(panel);\n          if (current) {\n            setTimeout(() => viewContext.openRecordInOtherPanel(current.node.id), 220);\n          }\n        }, \"commitPeek\");\n        const showPeek = /* @__PURE__ */ __name(() => {\n          const current = rows[selectedIndex];\n          if (!current) return;\n          const self = ownPanel();\n          const before = new Set(ui.getPanels().map((p) => p.getId()));\n          if (!peekPanelId) {\n            const borrowed = ui.getPanels().find((p) => !p.isSidebar() && (!self || p.getId() !== self.getId()));\n            peekRestoreNav = borrowed ? borrowed.getNavigation() : null;\n          }\n          viewContext.openRecordInOtherPanel(current.node.id);\n          const takeFocusBack = /* @__PURE__ */ __name(() => {\n            if (self) ui.setActivePanel(self);\n            focusView();\n          }, \"takeFocusBack\");\n          takeFocusBack();\n          requestAnimationFrame(takeFocusBack);\n          setTimeout(takeFocusBack, 120);\n          if (peekPanelId) return;\n          const panels = ui.getPanels().filter((p) => !p.isSidebar());\n          const opened = panels.find((p) => !before.has(p.getId())) || panels.find((p) => !self || p.getId() !== self.getId());\n          peekPanelId = opened ? opened.getId() : null;\n        }, \"showPeek\");\n        const peekSelected = /* @__PURE__ */ __name(() => showPeek(), \"peekSelected\");\n        const ROW_PAD_X = 8;\n        const TWISTY_W = 16;\n        const ROW_GAP = 6;\n        const DEPTH_STEP = 20;\n        const ICON_OFFSET = ROW_PAD_X + TWISTY_W + ROW_GAP;\n        const createRecord = /* @__PURE__ */ __name(() => {\n          const guid = viewContext.createRecord();\n          if (!guid) return;\n          pendingNameEditGuid = guid;\n          setTimeout(() => {\n            if (pendingNameEditGuid) renderRows();\n          }, 150);\n        }, \"createRecord\");\n        const onDocumentClick = /* @__PURE__ */ __name((e) => {\n          if ($menu && !$menu.contains(e.target)) closeMenu();\n        }, \"onDocumentClick\");\n        const closeMenu = /* @__PURE__ */ __name(() => {\n          if ($menu) {\n            $menu.remove();\n            $menu = null;\n            document.removeEventListener(\"click\", onDocumentClick, true);\n          }\n        }, \"closeMenu\");\n        const showMenu = /* @__PURE__ */ __name((items, x, y, filterPlaceholder) => {\n          closeMenu();\n          if (!$root) return;\n          $menu = document.createElement(\"div\");\n          $menu.className = \"outline-menu\";\n          const $items = document.createElement(\"div\");\n          let $filter = null;\n          let shown = items;\n          let cursor = 0;\n          const confirm = /* @__PURE__ */ __name((index) => {\n            const item = shown[index];\n            if (!item) return;\n            closeMenu();\n            item.onSelect();\n          }, \"confirm\");\n          const move = /* @__PURE__ */ __name((delta) => {\n            if (!shown.length) return;\n            cursor = (cursor + delta + shown.length) % shown.length;\n            paint();\n            const $sel = $items.querySelector(\".is-selected\");\n            if ($sel) $sel.scrollIntoView({ block: \"nearest\" });\n          }, \"move\");\n          const paint = /* @__PURE__ */ __name(() => {\n            const needle = $filter ? $filter.value.trim().toLowerCase() : \"\";\n            shown = items.filter((item) => !needle || item.label.toLowerCase().includes(needle));\n            if (cursor >= shown.length) cursor = 0;\n            $items.innerHTML = \"\";\n            shown.forEach((item, index) => {\n              const $item = document.createElement(\"div\");\n              $item.className = \"outline-menu-item\";\n              if (item.active) $item.classList.add(\"is-active\");\n              if (index === cursor) $item.classList.add(\"is-selected\");\n              $item.appendChild(ui.createIcon(item.icon || \"ti-align-left\"));\n              const $label = document.createElement(\"span\");\n              $label.textContent = item.label;\n              $item.appendChild($label);\n              $item.addEventListener(\"click\", (e) => {\n                e.stopPropagation();\n                confirm(index);\n              });\n              $items.appendChild($item);\n            });\n          }, \"paint\");\n          const onMenuKeyDown = /* @__PURE__ */ __name((e) => {\n            e.stopPropagation();\n            switch (e.key) {\n              case \"ArrowDown\":\n                e.preventDefault();\n                move(1);\n                break;\n              case \"ArrowUp\":\n                e.preventDefault();\n                move(-1);\n                break;\n              case \"Enter\":\n                e.preventDefault();\n                confirm(cursor);\n                break;\n              case \"Escape\":\n                e.preventDefault();\n                closeMenu();\n                break;\n              case \"Tab\":\n                e.preventDefault();\n                break;\n            }\n          }, \"onMenuKeyDown\");\n          $menu.addEventListener(\"keydown\", onMenuKeyDown);\n          if (filterPlaceholder) {\n            $menu.classList.add(\"has-filter\");\n            $filter = document.createElement(\"input\");\n            $filter.type = \"text\";\n            $filter.spellcheck = false;\n            $filter.className = \"form-input outline-menu-filter\";\n            $filter.placeholder = filterPlaceholder;\n            $filter.addEventListener(\"input\", () => {\n              cursor = 0;\n              paint();\n            });\n            $filter.addEventListener(\"click\", (e) => e.stopPropagation());\n            $menu.appendChild($filter);\n          }\n          $menu.appendChild($items);\n          paint();\n          $root.appendChild($menu);\n          const rootRect = $root.getBoundingClientRect();\n          const menuW = $menu.offsetWidth;\n          const left = Math.max(0, Math.min(x - rootRect.left, rootRect.width - menuW));\n          $menu.style.left = `${left}px`;\n          $menu.style.top = `${y - rootRect.top}px`;\n          document.addEventListener(\"click\", onDocumentClick, true);\n          if ($filter) {\n            $filter.focus();\n          } else {\n            $menu.tabIndex = -1;\n            $menu.focus();\n          }\n        }, \"showMenu\");\n        const renderOrphanNote = /* @__PURE__ */ __name(() => {\n          if (!$note) return;\n          const orphaned = hierarchyBinding().orphaned;\n          $note.textContent = orphaned ? 'The property this view nested by is gone, so rows are flat. Run \"Outline: install into a collection...\" to clean this up.' : \"\";\n        }, \"renderOrphanNote\");\n        const EDITABLE_TYPES = [\"text\", \"number\", \"choice\", \"record\"];\n        const EDIT_SKIP_IDS = [\"title\", \"icon\", \"collection\"];\n        const editableFields = /* @__PURE__ */ __name(() => {\n          const canEdit = /* @__PURE__ */ __name((f) => f && f.active !== false && !f.read_only && EDITABLE_TYPES.includes(f.type) && !EDIT_SKIP_IDS.includes(f.id), \"canEdit\");\n          const shown = visibleFields().filter(canEdit);\n          const rest = (plugin.getConfiguration().fields || []).filter((f) => canEdit(f) && !shown.some((s) => s.id === f.id));\n          const title = fieldsById()[\"title\"];\n          return title ? [title, ...shown, ...rest] : [...shown, ...rest];\n        }, \"editableFields\");\n        const fieldText = /* @__PURE__ */ __name((record, field) => {\n          if (field.id === \"title\") return record.getName() || \"\";\n          const value = propValue(record, field);\n          return value ? value.text : \"\";\n        }, \"fieldText\");\n        const afterWrite = /* @__PURE__ */ __name(() => setTimeout(() => renderRows(), 60), \"afterWrite\");\n        const editText = /* @__PURE__ */ __name(($cell, value, { onCommit, onCancel }) => {\n          const $input = document.createElement(\"input\");\n          $input.type = \"text\";\n          $input.className = \"outline-inline-input\";\n          $input.value = value || \"\";\n          let done = false;\n          const finish = /* @__PURE__ */ __name((commit) => {\n            if (done) return;\n            done = true;\n            if (commit) onCommit($input.value.trim());\n            else if (onCancel) onCancel();\n          }, \"finish\");\n          $input.addEventListener(\"keydown\", (e) => {\n            e.stopPropagation();\n            if (e.key === \"Enter\") {\n              e.preventDefault();\n              finish(true);\n            } else if (e.key === \"Escape\") {\n              e.preventDefault();\n              finish(false);\n            }\n          });\n          $input.addEventListener(\"blur\", () => finish(true));\n          $input.addEventListener(\"mouseup\", (e) => e.stopPropagation());\n          $cell.replaceWith($input);\n          $input.focus();\n          $input.select();\n        }, \"editText\");\n        const startNameEdit = /* @__PURE__ */ __name((node, isNew) => {\n          if (!$list) return;\n          const $row = $list.querySelector(`.outline-row[data-guid=\"${node.id}\"]`);\n          const $name = $row && $row.querySelector(\".outline-name\");\n          if (!$name) return;\n          const discardIfEmpty = /* @__PURE__ */ __name((text) => {\n            if (isNew && !text) {\n              node.record.trash();\n              return true;\n            }\n            return false;\n          }, \"discardIfEmpty\");\n          editText($name, node.record.getName(), {\n            onCommit: /* @__PURE__ */ __name((text) => {\n              if (!discardIfEmpty(text)) node.record.prop(\"title\").set(text);\n              focusView();\n              afterWrite();\n            }, \"onCommit\"),\n            onCancel: /* @__PURE__ */ __name(() => {\n              discardIfEmpty(\"\");\n              focusView();\n              afterWrite();\n            }, \"onCancel\")\n          });\n        }, \"startNameEdit\");\n        const descendantsOf = /* @__PURE__ */ __name((node) => {\n          const out = /* @__PURE__ */ new Set();\n          const visit = /* @__PURE__ */ __name((n) => n.children.forEach((child) => {\n            out.add(child.id);\n            visit(child);\n          }), \"visit\");\n          visit(node);\n          return out;\n        }, \"descendantsOf\");\n        const recordCandidates = /* @__PURE__ */ __name(async (field, node) => {\n          if (!field.filter_colguid || field.filter_colguid === collectionGuid()) {\n            const banned = descendantsOf(node);\n            return [...hierarchy.nodes.values()].filter((n) => n.id !== node.id && !banned.has(n.id)).map((n) => ({ guid: n.id, name: n.name }));\n          }\n          const other = plugin.data.getPluginByGuid(field.filter_colguid);\n          if (!other || !other.getAllRecords) return [];\n          const records = await other.getAllRecords();\n          return records.map((r) => ({ guid: r.guid, name: r.getName() || \"Unknown\" }));\n        }, \"recordCandidates\");\n        const editField = /* @__PURE__ */ __name((node, field, $cell) => {\n          const record = node.record;\n          const prop = /* @__PURE__ */ __name(() => record.prop(field.id), \"prop\");\n          if (field.id === \"title\" || field.type === \"text\" || field.type === \"number\") {\n            editText($cell, fieldText(record, field), {\n              onCommit: /* @__PURE__ */ __name((text) => {\n                if (field.type === \"number\") {\n                  prop().set(text === \"\" ? null : Number(text));\n                } else {\n                  prop().set(text);\n                }\n                focusView();\n                afterWrite();\n              }, \"onCommit\"),\n              onCancel: /* @__PURE__ */ __name(() => {\n                focusView();\n                renderRows();\n              }, \"onCancel\")\n            });\n            return;\n          }\n          const rect = $cell.getBoundingClientRect();\n          const icon = field.icon || \"ti-align-left\";\n          if (field.type === \"choice\") {\n            const current = prop().choiceLabel();\n            const items = (field.choices || []).filter((c) => c.active !== false).map((c) => ({\n              label: c.label,\n              icon: c.icon || icon,\n              active: c.label === current,\n              onSelect: /* @__PURE__ */ __name(() => {\n                prop().setChoice(c.label);\n                focusView();\n                afterWrite();\n              }, \"onSelect\")\n            }));\n            items.push({\n              label: \"Clear\",\n              icon: \"ti-x\",\n              onSelect: /* @__PURE__ */ __name(() => {\n                prop().set(null);\n                focusView();\n                afterWrite();\n              }, \"onSelect\")\n            });\n            showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);\n            return;\n          }\n          if (field.type === \"record\") {\n            const linked = record.linkedRecord(field.id);\n            const link = /* @__PURE__ */ __name((guid) => {\n              if (field.id === \"parent_page\") record.setSubPageOf(guid);\n              else prop().set(guid);\n            }, \"link\");\n            recordCandidates(field, node).then((candidates) => {\n              if (viewContext.isDestroyed()) return;\n              const items = [{\n                label: \"None\",\n                icon: \"ti-x\",\n                active: !linked,\n                onSelect: /* @__PURE__ */ __name(() => {\n                  link(null);\n                  focusView();\n                  afterWrite();\n                }, \"onSelect\")\n              }];\n              candidates.forEach((c) => items.push({\n                label: c.name,\n                icon,\n                active: linked && linked.guid === c.guid,\n                onSelect: /* @__PURE__ */ __name(() => {\n                  link(c.guid);\n                  focusView();\n                  afterWrite();\n                }, \"onSelect\")\n              }));\n              showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);\n            });\n          }\n        }, \"editField\");\n        const editSelectedField = /* @__PURE__ */ __name(() => {\n          if (!propMode || !$list) return;\n          const $row = $list.querySelector(`.outline-row[data-guid=\"${propMode.guid}\"]`);\n          const current = rows.find((r) => r.node.id === propMode.guid);\n          const fields = editableFields();\n          const field = fields[propMode.index];\n          if (!$row || !current || !field) return;\n          const $cell = $row.querySelector(`.outline-pe-row[data-index=\"${propMode.index}\"] .outline-pe-value`);\n          if ($cell) editField(current.node, field, $cell);\n        }, \"editSelectedField\");\n        const paintPropSelection = /* @__PURE__ */ __name(() => {\n          if (!$list) return;\n          $list.querySelectorAll(\".outline-pe-row\").forEach(($r) => {\n            $r.classList.toggle(\"is-selected\", Number($r.dataset.index) === propMode.index);\n          });\n        }, \"paintPropSelection\");\n        const exitPropMode = /* @__PURE__ */ __name(() => {\n          propMode = null;\n          renderRows();\n          focusView();\n        }, \"exitPropMode\");\n        const buildPropEditor = /* @__PURE__ */ __name((node, indent) => {\n          const $panel = document.createElement(\"div\");\n          $panel.className = \"outline-propedit\";\n          $panel.style.paddingLeft = `${indent + TWISTY_W + ROW_GAP}px`;\n          $panel.addEventListener(\"mouseup\", (e) => e.stopPropagation());\n          const fields = editableFields();\n          if (propMode.index >= fields.length) propMode.index = 0;\n          fields.forEach((field, index) => {\n            const $prow = document.createElement(\"div\");\n            $prow.className = \"outline-pe-row\";\n            $prow.dataset.index = String(index);\n            if (index === propMode.index) $prow.classList.add(\"is-selected\");\n            const $icon = ui.createIcon(field.icon || \"ti-align-left\");\n            $icon.classList.add(\"outline-pe-icon\");\n            $prow.appendChild($icon);\n            const $label = document.createElement(\"span\");\n            $label.className = \"outline-pe-label\";\n            $label.textContent = field.label;\n            $prow.appendChild($label);\n            const $value = document.createElement(\"span\");\n            $value.className = \"outline-pe-value\";\n            const text = fieldText(node.record, field);\n            $value.textContent = text || \"Empty\";\n            if (!text) $value.classList.add(\"is-empty\");\n            $prow.appendChild($value);\n            $prow.addEventListener(\"mouseup\", (e) => {\n              e.stopPropagation();\n              if (e.button !== 0) return;\n              propMode.index = index;\n              paintPropSelection();\n              editField(node, field, $value);\n            });\n            $panel.appendChild($prow);\n          });\n          return $panel;\n        }, \"buildPropEditor\");\n        const propChip = /* @__PURE__ */ __name((field, value) => {\n          const $prop = document.createElement(\"span\");\n          $prop.className = \"outline-prop\";\n          const $icon = ui.createIcon(field.icon || \"ti-align-left\");\n          $icon.classList.add(\"outline-prop-icon\");\n          $prop.appendChild($icon);\n          const $value = document.createElement(\"span\");\n          if (value.color) {\n            $value.className = \"outline-pill\";\n            $value.style.background = `var(--enum-${value.color}-bg)`;\n            $value.style.color = `var(--enum-${value.color}-fg)`;\n          } else if (value.guid) {\n            $value.className = \"outline-link\";\n          } else {\n            $value.className = \"outline-prop-text\";\n          }\n          $value.textContent = value.text;\n          $prop.appendChild($value);\n          if (value.guid) {\n            const $arrow = document.createElement(\"span\");\n            $arrow.className = \"outline-link-arrow\";\n            $arrow.textContent = \"\\u2197\";\n            $value.appendChild($arrow);\n            $prop.addEventListener(\"click\", (e) => {\n              e.stopPropagation();\n              viewContext.openRecordInThisPanel(value.guid);\n            });\n          }\n          return $prop;\n        }, \"propChip\");\n        const renderRows = /* @__PURE__ */ __name(() => {\n          if (!$list) return;\n          const fields = visibleFields();\n          $list.innerHTML = \"\";\n          rows = hierarchy ? flatten() : [];\n          if (rows.length === 0) {\n            const $empty = document.createElement(\"div\");\n            $empty.className = \"outline-empty\";\n            $empty.textContent = \"No records\";\n            $list.appendChild($empty);\n            return;\n          }\n          rows.forEach(({ node, depth }, index) => {\n            const hasChildren = node.children.length > 0;\n            const indent = ROW_PAD_X + depth * DEPTH_STEP;\n            const $row = document.createElement(\"div\");\n            $row.className = \"outline-row\";\n            if (contextGuids.has(node.id)) $row.classList.add(\"is-context\");\n            $row.dataset.index = String(index);\n            $row.tabIndex = index === selectedIndex ? 0 : -1;\n            $row.dataset.guid = node.id;\n            $row.dataset.indent = String(indent);\n            const $title = document.createElement(\"div\");\n            $title.className = \"outline-title\";\n            $title.style.paddingLeft = `${indent}px`;\n            const $twisty = document.createElement(\"span\");\n            $twisty.className = \"outline-twisty\";\n            if (hasChildren) {\n              $twisty.appendChild(ui.createIcon(\"ti-chevron-right\"));\n              $twisty.classList.toggle(\"expanded\", isExpanded(node));\n              $twisty.addEventListener(\"mouseup\", (e) => {\n                if (e.button !== 0) return;\n                e.stopPropagation();\n                e.preventDefault();\n                toggle(node);\n              });\n            }\n            $title.appendChild($twisty);\n            const $icon = ui.createIcon(plugin.getConfiguration().icon || \"ti-file\");\n            $icon.classList.add(\"outline-icon\");\n            $title.appendChild($icon);\n            const $name = document.createElement(\"span\");\n            $name.className = \"outline-name\";\n            $name.textContent = node.name;\n            $title.appendChild($name);\n            if (hasChildren && !isExpanded(node)) {\n              const $count = document.createElement(\"span\");\n              $count.className = \"outline-count\";\n              $count.textContent = String(node.children.length);\n              $title.appendChild($count);\n            }\n            const chips = fields.map((field) => ({ field, value: propValue(node.record, field) })).filter((entry) => entry.value);\n            if (chips.length) {\n              const $props = document.createElement(\"span\");\n              $props.className = \"outline-props\";\n              chips.forEach(({ field, value }) => $props.appendChild(propChip(field, value)));\n              $title.appendChild($props);\n            }\n            const $time = document.createElement(\"span\");\n            $time.className = \"outline-time\";\n            $time.textContent = timeAgo(node.record.date(\"Modified\"));\n            $title.appendChild($time);\n            $row.appendChild($title);\n            if (propMode && propMode.guid === node.id) {\n              $row.appendChild(buildPropEditor(node, indent));\n            }\n            $row.addEventListener(\"mouseup\", (e) => {\n              if (e.button !== 0 && e.button !== 1) return;\n              hidePeek();\n              setSelection(index);\n              if (e.button === 0 && e.shiftKey) {\n                e.preventDefault();\n                return;\n              }\n              if (e.button === 1 || e.metaKey || e.ctrlKey) {\n                viewContext.openRecordInOtherPanel(node.id);\n              } else {\n                viewContext.openRecordInThisPanel(node.id);\n              }\n              e.preventDefault();\n            });\n            $list.appendChild($row);\n          });\n          restack();\n          setSelection(selectedIndex);\n          if (pendingNameEditGuid) {\n            const at = rows.findIndex((r) => r.node.id === pendingNameEditGuid);\n            pendingNameEditGuid = null;\n            if (at !== -1) {\n              setSelection(at);\n              startNameEdit(rows[at].node, true);\n            }\n          }\n        }, \"renderRows\");\n        const mount = /* @__PURE__ */ __name(() => {\n          const $element = viewContext.getElement();\n          $element.innerHTML = \"\";\n          $root = document.createElement(\"div\");\n          $root.className = \"outline-root collection-list-view\";\n          $note = document.createElement(\"div\");\n          $note.className = \"outline-note\";\n          $root.appendChild($note);\n          $list = document.createElement(\"div\");\n          $list.className = \"outline-list\";\n          $root.appendChild($list);\n          if (viewContext.supportsCreateRecord()) {\n            const $create = document.createElement(\"button\");\n            $create.type = \"button\";\n            $create.className = \"collection-list-create-card\";\n            $create.style.paddingLeft = `calc(var(--list-row-overhang) + ${ICON_OFFSET}px)`;\n            $create.appendChild(ui.createIcon(\"ti-plus\"));\n            const $label = document.createElement(\"span\");\n            $label.textContent = `New ${viewContext.getRecordTypeName()}`;\n            $create.appendChild($label);\n            const $kbd = document.createElement(\"kbd\");\n            $kbd.className = \"collection-list-create-card-shortcut\";\n            $kbd.textContent = \"\\u21E7\\u21B5\";\n            $create.appendChild($kbd);\n            $create.addEventListener(\"click\", (e) => {\n              e.stopPropagation();\n              createRecord();\n            });\n            $root.appendChild($create);\n          }\n          $element.appendChild($root);\n        }, \"mount\");\n        return {\n          onLoad: /* @__PURE__ */ __name(() => {\n            ui.injectCSS(\n              /* css */\n              `\n\t\t\t\t\t\t.outline-root {\n\t\t\t\t\t\t\tposition: relative;\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t\tfont-family: var(--font-sans);\n\t\t\t\t\t\t\tfont-size: var(--text-size-normal);\n\t\t\t\t\t\t\tcolor: var(--text-default);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-note {\n\t\t\t\t\t\t\tfont-size: 12px;\n\t\t\t\t\t\t\tcolor: var(--enum-orange-fg, #c60);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-note:empty {\n\t\t\t\t\t\t\tdisplay: none;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu {\n\t\t\t\t\t\t\tposition: absolute;\n\t\t\t\t\t\t\tz-index: 20;\n\t\t\t\t\t\t\tmin-width: 180px;\n\t\t\t\t\t\t\tpadding: 4px;\n\t\t\t\t\t\t\tbackground: var(--cmdpal-bg-color);\n\t\t\t\t\t\t\tborder: 1px solid var(--cmdpal-border-color);\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tbox-shadow: var(--cmdpal-box-shadow);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu.has-filter {\n\t\t\t\t\t\t\tmin-width: 250px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-filter {\n\t\t\t\t\t\t\twidth: 100%;\n\t\t\t\t\t\t\tmargin-bottom: 4px;\n\t\t\t\t\t\t\tbackground: transparent;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-item {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t\tpadding: 5px 8px;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-fg-color);\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-item:hover {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-hover-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-hover-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the current value, as the app's .autocomplete--current */\n\t\t\t\t\t\t.outline-menu-item.is-active {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-current-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-current-fg-color);\n\t\t\t\t\t\t\tfont-weight: 700;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the keyboard highlight, as .autocomplete--option-selected */\n\t\t\t\t\t\t.outline-menu-item.is-selected,\n\t\t\t\t\t\t.outline-menu-item.is-selected:hover {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-selected-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-selected-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-list {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row {\n\t\t\t\t\t\t\tpadding: 4px 12px 4px 0;\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t\tuser-select: none;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row:hover {\n\t\t\t\t\t\t\tbackground: var(--prop-bg-hover);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row.selected {\n\t\t\t\t\t\t\tbackground: var(--cards-bg-focused);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-title {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tjustify-content: center;\n\t\t\t\t\t\t\twidth: 16px;\n\t\t\t\t\t\t\theight: 16px;\n\t\t\t\t\t\t\tflex: 0 0 16px;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\tborder-radius: 3px;\n\t\t\t\t\t\t\ttransition: transform 0.12s ease;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty.expanded {\n\t\t\t\t\t\t\ttransform: rotate(90deg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty:hover {\n\t\t\t\t\t\t\tbackground: var(--ed-fold-icon-hover-bg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-icon {\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-name {\n\t\t\t\t\t\t\tflex: 0 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\tfont-weight: 600;\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * A row the filter dropped, kept only to hold a match's place.\n\t\t\t\t\t\t * Dimmed rather than hidden: it still has to read as the path\n\t\t\t\t\t\t * down to the match, and it is still a working row \\u2014 clickable,\n\t\t\t\t\t\t * foldable, editable. The matches themselves are left alone, so\n\t\t\t\t\t\t * an unfiltered tree looks exactly as it always did.\n\t\t\t\t\t\t *\n\t\t\t\t\t\t * Recoloring the name alone was not enough to see, at either\n\t\t\t\t\t\t * --text-subtle (text-500, one step off the default \\u2014 invisible)\n\t\t\t\t\t\t * or --text-muted (text-800). Fading the WHOLE row instead takes\n\t\t\t\t\t\t * the name, the icon, the chips and the timestamp down together,\n\t\t\t\t\t\t * which is what makes the matched rows pop out of the column; the\n\t\t\t\t\t\t * name also loses its bold, so weight carries the same signal\n\t\t\t\t\t\t * where a theme's colors are close together.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-row.is-context {\n\t\t\t\t\t\t\topacity: .45;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row.is-context .outline-name {\n\t\t\t\t\t\t\tfont-weight: 400;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* Full strength again on hover or focus \\u2014 a faded row is still a\n\t\t\t\t\t\t   working row, and it should not look inert while pointed at. */\n\t\t\t\t\t\t.outline-row.is-context:hover,\n\t\t\t\t\t\t.outline-row.is-context.selected {\n\t\t\t\t\t\t\topacity: 1;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-count {\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcolor: var(--text-subtle);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * A fixed column, not shrink-to-fit: the chips are pushed up\n\t\t\t\t\t\t * against the stamp, so a stamp that is one character shorter\n\t\t\t\t\t\t * (\"1h ago\" against \"16m ago\") would otherwise leave that row's\n\t\t\t\t\t\t * chips ending at a different x from every other row's.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-time {\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tmin-width: 8ch;\n\t\t\t\t\t\t\ttext-align: right;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * Chips are pushed to the right, so they and the timestamp read\n\t\t\t\t\t\t * as one right-hand column instead of trailing the name at a\n\t\t\t\t\t\t * different x on every row.\n\t\t\t\t\t\t *\n\t\t\t\t\t\t * This is the ONLY auto margin on the line. Giving the stamp one\n\t\t\t\t\t\t * as well splits the free space evenly between the two, which\n\t\t\t\t\t\t * left the chips floating mid-row at a position that tracked the\n\t\t\t\t\t\t * name's length \\u2014 the opposite of aligned.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-props {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tgap: 10px;\n\t\t\t\t\t\t\tmargin-left: auto;\n\t\t\t\t\t\t\tpadding-right: 10px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * Two-line fallback: the chips are moved out of the title line\n\t\t\t\t\t\t * (restack()), which keeps that line unwrappable \\u2014 the name\n\t\t\t\t\t\t * ellipsises and the timestamp stays put, as native does. The\n\t\t\t\t\t\t * left offset is set inline, since it follows the row's depth.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t/* Wrapped, the chips are left-aligned under the row icon: there\n\t\t\t\t\t\t   is no stamp on line 2 to align them against, and a lone\n\t\t\t\t\t\t   right-aligned run reads as belonging to the row below. */\n\t\t\t\t\t\t.outline-row.is-stacked .outline-props {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tjustify-content: flex-start;\n\t\t\t\t\t\t\tmargin-left: 0;\n\t\t\t\t\t\t\tmargin-top: 2px;\n\t\t\t\t\t\t\tpadding-right: 0;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 4px;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop-icon {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop-text {\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pill {\n\t\t\t\t\t\t\tborder-radius: 4px;\n\t\t\t\t\t\t\tpadding: 1px 6px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link {\n\t\t\t\t\t\t\tcolor: var(--ed-inlineref-fg);\n\t\t\t\t\t\t\tborder-radius: 4px;\n\t\t\t\t\t\t\tpadding: 1px 6px;\n\t\t\t\t\t\t\tbackground: var(--ed-backlink-bg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link:hover {\n\t\t\t\t\t\t\tcolor: var(--ed-inlineref-hover-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link-arrow {\n\t\t\t\t\t\t\tmargin-left: 3px;\n\t\t\t\t\t\t\topacity: 0.7;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the property list E opens under a row */\n\t\t\t\t\t\t.outline-propedit {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t\tgap: 1px;\n\t\t\t\t\t\t\tmargin-top: 4px;\n\t\t\t\t\t\t\tpadding-bottom: 2px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t\tpadding: 3px 6px;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row:hover {\n\t\t\t\t\t\t\tbackground: var(--prop-bg-hover);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row.is-selected {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-selected-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-selected-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-icon {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-label {\n\t\t\t\t\t\t\tflex: 0 0 140px;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row.is-selected .outline-pe-label {\n\t\t\t\t\t\t\tcolor: inherit;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-value {\n\t\t\t\t\t\t\tflex: 1 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-value.is-empty {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-inline-input {\n\t\t\t\t\t\t\tflex: 1 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\tpadding: 1px 4px;\n\t\t\t\t\t\t\tborder: var(--input-border-focus);\n\t\t\t\t\t\t\tborder-radius: 3px;\n\t\t\t\t\t\t\tbackground: var(--panel-bg-color);\n\t\t\t\t\t\t\tcolor: var(--text-default);\n\t\t\t\t\t\t\tfont-family: var(--font-sans);\n\t\t\t\t\t\t\tfont-size: inherit;\n\t\t\t\t\t\t\tfont-weight: inherit;\n\t\t\t\t\t\t\toutline: none;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-empty {\n\t\t\t\t\t\t\tpadding: 40px;\n\t\t\t\t\t\t\ttext-align: center;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t`\n            );\n            viewContext.makeNormalLayout();\n            mount();\n          }, \"onLoad\"),\n          onRefresh: /* @__PURE__ */ __name(({ records }) => {\n            const parentFieldId = hierarchyFieldId();\n            const completed = withAncestors(records, parentFieldId);\n            hierarchy = buildHierarchy(completed.records, parentFieldId);\n            contextGuids = completed.added;\n            computeForceExpanded(contextGuids);\n            if (!$list) mount();\n            renderOrphanNote();\n            renderRows();\n          }, \"onRefresh\"),\n          onPanelResize: /* @__PURE__ */ __name(() => restack(), \"onPanelResize\"),\n          onDestroy: /* @__PURE__ */ __name(() => {\n            closeMenu();\n            hidePeek();\n            propMode = null;\n            pendingNameEditGuid = null;\n            hierarchy = null;\n            rows = [];\n            $root = null;\n            $list = null;\n            $note = null;\n            $menu = null;\n          }, \"onDestroy\"),\n          onFocus: /* @__PURE__ */ __name(() => {\n          }, \"onFocus\"),\n          onBlur: /* @__PURE__ */ __name(() => {\n          }, \"onBlur\"),\n          onKeyboardNavigation: /* @__PURE__ */ __name(({ e }) => {\n            if ($menu) return;\n            const $focused = document.activeElement;\n            if ($focused && $focused !== document.body && $root && !$root.contains($focused)) return;\n            if ($focused && $focused.classList && $focused.classList.contains(\"outline-inline-input\")) return;\n            if (rows.length === 0) return;\n            const current = rows[selectedIndex];\n            if (!current) return;\n            if (propMode) {\n              const fields = editableFields();\n              if (e.key === \"ArrowDown\" || e.key === \"ArrowUp\") {\n                e.preventDefault();\n                const step = e.key === \"ArrowDown\" ? 1 : -1;\n                propMode.index = (propMode.index + step + fields.length) % fields.length;\n                paintPropSelection();\n                return;\n              }\n              if (e.key === \"Enter\") {\n                e.preventDefault();\n                editSelectedField();\n                return;\n              }\n              if (e.key === \"Escape\" || e.key === \"e\" || e.key === \"E\") {\n                e.preventDefault();\n                exitPropMode();\n                return;\n              }\n              return;\n            }\n            if ((e.key === \"e\" || e.key === \"E\") && !e.metaKey && !e.ctrlKey && !e.altKey) {\n              e.preventDefault();\n              if (editableFields().length) {\n                propMode = { guid: current.node.id, index: 0 };\n                renderRows();\n              }\n              return;\n            }\n            if (e.key === \"Enter\" && e.shiftKey) {\n              e.preventDefault();\n              createRecord();\n              return;\n            }\n            if (e.key === \"/\" && !e.metaKey && !e.ctrlKey && !e.altKey) {\n              if (focusAppSearch()) e.preventDefault();\n              return;\n            }\n            if (e.key === \"Enter\" && (e.metaKey || e.ctrlKey)) {\n              e.preventDefault();\n              if (peekPanelId) commitPeek();\n              else openSelected(true);\n              return;\n            }\n            if (peekPanelId && e.key === \"Escape\") {\n              e.preventDefault();\n              hidePeek();\n              return;\n            }\n            if (e.key === \" \") {\n              e.preventDefault();\n              peekSelected();\n              return;\n            }\n            if ((e.metaKey || e.ctrlKey) && (e.key === \"ArrowDown\" || e.key === \"ArrowUp\")) {\n              e.preventDefault();\n              const hasChildren = current.node.children.length > 0;\n              if (e.key === \"ArrowDown\") {\n                if (hasChildren && !isExpanded(current.node)) toggle(current.node);\n                else selectNext(1);\n              } else if (hasChildren && isExpanded(current.node)) {\n                toggle(current.node);\n              } else if (current.parent) {\n                const up = rows.findIndex((r) => r.node.id === current.parent.id);\n                if (up !== -1) setSelection(up);\n              } else {\n                selectNext(-1);\n              }\n              return;\n            }\n            switch (e.key) {\n              case \"Tab\":\n                if (e.shiftKey) return;\n                e.preventDefault();\n                selectNext(1);\n                break;\n              case \"ArrowDown\":\n                e.preventDefault();\n                selectNext(1);\n                break;\n              case \"ArrowUp\":\n                e.preventDefault();\n                if (selectedIndex === 0) focusAppSearch();\n                else selectNext(-1);\n                break;\n              // ←/→ cycle rows like ↑/↓ do. They also have to be swallowed:\n              // left alone, the app moves the panel left/right.\n              case \"ArrowRight\":\n                e.preventDefault();\n                selectNext(1);\n                break;\n              case \"ArrowLeft\":\n                e.preventDefault();\n                selectNext(-1);\n                break;\n              case \"Home\":\n                e.preventDefault();\n                setSelection(0);\n                break;\n              case \"End\":\n                e.preventDefault();\n                setSelection(rows.length - 1);\n                break;\n              case \"Enter\":\n                e.preventDefault();\n                if (peekPanelId) commitPeek();\n                else openSelected(false);\n                break;\n            }\n          }, \"onKeyboardNavigation\")\n        };\n      });\n    }\n  };\n  return __toCommonJS(plugin_exports);\n})();\n";

const PANEL_ID = 'outline-installer';

/** What a collection's plugin slot looks like when nobody has touched it. */
const STUB = 'class Plugin extends CollectionPlugin {\n  onLoad() {\n    // Put your custom code here...\n  }\n}\n';

/**
 * A distinctive name from the view's source. Used to recognise OUR code in a
 * collection even when it is an older build — exact equality only ever answers
 * "is this the current version", and treating a previous version as somebody
 * else's code would send every upgrade through the merge path for no reason.
 */
const SIGNATURE = 'registerOutlineView';

/** The field enableSubPages() appends. The app fills in filter_colguid itself. */
const SUBPAGE_FIELD = {
	icon: 'ti-list-tree', id: 'parent_page', label: 'Sub-page of',
	many: false, read_only: false, active: true, type: 'record',
};

/**
 * The view entry install() writes, before its per-view bits are filled in.
 * Uninstall removes only views matching isOurView().
 */
const VIEW_ENTRY = {
	id: 'outline', label: 'Outline', type: 'custom',
	icon: 'ti-list-tree', shown: true, description: '', query: '',
	read_only: false, opts: {}, field_ids: ['title'],
	group_by_field_id: null, sort_field_id: 'title', sort_dir: 'asc',
};

/**
 * Ours if it carries a hierarchy binding — that key is written by nothing else —
 * or if it matches the single fixed id/label installs used before bindings
 * existed, so an older install is still recognised and removable.
 */
const isOurView = (v) => v.type === 'custom'
	&& (!!(v.opts && v.opts.hierarchy_field_id)
		|| v.id === VIEW_ENTRY.id || v.label === VIEW_ENTRY.label);

/**
 * View ids are silently sanitized — `_H(o) = o.replace(/[^a-zA-Z0-9_]/g, "")`
 * runs over every one, deleting hyphens, spaces and dots without warning. So the
 * id is built already-sanitized rather than discovering later that it was
 * rewritten. Ids only need to be unique within one collection.
 */
const viewIdFor = (fieldId) => ('outline_' + fieldId).replace(/[^a-zA-Z0-9_]/g, '');

/**
 * Sub-pages are the collection's default hierarchy, so their view is just
 * "Outline"; anything else is named after the property it draws.
 */
const labelFor = (field) => field.id === 'parent_page' ? 'Outline' : `Outline: ${field.label}`;

/**
 * A label this installer generated, as opposed to one the user typed. Only these
 * are re-synced when a property is renamed — a view you named yourself keeps the
 * name you gave it.
 *
 * Restricted to the `Outline: ` form on purpose. The bare "Outline" belongs to
 * sub-pages, whose label never changes, and matching it would mean renaming any
 * view that happens to be called that.
 */
const isGeneratedLabel = (label) => /^Outline: /.test(label || '');

/**
 * The properties a hierarchy can be read from — the same test the view makes.
 * Single-valued record links pointing back at this same collection: a
 * multi-valued link would give a record several parents, and a link to another
 * collection points at records this collection's views never see.
 */
const hierarchyCandidates = (api) => {
	const guid = api.getGuid();
	return (api.getConfiguration().fields || []).filter(f => f.type === 'record'
		&& f.active !== false
		&& f.many !== true
		&& (f.id === 'parent_page' || f.filter_colguid === guid));
};

const isStub = (code) => !code
	|| !code.trim()
	|| code.includes('// Put your custom code here');

class Plugin extends AppPlugin {

	onLoad() {
		this.ui.registerCustomPanelType(PANEL_ID, (panel) => {
			panel.setTitle('Install Outline view');
			this.render(panel);
		});
		this.ui.addCommandPaletteCommand({
			label: 'Outline: install into a collection...',
			icon: 'ti-list-tree',
			onSelected: () => this.open(),
		});
	}

	async open() {
		const panel = await this.ui.createPanel();
		if (panel) panel.navigateToCustomType(PANEL_ID);
	}

	// --- inspection ---------------------------------------------------------

	/**
	 * A FRESH handle on a collection's plugin. Never hold one across a write.
	 *
	 * getPluginByGuid() wraps a fixed reference to the live plugin instance, and
	 * every config save destroys that instance and builds a new one from the
	 * stored config. The old wrapper keeps answering from the config object it
	 * was born with — so a handle kept from panel-open time is a snapshot, and
	 * saving it back reverts anything the settings screen, another device or a
	 * collaborator changed in the meantime. Config saves are whole-object
	 * replaces, so that revert is silent and total.
	 *
	 * saveCode() has the same exposure even though it writes no config: it reads
	 * its plugin's current config and the app stamps that copy into local state
	 * regardless, so a stale handle re-asserts an old config locally and the next
	 * real save persists it.
	 */
	resolve(guid) {
		return this.data.getPluginByGuid(guid);
	}

	/**
	 * Sub-pages, read from the config rather than from hasSubPages().
	 *
	 * hasSubPages() consults an internal field index that lags a config write, so
	 * straight after an install it still answers false while the config already
	 * has the property. This is the same test the app's own method makes, just
	 * against data that cannot be stale — and it is what the view itself uses.
	 */
	hasSubPages(api) {
		return (api.getConfiguration().fields || [])
			.some(f => f.id === 'parent_page' && f.active !== false);
	}

	/**
	 * Hand-made record properties pointing back at their own collection — the
	 * other way a collection can nest. `parent_page` is excluded so the two are
	 * real alternatives: it satisfies the candidate test too, and letting it match
	 * here would describe a sub-pages collection as using a property of your own.
	 */
	selfRefFields(api) {
		return hierarchyCandidates(api).filter(f => f.id !== 'parent_page');
	}

	customViews(api) {
		return (api.getConfiguration().views || []).filter(v => v.type === 'custom');
	}

	ourViews(api) {
		return (api.getConfiguration().views || []).filter(isOurView);
	}

	/**
	 * The property a view of ours draws, resolved the same way the view resolves
	 * it: its binding, else sub-pages, else the first self-referencing property.
	 * An unbound view is a pre-bindings install, and reconcile adopts it by
	 * writing the binding it was already behaving as if it had.
	 */
	boundFieldId(api, view) {
		if (view.opts && view.opts.hierarchy_field_id) return view.opts.hierarchy_field_id;
		const candidates = hierarchyCandidates(api);
		if (candidates.some(f => f.id === 'parent_page')) return 'parent_page';
		return candidates.length ? candidates[0].id : null;
	}

	/**
	 * What Install would change: which eligible properties have no view, and which
	 * of our views point at a property that no longer exists.
	 */
	plan(api) {
		const candidates = hierarchyCandidates(api);
		const ours = this.ourViews(api);
		const taken = new Set();
		const orphaned = [];
		// Views whose property was renamed, so the generated label no longer says
		// what the view draws. The binding is by field id, so these still work —
		// only the name is wrong.
		const stale = [];
		for (const view of ours) {
			const fieldId = this.boundFieldId(api, view);
			if (fieldId && candidates.some(f => f.id === fieldId)) {
				taken.add(fieldId);
				const field = candidates.find(f => f.id === fieldId);
				const label = labelFor(field);
				if (view.label !== label && isGeneratedLabel(view.label)) {
					stale.push({ view, label });
				}
			} else {
				orphaned.push(view);
			}
		}
		return {
			candidates,
			missing: candidates.filter(f => !taken.has(f.id)),
			orphaned,
			stale,
			// Views that work but predate bindings, so reconcile writes theirs in.
			unbound: ours.filter(v => !(v.opts && v.opts.hierarchy_field_id)
				&& !orphaned.includes(v)),
		};
	}

	/**
	 * Why the code state matters: saveCode() REPLACES a collection's plugin code
	 * outright — there is no merge. Overwriting a collection that has formulas or
	 * a custom record title would delete them, so anything that isn't empty, the
	 * default stub, or our own source goes through the editor instead.
	 */
	codeState(api) {
		const code = (api.getExistingCodeAndConfig() || {}).code || '';
		if (code.trim() === VIEW_SOURCE.trim()) return 'current';
		if (code.includes(SIGNATURE)) return 'outdated';
		if (isStub(code)) return 'free';
		return 'occupied';
	}

	status(api) {
		const plan = this.plan(api);
		return {
			guid: api.getGuid(),
			name: api.getName(),
			nests: !!plan.candidates.length,
			subPages: this.hasSubPages(api),
			selfRef: this.selfRefFields(api).length,
			candidates: plan.candidates,
			missing: plan.missing,
			orphaned: plan.orphaned,
			unbound: plan.unbound,
			stale: plan.stale,
			views: this.customViews(api).length,
			ours: this.ourViews(api).length,
			code: this.codeState(api),
		};
	}

	/**
	 * A sanitizer-safe view id not already in use. Ids collide when two properties
	 * sanitize to the same string, and a duplicate id would make views.register()
	 * and the tab switcher pick whichever comes first.
	 */
	freeViewId(conf, fieldId) {
		const taken = new Set((conf.views || []).map(v => v.id));
		const base = viewIdFor(fieldId);
		if (!taken.has(base)) return base;
		let n = 2;
		while (taken.has(`${base}_${n}`)) n++;
		return `${base}_${n}`;
	}

	// --- actions ------------------------------------------------------------

	/**
	 * Install is a RECONCILE, not an add: it brings the collection to one Outline
	 * view per eligible nesting property — creating the ones that are missing and
	 * deleting the ones whose property no longer exists — then writes the code.
	 * Running it twice changes nothing the second time.
	 *
	 * That makes the property the source of truth and the view derived from it.
	 * The consequence to be aware of: deleting a view is not durable, since the
	 * next reconcile puts it back. Deleting the property is how you get rid of a
	 * view for good.
	 */
	async install(guid, log) {
		let api = this.resolve(guid);
		if (!api) { log('That collection is gone.'); return; }

		// The code is checked BEFORE anything is written. A collection whose plugin
		// slot belongs to somebody else gets no schema change at all — writing the
		// field and the view first and then bailing out left a half-installed
		// collection carrying a view its own plugin does not render.
		if (this.codeState(api) === 'occupied') {
			log('This collection already has plugin code of its own.');
			log('Opening the editor so you can merge it yourself. Nothing was written.');
			const existing = api.getExistingCodeAndConfig() || {};
			api.previewPlugin(api.getConfiguration(), VIEW_SOURCE, existing.css || '', true);
			return;
		}

		const conf = api.getConfiguration();

		// Nesting is provisioned only when the collection has NO way to nest at
		// all. A collection that already nests through a property of its own is
		// left alone — adding sub-pages there would invent a second hierarchy and
		// a second view nobody asked for.
		const needsNesting = !hierarchyCandidates(api).length;
		if (needsNesting) {
			log('Turning on sub-pages...');
			conf.fields = (conf.fields || []).concat([Object.assign({}, SUBPAGE_FIELD)]);
		}

		// Reconcile against the config being built, not the live one: with
		// sub-pages just appended above, `parent_page` is a candidate for this
		// save even though the collection does not have it yet.
		const pending = { getGuid: () => guid, getConfiguration: () => conf };
		const plan = this.plan(pending);

		// A view from before bindings existed is adopted rather than duplicated:
		// without this, reconcile would see `parent_page` as unclaimed and add a
		// second view alongside the one already drawing it.
		for (const view of plan.unbound) {
			const fieldId = this.boundFieldId(pending, view);
			if (!fieldId) continue;
			view.opts = Object.assign({}, view.opts, { hierarchy_field_id: fieldId });
		}

		if (plan.orphaned.length) {
			log(`Removing ${plan.orphaned.length} view(s) whose property is gone...`);
			conf.views = (conf.views || []).filter(v => !plan.orphaned.includes(v));
		}

		// Only labels this installer generated are re-synced, so a view you renamed
		// yourself keeps your name. The view kept working through the rename either
		// way — the binding is by field id — so this is cosmetic.
		for (const { view, label } of plan.stale) {
			log(`Renaming "${view.label}" to "${label}"...`);
			view.label = label;
		}

		for (const field of plan.missing) {
			log(`Adding a view for "${field.label}"...`);
			conf.views = (conf.views || []).concat([Object.assign({}, VIEW_ENTRY, {
				id: this.freeViewId(conf, field.id),
				label: labelFor(field),
				opts: { hierarchy_field_id: field.id },
			})]);
		}

		// Every config change goes in ONE save. Writes are not readable in the same
		// tick, so appending the sub-page field and then re-reading the config
		// returns the copy from BEFORE it — saving that back silently drops the
		// field again, which is exactly how a collection ends up with the view
		// installed and no nesting.
		if (needsNesting || plan.orphaned.length || plan.missing.length
			|| plan.unbound.length || plan.stale.length) {
			// A refused save is reported as a refusal. saveConfiguration() returns
			// false when the user lacks permission on this collection — it does not
			// throw — so an unchecked call reports success and writes nothing.
			if (!await api.saveConfiguration(conf)) {
				log('The workspace refused that change — you may not have permission to edit this collection.');
				return;
			}
			api = this.resolve(guid);
			if (!api) { log('That collection is gone.'); return; }
		}

		const state = this.codeState(api);
		if (state === 'current') {
			log('Code is already up to date.');
			return;
		}
		log(state === 'outdated' ? 'Updating the view code...' : 'Writing the view code...');
		if (!await api.saveCode(VIEW_SOURCE)) {
			log('The workspace refused that change — you may not have permission to edit this plugin.');
			return;
		}
		log('Done. Open the collection and click the Outline tab.');
	}

	/**
	 * Removes the view. Leaves the code alone unless it is exactly ours, and
	 * never touches sub-pages — that field holds the nesting itself.
	 */
	async uninstall(guid, log) {
		let api = this.resolve(guid);
		if (!api) { log('That collection is gone.'); return; }

		// Only the view this installer writes is removed. Filtering out every
		// type:"custom" entry also deleted custom views the user had made — their
		// label, columns and sort along with them — which is not what Remove means.
		const mine = this.ourViews(api);
		const others = this.customViews(api).length - mine.length;
		if (mine.length) {
			log(`Removing ${mine.length} Outline view(s)...`);
			const conf = api.getConfiguration();
			conf.views = (conf.views || []).filter(v => !isOurView(v));
			if (!await api.saveConfiguration(conf)) {
				log('The workspace refused that change — you may not have permission to edit this collection.');
				return;
			}
			api = this.resolve(guid);
			if (!api) { log('That collection is gone.'); return; }
		}
		if (others) log(`Leaving ${others} other custom view(s) alone.`);

		const state = this.codeState(api);
		if (state === 'current' || state === 'outdated') {
			log('Clearing the view code...');
			if (!await api.saveCode(STUB)) {
				log('The workspace refused that change — you may not have permission to edit this plugin.');
				return;
			}
		} else {
			log('Leaving the plugin code alone — it is not the Outline source.');
		}
		log('Sub-pages and your nesting are untouched.');
	}

	// --- panel --------------------------------------------------------------

	async render(panel) {
		const root = panel.getElement();
		if (!root) return;
		while (root.firstChild) root.removeChild(root.firstChild);

		const wrap = el('div', root);
		wrap.style.cssText = 'padding:24px;max-width:760px;margin:0 auto;';

		const h = el('h2', wrap, 'Install the Outline view');
		h.style.cssText = 'margin:0 0 4px;';
		const sub = el('p', wrap, 'Pick a collection. Installing turns on nesting if needed, adds a Custom view, and writes the view code.');
		sub.style.cssText = 'margin:0 0 20px;opacity:.7;';

		let collections = [];
		try {
			collections = await this.data.getAllCollections();
		} catch (err) {
			el('p', wrap, `Could not read collections: ${String(err)}`);
			return;
		}

		for (const api of collections) {
			if (api.isJournalPlugin && api.isJournalPlugin()) continue;
			this.renderRow(wrap, api.getGuid());
		}
	}

	/**
	 * Each collection owns a box that repaints itself. Actions redraw it when they
	 * finish, so the summary and the buttons describe the collection as it is now
	 * rather than as it was when the panel opened.
	 *
	 * Rows carry a GUID, never a plugin handle: a handle held across a write goes
	 * stale (see resolve()), so both the reads behind the summary and the writes
	 * behind the buttons have to start from a fresh one.
	 */
	renderRow(parent, guid) {
		const box = el('div', parent);
		box.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid var(--border-color,rgba(128,128,128,.25));';
		this.paintRow(box, guid, []);
	}

	paintRow(box, guid, notes) {
		while (box.firstChild) box.removeChild(box.firstChild);
		const api = this.resolve(guid);
		if (!api) return;
		const s = this.status(api);

		const left = el('div', box);
		left.style.cssText = 'flex:1;min-width:0;';
		const title = el('div', left, s.name);
		title.style.cssText = 'font-weight:600;';

		const bits = [];
		if (!s.candidates.length) bits.push('no nesting yet');
		else bits.push(`${s.candidates.length} nesting propert${s.candidates.length === 1 ? 'y' : 'ies'}`
			+ (s.subPages ? s.selfRef ? ' (sub-pages + your own)' : ' (sub-pages)' : ' (your own)'));
		bits.push(s.ours ? `${s.ours} Outline view(s)` : 'no Outline view');
		bits.push(s.code === 'current' ? 'view installed'
			: s.code === 'outdated' ? 'older version installed'
			: s.code === 'free' ? 'plugin slot empty'
			: 'has other plugin code');
		const meta = el('div', left, bits.join(' \u00b7 '));
		meta.style.cssText = 'font-size:12px;opacity:.7;margin-top:2px;';

		// The delta Install would apply, so the button's effect is legible before
		// it is pressed.
		const delta = [];
		if (s.missing.length) delta.push(`${s.missing.length} view(s) to add: `
			+ s.missing.map(f => f.label).join(', '));
		if (s.orphaned.length) delta.push(`${s.orphaned.length} view(s) to remove — their property is gone`);
		if (s.stale.length) delta.push(`${s.stale.length} view(s) to rename — their property was renamed`);
		if (delta.length && s.code !== 'occupied') {
			const line = el('div', left, delta.join(' · '));
			line.style.cssText = 'font-size:12px;margin-top:4px;opacity:.85;';
		}

		if (s.code === 'occupied') {
			const warn = el('div', left, 'Installing here opens the code editor so you can merge by hand. Your code is not overwritten.');
			warn.style.cssText = 'font-size:12px;margin-top:4px;color:var(--enum-orange-fg,#c60);';
		}

		for (const note of notes) {
			const line = el('div', left, note);
			line.style.cssText = 'font-size:12px;margin-top:4px;opacity:.85;';
		}

		const run = (label, fn, primary) => {
			const btn = el('button', box, label);
			if (primary) btn.className = 'button-primary';
			btn.addEventListener('click', async () => {
				btn.disabled = true;
				const log = [];
				const push = (m) => { log.push(m); this.paintRow(box, guid, log); };
				try { await fn(guid, push); }
				catch (err) { log.push(`Failed: ${String(err)}`); }
				// Repaint once more: the status above was computed before the writes.
				this.paintRow(box, guid, log);
				// And again on a timer, because the CODE half of the status reads
				// back stale for a moment after saveCode() even from a freshly
				// resolved handle: the rebuilt plugin instance substitutes the
				// default stub when the code is not in place yet (`f || (f = ma)` in
				// the app's plugin factory), so the row claimed "plugin slot empty"
				// and offered Install on a collection it had just finished
				// installing — no Remove button until the panel was reopened. The
				// config half is current immediately; only this needs the wait.
				setTimeout(() => this.paintRow(box, guid, log), 500);
			});
			return btn;
		};

		// The action button says what it will actually do, and is dropped entirely
		// when there is nothing to do — a button whose only outcome is "already up
		// to date" is worse than no button.
		const ours = s.code === 'current' || s.code === 'outdated';
		const present = s.ours > 0 && ours;
		// Complete means there is nothing left to reconcile: a view per eligible
		// property, none orphaned, none unbound, and the code current.
		const complete = present && s.nests && s.code === 'current'
			&& !s.missing.length && !s.orphaned.length && !s.unbound.length
			&& !s.stale.length;

		if (!complete) {
			run(s.code === 'outdated' ? 'Update' : present ? 'Repair' : 'Install',
				(g, l) => this.install(g, l), true);
		}
		if (present) run('Remove', (g, l) => this.uninstall(g, l), false);
		if (complete) {
			const ok = el('div', box, 'Installed');
			ok.style.cssText = 'font-size:12px;opacity:.6;align-self:center;';
		}
	}
}

/** Small DOM helper. textContent only — plugin code must never build markup. */
function el(tag, parent, text) {
	const node = document.createElement(tag);
	if (text !== undefined) node.textContent = text;
	if (parent) parent.appendChild(node);
	return node;
}

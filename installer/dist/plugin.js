/**
 * Outline — the global half of the Outline plugin.
 *
 * The view itself is a CollectionPlugin, so it has to live in each collection's
 * own plugin slot (global plugins can't register views). This plugin installs it
 * — walks your collections, shows what state each one is in, and does the three
 * steps for you: turn on sub-pages, add a Custom view, write the view's code —
 * and, on every page of a collection with an Outline view, adds the hierarchy
 * features that work outside the view:
 *
 *   - Breadcrumb: Root › … › Parent, after the collection pill above the title.
 *   - Show this page: open the Outline view zoomed into the page, its row selected.
 *   - New child / New sibling page, and Move page under… (a picker showing paths).
 *
 * The hierarchy is always sub-pages ("Sub-page of" / `parent_page`), so there is
 * nothing to configure. Nothing derived is stored: ancestors are walked live
 * through linkedRecord().
 *
 * The view source is embedded at build time by build.mjs — this file is a
 * template and will not run until built. Nothing is fetched at runtime.
 */

const VIEW_SOURCE = "\"use strict\";\nvar plugins = (() => {\n  var __defProp = Object.defineProperty;\n  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;\n  var __getOwnPropNames = Object.getOwnPropertyNames;\n  var __hasOwnProp = Object.prototype.hasOwnProperty;\n  var __name = (target, value) => __defProp(target, \"name\", { value, configurable: true });\n  var __export = (target, all) => {\n    for (var name in all)\n      __defProp(target, name, { get: all[name], enumerable: true });\n  };\n  var __copyProps = (to, from, except, desc) => {\n    if (from && typeof from === \"object\" || typeof from === \"function\") {\n      for (let key of __getOwnPropNames(from))\n        if (!__hasOwnProp.call(to, key) && key !== except)\n          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });\n    }\n    return to;\n  };\n  var __toCommonJS = (mod) => __copyProps(__defProp({}, \"__esModule\", { value: true }), mod);\n\n  // plugin.js\n  var plugin_exports = {};\n  __export(plugin_exports, {\n    Plugin: () => Plugin\n  });\n  var ENUM_COLORS = [\n    \"red\",\n    \"orange\",\n    \"green\",\n    \"cyan\",\n    \"blue\",\n    \"purple\",\n    \"pink\",\n    \"fuchsia\",\n    \"rose\",\n    \"stone\",\n    \"teal\",\n    \"sky\",\n    \"indigo\",\n    \"zinc\",\n    \"yellow\"\n  ];\n  function timeAgo(date) {\n    if (!date) return \"\";\n    const seconds = Math.floor((Date.now() - date.getTime()) / 1e3);\n    if (seconds < 60) return \"just now\";\n    const minutes = Math.floor(seconds / 60);\n    if (minutes < 60) return `${minutes}m ago`;\n    const hours = Math.floor(minutes / 60);\n    if (hours < 24) return `${hours}h ago`;\n    const days = Math.floor(hours / 24);\n    if (days < 30) return `${days}d ago`;\n    const months = Math.floor(days / 30);\n    if (months < 12) return `${months}mo ago`;\n    return `${Math.floor(months / 12)}y ago`;\n  }\n  __name(timeAgo, \"timeAgo\");\n  function withAncestors(records, parentFieldId) {\n    const byGuid = new Map(records.map((record) => [record.guid, record]));\n    const added = /* @__PURE__ */ new Set();\n    if (parentFieldId) {\n      records.forEach((record) => {\n        let parent = record.linkedRecord(parentFieldId);\n        for (let depth = 0; parent && !byGuid.has(parent.guid) && depth < 100; depth++) {\n          byGuid.set(parent.guid, parent);\n          added.add(parent.guid);\n          parent = parent.linkedRecord(parentFieldId);\n        }\n      });\n    }\n    return { records: Array.from(byGuid.values()), added };\n  }\n  __name(withAncestors, \"withAncestors\");\n  function buildHierarchy(records, parentFieldId) {\n    const nodes = /* @__PURE__ */ new Map();\n    records.forEach((record) => {\n      const parent = parentFieldId ? record.linkedRecord(parentFieldId) : null;\n      nodes.set(record.guid, {\n        id: record.guid,\n        name: record.getName() || \"Unknown\",\n        parentGuid: parent ? parent.guid : null,\n        record,\n        children: [],\n        level: 0,\n        x: 0,\n        y: 0\n      });\n    });\n    const rootNodes = [];\n    nodes.forEach((node) => {\n      if (node.parentGuid && nodes.has(node.parentGuid)) {\n        nodes.get(node.parentGuid).children.push(node);\n      } else {\n        rootNodes.push(node);\n      }\n    });\n    const reachable = /* @__PURE__ */ new Set();\n    const walk = /* @__PURE__ */ __name((node) => {\n      if (reachable.has(node.id)) return;\n      reachable.add(node.id);\n      node.children.forEach(walk);\n    }, \"walk\");\n    rootNodes.forEach(walk);\n    nodes.forEach((node) => {\n      if (!reachable.has(node.id)) {\n        const parent = nodes.get(node.parentGuid);\n        if (parent) {\n          parent.children = parent.children.filter((c) => c !== node);\n        }\n        rootNodes.push(node);\n        walk(node);\n      }\n    });\n    return { nodes, rootNodes };\n  }\n  __name(buildHierarchy, \"buildHierarchy\");\n  var SUBPAGE = \"parent_page\";\n  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);\n  var KBD_SLOT = (IS_MAC ? \"mac\" : \"win\") + (window.thymerDesktopAPI ? \"_electron\" : \"_web\");\n  var DEFAULT_KEYS = IS_MAC ? {\n    \"nav.togglefold\": \"Meta+/\",\n    \"nav.togglefolddescendants\": \"Meta+Shift+?\",\n    \"nav.foldchildren\": \"Meta+,\",\n    \"nav.unfoldchildren\": \"Meta+.\",\n    \"nav.foldcascade\": \"Meta+Shift+,\",\n    \"nav.unfoldcascade\": \"Meta+Shift+.\",\n    \"panel.zoom_out\": \"Alt+ArrowUp\",\n    \"panel.zoom_in\": \"Alt+ArrowDown\",\n    \"collection.trash_record\": \"Meta+Backspace\",\n    \"plugin.outlinehints\": \"Shift+?\"\n  } : {\n    \"nav.togglefold\": \"Ctrl+/\",\n    \"nav.togglefolddescendants\": \"Ctrl+Shift+?\",\n    \"nav.foldchildren\": \"Ctrl+,\",\n    \"nav.unfoldchildren\": \"Ctrl+.\",\n    \"nav.foldcascade\": \"Ctrl+Shift+<\",\n    \"nav.unfoldcascade\": \"Ctrl+Shift+>\",\n    \"panel.zoom_out\": \"Alt+ArrowUp\",\n    \"panel.zoom_in\": \"Alt+ArrowDown\",\n    \"collection.trash_record\": \"Ctrl+Delete\",\n    \"plugin.outlinehints\": \"Shift+?\"\n  };\n  for (const action of [\n    \"nav.unfolddescendants\",\n    \"nav.folddescendants\",\n    \"nav.togglefoldchildren\",\n    \"nav.foldcontainer\",\n    \"nav.unfoldcontainer\",\n    \"nav.togglefoldcontainer\"\n  ]) {\n    DEFAULT_KEYS[action] = \"\";\n  }\n  var KEY_MODIFIERS = [\"Meta\", \"Ctrl\", \"Alt\", \"Shift\"];\n  var NAMED_KEYS = [\n    \"Escape\",\n    \"Enter\",\n    \"Tab\",\n    \"Space\",\n    \"Backspace\",\n    \"Delete\",\n    \"ArrowUp\",\n    \"ArrowDown\",\n    \"ArrowLeft\",\n    \"ArrowRight\",\n    \"Home\",\n    \"End\",\n    \"PageUp\",\n    \"PageDown\",\n    \"F1\",\n    \"F2\",\n    \"F3\",\n    \"F4\",\n    \"F5\",\n    \"F6\",\n    \"F7\",\n    \"F8\",\n    \"F9\",\n    \"F10\",\n    \"F11\",\n    \"F12\",\n    \"NumpadEnter\",\n    \"Insert\"\n  ];\n  function normalizeKey(s) {\n    const parts = s.split(\"+\").map((p) => p.trim());\n    if (parts.some((p) => !p)) return null;\n    const mods = /* @__PURE__ */ new Set();\n    for (const p of parts.slice(0, -1)) {\n      const m = KEY_MODIFIERS.find((k) => k.toLowerCase() === p.toLowerCase());\n      if (!m) return null;\n      mods.add(m);\n    }\n    let key = parts[parts.length - 1];\n    if (/\\p{So}/u.test(key)) return null;\n    if (key.length === 1) key = key.toUpperCase();\n    else key = { copy: \"C\", cut: \"X\", paste: \"V\" }[key.toLowerCase()] || NAMED_KEYS.find((k) => k.toLowerCase() === key.toLowerCase());\n    return key ? [...KEY_MODIFIERS.filter((m) => mods.has(m)), key].join(\"+\") : null;\n  }\n  __name(normalizeKey, \"normalizeKey\");\n  var CODE_KEYS = {\n    Minus: \"-\",\n    Equal: \"=\",\n    BracketLeft: \"[\",\n    BracketRight: \"]\",\n    Semicolon: \";\",\n    Quote: \"'\",\n    Backquote: \"`\",\n    Backslash: \"\\\\\",\n    Comma: \",\",\n    Period: \".\",\n    Slash: \"/\"\n  };\n  var SHIFTED_CODE_KEYS = {\n    Minus: \"_\",\n    Equal: \"+\",\n    BracketLeft: \"{\",\n    BracketRight: \"}\",\n    Semicolon: \":\",\n    Quote: '\"',\n    Backquote: \"~\",\n    Backslash: \"|\",\n    Comma: \"<\",\n    Period: \">\",\n    Slash: \"?\"\n  };\n  function eventKeyName(e) {\n    if (e.isComposing || e.key === \"Dead\") return \"\";\n    const mods = (e.metaKey ? \"Meta+\" : \"\") + (e.ctrlKey ? \"Ctrl+\" : \"\") + (e.altKey ? \"Alt+\" : \"\") + (e.shiftKey ? \"Shift+\" : \"\");\n    if (e.code === \"BracketLeft\") return mods + \"[\";\n    if (e.code === \"BracketRight\") return mods + \"]\";\n    if (e.code === \"Space\") return mods + \"Space\";\n    if (!e.key || e.key.length !== 1) return mods + e.key;\n    const c = e.key.charCodeAt(0);\n    if (c >= 32 && c <= 126) return mods + e.key.toUpperCase();\n    let k = /^Key([A-Z])$/.exec(e.code)?.[1];\n    const digit = /^Digit(\\d)$/.exec(e.code)?.[1];\n    if (digit) k = e.shiftKey ? \")!@#$%^&*(\"[Number(digit)] : digit;\n    k ??= (e.shiftKey ? SHIFTED_CODE_KEYS : CODE_KEYS)[e.code];\n    return mods + (k || e.key.toUpperCase());\n  }\n  __name(eventKeyName, \"eventKeyName\");\n  function parseShortcuts(source) {\n    const entries = [];\n    if (/^\\{\\s*\\}$/.test(source.trim())) return entries;\n    for (const raw of source.split(\"\\n\")) {\n      const line = raw.trim();\n      if (!line || line.startsWith(\"//\") || line === \"{\" || line === \"}\") continue;\n      const m = line.match(/^(?:\"(?<action>[^\"]*)\"|'(?<action>[^']*)')\\s*:\\s*(?:\"(?<key>[^\"]*)\"|'(?<key>[^']*)')\\s*,?/);\n      const rest = m && line.slice(m[0].length).trim();\n      if (!m || rest && !rest.startsWith(\"//\")) return null;\n      const { action, key } = m.groups;\n      if (!action && !key) return null;\n      if (action && !action.includes(\".\")) return null;\n      const normalized = key ? normalizeKey(key) : \"\";\n      if (normalized === null) return null;\n      entries.push({ action: action.toLowerCase(), key: normalized });\n    }\n    return entries;\n  }\n  __name(parseShortcuts, \"parseShortcuts\");\n  var keymapSource = null;\n  var keymap = null;\n  function foldKeymap() {\n    let root = window.g_focusedComponent;\n    while (root?.parent) root = root.parent;\n    const source = root?.sideBar?.activeUser?.acct_json?.kbd?.[KBD_SLOT] || \"\";\n    if (keymap && source === keymapSource) return keymap;\n    const keys = { ...DEFAULT_KEYS };\n    for (const { action, key } of parseShortcuts(source) || []) {\n      if (key) {\n        for (const a in keys) if (keys[a] === key && a !== action) keys[a] = \"\";\n      }\n      if (action in keys) keys[action] = key;\n    }\n    const byKey = /* @__PURE__ */ new Map();\n    for (const a in keys) if (keys[a]) byKey.set(keys[a], a);\n    keymapSource = source;\n    keymap = { keys, byKey };\n    return keymap;\n  }\n  __name(foldKeymap, \"foldKeymap\");\n  var KEY_GLYPHS = {\n    Space: \"Space\",\n    ArrowRight: \"\\u2192\",\n    ArrowLeft: \"\\u2190\",\n    Escape: \"Esc\",\n    Enter: \"\\u21B5\",\n    Tab: \"\\u21E5\",\n    ArrowUp: \"\\u2191\",\n    ArrowDown: \"\\u2193\",\n    PageUp: \"PgUp\",\n    PageDown: \"PgDn\",\n    Delete: \"Del\",\n    Backspace: IS_MAC ? \"\\u232B\" : \"Bksp\"\n  };\n  var SHIFTED_CHARS = /* @__PURE__ */ new Set([...Object.values(SHIFTED_CODE_KEYS), ...\")!@#$%^&*(\"]);\n  function keyLabel(key) {\n    if (!key) return \"\";\n    let parts = key.split(\"+\");\n    const last = parts.pop();\n    if (SHIFTED_CHARS.has(last)) parts = parts.filter((m) => m !== \"Shift\");\n    const k = KEY_GLYPHS[last] || last;\n    if (!IS_MAC) return [...parts.map((m) => m === \"Meta\" ? \"Ctrl\" : m), k].join(\"+\");\n    const glyph = { Meta: \"\\u2318\", Ctrl: \"\\u2303\", Alt: \"\\u2325\", Shift: \"\\u21E7\" };\n    return parts.map((m) => glyph[m]).join(\"\") + k;\n  }\n  __name(keyLabel, \"keyLabel\");\n  var KBDMOD_GLYPHS = /* @__PURE__ */ new Set([\"\\u232B\", \"\\u2326\", \"\\u21B5\", \"\\u21E7\", \"\\u2303\", \"\\u2325\", \"\\u2318\", \"\\u2192\", \"\\u2190\", \"\\u2191\", \"\\u2193\", \"\\u2195\", \"\\u2194\", \"\\u21E5\"]);\n  function kbdHtml(text) {\n    const esc = { \"&\": \"&amp;\", \"<\": \"&lt;\", \">\": \"&gt;\", '\"': \"&quot;\", \"'\": \"&#39;\" };\n    return Array.from(text, (c) => KBDMOD_GLYPHS.has(c) ? `<span class=\"kbdmod ${IS_MAC ? \"kbdmod-mac\" : \"\"}\">${c}</span>` : esc[c] || c).join(\"\");\n  }\n  __name(kbdHtml, \"kbdHtml\");\n  var KEYS_BODY_CLASS = \"plg-outline-keys\";\n  function keyHints(mode, zoomed, itemName) {\n    const cmd = IS_MAC ? \"\\u2318\" : \"Ctrl+\";\n    const shift = IS_MAC ? \"\\u21E7\" : \"Shift+\";\n    const { keys } = foldKeymap();\n    const up = keys[\"nav.unfoldcascade\"], down = keys[\"nav.foldcascade\"];\n    const modsOf = /* @__PURE__ */ __name((k) => k.split(\"+\").slice(0, -1).join(\"+\"), \"modsOf\");\n    const cascade = up && down && modsOf(up) === modsOf(down) ? keyLabel(up) + keyLabel(down.split(\"+\").pop()) : [up, down].filter(Boolean).map(keyLabel).join(\" \");\n    const mono = \"statusbar--kbd-modifier\";\n    const hints = mode === \"peek\" ? [\n      [\"Esc\", \"Exit Peek\", mono],\n      [\"\\u21B5\", \"Open\", mono],\n      [\"\\u2195 \\u2194\", \"Browse\", mono]\n    ] : mode === \"props\" ? [\n      [\"\\u2195\", \"Previous / next property\", mono],\n      [\"\\u21B5\", \"Edit / save\", mono],\n      [\"Esc\", \"Exit\", mono]\n    ] : mode === \"field\" ? [\n      [\"\\u21B5\", \"Save\", mono],\n      [\"Esc\", \"Exit\", mono]\n    ] : [\n      [\"/\", \"Search\", mono],\n      [\"Space\", \"Peek\", mono],\n      [\"\\u21B5\", \"Open\", mono],\n      [\"R\", \"Rename\", mono],\n      [`${cmd}\\u21B5`, \"Open Aside\", mono],\n      [`${shift}\\u21B5`, `Create ${itemName}`, mono],\n      [keyLabel(keys[\"collection.trash_record\"]), \"Trash\", mono],\n      [\"E\", \"Edit\", mono],\n      [\"\\u21E5\", \"Indent\", mono],\n      [`${shift}\\u21E5`, \"Outdent\", mono],\n      [`${cmd}${shift}\\u2191\\u2193`, \"Reorder\", mono],\n      [keyLabel(keys[\"panel.zoom_in\"]), \"Zoom\"],\n      ...zoomed ? [[keyLabel(keys[\"panel.zoom_out\"]), \"Zoom out\"]] : [],\n      [keyLabel(keys[\"nav.togglefold\"]), \"Fold\"],\n      [keyLabel(keys[\"nav.togglefoldchildren\"]), \"Fold children\"],\n      [keyLabel(keys[\"nav.togglefolddescendants\"]), \"Fold descendants\"],\n      [cascade, \"Fold level\"],\n      [keyLabel(keys[\"nav.togglefoldcontainer\"]), \"Fold all\"]\n    ];\n    return hints.filter(([k]) => k);\n  }\n  __name(keyHints, \"keyHints\");\n  function hintsHtml(hints) {\n    return hints.map(([k, label, cls]) => `<span class=\"statusbar-item${cls ? \" \" + cls : \"\"}\"><span class=\"statusbar--kbd\">${kbdHtml(k)}</span> <span class=\"statusbar--kbd-label\">${label}</span></span>`).join(\"\");\n  }\n  __name(hintsHtml, \"hintsHtml\");\n  var Plugin = class extends CollectionPlugin {\n    static {\n      __name(this, \"Plugin\");\n    }\n    onLoad() {\n      this.registerOutlineView();\n    }\n    onUnload() {\n      document.body.classList.remove(KEYS_BODY_CLASS);\n      if (this.keysObserver) this.keysObserver.disconnect();\n      if (this.keysItem) this.keysItem.remove();\n      this.keysItem = this.keysObserver = null;\n    }\n    /**\n     * Show or hide the Outline key hints. A plugin can only APPEND status-bar\n     * items (they land on the right), so the hints are one item of ours,\n     * pinned over the left edge by CSS while the body class hides the app's\n     * own hints there. One item per plugin, shared by every view instance.\n     */\n    showKeyHints(on, mode = null, zoomed = false, itemName = \"Page\") {\n      const map = foldKeymap();\n      if (map !== this.keysMap) {\n        this.keysMap = map;\n        this.keysEpoch = (this.keysEpoch || 0) + 1;\n      }\n      document.body.classList.toggle(KEYS_BODY_CLASS, on);\n      if (!on) {\n        this.keysStart = 0;\n        return;\n      }\n      const state = `${mode}|${zoomed}|${itemName}|${this.keysEpoch}`;\n      if (!this.keysItem) {\n        this.keysItem = this.ui.addStatusBarItem({ htmlLabel: \"\" });\n        const $el = this.keysItem.getElement();\n        if ($el) {\n          $el.classList.add(\"outline-keys\");\n          const $bar = $el.closest(\".statusbar--status-bar\");\n          const $right = $bar && $bar.querySelector(\".statusbar--right\");\n          if ($right) {\n            const fit = /* @__PURE__ */ __name(() => {\n              $el.style.right = `${$right.offsetWidth + 10}px`;\n              this.renderKeyHints();\n            }, \"fit\");\n            this.keysObserver = new ResizeObserver(fit);\n            this.keysObserver.observe($right);\n            this.keysObserver.observe($bar);\n          }\n        }\n      }\n      if (this.keysState !== state) {\n        this.keysState = state;\n        this.keysHints = keyHints(mode, zoomed, itemName);\n        this.keysStart = 0;\n        this.renderKeyHints();\n      }\n    }\n    /** The hint elements as laid out, or [] when the strip isn't showing. */\n    keyHintItems() {\n      const $el = this.keysItem && this.keysItem.getElement();\n      const $label = $el && $el.querySelector(\".statusbar-item--label\");\n      return $label ? Array.from($label.children) : [];\n    }\n    /** How many leading items sit on the strip's visible first line. */\n    visibleKeyHints() {\n      const items = this.keyHintItems();\n      if (!items.length) return 0;\n      const at = items.findIndex((i) => i.offsetTop > items[0].offsetTop);\n      return at === -1 ? items.length : at;\n    }\n    /**\n     * Draw the page of hints starting at `keysStart`. The More hint (the paging\n     * key) leads whenever anything is out of view, and is left off when the\n     * whole set fits without it.\n     */\n    renderKeyHints() {\n      if (!this.keysItem || !this.keysHints) return;\n      const page = this.keysHints.slice(this.keysStart);\n      const more = keyLabel(foldKeymap().keys[\"plugin.outlinehints\"]);\n      this.keysMore = !!more;\n      this.keysItem.setHtmlLabel(hintsHtml(more ? [[more, \"More\"], ...page] : page));\n      if (more && this.keysStart === 0 && this.visibleKeyHints() === page.length + 1) {\n        this.keysMore = false;\n        this.keysItem.setHtmlLabel(hintsHtml(page));\n      }\n    }\n    /** Show the next page of hints: from the first one out of view, else from the top. */\n    pageKeyHints() {\n      if (!this.keysHints) return;\n      const lead = this.keysMore ? 1 : 0;\n      const shown = this.visibleKeyHints() - lead;\n      const next = this.keysStart + Math.max(1, shown);\n      this.keysStart = shown < this.keyHintItems().length - lead && next < this.keysHints.length ? next : 0;\n      this.renderKeyHints();\n    }\n    /**\n     * Claim every custom view the collection has, rather than one hardcoded id.\n     *\n     * A collection has exactly one plugin, so its custom views can only be\n     * rendered by this code — there is nothing else they could belong to. Binding\n     * to whatever is there means the view id stops being load-bearing: renaming\n     * it, or letting the app's sanitizer rewrite it, can't unhook the view.\n     * `register()` is a Map.set keyed by view id, so calling it per view is fine.\n     *\n     * Views added after load aren't seen until the plugin reloads, which saving\n     * the collection config does anyway.\n     */\n    registerOutlineView() {\n      const views = (this.getConfiguration().views || []).filter((v) => v.type === \"custom\");\n      for (const view of views) this.registerOn(view.id);\n    }\n    /**\n     * Hand each view instance Thymer's own records-view object, for its native\n     * peek. Not SDK: the SDK plugin class EXTENDS the app's internal collection\n     * plugin, so `this.customViewHooks` is the very Map `views.register()`\n     * writes into, and the app calls its entries with the internal view\n     * (`customViewHooks.get(id)(view)`, read 2026-11-15). register() drops that\n     * argument before calling our factory, so wrap the entry and park the view\n     * where the factory, which runs synchronously inside it, can pick it up.\n     * Missing or changed internals leave `pendingNativeView` unset, and the view\n     * falls back to the SDK-only peek.\n     */\n    captureNativeView(viewId) {\n      const hooks = this.customViewHooks;\n      const make = hooks instanceof Map ? hooks.get(viewId) : null;\n      if (typeof make !== \"function\") return;\n      hooks.set(viewId, (view) => {\n        this.pendingNativeView = view;\n        try {\n          return make(view);\n        } finally {\n          this.pendingNativeView = null;\n        }\n      });\n    }\n    registerOn(viewId) {\n      this.views.register(viewId, (viewContext) => {\n        const ui = this.ui;\n        const plugin = this;\n        const nativePeek = (() => {\n          const view = plugin.pendingNativeView;\n          const ok = view && [\n            \"startRecordPreview\",\n            \"commitRecordPreview\",\n            \"dismissRecordPreview\",\n            \"getPeekStatusBarContext\"\n          ].every((name) => typeof view[name] === \"function\");\n          return ok ? view : null;\n        })();\n        const canShowOptions = /* @__PURE__ */ __name(() => !!nativePeek && typeof nativePeek.showOptionsDropdown === \"function\", \"canShowOptions\");\n        const collectionGuid = /* @__PURE__ */ __name(() => plugin.collection.getGuid(), \"collectionGuid\");\n        const storageKey = `outline-collapsed:${this.getConfiguration().name}:${viewId}`;\n        let collapsed = /* @__PURE__ */ new Set();\n        try {\n          collapsed = new Set(JSON.parse(localStorage.getItem(storageKey) || \"[]\"));\n        } catch (err) {\n          collapsed = /* @__PURE__ */ new Set();\n        }\n        let searchOpen = null;\n        let searchKey = null;\n        let contextGuids = /* @__PURE__ */ new Set();\n        let viewFocused = false;\n        let hierarchy = null;\n        let zoomGuid = null;\n        let lastRecords = null;\n        let $zoom = null;\n        let rows = [];\n        let selectedIndex = 0;\n        let $root = null;\n        let $list = null;\n        let $note = null;\n        let $menu = null;\n        let peekPanelId = null;\n        let peekRestoreNav = null;\n        let peekedGuid = null;\n        let peekSteps = 0;\n        let propMode = null;\n        let pendingNameEditGuid = null;\n        let win = { start: 0, end: 0 };\n        const heightCache = /* @__PURE__ */ new Map();\n        let rowEstimate = 30;\n        let $topPad = null;\n        let $bottomPad = null;\n        let scroller = null;\n        let scrollTarget = null;\n        let scrollRaf = 0;\n        let renderFields = [];\n        const fieldsById = /* @__PURE__ */ __name(() => {\n          const map = {};\n          (plugin.getConfiguration().fields || []).forEach((f) => {\n            map[f.id] = f;\n          });\n          return map;\n        }, \"fieldsById\");\n        const hierarchyFieldId = /* @__PURE__ */ __name(() => (plugin.getConfiguration().fields || []).some((f) => f.id === SUBPAGE && f.active !== false) ? SUBPAGE : null, \"hierarchyFieldId\");\n        const choiceColorsFor = /* @__PURE__ */ __name((field) => {\n          const map = {};\n          (field.choices || []).forEach((c) => {\n            map[c.label] = ENUM_COLORS[Number(c.color)] || \"zinc\";\n          });\n          return map;\n        }, \"choiceColorsFor\");\n        const ownPanel = /* @__PURE__ */ __name(() => ui.getPanels().find((panel) => {\n          const nav = panel.getNavigation();\n          return nav && nav.type === \"overview\" && nav.rootId === collectionGuid();\n        }) || null, \"ownPanel\");\n        const isExpanded = /* @__PURE__ */ __name((node) => node.id === zoomGuid || (searchOpen ? searchOpen.has(node.id) : !collapsed.has(node.id)), \"isExpanded\");\n        const visibleFields = /* @__PURE__ */ __name(() => {\n          const byId = fieldsById();\n          return viewContext.getVisiblePropertyIds().map((id) => byId[id]).filter((field) => field && field.id !== \"title\" && field.type !== \"datetime\" && field.type !== \"banner\");\n        }, \"visibleFields\");\n        const propValue = /* @__PURE__ */ __name((record, field) => {\n          if (field.type === \"choice\") {\n            const label = record.prop(field.id).choiceLabel();\n            if (!label) return null;\n            return { text: label, color: choiceColorsFor(field)[label] || \"zinc\" };\n          }\n          if (field.type === \"record\") {\n            const linked = record.linkedRecord(field.id);\n            return linked ? { text: linked.getName(), guid: linked.guid } : null;\n          }\n          if (field.type === \"number\") {\n            const num = record.number(field.id);\n            return num === null ? null : { text: String(num) };\n          }\n          const text = record.text(field.id);\n          return text ? { text } : null;\n        }, \"propValue\");\n        const openToMatches = /* @__PURE__ */ __name((matches) => {\n          const open = /* @__PURE__ */ new Set();\n          const visit = /* @__PURE__ */ __name((node) => {\n            const hasMatchBelow = node.children.map(visit).some(Boolean);\n            if (hasMatchBelow) open.add(node.id);\n            return hasMatchBelow || matches.has(node.id);\n          }, \"visit\");\n          hierarchy.rootNodes.forEach(visit);\n          return open;\n        }, \"openToMatches\");\n        const findMatches = /* @__PURE__ */ __name((delivered) => {\n          const $input = appSearchInput();\n          const words = ($input ? $input.value : \"\").toLowerCase().split(/\\s+/).filter(Boolean);\n          if (words.length) {\n            const hits = delivered.filter((r) => {\n              const name = (r.getName() || \"\").toLowerCase();\n              return words.every((w) => name.includes(w));\n            });\n            if (hits.length) return { matches: new Set(hits.map((r) => r.guid)), query: words.join(\" \") };\n          }\n          return { matches: new Set(delivered.map((r) => r.guid)), query: words.join(\" \") };\n        }, \"findMatches\");\n        const flatten = /* @__PURE__ */ __name(() => {\n          const out = [];\n          const visit = /* @__PURE__ */ __name((node, depth, parent) => {\n            out.push({ node, depth, parent });\n            if (isExpanded(node)) {\n              node.children.forEach((child) => visit(child, depth + 1, node));\n            }\n          }, \"visit\");\n          hierarchy.rootNodes.forEach((root) => visit(root, 0, null));\n          return out;\n        }, \"flatten\");\n        const setSelection = /* @__PURE__ */ __name((index) => {\n          selectedIndex = Math.max(0, Math.min(index, rows.length - 1));\n          if (!$list) return;\n          ensureRendered(selectedIndex);\n          $list.querySelectorAll(\".outline-row\").forEach(($row) => {\n            $row.classList.toggle(\"selected\", Number($row.dataset.index) === selectedIndex);\n          });\n          const $selected = $list.querySelector(`.outline-row[data-index=\"${selectedIndex}\"]`);\n          if ($selected) $selected.scrollIntoView({ block: \"nearest\" });\n          if (isPeeking() && rows[selectedIndex] && rows[selectedIndex].node.id !== peekedGuid) {\n            showPeek();\n          }\n        }, \"setSelection\");\n        const toggle = /* @__PURE__ */ __name((node) => {\n          if (node.id === zoomGuid) return;\n          if (searchOpen) {\n            if (searchOpen.has(node.id)) searchOpen.delete(node.id);\n            else searchOpen.add(node.id);\n          } else {\n            if (isExpanded(node)) collapsed.add(node.id);\n            else collapsed.delete(node.id);\n            localStorage.setItem(storageKey, JSON.stringify([...collapsed]));\n          }\n          const keepGuid = rows[selectedIndex] ? rows[selectedIndex].node.id : null;\n          renderRows();\n          const restored = rows.findIndex((r) => r.node.id === keepGuid);\n          setSelection(restored === -1 ? 0 : restored);\n        }, \"toggle\");\n        const canFold = /* @__PURE__ */ __name((node) => node.children.length > 0, \"canFold\");\n        const setFolded = /* @__PURE__ */ __name((nodes, fold) => {\n          for (const node of nodes) {\n            if (!canFold(node) || node.id === zoomGuid) continue;\n            if (searchOpen) {\n              if (fold) searchOpen.delete(node.id);\n              else searchOpen.add(node.id);\n            } else if (fold) collapsed.add(node.id);\n            else collapsed.delete(node.id);\n          }\n          if (!searchOpen) localStorage.setItem(storageKey, JSON.stringify([...collapsed]));\n        }, \"setFolded\");\n        const nodesUnder = /* @__PURE__ */ __name((node) => {\n          const out = [];\n          const visit = /* @__PURE__ */ __name((n) => n.children.forEach((child) => {\n            out.push(child);\n            visit(child);\n          }), \"visit\");\n          visit(node);\n          return out;\n        }, \"nodesUnder\");\n        const foldSet = /* @__PURE__ */ __name((nodes, op) => {\n          const foldable = nodes.filter(canFold);\n          if (!foldable.length) return;\n          setFolded(foldable, op === \"toggle\" ? foldable.some(isExpanded) : op === \"fold\");\n        }, \"foldSet\");\n        const cascade = /* @__PURE__ */ __name((node, op) => {\n          const levels = [[node]];\n          const walk = /* @__PURE__ */ __name((n, depth) => {\n            if (!isExpanded(n)) return;\n            n.children.forEach((child) => {\n              (levels[depth + 1] ??= []).push(child);\n              walk(child, depth + 1);\n            });\n          }, \"walk\");\n          walk(node, 0);\n          if (op === \"fold\") {\n            for (let d = levels.length - 2; d >= 0; d--) {\n              const open = levels[d].filter((n) => canFold(n) && isExpanded(n));\n              if (open.length) return setFolded(open, true);\n            }\n          } else {\n            for (let d = levels.length - 1; d >= 0; d--) {\n              const shut = levels[d].filter((n) => canFold(n) && !isExpanded(n));\n              if (shut.length) return setFolded(shut, false);\n            }\n          }\n        }, \"cascade\");\n        const refold = /* @__PURE__ */ __name((guid) => {\n          const keep = guid || (rows[selectedIndex] ? rows[selectedIndex].node.id : null);\n          renderRows();\n          const restored = rows.findIndex((r) => r.node.id === keep);\n          setSelection(restored === -1 ? 0 : restored);\n        }, \"refold\");\n        const runAction = /* @__PURE__ */ __name((action) => {\n          const current = rows[selectedIndex];\n          if (!current) return;\n          const node = current.node;\n          const all = /* @__PURE__ */ __name(() => zoomGuid ? hierarchy.rootNodes.flatMap(nodesUnder) : hierarchy.rootNodes.flatMap((root) => [root, ...nodesUnder(root)]), \"all\");\n          const [scope, op] = {\n            \"nav.togglefold\": [\"item\", \"toggle\"],\n            \"nav.foldchildren\": [\"children\", \"fold\"],\n            \"nav.unfoldchildren\": [\"children\", \"unfold\"],\n            \"nav.togglefoldchildren\": [\"children\", \"toggle\"],\n            \"nav.folddescendants\": [\"descendants\", \"fold\"],\n            \"nav.unfolddescendants\": [\"descendants\", \"unfold\"],\n            \"nav.togglefolddescendants\": [\"descendants\", \"toggle\"],\n            \"nav.foldcontainer\": [\"all\", \"fold\"],\n            \"nav.unfoldcontainer\": [\"all\", \"unfold\"],\n            \"nav.togglefoldcontainer\": [\"all\", \"toggle\"]\n          }[action] || [];\n          if (scope) {\n            foldSet({\n              item: /* @__PURE__ */ __name(() => [node], \"item\"),\n              children: /* @__PURE__ */ __name(() => node.children, \"children\"),\n              descendants: /* @__PURE__ */ __name(() => nodesUnder(node), \"descendants\"),\n              all\n            }[scope](), op);\n            refold();\n            return;\n          }\n          if (action === \"nav.foldcascade\") {\n            if (canFold(node) && isExpanded(node)) {\n              cascade(node, \"fold\");\n              refold();\n            } else if (current.parent) {\n              cascade(current.parent, \"fold\");\n              refold(current.parent.id);\n            } else {\n              setFolded(hierarchy.rootNodes.filter(isExpanded), true);\n              refold();\n            }\n            return;\n          }\n          if (action === \"nav.unfoldcascade\") {\n            cascade(node, \"unfold\");\n            refold();\n            return;\n          }\n          if (action === \"plugin.outlinehints\") {\n            plugin.pageKeyHints();\n            return;\n          }\n          if (action === \"collection.trash_record\") {\n            const gone = /* @__PURE__ */ new Set([node.id, ...nodesUnder(node).map((n) => n.id)]);\n            const next = rows.slice(selectedIndex + 1).find((r) => !gone.has(r.node.id)) || rows[selectedIndex - 1];\n            if (node.id === zoomGuid) {\n              const parent = node.record.linkedRecord(hierarchyFieldId());\n              zoomTo(parent ? parent.guid : null);\n            }\n            if (next) {\n              followGuid = next.node.id;\n              clearTimeout(followTimer);\n              followTimer = setTimeout(() => {\n                followGuid = null;\n              }, 3e3);\n            }\n            const fieldId = hierarchyFieldId();\n            plugin.collection.getAllRecords().then((records) => {\n              const children = /* @__PURE__ */ new Map();\n              for (const r of records) {\n                const parent = r.linkedRecord(fieldId);\n                if (!parent) continue;\n                if (!children.has(parent.guid)) children.set(parent.guid, []);\n                children.get(parent.guid).push(r);\n              }\n              const subtree = [node.record];\n              const seen = /* @__PURE__ */ new Set([node.id]);\n              for (let i = 0; i < subtree.length; i++) {\n                for (const c of children.get(subtree[i].guid) || []) {\n                  if (!seen.has(c.guid)) {\n                    seen.add(c.guid);\n                    subtree.push(c);\n                  }\n                }\n              }\n              subtree.reverse().forEach((r) => r.trash());\n              afterWrite();\n            });\n            return;\n          }\n          if (action === \"panel.zoom_in\") {\n            zoomTo(node.id);\n          } else if (action === \"panel.zoom_out\" && zoomGuid) {\n            const zoomed = hierarchy && hierarchy.nodes.get(zoomGuid);\n            const parent = zoomed ? zoomed.record.linkedRecord(hierarchyFieldId()) : null;\n            const from = zoomGuid;\n            zoomTo(parent ? parent.guid : null);\n            const back = rows.findIndex((r) => r.node.id === from);\n            if (back !== -1) setSelection(back);\n          }\n        }, \"runAction\");\n        const onShortcutKey = /* @__PURE__ */ __name((e) => {\n          if (!viewFocused || !$root || $menu || propMode || !rows.length) return;\n          const $focused = document.activeElement;\n          if ($focused && $focused !== document.body && !$root.contains($focused)) return;\n          if ($focused && $focused.classList && $focused.classList.contains(\"outline-inline-input\")) return;\n          const action = foldKeymap().byKey.get(eventKeyName(e));\n          if (!action) return;\n          e.preventDefault();\n          e.stopImmediatePropagation();\n          runAction(action);\n        }, \"onShortcutKey\");\n        const restack = /* @__PURE__ */ __name(() => {\n          if (!$list) return;\n          const $rows = Array.from($list.querySelectorAll(\".outline-row\"));\n          $rows.forEach(($r) => {\n            const $props = $r.querySelector(\".outline-props\");\n            const $title = $r.querySelector(\".outline-title\");\n            if ($props && $title && $props.parentElement !== $title) {\n              $title.insertBefore($props, $r.querySelector(\".outline-time\"));\n            }\n            $r.classList.remove(\"is-stacked\");\n          });\n          const needsStacking = $rows.map(($r) => {\n            const $name = $r.querySelector(\".outline-name\");\n            if (!$name || !$r.querySelector(\".outline-props\")) return false;\n            return $name.scrollWidth > $name.clientWidth + 1;\n          });\n          $rows.forEach(($r, i) => {\n            if (!needsStacking[i]) return;\n            $r.classList.add(\"is-stacked\");\n            const $props = $r.querySelector(\".outline-props\");\n            $props.style.paddingLeft = `${Number($r.dataset.indent) + TWISTY_W + ROW_GAP}px`;\n            $r.insertBefore($props, $r.querySelector(\".outline-propedit\"));\n          });\n        }, \"restack\");\n        const selectNext = /* @__PURE__ */ __name((delta) => {\n          if (!rows.length) return;\n          setSelection((selectedIndex + delta + rows.length) % rows.length);\n        }, \"selectNext\");\n        const openSelected = /* @__PURE__ */ __name((otherPanel) => {\n          const current = rows[selectedIndex];\n          if (!current) return;\n          if (otherPanel) viewContext.openRecordInOtherPanel(current.node.id);\n          else viewContext.openRecordInThisPanel(current.node.id);\n        }, \"openSelected\");\n        const focusView = /* @__PURE__ */ __name(() => {\n          const $focused = document.activeElement;\n          if ($focused instanceof HTMLElement && $focused !== document.body) $focused.blur();\n        }, \"focusView\");\n        const appChrome = /* @__PURE__ */ __name(() => $root && $root.closest(\".custom-view\") || null, \"appChrome\");\n        const appSearchInput = /* @__PURE__ */ __name(() => {\n          const $chrome = appChrome();\n          return $chrome && $chrome.querySelector(\".records-view-query-wrap input\") || null;\n        }, \"appSearchInput\");\n        const focusAppSearch = /* @__PURE__ */ __name(() => {\n          const $input = appSearchInput();\n          if (!$input) return false;\n          $input.focus();\n          return true;\n        }, \"focusAppSearch\");\n        const isPeeking = /* @__PURE__ */ __name(() => {\n          if (nativePeek) {\n            try {\n              return !!nativePeek.getPeekStatusBarContext();\n            } catch (err) {\n              return false;\n            }\n          }\n          if (peekPanelId && !peekPanel()) peekPanelId = null;\n          return !!peekPanelId;\n        }, \"isPeeking\");\n        let hintTimer = null;\n        const hintMode = /* @__PURE__ */ __name(() => {\n          if (isPeeking()) return \"peek\";\n          const $focused = document.activeElement;\n          if ($root && $root.contains($focused) && $focused.classList.contains(\"outline-inline-input\")) return \"field\";\n          if (propMode) return $menu ? \"field\" : \"props\";\n          return null;\n        }, \"hintMode\");\n        const syncKeyHints = /* @__PURE__ */ __name(() => {\n          if (viewFocused) plugin.showKeyHints(true, hintMode(), !!zoomGuid, viewContext.getRecordTypeName());\n        }, \"syncKeyHints\");\n        const stopHintTimer = /* @__PURE__ */ __name(() => {\n          if (hintTimer) clearInterval(hintTimer);\n          hintTimer = null;\n        }, \"stopHintTimer\");\n        const peekPanel = /* @__PURE__ */ __name(() => {\n          if (!peekPanelId) return null;\n          return ui.getPanels().find((p) => p.getId() === peekPanelId) || null;\n        }, \"peekPanel\");\n        const hidePeek = /* @__PURE__ */ __name(() => {\n          if (nativePeek) {\n            if (isPeeking()) nativePeek.dismissRecordPreview();\n            return;\n          }\n          const panel = peekPanel();\n          const restore = peekRestoreNav;\n          peekPanelId = null;\n          peekRestoreNav = null;\n          if (!panel) return;\n          if (restore) {\n            panel.navigateTo(restore);\n            const self = ownPanel();\n            if (self) ui.setActivePanel(self);\n            focusView();\n          } else {\n            ui.closePanel(panel);\n          }\n        }, \"hidePeek\");\n        const commitPeek = /* @__PURE__ */ __name(() => {\n          if (nativePeek) {\n            nativePeek.commitRecordPreview();\n            return;\n          }\n          const current = rows[selectedIndex];\n          const panel = peekPanel();\n          const borrowed = !!peekRestoreNav;\n          peekPanelId = null;\n          peekRestoreNav = null;\n          if (borrowed) {\n            if (panel) ui.setActivePanel(panel);\n            return;\n          }\n          if (peekSteps <= 1) {\n            if (panel) ui.setActivePanel(panel);\n            return;\n          }\n          if (panel) ui.closePanel(panel);\n          if (current) {\n            setTimeout(() => viewContext.openRecordInOtherPanel(current.node.id), 220);\n          }\n        }, \"commitPeek\");\n        const showPeek = /* @__PURE__ */ __name(() => {\n          const current = rows[selectedIndex];\n          if (!current) return;\n          if (nativePeek) {\n            peekedGuid = current.node.id;\n            nativePeek.startRecordPreview(current.node.id);\n            return;\n          }\n          const self = ownPanel();\n          const before = new Set(ui.getPanels().map((p) => p.getId()));\n          if (!peekPanelId) {\n            const borrowed = ui.getPanels().find((p) => !p.isSidebar() && (!self || p.getId() !== self.getId()));\n            peekRestoreNav = borrowed ? borrowed.getNavigation() : null;\n            peekSteps = 0;\n          }\n          if (!peekPanelId || peekedGuid !== current.node.id) peekSteps++;\n          peekedGuid = current.node.id;\n          viewContext.openRecordInOtherPanel(current.node.id);\n          const takeFocusBack = /* @__PURE__ */ __name(() => {\n            if (self) ui.setActivePanel(self);\n            focusView();\n          }, \"takeFocusBack\");\n          takeFocusBack();\n          requestAnimationFrame(takeFocusBack);\n          setTimeout(takeFocusBack, 120);\n          if (peekPanelId) return;\n          const panels = ui.getPanels().filter((p) => !p.isSidebar());\n          const opened = panels.find((p) => !before.has(p.getId())) || panels.find((p) => !self || p.getId() !== self.getId());\n          peekPanelId = opened ? opened.getId() : null;\n        }, \"showPeek\");\n        const peekSelected = /* @__PURE__ */ __name(() => showPeek(), \"peekSelected\");\n        const ROW_PAD_X = 8;\n        const TWISTY_W = 16;\n        const ROW_GAP = 6;\n        const DEPTH_STEP = 20;\n        const ICON_OFFSET = ROW_PAD_X + TWISTY_W + ROW_GAP;\n        const createRecord = /* @__PURE__ */ __name(() => {\n          const guid = viewContext.createRecord();\n          if (!guid) return;\n          pendingNameEditGuid = guid;\n          setTimeout(() => {\n            if (pendingNameEditGuid) renderRows();\n          }, 150);\n        }, \"createRecord\");\n        const onDocumentClick = /* @__PURE__ */ __name((e) => {\n          if ($menu && !$menu.contains(e.target)) closeMenu();\n        }, \"onDocumentClick\");\n        const closeMenu = /* @__PURE__ */ __name(() => {\n          if ($menu) {\n            $menu.remove();\n            $menu = null;\n            document.removeEventListener(\"click\", onDocumentClick, true);\n            syncKeyHints();\n          }\n        }, \"closeMenu\");\n        const showMenu = /* @__PURE__ */ __name((items, x, y, filterPlaceholder) => {\n          closeMenu();\n          if (!$root) return;\n          $menu = document.createElement(\"div\");\n          $menu.className = \"outline-menu\";\n          const $items = document.createElement(\"div\");\n          let $filter = null;\n          let shown = items;\n          let cursor = 0;\n          const confirm = /* @__PURE__ */ __name((index) => {\n            const item = shown[index];\n            if (!item) return;\n            closeMenu();\n            item.onSelect();\n          }, \"confirm\");\n          const move = /* @__PURE__ */ __name((delta) => {\n            if (!shown.length) return;\n            cursor = (cursor + delta + shown.length) % shown.length;\n            paint();\n            const $sel = $items.querySelector(\".is-selected\");\n            if ($sel) $sel.scrollIntoView({ block: \"nearest\" });\n          }, \"move\");\n          const paint = /* @__PURE__ */ __name(() => {\n            const needle = $filter ? $filter.value.trim().toLowerCase() : \"\";\n            shown = items.filter((item) => !needle || item.label.toLowerCase().includes(needle));\n            if (cursor >= shown.length) cursor = 0;\n            $items.innerHTML = \"\";\n            shown.forEach((item, index) => {\n              const $item = document.createElement(\"div\");\n              $item.className = \"outline-menu-item\";\n              if (item.active) $item.classList.add(\"is-active\");\n              if (index === cursor) $item.classList.add(\"is-selected\");\n              $item.appendChild(ui.createIcon(item.icon || \"ti-align-left\"));\n              const $label = document.createElement(\"span\");\n              $label.textContent = item.label;\n              $item.appendChild($label);\n              $item.addEventListener(\"click\", (e) => {\n                e.stopPropagation();\n                confirm(index);\n              });\n              $items.appendChild($item);\n            });\n          }, \"paint\");\n          const onMenuKeyDown = /* @__PURE__ */ __name((e) => {\n            e.stopPropagation();\n            switch (e.key) {\n              case \"ArrowDown\":\n                e.preventDefault();\n                move(1);\n                break;\n              case \"ArrowUp\":\n                e.preventDefault();\n                move(-1);\n                break;\n              case \"Enter\":\n                e.preventDefault();\n                confirm(cursor);\n                break;\n              case \"Escape\":\n                e.preventDefault();\n                closeMenu();\n                break;\n              case \"Tab\":\n                e.preventDefault();\n                break;\n            }\n          }, \"onMenuKeyDown\");\n          $menu.addEventListener(\"keydown\", onMenuKeyDown);\n          if (filterPlaceholder) {\n            $menu.classList.add(\"has-filter\");\n            $filter = document.createElement(\"input\");\n            $filter.type = \"text\";\n            $filter.spellcheck = false;\n            $filter.className = \"form-input outline-menu-filter\";\n            $filter.placeholder = filterPlaceholder;\n            $filter.addEventListener(\"input\", () => {\n              cursor = 0;\n              paint();\n            });\n            $filter.addEventListener(\"click\", (e) => e.stopPropagation());\n            $menu.appendChild($filter);\n          }\n          $menu.appendChild($items);\n          paint();\n          $root.appendChild($menu);\n          const rootRect = $root.getBoundingClientRect();\n          const menuW = $menu.offsetWidth;\n          const left = Math.max(0, Math.min(x - rootRect.left, rootRect.width - menuW));\n          $menu.style.left = `${left}px`;\n          $menu.style.top = `${y - rootRect.top}px`;\n          document.addEventListener(\"click\", onDocumentClick, true);\n          if ($filter) {\n            $filter.focus();\n          } else {\n            $menu.tabIndex = -1;\n            $menu.focus();\n          }\n          syncKeyHints();\n        }, \"showMenu\");\n        const inZoom = /* @__PURE__ */ __name((record, parentFieldId) => {\n          for (let r = record, d = 0; r && d < 100; r = r.linkedRecord(parentFieldId), d++) {\n            if (r.guid === zoomGuid) return true;\n          }\n          return false;\n        }, \"inZoom\");\n        const rebuild = /* @__PURE__ */ __name(() => {\n          if (!lastRecords) return;\n          const parentFieldId = hierarchyFieldId();\n          if (zoomGuid && !parentFieldId) zoomGuid = null;\n          const scoped = zoomGuid ? lastRecords.filter((r) => inZoom(r, parentFieldId)) : lastRecords;\n          const completed = withAncestors(scoped, parentFieldId);\n          if (zoomGuid) {\n            completed.records = completed.records.filter((r) => inZoom(r, parentFieldId));\n            completed.added = new Set([...completed.added].filter((g) => completed.records.some((r) => r.guid === g)));\n          }\n          hierarchy = buildHierarchy(completed.records, parentFieldId);\n          const { matches, query } = findMatches(scoped);\n          contextGuids = completed.added.size || query ? new Set(completed.records.map((r) => r.guid).filter((g) => !matches.has(g))) : /* @__PURE__ */ new Set();\n          if (query) {\n            const key = `${zoomGuid}|${query}|${[...matches].sort().join(\",\")}`;\n            if (key !== searchKey || !searchOpen) {\n              searchOpen = openToMatches(matches);\n              searchKey = key;\n            }\n          } else {\n            searchOpen = null;\n            searchKey = null;\n          }\n          if (!$list) mount();\n          renderNote();\n          renderZoomBar();\n          renderRows();\n        }, \"rebuild\");\n        const zoomTo = /* @__PURE__ */ __name((guid) => {\n          zoomGuid = guid || null;\n          selectedIndex = 0;\n          rebuild();\n          if (rows.length) setSelection(0);\n          syncKeyHints();\n        }, \"zoomTo\");\n        const takeZoomHandoff = /* @__PURE__ */ __name(() => {\n          const raw = document.documentElement.dataset.outlineZoom;\n          if (!raw) return;\n          let req = null;\n          try {\n            req = JSON.parse(raw);\n          } catch (err) {\n            req = null;\n          }\n          if (!req || req.collection !== collectionGuid()) return;\n          delete document.documentElement.dataset.outlineZoom;\n          if (Date.now() - (req.at || 0) > 1e4) return;\n          zoomGuid = req.guid || null;\n          selectedIndex = 0;\n        }, \"takeZoomHandoff\");\n        const renderZoomBar = /* @__PURE__ */ __name(() => {\n          if (!$zoom) return;\n          $zoom.innerHTML = \"\";\n          if (!zoomGuid) return;\n          const parentFieldId = hierarchyFieldId();\n          const target = plugin.data.getRecord(zoomGuid);\n          if (!target) return;\n          const chain = [target];\n          for (let p = target.linkedRecord(parentFieldId), d = 0; p && d < 100; p = p.linkedRecord(parentFieldId), d++) {\n            chain.unshift(p);\n          }\n          const $all = document.createElement(\"button\");\n          $all.type = \"button\";\n          $all.className = \"button-minimal button-small outline-zoom-step\";\n          $all.textContent = \"All\";\n          $all.title = \"Show the whole collection\";\n          $all.addEventListener(\"click\", () => zoomTo(null));\n          $zoom.appendChild($all);\n          chain.forEach((record, i) => {\n            const $sep = document.createElement(\"span\");\n            $sep.className = \"outline-zoom-sep ti ti-chevron-right\";\n            const $step = document.createElement(\"button\");\n            $step.type = \"button\";\n            $step.className = \"button-minimal button-small outline-zoom-step\" + (i === chain.length - 1 ? \" is-current\" : \"\");\n            const $label = document.createElement(\"span\");\n            $label.textContent = record.getName() || \"Untitled\";\n            $step.appendChild($label);\n            $step.title = record.getName() || \"\";\n            $step.addEventListener(\"click\", () => zoomTo(record.guid));\n            $zoom.append($sep, $step);\n          });\n        }, \"renderZoomBar\");\n        const renderNote = /* @__PURE__ */ __name(() => {\n          if (!$note) return;\n          $note.textContent = hierarchyFieldId() ? \"\" : 'Sub-pages are off in this collection, so rows are flat. Run \"Outline: install into a collection...\" to turn them on.';\n        }, \"renderNote\");\n        const EDITABLE_TYPES = [\"text\", \"number\", \"choice\", \"record\"];\n        const EDIT_SKIP_IDS = [\"title\", \"icon\", \"collection\"];\n        const editableFields = /* @__PURE__ */ __name(() => {\n          const canEdit = /* @__PURE__ */ __name((f) => f && f.active !== false && !f.read_only && EDITABLE_TYPES.includes(f.type) && !EDIT_SKIP_IDS.includes(f.id), \"canEdit\");\n          const shown = visibleFields().filter(canEdit);\n          const rest = (plugin.getConfiguration().fields || []).filter((f) => canEdit(f) && !shown.some((s) => s.id === f.id));\n          const title = fieldsById()[\"title\"];\n          return title ? [title, ...shown, ...rest] : [...shown, ...rest];\n        }, \"editableFields\");\n        const fieldText = /* @__PURE__ */ __name((record, field) => {\n          if (field.id === \"title\") return record.getName() || \"\";\n          const value = propValue(record, field);\n          return value ? value.text : \"\";\n        }, \"fieldText\");\n        const afterWrite = /* @__PURE__ */ __name(() => setTimeout(() => renderRows(), 60), \"afterWrite\");\n        const pending = /* @__PURE__ */ new Map();\n        let settleTimer = 0;\n        const SETTLE_MS = 3e3;\n        const notePending = /* @__PURE__ */ __name((guid, key, value) => {\n          pending.set(guid, { ...pending.get(guid), [key]: value });\n          clearTimeout(settleTimer);\n          settleTimer = setTimeout(() => {\n            pending.clear();\n            rebuild();\n          }, SETTLE_MS);\n        }, \"notePending\");\n        const settled = /* @__PURE__ */ __name((records) => {\n          const byGuid = new Map(records.map((r) => [r.guid, r]));\n          const fieldId = hierarchyFieldId();\n          const ord = orderField();\n          for (const [guid, p] of pending) {\n            const record = byGuid.get(guid);\n            if (!record) continue;\n            if (\"parent\" in p) {\n              const linked = fieldId ? record.linkedRecord(fieldId) : null;\n              if ((linked ? linked.guid : null) !== p.parent) return false;\n            }\n            if (\"order\" in p && ord && record.prop(ord.id).number() !== p.order) return false;\n          }\n          pending.clear();\n          clearTimeout(settleTimer);\n          return true;\n        }, \"settled\");\n        let followGuid = null;\n        let followTimer = 0;\n        const toast = /* @__PURE__ */ __name((title, message) => ui.addToaster({ title, message, dismissible: true, autoDestroyTime: 4e3 }), \"toast\");\n        const orderField = /* @__PURE__ */ __name(() => {\n          const view = (plugin.getConfiguration().views || []).find((v) => v.id === viewId);\n          const field = view && view.opts ? fieldsById()[view.opts.order_field_id] : null;\n          if (!field || field.type !== \"number\" || field.read_only || field.active === false) return null;\n          const desc = view.sort_field_id === field.id && view.sort_dir === \"desc\";\n          return { id: field.id, label: field.label, dir: desc ? -1 : 1 };\n        }, \"orderField\");\n        const orderOf = /* @__PURE__ */ __name((node, ord) => {\n          const p = pending.get(node.id);\n          if (p && \"order\" in p) return p.order;\n          return node.record.prop(ord.id).number();\n        }, \"orderOf\");\n        const parentOf = /* @__PURE__ */ __name((node) => {\n          const parent = node.parentGuid ? hierarchy.nodes.get(node.parentGuid) : null;\n          return parent && parent.children.includes(node) ? parent : null;\n        }, \"parentOf\");\n        const childList = /* @__PURE__ */ __name((parent) => parent ? parent.children : hierarchy.rootNodes, \"childList\");\n        const followsOrder = /* @__PURE__ */ __name((list, ord) => {\n          let last = null;\n          for (const n of list) {\n            const v = orderOf(n, ord);\n            if (v === null) continue;\n            if (last !== null && ord.dir * (v - last) < 0) return false;\n            last = v;\n          }\n          return true;\n        }, \"followsOrder\");\n        const positionWrites = /* @__PURE__ */ __name((node, kids, index, ord) => {\n          const list = [...kids];\n          list.splice(index, 0, node);\n          const n = list.length;\n          return list.map((m, i) => ({ node: m, value: ord.dir > 0 ? i + 1 : n - i })).filter(({ node: m, value }) => orderOf(m, ord) !== value);\n        }, \"positionWrites\");\n        const writeParent = /* @__PURE__ */ __name((node, parent) => node.record.setSubPageOf(parent ? parent.id : null) !== false, \"writeParent\");\n        const rearrange = /* @__PURE__ */ __name((op) => {\n          const current = rows[selectedIndex];\n          if (!current || !hierarchy || !hierarchyFieldId()) return;\n          const node = current.node;\n          if (contextGuids.size || searchOpen) {\n            toast(\"Clear the search to rearrange\", \"With a search or filter on, the outline shows only part of each level.\");\n            return;\n          }\n          if (node.id === zoomGuid) return;\n          const parent = parentOf(node);\n          const siblings = childList(parent);\n          const at = siblings.indexOf(node);\n          let target = parent;\n          let index;\n          if (op === \"indent\") {\n            if (at <= 0) return;\n            target = siblings[at - 1];\n            index = target.children.length;\n          } else if (op === \"outdent\") {\n            if (!parent || parent.id === zoomGuid) return;\n            target = parentOf(parent);\n            index = childList(target).indexOf(parent) + 1;\n          } else {\n            index = at + (op === \"down\" ? 1 : -1);\n            if (index < 0 || index >= siblings.length) return;\n          }\n          const ord = orderField();\n          if (!ord && (op === \"up\" || op === \"down\")) {\n            toast(\"No Order property\", 'Run \"Outline: install into a collection\\u2026\" to add one; sibling order is stored there.');\n            return;\n          }\n          const kids = childList(target).filter((n) => n !== node);\n          if (ord && !(followsOrder(siblings, ord) && followsOrder(kids, ord))) {\n            toast(`Sort by ${ord.label} to rearrange`, `The rows aren't in ${ord.label} order, so a new position wouldn't show.`);\n            return;\n          }\n          const writes = ord ? positionWrites(node, kids, index, ord) : [];\n          if (target !== parent) {\n            if (!writeParent(node, target)) {\n              toast(\"Couldn't move the page\", \"The app refused the new parent.\");\n              return;\n            }\n            notePending(node.id, \"parent\", target ? target.id : null);\n          }\n          writes.forEach(({ node: n, value }) => {\n            n.record.prop(ord.id).set(value);\n            notePending(n.id, \"order\", value);\n          });\n          const from = childList(parent);\n          from.splice(from.indexOf(node), 1);\n          childList(target).splice(index, 0, node);\n          node.parentGuid = target ? target.id : null;\n          if (target && collapsed.has(target.id)) {\n            collapsed.delete(target.id);\n            localStorage.setItem(storageKey, JSON.stringify([...collapsed]));\n          }\n          followGuid = node.id;\n          clearTimeout(followTimer);\n          followTimer = setTimeout(() => {\n            followGuid = null;\n          }, 3e3);\n          renderRows();\n        }, \"rearrange\");\n        const editText = /* @__PURE__ */ __name(($cell, value, { onCommit, onCancel }) => {\n          const $input = document.createElement(\"input\");\n          $input.type = \"text\";\n          $input.className = \"outline-inline-input\";\n          $input.value = value || \"\";\n          let done = false;\n          const finish = /* @__PURE__ */ __name((commit) => {\n            if (done) return;\n            done = true;\n            if (commit) onCommit($input.value.trim());\n            else if (onCancel) onCancel();\n            syncKeyHints();\n          }, \"finish\");\n          $input.addEventListener(\"keydown\", (e) => {\n            e.stopPropagation();\n            if (e.key === \"Enter\") {\n              e.preventDefault();\n              finish(true);\n            } else if (e.key === \"Escape\") {\n              e.preventDefault();\n              finish(false);\n            }\n          });\n          $input.addEventListener(\"blur\", () => finish(true));\n          $input.addEventListener(\"mouseup\", (e) => e.stopPropagation());\n          $cell.replaceWith($input);\n          $input.focus();\n          $input.select();\n          syncKeyHints();\n        }, \"editText\");\n        const startNameEdit = /* @__PURE__ */ __name((node, isNew) => {\n          if (!$list) return;\n          const $row = $list.querySelector(`.outline-row[data-guid=\"${node.id}\"]`);\n          const $name = $row && $row.querySelector(\".outline-name\");\n          if (!$name) return;\n          const discardIfEmpty = /* @__PURE__ */ __name((text) => {\n            if (isNew && !text) {\n              node.record.trash();\n              return true;\n            }\n            return false;\n          }, \"discardIfEmpty\");\n          editText($name, node.record.getName(), {\n            onCommit: /* @__PURE__ */ __name((text) => {\n              if (!discardIfEmpty(text)) node.record.prop(\"title\").set(text);\n              focusView();\n              afterWrite();\n            }, \"onCommit\"),\n            onCancel: /* @__PURE__ */ __name(() => {\n              discardIfEmpty(\"\");\n              focusView();\n              afterWrite();\n            }, \"onCancel\")\n          });\n        }, \"startNameEdit\");\n        const descendantsOf = /* @__PURE__ */ __name((node) => {\n          const out = /* @__PURE__ */ new Set();\n          const visit = /* @__PURE__ */ __name((n) => n.children.forEach((child) => {\n            out.add(child.id);\n            visit(child);\n          }), \"visit\");\n          visit(node);\n          return out;\n        }, \"descendantsOf\");\n        const recordCandidates = /* @__PURE__ */ __name(async (field, node) => {\n          if (!field.filter_colguid || field.filter_colguid === collectionGuid()) {\n            const banned = field.id === SUBPAGE ? descendantsOf(node) : /* @__PURE__ */ new Set();\n            return [...hierarchy.nodes.values()].filter((n) => n.id !== node.id && !banned.has(n.id)).map((n) => ({ guid: n.id, name: n.name }));\n          }\n          const other = plugin.data.getPluginByGuid(field.filter_colguid);\n          if (!other || !other.getAllRecords) return [];\n          const records = await other.getAllRecords();\n          return records.map((r) => ({ guid: r.guid, name: r.getName() || \"Unknown\" }));\n        }, \"recordCandidates\");\n        const editField = /* @__PURE__ */ __name((node, field, $cell) => {\n          const record = node.record;\n          const prop = /* @__PURE__ */ __name(() => record.prop(field.id), \"prop\");\n          if (field.id === \"title\" || field.type === \"text\" || field.type === \"number\") {\n            editText($cell, fieldText(record, field), {\n              onCommit: /* @__PURE__ */ __name((text) => {\n                if (field.type === \"number\") {\n                  prop().set(text === \"\" ? null : Number(text));\n                } else {\n                  prop().set(text);\n                }\n                focusView();\n                afterWrite();\n              }, \"onCommit\"),\n              onCancel: /* @__PURE__ */ __name(() => {\n                focusView();\n                renderRows();\n              }, \"onCancel\")\n            });\n            return;\n          }\n          const rect = $cell.getBoundingClientRect();\n          const icon = field.icon || \"ti-align-left\";\n          if (field.type === \"choice\") {\n            const current = prop().choiceLabel();\n            const items = (field.choices || []).filter((c) => c.active !== false).map((c) => ({\n              label: c.label,\n              icon: c.icon || icon,\n              active: c.label === current,\n              onSelect: /* @__PURE__ */ __name(() => {\n                prop().setChoice(c.label);\n                focusView();\n                afterWrite();\n              }, \"onSelect\")\n            }));\n            items.push({\n              label: \"Clear\",\n              icon: \"ti-x\",\n              onSelect: /* @__PURE__ */ __name(() => {\n                prop().set(null);\n                focusView();\n                afterWrite();\n              }, \"onSelect\")\n            });\n            showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);\n            return;\n          }\n          if (field.type === \"record\") {\n            const linked = record.linkedRecord(field.id);\n            const link = /* @__PURE__ */ __name((guid) => {\n              if (field.id === SUBPAGE) record.setSubPageOf(guid);\n              else prop().set(guid);\n            }, \"link\");\n            recordCandidates(field, node).then((candidates) => {\n              if (viewContext.isDestroyed()) return;\n              const items = [{\n                label: \"None\",\n                icon: \"ti-x\",\n                active: !linked,\n                onSelect: /* @__PURE__ */ __name(() => {\n                  link(null);\n                  focusView();\n                  afterWrite();\n                }, \"onSelect\")\n              }];\n              candidates.forEach((c) => items.push({\n                label: c.name,\n                icon,\n                active: linked && linked.guid === c.guid,\n                onSelect: /* @__PURE__ */ __name(() => {\n                  link(c.guid);\n                  focusView();\n                  afterWrite();\n                }, \"onSelect\")\n              }));\n              showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);\n            });\n          }\n        }, \"editField\");\n        const editSelectedField = /* @__PURE__ */ __name(() => {\n          if (!propMode || !$list) return;\n          const $row = $list.querySelector(`.outline-row[data-guid=\"${propMode.guid}\"]`);\n          const current = rows.find((r) => r.node.id === propMode.guid);\n          const fields = editableFields();\n          const field = fields[propMode.index];\n          if (!$row || !current || !field) return;\n          const $cell = $row.querySelector(`.outline-pe-row[data-index=\"${propMode.index}\"] .outline-pe-value`);\n          if ($cell) editField(current.node, field, $cell);\n        }, \"editSelectedField\");\n        const paintPropSelection = /* @__PURE__ */ __name(() => {\n          if (!$list) return;\n          $list.querySelectorAll(\".outline-pe-row\").forEach(($r) => {\n            $r.classList.toggle(\"is-selected\", Number($r.dataset.index) === propMode.index);\n          });\n        }, \"paintPropSelection\");\n        const exitPropMode = /* @__PURE__ */ __name(() => {\n          propMode = null;\n          renderRows();\n          focusView();\n          syncKeyHints();\n        }, \"exitPropMode\");\n        const buildPropEditor = /* @__PURE__ */ __name((node, indent) => {\n          const $panel = document.createElement(\"div\");\n          $panel.className = \"outline-propedit\";\n          $panel.style.paddingLeft = `${indent + TWISTY_W + ROW_GAP}px`;\n          $panel.addEventListener(\"mouseup\", (e) => e.stopPropagation());\n          const fields = editableFields();\n          if (propMode.index >= fields.length) propMode.index = 0;\n          fields.forEach((field, index) => {\n            const $prow = document.createElement(\"div\");\n            $prow.className = \"outline-pe-row\";\n            $prow.dataset.index = String(index);\n            if (index === propMode.index) $prow.classList.add(\"is-selected\");\n            const $icon = ui.createIcon(field.icon || \"ti-align-left\");\n            $icon.classList.add(\"outline-pe-icon\");\n            $prow.appendChild($icon);\n            const $label = document.createElement(\"span\");\n            $label.className = \"outline-pe-label\";\n            $label.textContent = field.label;\n            $prow.appendChild($label);\n            const $value = document.createElement(\"span\");\n            $value.className = \"outline-pe-value\";\n            const text = fieldText(node.record, field);\n            $value.textContent = text || \"Empty\";\n            if (!text) $value.classList.add(\"is-empty\");\n            $prow.appendChild($value);\n            $prow.addEventListener(\"mouseup\", (e) => {\n              e.stopPropagation();\n              if (e.button !== 0) return;\n              propMode.index = index;\n              paintPropSelection();\n              editField(node, field, $value);\n            });\n            $panel.appendChild($prow);\n          });\n          return $panel;\n        }, \"buildPropEditor\");\n        const propChip = /* @__PURE__ */ __name((field, value) => {\n          const $prop = document.createElement(\"span\");\n          $prop.className = \"outline-prop\";\n          const $icon = ui.createIcon(field.icon || \"ti-align-left\");\n          $icon.classList.add(\"outline-prop-icon\");\n          $prop.appendChild($icon);\n          const $value = document.createElement(\"span\");\n          if (value.color) {\n            $value.className = \"outline-pill\";\n            $value.style.background = `var(--enum-${value.color}-bg)`;\n            $value.style.color = `var(--enum-${value.color}-fg)`;\n          } else if (value.guid) {\n            $value.className = \"outline-link\";\n          } else {\n            $value.className = \"outline-prop-text\";\n          }\n          $value.textContent = value.text;\n          $prop.appendChild($value);\n          if (value.guid) {\n            const $arrow = document.createElement(\"span\");\n            $arrow.className = \"outline-link-arrow\";\n            $arrow.textContent = \"\\u2197\";\n            $value.appendChild($arrow);\n            $prop.addEventListener(\"click\", (e) => {\n              e.stopPropagation();\n              viewContext.openRecordInThisPanel(value.guid);\n            });\n          }\n          return $prop;\n        }, \"propChip\");\n        const OVERSCAN_PX = 1e3;\n        const MARGIN_PX = 300;\n        const rowHeight = /* @__PURE__ */ __name((i) => heightCache.get(rows[i].node.id) ?? rowEstimate, \"rowHeight\");\n        const sumHeights = /* @__PURE__ */ __name((from, to) => {\n          let y = 0;\n          for (let i = from; i < to; i++) y += rowHeight(i);\n          return y;\n        }, \"sumHeights\");\n        const attachScroller = /* @__PURE__ */ __name(() => {\n          if (scroller && scroller.contains($list)) return;\n          detachScroller();\n          let found = null;\n          for (let el = $list.parentElement; el && el !== document.body; el = el.parentElement) {\n            const oy = getComputedStyle(el).overflowY;\n            if (oy === \"auto\" || oy === \"scroll\") {\n              found = el;\n              break;\n            }\n          }\n          if (!found && !$list.isConnected) return;\n          scroller = found || document.scrollingElement;\n          scrollTarget = found || window;\n          scrollTarget.addEventListener(\"scroll\", onScroll, { passive: true });\n        }, \"attachScroller\");\n        const detachScroller = /* @__PURE__ */ __name(() => {\n          if (scrollTarget) scrollTarget.removeEventListener(\"scroll\", onScroll);\n          if (scrollRaf) cancelAnimationFrame(scrollRaf);\n          scroller = scrollTarget = null;\n          scrollRaf = 0;\n        }, \"detachScroller\");\n        const onScroll = /* @__PURE__ */ __name(() => {\n          if (scrollRaf) return;\n          scrollRaf = requestAnimationFrame(() => {\n            scrollRaf = 0;\n            renderWindow(false);\n          });\n        }, \"onScroll\");\n        const viewportInList = /* @__PURE__ */ __name(() => {\n          const listTop = $list.getBoundingClientRect().top;\n          if (!scroller || scroller === document.scrollingElement) {\n            return { from: -listTop, to: window.innerHeight - listTop };\n          }\n          const top = scroller.getBoundingClientRect().top;\n          return { from: top - listTop, to: top - listTop + scroller.clientHeight };\n        }, \"viewportInList\");\n        const rangeFor = /* @__PURE__ */ __name((pad) => {\n          const { from, to } = viewportInList();\n          const lo = from - pad;\n          const hi = to + pad;\n          let y = 0;\n          let start = -1;\n          let end = rows.length;\n          for (let i = 0; i < rows.length; i++) {\n            if (y >= hi) {\n              end = i;\n              break;\n            }\n            const h = rowHeight(i);\n            if (start === -1 && y + h > lo) start = i;\n            y += h;\n          }\n          if (start === -1) start = Math.max(0, end - 1);\n          return { start, end };\n        }, \"rangeFor\");\n        const updatePads = /* @__PURE__ */ __name(() => {\n          $topPad.style.height = `${sumHeights(0, win.start)}px`;\n          $bottomPad.style.height = `${sumHeights(win.end, rows.length)}px`;\n        }, \"updatePads\");\n        const renderWindow = /* @__PURE__ */ __name((force, depth = 0) => {\n          if (!$list || !$topPad || !rows.length) return;\n          if (!force) {\n            const need = rangeFor(MARGIN_PX);\n            if (need.start >= win.start && need.end <= win.end) return;\n          }\n          win = rangeFor(OVERSCAN_PX);\n          while ($topPad.nextSibling && $topPad.nextSibling !== $bottomPad) {\n            $topPad.nextSibling.remove();\n          }\n          const $frag = document.createDocumentFragment();\n          for (let i = win.start; i < win.end; i++) $frag.appendChild(buildRow(i));\n          $list.insertBefore($frag, $bottomPad);\n          restack();\n          let changed = false;\n          let estimated = heightCache.size > 0;\n          for (let $r = $topPad.nextSibling; $r && $r !== $bottomPad; $r = $r.nextSibling) {\n            const h = $r.offsetHeight;\n            if (!h) continue;\n            if (!estimated && !$r.classList.contains(\"is-stacked\") && !$r.querySelector(\".outline-propedit\")) {\n              estimated = true;\n              rowEstimate = h;\n            }\n            if (heightCache.get($r.dataset.guid) !== h) {\n              heightCache.set($r.dataset.guid, h);\n              changed = true;\n            }\n          }\n          updatePads();\n          if (changed && depth < 2) renderWindow(false, depth + 1);\n        }, \"renderWindow\");\n        const ensureRendered = /* @__PURE__ */ __name((index) => {\n          if (!$topPad || !rows.length || index >= win.start && index < win.end) return;\n          if (scroller) {\n            const { from, to } = viewportInList();\n            const top = sumHeights(0, index);\n            const bottom = top + rowHeight(index);\n            if (top < from) scroller.scrollTop -= from - top;\n            else if (bottom > to) scroller.scrollTop += bottom - to;\n          }\n          renderWindow(true);\n        }, \"ensureRendered\");\n        const renderRows = /* @__PURE__ */ __name(() => {\n          if (!$list) return;\n          renderFields = visibleFields();\n          $list.innerHTML = \"\";\n          $topPad = $bottomPad = null;\n          win = { start: 0, end: 0 };\n          rows = hierarchy ? flatten() : [];\n          if (followGuid) {\n            const at = rows.findIndex((r) => r.node.id === followGuid);\n            if (at !== -1) selectedIndex = at;\n          }\n          if (rows.length === 0) {\n            const $empty = document.createElement(\"div\");\n            $empty.className = \"outline-empty\";\n            $empty.textContent = \"No records\";\n            $list.appendChild($empty);\n            return;\n          }\n          $topPad = document.createElement(\"div\");\n          $bottomPad = document.createElement(\"div\");\n          $topPad.className = $bottomPad.className = \"outline-pad\";\n          $list.append($topPad, $bottomPad);\n          attachScroller();\n          renderWindow(true);\n          if (!scroller) {\n            requestAnimationFrame(() => {\n              if (!$list) return;\n              attachScroller();\n              renderWindow(false);\n            });\n          }\n          setSelection(selectedIndex);\n          if (pendingNameEditGuid) {\n            const at = rows.findIndex((r) => r.node.id === pendingNameEditGuid);\n            pendingNameEditGuid = null;\n            if (at !== -1) {\n              setSelection(at);\n              startNameEdit(rows[at].node, true);\n            }\n          }\n        }, \"renderRows\");\n        const buildRow = /* @__PURE__ */ __name((index) => {\n          const { node, depth } = rows[index];\n          const fields = renderFields;\n          const hasChildren = node.children.length > 0;\n          const indent = ROW_PAD_X + depth * DEPTH_STEP;\n          const $row = document.createElement(\"div\");\n          $row.className = \"outline-row\";\n          if (contextGuids.has(node.id)) $row.classList.add(\"is-context\");\n          $row.dataset.index = String(index);\n          if (index === selectedIndex) $row.classList.add(\"selected\");\n          $row.dataset.guid = node.id;\n          $row.dataset.indent = String(indent);\n          const $title = document.createElement(\"div\");\n          $title.className = \"outline-title\";\n          $title.style.paddingLeft = `${indent}px`;\n          const $twisty = document.createElement(\"span\");\n          $twisty.className = \"outline-twisty\";\n          if (hasChildren) {\n            $twisty.style.setProperty(\"--twisty-reach\", `${indent}px`);\n            $twisty.appendChild(ui.createIcon(\"ti-chevron-right\"));\n            $twisty.classList.toggle(\"expanded\", isExpanded(node));\n            $twisty.addEventListener(\"mouseup\", (e) => {\n              if (e.button !== 0) return;\n              e.stopPropagation();\n              e.preventDefault();\n              toggle(node);\n            });\n          }\n          $title.appendChild($twisty);\n          const $icon = ui.createIcon(node.record.getIcon(true) || \"ti-file\");\n          $icon.classList.add(\"outline-icon\");\n          $title.appendChild($icon);\n          const $name = document.createElement(\"span\");\n          $name.className = \"outline-name\";\n          $name.textContent = node.name;\n          $title.appendChild($name);\n          if (hasChildren && !isExpanded(node)) {\n            const $count = document.createElement(\"span\");\n            $count.className = \"outline-count\";\n            $count.textContent = String(node.children.length);\n            $title.appendChild($count);\n          }\n          const chips = fields.map((field) => ({ field, value: propValue(node.record, field) })).filter((entry) => entry.value);\n          if (chips.length) {\n            const $props = document.createElement(\"span\");\n            $props.className = \"outline-props\";\n            chips.forEach(({ field, value }) => $props.appendChild(propChip(field, value)));\n            $title.appendChild($props);\n          }\n          const $time = document.createElement(\"span\");\n          $time.className = \"outline-time\";\n          $time.textContent = timeAgo(node.record.date(\"Modified\"));\n          $title.appendChild($time);\n          if (canShowOptions()) {\n            const $opts = document.createElement(\"button\");\n            $opts.type = \"button\";\n            $opts.className = \"outline-row-menu button-none button-small button-minimal-hover tooltip\";\n            $opts.setAttribute(\"aria-label\", \"Options\");\n            $opts.dataset.tooltip = \"Options\";\n            $opts.dataset.tooltipDir = \"top\";\n            $opts.appendChild(ui.createIcon(\"ti-dots\"));\n            $opts.addEventListener(\"mouseup\", (e) => {\n              e.stopPropagation();\n              e.preventDefault();\n            });\n            $opts.addEventListener(\"click\", (e) => {\n              e.stopPropagation();\n              e.preventDefault();\n              setSelection(index);\n              nativePeek.showOptionsDropdown($opts, node.id);\n            });\n            $title.appendChild($opts);\n          }\n          $row.appendChild($title);\n          if (propMode && propMode.guid === node.id) {\n            $row.appendChild(buildPropEditor(node, indent));\n          }\n          $row.addEventListener(\"mouseup\", (e) => {\n            if (e.button !== 0 && e.button !== 1) return;\n            hidePeek();\n            setSelection(index);\n            if (e.button === 0 && e.shiftKey) {\n              e.preventDefault();\n              return;\n            }\n            if (e.button === 1 || e.metaKey || e.ctrlKey) {\n              viewContext.openRecordInOtherPanel(node.id);\n            } else {\n              viewContext.openRecordInThisPanel(node.id);\n            }\n            e.preventDefault();\n          });\n          return $row;\n        }, \"buildRow\");\n        const mount = /* @__PURE__ */ __name(() => {\n          const $element = viewContext.getElement();\n          $element.innerHTML = \"\";\n          $root = document.createElement(\"div\");\n          $root.className = \"outline-root collection-list-view\";\n          $zoom = document.createElement(\"div\");\n          $zoom.className = \"outline-zoom\";\n          $root.appendChild($zoom);\n          $note = document.createElement(\"div\");\n          $note.className = \"outline-note\";\n          $root.appendChild($note);\n          $list = document.createElement(\"div\");\n          $list.className = \"outline-list\";\n          $root.appendChild($list);\n          if (viewContext.supportsCreateRecord()) {\n            const $create = document.createElement(\"button\");\n            $create.type = \"button\";\n            $create.className = \"collection-list-create-card\";\n            $create.style.paddingLeft = `calc(var(--list-row-overhang) + ${ICON_OFFSET}px)`;\n            $create.appendChild(ui.createIcon(\"ti-plus\"));\n            const $label = document.createElement(\"span\");\n            $label.textContent = `New ${viewContext.getRecordTypeName()}`;\n            $create.appendChild($label);\n            const $kbd = document.createElement(\"kbd\");\n            $kbd.className = \"collection-list-create-card-shortcut\";\n            $kbd.textContent = \"\\u21E7\\u21B5\";\n            $create.appendChild($kbd);\n            $create.addEventListener(\"click\", (e) => {\n              e.stopPropagation();\n              createRecord();\n            });\n            $root.appendChild($create);\n          }\n          $element.appendChild($root);\n        }, \"mount\");\n        return {\n          onLoad: /* @__PURE__ */ __name(() => {\n            ui.injectCSS(\n              /* css */\n              `\n\t\t\t\t\t\t.outline-root {\n\t\t\t\t\t\t\tposition: relative;\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t\tfont-family: var(--font-sans);\n\t\t\t\t\t\t\tfont-size: var(--text-size-normal);\n\t\t\t\t\t\t\tcolor: var(--text-default);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-note {\n\t\t\t\t\t\t\tfont-size: 12px;\n\t\t\t\t\t\t\tcolor: var(--enum-orange-fg, #c60);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-note:empty {\n\t\t\t\t\t\t\tdisplay: none;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-zoom {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\tmargin-bottom: 6px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-zoom:empty {\n\t\t\t\t\t\t\tdisplay: none;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-zoom-sep {\n\t\t\t\t\t\t\tflex: none;\n\t\t\t\t\t\t\topacity: .45;\n\t\t\t\t\t\t\tfont-size: 13px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-zoom-step {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\tflex: 0 1 auto;\n\t\t\t\t\t\t\tmin-width: 3em;\n\t\t\t\t\t\t\tmax-width: 16em;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-zoom-step:first-child {\n\t\t\t\t\t\t\tflex: none;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-zoom-step.is-current {\n\t\t\t\t\t\t\tflex-shrink: 0.3;\n\t\t\t\t\t\t\tfont-weight: 600;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-zoom-step > span {\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu {\n\t\t\t\t\t\t\tposition: absolute;\n\t\t\t\t\t\t\tz-index: 20;\n\t\t\t\t\t\t\tmin-width: 180px;\n\t\t\t\t\t\t\tpadding: 4px;\n\t\t\t\t\t\t\tbackground: var(--cmdpal-bg-color);\n\t\t\t\t\t\t\tborder: 1px solid var(--cmdpal-border-color);\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tbox-shadow: var(--cmdpal-box-shadow);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu.has-filter {\n\t\t\t\t\t\t\tmin-width: 250px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-filter {\n\t\t\t\t\t\t\twidth: 100%;\n\t\t\t\t\t\t\tmargin-bottom: 4px;\n\t\t\t\t\t\t\tbackground: transparent;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-item {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t\tpadding: 5px 8px;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-fg-color);\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-menu-item:hover {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-hover-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-hover-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the current value, as the app's .autocomplete--current */\n\t\t\t\t\t\t.outline-menu-item.is-active {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-current-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-current-fg-color);\n\t\t\t\t\t\t\tfont-weight: 700;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the keyboard highlight, as .autocomplete--option-selected */\n\t\t\t\t\t\t.outline-menu-item.is-selected,\n\t\t\t\t\t\t.outline-menu-item.is-selected:hover {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-selected-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-selected-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pad { flex: none; }\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * Key hints: our status-bar item is pinned over the bar's left\n\t\t\t\t\t\t * edge while the app's own hints there are hidden. Absolute\n\t\t\t\t\t\t * against the bar escapes .statusbar--right's overflow clip.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-keys { display: none !important; }\n\t\t\t\t\t\tbody.${KEYS_BODY_CLASS} .statusbar--status-bar { position: relative; }\n\t\t\t\t\t\tbody.${KEYS_BODY_CLASS} .statusbar--left > * { display: none !important; }\n\t\t\t\t\t\tbody.${KEYS_BODY_CLASS} .outline-keys {\n\t\t\t\t\t\t\tdisplay: flex !important;\n\t\t\t\t\t\t\tposition: absolute;\n\t\t\t\t\t\t\tleft: 0;\n\t\t\t\t\t\t\ttop: 0;\n\t\t\t\t\t\t\tbottom: 0;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tmargin: 0;\n\t\t\t\t\t\t\tpadding: 0;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-keys .statusbar-item--icon { display: none; }\n\t\t\t\t\t\t.outline-keys .statusbar-item--label {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-wrap: wrap;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tcolumn-gap: 5px;\n\t\t\t\t\t\t\trow-gap: 20px;\n\t\t\t\t\t\t\theight: 19px;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\tfont-size: 12px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-list {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row {\n\t\t\t\t\t\t\tpadding: 4px 12px 4px 0;\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t\tuser-select: none;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row:hover {\n\t\t\t\t\t\t\tbackground: var(--prop-bg-hover);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row.selected {\n\t\t\t\t\t\t\tbackground: var(--cards-bg-focused);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-title {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tjustify-content: center;\n\t\t\t\t\t\t\twidth: 16px;\n\t\t\t\t\t\t\theight: 16px;\n\t\t\t\t\t\t\tflex: 0 0 16px;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\tborder-radius: 3px;\n\t\t\t\t\t\t\tposition: relative;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * The chevron alone is a 16px target beside a row that opens on\n\t\t\t\t\t\t * click, so misses zoom into the page. This invisible box widens\n\t\t\t\t\t\t * the target to the full row height, left across the indent to the\n\t\t\t\t\t\t * row edge, and right across the gap to the page icon. The\n\t\t\t\t\t\t * chevron rotates inside it, not the twisty, so the box stays put.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-twisty:not(:empty)::before {\n\t\t\t\t\t\t\tcontent: \"\";\n\t\t\t\t\t\t\tposition: absolute;\n\t\t\t\t\t\t\ttop: -7px;\n\t\t\t\t\t\t\tbottom: -7px;\n\t\t\t\t\t\t\tleft: calc(-1 * var(--twisty-reach, 0px));\n\t\t\t\t\t\t\tright: -${ROW_GAP}px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty > * {\n\t\t\t\t\t\t\ttransition: transform 0.12s ease;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty.expanded > * {\n\t\t\t\t\t\t\ttransform: rotate(90deg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-twisty:hover {\n\t\t\t\t\t\t\tbackground: var(--ed-fold-icon-hover-bg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-icon {\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * Our collection-icons fork broadcasts its \"Hide icons in\n\t\t\t\t\t\t * collection views\" switch as this body attribute; honor it so\n\t\t\t\t\t\t * the Outline view matches the built-in List view. Inert when\n\t\t\t\t\t\t * that plugin is absent \\u2014 the attribute is never set.\n\t\t\t\t\t\t */\n\t\t\t\t\t\tbody[data-plg-collection-icons-listview-icons=\"hide\"] .outline-icon {\n\t\t\t\t\t\t\tdisplay: none;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-name {\n\t\t\t\t\t\t\tflex: 0 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\tfont-weight: 600;\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * A row the filter dropped, kept only to hold a match's place.\n\t\t\t\t\t\t * Dimmed rather than hidden: it still has to read as the path\n\t\t\t\t\t\t * down to the match, and it is still a working row \\u2014 clickable,\n\t\t\t\t\t\t * foldable, editable. The matches themselves are left alone, so\n\t\t\t\t\t\t * an unfiltered tree looks exactly as it always did.\n\t\t\t\t\t\t *\n\t\t\t\t\t\t * Recoloring the name alone was not enough to see, at either\n\t\t\t\t\t\t * --text-subtle (text-500, one step off the default \\u2014 invisible)\n\t\t\t\t\t\t * or --text-muted (text-800). Fading the WHOLE row instead takes\n\t\t\t\t\t\t * the name, the icon, the chips and the timestamp down together,\n\t\t\t\t\t\t * which is what makes the matched rows pop out of the column; the\n\t\t\t\t\t\t * name also loses its bold, so weight carries the same signal\n\t\t\t\t\t\t * where a theme's colors are close together.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-row.is-context {\n\t\t\t\t\t\t\topacity: .45;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row.is-context .outline-name {\n\t\t\t\t\t\t\tfont-weight: 400;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* Full strength again on hover or focus \\u2014 a faded row is still a\n\t\t\t\t\t\t   working row, and it should not look inert while pointed at. */\n\t\t\t\t\t\t.outline-row.is-context:hover,\n\t\t\t\t\t\t.outline-row.is-context.selected {\n\t\t\t\t\t\t\topacity: 1;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-count {\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcolor: var(--text-subtle);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * A fixed column, not shrink-to-fit: the chips are pushed up\n\t\t\t\t\t\t * against the stamp, so a stamp that is one character shorter\n\t\t\t\t\t\t * (\"1h ago\" against \"16m ago\") would otherwise leave that row's\n\t\t\t\t\t\t * chips ending at a different x from every other row's.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-time {\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tmin-width: 8ch;\n\t\t\t\t\t\t\ttext-align: right;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* Native: .collection-list-card-menu, shown on hover or on the\n\t\t\t\t\t\t   focused card of a focused view. */\n\t\t\t\t\t\t/* At the right end of line 1, like native's top-right corner. The\n\t\t\t\t\t\t   chips already push themselves and the stamp right; with none on\n\t\t\t\t\t\t   the line, the button takes the free space instead (two auto\n\t\t\t\t\t\t   margins on one line would split it). */\n\t\t\t\t\t\t.outline-row-menu {\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tmargin-left: auto;\n\t\t\t\t\t\t\topacity: 0;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-props ~ .outline-row-menu {\n\t\t\t\t\t\t\tmargin-left: 0;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-row:hover .outline-row-menu,\n\t\t\t\t\t\t.focused-component .outline-row.selected .outline-row-menu {\n\t\t\t\t\t\t\topacity: 1;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * Chips are pushed to the right, so they and the timestamp read\n\t\t\t\t\t\t * as one right-hand column instead of trailing the name at a\n\t\t\t\t\t\t * different x on every row.\n\t\t\t\t\t\t *\n\t\t\t\t\t\t * This is the ONLY auto margin on the line. Giving the stamp one\n\t\t\t\t\t\t * as well splits the free space evenly between the two, which\n\t\t\t\t\t\t * left the chips floating mid-row at a position that tracked the\n\t\t\t\t\t\t * name's length \\u2014 the opposite of aligned.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t.outline-props {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t\tgap: 10px;\n\t\t\t\t\t\t\tmargin-left: auto;\n\t\t\t\t\t\t\tpadding-right: 10px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/*\n\t\t\t\t\t\t * Two-line fallback: the chips are moved out of the title line\n\t\t\t\t\t\t * (restack()), which keeps that line unwrappable \\u2014 the name\n\t\t\t\t\t\t * ellipsises and the timestamp stays put, as native does. The\n\t\t\t\t\t\t * left offset is set inline, since it follows the row's depth.\n\t\t\t\t\t\t */\n\t\t\t\t\t\t/* Wrapped, the chips are left-aligned under the row icon: there\n\t\t\t\t\t\t   is no stamp on line 2 to align them against, and a lone\n\t\t\t\t\t\t   right-aligned run reads as belonging to the row below. */\n\t\t\t\t\t\t.outline-row.is-stacked .outline-props {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tjustify-content: flex-start;\n\t\t\t\t\t\t\tmargin-left: 0;\n\t\t\t\t\t\t\tmargin-top: 2px;\n\t\t\t\t\t\t\tpadding-right: 0;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop {\n\t\t\t\t\t\t\tdisplay: inline-flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 4px;\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop-icon {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-prop-text {\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pill {\n\t\t\t\t\t\t\tborder-radius: 4px;\n\t\t\t\t\t\t\tpadding: 1px 6px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link {\n\t\t\t\t\t\t\tcolor: var(--ed-inlineref-fg);\n\t\t\t\t\t\t\tborder-radius: 4px;\n\t\t\t\t\t\t\tpadding: 1px 6px;\n\t\t\t\t\t\t\tbackground: var(--ed-backlink-bg);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link:hover {\n\t\t\t\t\t\t\tcolor: var(--ed-inlineref-hover-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-link-arrow {\n\t\t\t\t\t\t\tmargin-left: 3px;\n\t\t\t\t\t\t\topacity: 0.7;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t/* the property list E opens under a row */\n\t\t\t\t\t\t.outline-propedit {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\tflex-direction: column;\n\t\t\t\t\t\t\tgap: 1px;\n\t\t\t\t\t\t\tmargin-top: 4px;\n\t\t\t\t\t\t\tpadding-bottom: 2px;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row {\n\t\t\t\t\t\t\tdisplay: flex;\n\t\t\t\t\t\t\talign-items: center;\n\t\t\t\t\t\t\tgap: 6px;\n\t\t\t\t\t\t\tpadding: 3px 6px;\n\t\t\t\t\t\t\tborder-radius: var(--radius-normal);\n\t\t\t\t\t\t\tfont-size: var(--text-size-small);\n\t\t\t\t\t\t\tcursor: pointer;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row:hover {\n\t\t\t\t\t\t\tbackground: var(--prop-bg-hover);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row.is-selected {\n\t\t\t\t\t\t\tbackground: var(--cmdpal-selected-bg-color);\n\t\t\t\t\t\t\tcolor: var(--cmdpal-selected-fg-color);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-icon {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t\tflex: 0 0 auto;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-label {\n\t\t\t\t\t\t\tflex: 0 0 140px;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-row.is-selected .outline-pe-label {\n\t\t\t\t\t\t\tcolor: inherit;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-value {\n\t\t\t\t\t\t\tflex: 1 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\twhite-space: nowrap;\n\t\t\t\t\t\t\toverflow: hidden;\n\t\t\t\t\t\t\ttext-overflow: ellipsis;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-pe-value.is-empty {\n\t\t\t\t\t\t\tcolor: var(--text-xmuted);\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-inline-input {\n\t\t\t\t\t\t\tflex: 1 1 auto;\n\t\t\t\t\t\t\tmin-width: 0;\n\t\t\t\t\t\t\tpadding: 1px 4px;\n\t\t\t\t\t\t\tborder: var(--input-border-focus);\n\t\t\t\t\t\t\tborder-radius: 3px;\n\t\t\t\t\t\t\tbackground: var(--panel-bg-color);\n\t\t\t\t\t\t\tcolor: var(--text-default);\n\t\t\t\t\t\t\tfont-family: var(--font-sans);\n\t\t\t\t\t\t\tfont-size: inherit;\n\t\t\t\t\t\t\tfont-weight: inherit;\n\t\t\t\t\t\t\toutline: none;\n\t\t\t\t\t\t}\n\t\t\t\t\t\t.outline-empty {\n\t\t\t\t\t\t\tpadding: 40px;\n\t\t\t\t\t\t\ttext-align: center;\n\t\t\t\t\t\t\tcolor: var(--text-muted);\n\t\t\t\t\t\t}\n\t\t\t\t\t`\n            );\n            viewContext.makeNormalLayout();\n            mount();\n            document.addEventListener(\"keydown\", onShortcutKey, true);\n          }, \"onLoad\"),\n          onRefresh: /* @__PURE__ */ __name(({ records }) => {\n            lastRecords = records;\n            takeZoomHandoff();\n            if (pending.size && !settled(records)) return;\n            rebuild();\n          }, \"onRefresh\"),\n          // Width decides which rows stack onto two lines, so every measured\n          // height is suspect after a resize.\n          onPanelResize: /* @__PURE__ */ __name(() => {\n            heightCache.clear();\n            renderWindow(true);\n          }, \"onPanelResize\"),\n          onDestroy: /* @__PURE__ */ __name(() => {\n            document.removeEventListener(\"keydown\", onShortcutKey, true);\n            stopHintTimer();\n            if (viewFocused) plugin.showKeyHints(false);\n            detachScroller();\n            $topPad = $bottomPad = null;\n            closeMenu();\n            hidePeek();\n            propMode = null;\n            pendingNameEditGuid = null;\n            hierarchy = null;\n            rows = [];\n            $root = null;\n            $list = null;\n            $note = null;\n            $zoom = null;\n            $menu = null;\n            lastRecords = null;\n          }, \"onDestroy\"),\n          // Enter from the sidebar, a click, or a panel switch lands here.\n          onFocus: /* @__PURE__ */ __name(() => {\n            viewFocused = true;\n            syncKeyHints();\n            if (!hintTimer) hintTimer = setInterval(syncKeyHints, 300);\n            if (rows.length) setSelection(selectedIndex);\n          }, \"onFocus\"),\n          onBlur: /* @__PURE__ */ __name(() => {\n            viewFocused = false;\n            stopHintTimer();\n            plugin.showKeyHints(false);\n          }, \"onBlur\"),\n          onKeyboardNavigation: /* @__PURE__ */ __name(({ e }) => {\n            if ($menu) return;\n            const $focused = document.activeElement;\n            if ($focused && $focused !== document.body && $root && !$root.contains($focused)) return;\n            if ($focused && $focused.classList && $focused.classList.contains(\"outline-inline-input\")) return;\n            if (rows.length === 0) return;\n            const current = rows[selectedIndex];\n            if (!current) return;\n            if (propMode) {\n              const fields = editableFields();\n              if (e.key === \"ArrowDown\" || e.key === \"ArrowUp\") {\n                e.preventDefault();\n                const step = e.key === \"ArrowDown\" ? 1 : -1;\n                propMode.index = (propMode.index + step + fields.length) % fields.length;\n                paintPropSelection();\n                return;\n              }\n              if (e.key === \"Enter\") {\n                e.preventDefault();\n                editSelectedField();\n                return;\n              }\n              if (e.key === \"Escape\" || e.key === \"e\" || e.key === \"E\") {\n                e.preventDefault();\n                exitPropMode();\n                return;\n              }\n              return;\n            }\n            if ((e.key === \"e\" || e.key === \"E\") && !e.metaKey && !e.ctrlKey && !e.altKey) {\n              e.preventDefault();\n              if (editableFields().length) {\n                propMode = { guid: current.node.id, index: 0 };\n                renderRows();\n                syncKeyHints();\n              }\n              return;\n            }\n            if ((e.key === \"r\" || e.key === \"R\" || e.key === \"F2\") && !e.metaKey && !e.ctrlKey && !e.altKey) {\n              e.preventDefault();\n              startNameEdit(current.node, false);\n              return;\n            }\n            if (e.key === \"Enter\" && e.shiftKey) {\n              e.preventDefault();\n              createRecord();\n              return;\n            }\n            if (e.key === \"/\" && !e.metaKey && !e.ctrlKey && !e.altKey) {\n              if (focusAppSearch()) e.preventDefault();\n              return;\n            }\n            if (e.key === \"Enter\" && (e.metaKey || e.ctrlKey)) {\n              e.preventDefault();\n              if (isPeeking()) commitPeek();\n              else openSelected(true);\n              return;\n            }\n            if (e.key === \"Escape\" && isPeeking()) {\n              e.preventDefault();\n              hidePeek();\n              return;\n            }\n            if (e.key === \" \") {\n              e.preventDefault();\n              peekSelected();\n              return;\n            }\n            if (e.key === \"Tab\" && !e.metaKey && !e.ctrlKey && !e.altKey) {\n              e.preventDefault();\n              rearrange(e.shiftKey ? \"outdent\" : \"indent\");\n              return;\n            }\n            if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && (e.key === \"ArrowDown\" || e.key === \"ArrowUp\")) {\n              e.preventDefault();\n              rearrange(e.key === \"ArrowDown\" ? \"down\" : \"up\");\n              return;\n            }\n            if ((e.metaKey || e.ctrlKey) && (e.key === \"ArrowDown\" || e.key === \"ArrowUp\")) {\n              e.preventDefault();\n              const hasChildren = current.node.children.length > 0;\n              if (e.key === \"ArrowDown\") {\n                if (hasChildren && !isExpanded(current.node)) toggle(current.node);\n                selectNext(1);\n              } else if (hasChildren && isExpanded(current.node)) {\n                toggle(current.node);\n              } else if (current.parent) {\n                setFolded([current.parent], true);\n                refold(current.parent.id);\n              } else if (selectedIndex === 0) {\n                focusAppSearch();\n              } else {\n                selectNext(-1);\n              }\n              return;\n            }\n            switch (e.key) {\n              case \"ArrowDown\":\n                e.preventDefault();\n                selectNext(1);\n                break;\n              case \"ArrowUp\":\n                e.preventDefault();\n                if (selectedIndex === 0) focusAppSearch();\n                else selectNext(-1);\n                break;\n              // ←/→ cycle rows like ↑/↓ do. They also have to be swallowed:\n              // left alone, the app moves the panel left/right.\n              case \"ArrowRight\":\n                e.preventDefault();\n                selectNext(1);\n                break;\n              case \"ArrowLeft\":\n                e.preventDefault();\n                selectNext(-1);\n                break;\n              case \"Home\":\n                e.preventDefault();\n                setSelection(0);\n                break;\n              case \"End\":\n                e.preventDefault();\n                setSelection(rows.length - 1);\n                break;\n              case \"Enter\":\n                e.preventDefault();\n                if (isPeeking()) commitPeek();\n                else openSelected(false);\n                break;\n            }\n          }, \"onKeyboardNavigation\")\n        };\n      });\n      this.captureNativeView(viewId);\n    }\n  };\n  return __toCommonJS(plugin_exports);\n})();\n";

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

/**
 * The sub-page field, as collection.enableSubPages(true) appends it. Added
 * through the config rather than enableSubPages() so it lands in the same single
 * save as the view (see install()).
 */
const subPageField = (collectionGuid) => ({
	id: 'parent_page', label: 'Sub-page of', many: false, read_only: false,
	active: true, type: 'record', filter_colguid: collectionGuid,
});

const SUBPAGE = 'parent_page';

/**
 * The canonical position field: siblings are ordered by it, and the view's
 * rearranging keys write it. The view finds it by id through the Outline view's
 * opts.order_field_id, so a rename doesn't unbind it. Field ids look like the
 * app's own: "f" + 14 characters of Crockford base32.
 */
const ORDER_LABEL = 'Order';
const newFieldId = () => {
	const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
	const bytes = crypto.getRandomValues(new Uint8Array(14));
	return 'f' + Array.from(bytes, b => alphabet[b % 32]).join('');
};
const orderFieldEntry = (id) => ({
	id, label: ORDER_LABEL, icon: 'ti-list-tree',
	many: false, read_only: false, active: true, type: 'number',
});
// Cycle guard. Only setSubPageOf() refuses cycles; an MCP or Markdown Mirror
// edit to "Sub-page of" goes through the app's raw property write, which doesn't.
const MAX_DEPTH = 100;
const ROOT_CLASS = 'hier-crumbs';
const ACTIONS_CLASS = 'hier-actions';
const STYLE_ID = 'hier-style';
const PICKER_ID = 'hier-picker';

const CSS = `
.panel-context-row:has(.${ROOT_CLASS}) .panel-context-pill { flex-shrink: 0; }
.${ROOT_CLASS} { display: flex; align-items: center; flex: 1 1 auto; min-width: 0; overflow: hidden; }
.${ROOT_CLASS} .hier-sep { flex: none; opacity: .45; padding: 0 1px; font-size: 13px; }
.${ROOT_CLASS} .hier-crumb { display: inline-flex; flex: 0 1 auto; min-width: 3.5em; max-width: 14em; }
.${ROOT_CLASS} .hier-crumb.is-more { flex: none; min-width: 0; }
.${ROOT_CLASS} .hier-crumb > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.hier-menu { position: fixed; z-index: 10000; min-width: 220px; max-width: 420px; padding: 4px;
	background: var(--cmdpal-bg-color, var(--bg-color, #222)); border: 1px solid rgba(127,127,127,.25);
	border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,.4); }
.hier-menu button { display: block; width: 100%; text-align: left; white-space: nowrap; overflow: hidden;
	text-overflow: ellipsis; padding: 5px 8px; }
.${ACTIONS_CLASS} { display: none; }
#${PICKER_ID} { position: fixed; inset: 0; z-index: 10000; display: flex; justify-content: center;
	align-items: flex-start; padding-top: 12vh; background: rgba(0,0,0,.25); }
#${PICKER_ID} .hier-box { width: min(640px, 92vw); background: var(--cmdpal-bg-color, var(--bg-color, #222));
	color: inherit; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,.45); overflow: hidden;
	border: 1px solid rgba(127,127,127,.25); }
#${PICKER_ID} .hier-head { padding: 10px 14px 0; font-size: 12px; opacity: .6; }
#${PICKER_ID} input { width: 100%; box-sizing: border-box; padding: 10px 14px; font: inherit; font-size: 15px;
	background: transparent; color: inherit; border: 0; outline: 0; border-bottom: 1px solid rgba(127,127,127,.25); }
#${PICKER_ID} .hier-list { max-height: 50vh; overflow-y: auto; }
#${PICKER_ID} .hier-opt { padding: 6px 14px; cursor: pointer; }
#${PICKER_ID} .hier-opt.is-sel { background: var(--cmdpal-selected-bg-color, rgba(127,127,127,.2)); }
#${PICKER_ID} .hier-opt-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#${PICKER_ID} .hier-opt-path { font-size: 12px; opacity: .55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#${PICKER_ID} .hier-empty { padding: 10px 14px; opacity: .55; }
`;

/** The view entry install() writes. Uninstall removes only views matching isOurView(). */
const VIEW_ENTRY = {
	id: 'outline', label: 'Outline', type: 'custom',
	icon: 'ti-list-tree', shown: true, description: '', query: '',
	read_only: false, opts: {}, field_ids: ['title'],
	group_by_field_id: null, sort_field_id: 'title', sort_dir: 'asc',
};

/** Ours if it has the id or label install() writes (a renamed view keeps its id). */
const isOurView = (v) => v.type === 'custom'
	&& (v.id === VIEW_ENTRY.id || v.label === VIEW_ENTRY.label);

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
		this.loadHierarchy();
	}

	onUnload() {
		clearTimeout(this._timer);
		for (const id of this._handlers || []) this.events.off(id);
		for (const obs of this._observers?.values() || []) obs.disconnect();
		document.querySelectorAll(`.${ROOT_CLASS}, .${ACTIONS_CLASS}, #${PICKER_ID}, .hier-menu`).forEach((n) => n.remove());
		document.getElementById(STYLE_ID)?.remove();
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

	/** Whether every Outline view is bound to an active number field (opts.order_field_id). */
	hasOrder(api) {
		const fields = api.getConfiguration().fields || [];
		const views = this.ourViews(api);
		return views.length > 0 && views.every(v => fields.some(f => f.id === (v.opts && v.opts.order_field_id)
			&& f.type === 'number' && f.active !== false));
	}

	customViews(api) {
		return (api.getConfiguration().views || []).filter(v => v.type === 'custom');
	}

	ourViews(api) {
		return (api.getConfiguration().views || []).filter(isOurView);
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
		return {
			guid: api.getGuid(),
			name: api.getName(),
			subPages: this.hasSubPages(api),
			ours: this.ourViews(api).length,
			ordered: this.hasOrder(api),
			code: this.codeState(api),
		};
	}

	// --- actions ------------------------------------------------------------

	/**
	 * Brings a collection to: sub-pages on, an Order property, one Outline view
	 * sorted by it and bound to it (opts.order_field_id), the current code.
	 * Running it twice changes nothing the second time.
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
		let changed = false;
		if (!this.hasSubPages(api)) {
			log('Turning on sub-pages...');
			// An archived field is reactivated in place: enableSubPages(false)
			// deletes the field outright, so this is only a hand-edited config.
			const old = (conf.fields || []).find(f => f.id === SUBPAGE);
			if (old) old.active = true;
			else conf.fields = (conf.fields || []).concat([subPageField(guid)]);
			changed = true;
		}
		// The Order field: the one an Outline view is bound to, else an existing
		// number field named Order (reactivated if archived, so its values come
		// back), else a new one.
		const fields = conf.fields || [];
		const bound = this.ourViews(api).map(v => v.opts && v.opts.order_field_id).find(Boolean);
		let order = fields.find(f => f.id === bound && f.type === 'number')
			|| fields.find(f => f.type === 'number' && (f.label || '').trim().toLowerCase() === ORDER_LABEL.toLowerCase());
		if (!order) {
			log(`Adding the ${ORDER_LABEL} property...`);
			const taken = new Set(fields.map(f => f.id));
			let id;
			do id = newFieldId(); while (taken.has(id));
			order = orderFieldEntry(id);
			conf.fields = fields.concat([order]);
			changed = true;
		} else if (order.active === false) {
			log(`Restoring the ${order.label} property...`);
			order.active = true;
			changed = true;
		}

		if (!this.ourViews(api).length) {
			log(`Adding the Outline view, sorted by ${order.label}...`);
			const taken = new Set((conf.views || []).map(v => v.id));
			let id = VIEW_ENTRY.id;
			for (let n = 2; taken.has(id); n++) id = `${VIEW_ENTRY.id}${n}`;
			conf.views = (conf.views || []).concat([Object.assign({}, VIEW_ENTRY, {
				id, sort_field_id: order.id, sort_dir: 'asc', opts: { order_field_id: order.id },
			})]);
			changed = true;
		} else {
			// An Outline view from before the Order binding: bind it, leaving its
			// sort alone (the user may have chosen one).
			for (const v of conf.views.filter(isOurView)) {
				if (v.opts && v.opts.order_field_id === order.id) continue;
				log(`Binding the Outline view to ${order.label}...`);
				v.opts = Object.assign({}, v.opts, { order_field_id: order.id });
				changed = true;
			}
		}

		// Every config change goes in ONE save. Writes are not readable in the same
		// tick, so appending the sub-page field and then re-reading the config
		// returns the copy from BEFORE it — saving that back silently drops the
		// field again, which is exactly how a collection ends up with the view
		// installed and no nesting.
		if (changed) {
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
		this.buildIndex();
	}

	/**
	 * Removes the view. Leaves the code alone unless it is exactly ours, and
	 * never touches the nesting or Order properties — they hold the data.
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
		log('Sub-pages and the Order property are untouched.');
		this.buildIndex();
	}

	// --- hierarchy: breadcrumb and page commands -----------------------------

	loadHierarchy() {
		this._handlers = [];
		this._observers = new Map(); // panel id → MutationObserver
		this._timer = 0;
		this._index = new Map(); // record guid → collection guid, for collections with an Outline view

		if (!document.getElementById(STYLE_ID)) {
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = CSS;
			document.head.appendChild(style);
		}

		const commands = [
			['show', 'Show this page', 'ti-list-tree', () => this.openOutline()],
			['newchild', 'New child page…', 'ti-plus', () => this.newPage('child')],
			['newsibling', 'New sibling page…', 'ti-plus', () => this.newPage('sibling')],
			['move', 'Move page under…', 'ti-arrows-move', () => this.moveUnder()],
		];
		// Each also gets a hidden <button data-action="plugin.outline<id>"> in every
		// panel showing a hierarchy page, so it can be bound in "Change Keyboard Shortcuts".
		this._actions = commands.map(([id, , , run]) => [`plugin.outline${id}`, run]);
		for (const [, label, icon, run] of commands) {
			this.ui.addCommandPaletteCommand({ label: `Outline: ${label}`, icon, onSelected: run });
		}

		for (const ev of ['panel.navigated', 'panel.focused']) {
			this._handlers.push(this.events.on(ev, () => this.schedule()));
		}
		this._handlers.push(this.events.on('panel.closed', (ev) => {
			const id = ev.panel?.getId?.();
			this._observers.get(id)?.disconnect();
			this._observers.delete(id);
		}));
		// A rename or re-parent anywhere can change any crumb on screen.
		this._handlers.push(this.events.on('record.updated', () => this.schedule(), { collection: '*' }));
		for (const ev of ['record.created', 'record.moved']) {
			this._handlers.push(this.events.on(ev, (e) => this.onRecordPlaced(e), { collection: '*' }));
		}
		this.buildIndex();
	}

	/**
	 * A collection's hierarchy context: sub-pages on and an Outline view to open.
	 * Null otherwise.
	 */
	hierarchyOf(api) {
		if (!api || !this.hasSubPages(api)) return null;
		const view = this.ourViews(api)[0];
		return view ? { collection: api, viewId: view.id } : null;
	}

	/**
	 * The record's hierarchy context, or null. PluginRecord can't name its
	 * collection, so the index maps record → collection guid, and the collection
	 * is re-resolved every time (a held handle goes stale on any config write).
	 */
	context(record) {
		if (!record) return null;
		const guid = this._index.get(record.guid);
		return guid ? this.hierarchyOf(this.resolve(guid)) : null;
	}

	async buildIndex() {
		const index = new Map();
		for (const api of await this.data.getAllCollections()) {
			if (!this.hierarchyOf(api)) continue;
			for (const r of await api.getAllRecords()) index.set(r.guid, api.getGuid());
		}
		this._index = index;
		this.schedule();
	}

	onRecordPlaced(ev) {
		if (!ev.recordGuid) return;
		const guid = ev.collectionGuid;
		if (guid && this.hierarchyOf(this.resolve(guid))) this._index.set(ev.recordGuid, guid);
		else this._index.delete(ev.recordGuid);
		this.schedule();
	}

	parentOf(record) {
		return record.linkedRecord(SUBPAGE);
	}

	/** Ancestors, root first. */
	ancestors(record) {
		const chain = [];
		const seen = new Set([record.guid]);
		let parent = this.parentOf(record);
		while (parent && !seen.has(parent.guid) && chain.length < MAX_DEPTH) {
			seen.add(parent.guid);
			chain.unshift(parent);
			parent = this.parentOf(parent);
		}
		return chain;
	}

	schedule() {
		// A timer, not rAF: rAF stalls while the window is hidden or occluded.
		clearTimeout(this._timer);
		this._timer = setTimeout(() => this.renderCrumbs(), 30);
	}

	renderCrumbs() {
		for (const panel of this.ui.getPanels?.() ?? []) {
			let record = null, root = null;
			try { record = panel.getActiveRecord(); } catch {}
			try { root = panel.getElement(); } catch {}
			if (!root) continue;
			try {
				this.renderCrumb(panel, record, root, root.closest('.panel') ?? root);
			} catch (e) {
				console.warn('[outline]', e);
			}
		}
	}

	renderCrumb(panel, record, root, frame) {
		const ctx = this.context(record);
		const old = frame.querySelector(`.${ROOT_CLASS}`);
		const oldActions = root.querySelector(`.${ACTIONS_CLASS}`);
		if (!ctx) {
			old?.remove();
			oldActions?.remove();
			return;
		}
		this.observe(panel, frame);

		if (!oldActions) {
			const box = el('div', root);
			box.className = ACTIONS_CLASS;
			for (const [action, run] of this._actions) {
				const b = el('button', box);
				b.setAttribute('data-action', action);
				b.addEventListener('click', run);
			}
		}

		const ancestors = this.ancestors(record);
		const key = record.guid + '|' + ancestors.map((a) => a.guid + ':' + (a.getName() ?? '')).join('|');
		if (old && old.dataset.key === key && old.isConnected) return;

		const host = frame.querySelector('.panel-context-row');
		if (!host) return;
		const crumbs = el('span');
		crumbs.className = ROOT_CLASS;
		crumbs.dataset.key = key;
		// One line: root › … › last two. The header can't grow, so the middle folds into a menu.
		const hidden = ancestors.length > 3 ? ancestors.slice(1, -2) : [];
		const shown = hidden.length ? [ancestors[0], null, ...ancestors.slice(-2)] : ancestors;
		for (const a of shown) {
			const sep = el('span', crumbs);
			sep.className = 'hier-sep ti ti-chevron-right';
			const crumb = el('button', crumbs);
			crumb.type = 'button';
			crumb.className = 'button-minimal button-small hier-crumb' + (a ? '' : ' is-more');
			el('span', crumb, a ? a.getName() || 'Untitled' : '…');
			crumb.title = a ? a.getName() ?? '' : hidden.map((h) => h.getName()).join(' › ');
			crumb.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (a) this.openPage(panel, a.guid, e.metaKey || e.ctrlKey);
				else this.crumbMenu(crumb, hidden, panel);
			});
		}
		old?.remove();
		host.appendChild(crumbs);
	}

	/** Dropdown of the folded middle ancestors, under the "…" crumb. */
	crumbMenu(anchor, records, panel) {
		document.querySelector('.hier-menu')?.remove();
		const menu = el('div');
		menu.className = 'hier-menu';
		records.forEach((r, i) => {
			const b = el('button', menu, r.getName() || 'Untitled');
			b.type = 'button';
			b.className = 'button-minimal button-small';
			b.style.paddingLeft = `${8 + i * 12}px`;
			b.title = r.getName() ?? '';
			b.addEventListener('click', (e) => {
				close();
				this.openPage(panel, r.guid, e.metaKey || e.ctrlKey);
			});
		});
		const rect = anchor.getBoundingClientRect();
		menu.style.left = `${rect.left}px`;
		menu.style.top = `${rect.bottom + 4}px`;
		const close = () => {
			menu.remove();
			document.removeEventListener('mousedown', outside, true);
			document.removeEventListener('keydown', esc, true);
		};
		const outside = (e) => { if (!menu.contains(e.target)) close(); };
		const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
		document.addEventListener('mousedown', outside, true);
		document.addEventListener('keydown', esc, true);
		document.body.appendChild(menu);
	}

	/** Thymer re-renders the title area on its own schedule; put the crumb back when it drops. */
	observe(panel, frame) {
		const id = panel.getId();
		if (this._observers.has(id)) return;
		const obs = new MutationObserver(() => {
			const crumbs = frame.querySelector(`.${ROOT_CLASS}`);
			if (!crumbs || !crumbs.isConnected) this.schedule();
		});
		obs.observe(frame, { childList: true, subtree: true });
		this._observers.set(id, obs);
	}

	async openPage(panel, guid, aside) {
		let target = panel;
		if (aside) target = (await this.ui.createPanel({ afterPanel: panel })) ?? panel;
		target.navigateTo({ type: 'edit_panel', rootId: guid, subId: null, workspaceGuid: this.getWorkspaceGuid() });
		if (aside) this.ui.setActivePanel(target);
	}

	/** The active panel's page and its hierarchy context, or null (with a toast). */
	activePage() {
		const panel = this.ui.getActivePanel();
		const record = panel?.getActiveRecord() ?? null;
		const ctx = this.context(record);
		if (!ctx) {
			this.toast('This page isn\'t in a collection with an Outline view.');
			return null;
		}
		return { panel, record, ctx };
	}

	toast(message) {
		this.ui.addToaster({ title: 'Outline', message, dismissible: true, autoDestroyTime: 3500 });
	}

	async newPage(kind) {
		const a = this.activePage();
		if (!a) return;
		const parent = kind === 'child' ? a.record : this.parentOf(a.record);
		const where = parent ? `under ${parent.getName() || 'Untitled'}` : 'at the top level';
		const title = await this.prompt(`New page ${where}`);
		if (!title) return;
		const guid = a.ctx.collection.createRecord(title);
		if (!guid) return;
		// A record created this tick isn't readable yet; wait for it before the write.
		let record = null;
		for (let i = 0; i < 30; i++) {
			record = (await a.ctx.collection.getAllRecords()).find((r) => r.guid === guid);
			if (record) break;
			await new Promise((r) => setTimeout(r, 100));
		}
		if (record && parent) record.setSubPageOf(parent.guid);
		this.openPage(a.panel, guid, false);
	}

	async moveUnder() {
		const a = this.activePage();
		if (!a) return;
		const all = await a.ctx.collection.getAllRecords();
		// Its own subtree is off limits: moving under a descendant makes a cycle,
		// which setSubPageOf() would refuse anyway.
		const kids = new Map();
		for (const r of all) {
			const p = this.parentOf(r)?.guid;
			if (p) (kids.get(p) ?? kids.set(p, []).get(p)).push(r.guid);
		}
		const banned = new Set();
		const stack = [a.record.guid];
		while (stack.length) {
			const g = stack.pop();
			if (banned.has(g)) continue;
			banned.add(g);
			stack.push(...(kids.get(g) ?? []));
		}
		const current = this.parentOf(a.record)?.guid ?? null;
		const options = all
			.filter((r) => !banned.has(r.guid) && r.guid !== current)
			.map((r) => ({
				guid: r.guid,
				title: r.getName() || 'Untitled',
				path: this.ancestors(r).map((x) => x.getName() || 'Untitled').join(' › '),
			}));
		if (current) options.unshift({ guid: null, title: 'Top level', path: 'Remove the parent' });
		const pick = await this.pick(`Move "${a.record.getName() || 'Untitled'}" under…`, options);
		if (pick === undefined) return;
		a.record.setSubPageOf(pick);
		this.schedule();
	}

	/**
	 * Opens the collection's Outline view zoomed into this page: the view lists only
	 * this page's subtree, with the page's own row selected, ready for keyboard
	 * navigation (Thymer's Zoom Out key steps out to the siblings). The view runs as the collection's
	 * own plugin, so the request crosses over on <html data-outline-zoom> (see the
	 * view's takeZoomHandoff).
	 */
	openOutline() {
		const a = this.activePage();
		if (!a) return;
		const collection = a.ctx.collection.getGuid();
		document.documentElement.dataset.outlineZoom = JSON.stringify({ collection, guid: a.record.guid, at: Date.now() });
		a.panel.navigateTo({ type: 'overview', rootId: collection, subId: a.ctx.viewId, workspaceGuid: this.getWorkspaceGuid() });
	}

	/** Free-text prompt. Resolves to the trimmed text, or null on Escape / empty. */
	prompt(heading) {
		return this.overlay(heading, null).then((v) => (v === undefined ? null : v));
	}

	/** Fuzzy pick from [{guid, title, path}]. Resolves to the guid (null allowed), or undefined. */
	pick(heading, options) {
		return this.overlay(heading, options);
	}

	overlay(heading, options) {
		document.getElementById(PICKER_ID)?.remove();
		const prevFocus = document.activeElement;
		return new Promise((resolve) => {
			const wrap = el('div');
			wrap.id = PICKER_ID;
			const box = el('div', wrap);
			box.className = 'hier-box';
			el('div', box, heading).className = 'hier-head';
			const input = el('input', box);
			input.type = 'text';
			input.spellcheck = false;
			const list = el('div', box);
			list.className = 'hier-list';
			input.placeholder = options ? 'Search pages…' : 'Title';
			let shown = [];
			let sel = 0;

			// The nearest ancestors matter most, so long paths lose their root end.
			const tail = (path) => {
				const parts = path.split(' › ');
				let out = parts.pop() ?? '';
				while (parts.length && out.length + parts[parts.length - 1].length < 90) out = parts.pop() + ' › ' + out;
				return parts.length ? '… › ' + out : out;
			};
			const done = (value) => {
				wrap.remove();
				try { prevFocus?.focus?.(); } catch {}
				resolve(value);
			};
			const draw = () => {
				if (!options) return;
				const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
				const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const starts = terms.map((t) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(t)}`, 'iu'));
				shown = options.filter((o) => {
					const hay = (o.title + ' ' + o.path).toLowerCase();
					return terms.every((t) => hay.includes(t));
				});
				// Word-start hits in the title count most, then in the path; shallow before deep.
				const score = (o) => starts.reduce((n, re) => n + (re.test(o.title) ? 3 : re.test(o.path) ? 1 : 0), 0);
				for (const o of shown) o._score = score(o);
				shown.sort((x, y) => y._score - x._score || x.path.length - y.path.length);
				shown = shown.slice(0, 60);
				sel = Math.min(sel, Math.max(0, shown.length - 1));
				list.textContent = '';
				if (!shown.length) {
					el('div', list, 'No matches').className = 'hier-empty';
					return;
				}
				shown.forEach((o, i) => {
					const row = el('div', list);
					row.className = 'hier-opt' + (i === sel ? ' is-sel' : '');
					el('div', row, o.title).className = 'hier-opt-title';
					el('div', row, tail(o.path) || 'Top level').className = 'hier-opt-path';
					row.addEventListener('mousedown', (e) => {
						e.preventDefault();
						done(o.guid);
					});
				});
				list.children[sel]?.scrollIntoView({ block: 'nearest' });
			};

			input.addEventListener('input', () => { sel = 0; draw(); });
			input.addEventListener('keydown', (e) => {
				e.stopPropagation();
				if (e.key === 'Escape') { e.preventDefault(); done(undefined); }
				else if (e.key === 'Enter') {
					e.preventDefault();
					if (!options) done(input.value.trim() || undefined);
					else if (shown[sel]) done(shown[sel].guid);
				} else if (options && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
					e.preventDefault();
					sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(1, shown.length);
					draw();
				}
			});
			wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) done(undefined); });
			document.body.appendChild(wrap);
			draw();
			input.focus();
		});
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
		const sub = el('p', wrap, 'Pick a collection. Installing turns on sub-pages, adds an Order property and an Outline view sorted by it, and writes the view code.');
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
		bits.push(s.subPages ? 'sub-pages on' : 'sub-pages off');
		bits.push(s.ours ? 'Outline view' : 'no Outline view');
		if (s.ours && !s.ordered) bits.push('no Order property');
		bits.push(s.code === 'current' ? 'view installed'
			: s.code === 'outdated' ? 'older version installed'
			: s.code === 'free' ? 'plugin slot empty'
			: 'has other plugin code');
		const meta = el('div', left, bits.join(' \u00b7 '));
		meta.style.cssText = 'font-size:12px;opacity:.7;margin-top:2px;';

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
		const complete = present && s.subPages && s.ordered && s.code === 'current';

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

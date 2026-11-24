"use strict";
var plugins = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // global/plugin.js
  var plugin_exports = {};
  __export(plugin_exports, {
    Plugin: () => Plugin
  });

  // view.js
  var DATE_FORMAT = new Intl.DateTimeFormat(void 0, { year: "numeric", month: "short", day: "numeric" });
  var SUBPAGE = "parent_page";
  var isOutlineView = /* @__PURE__ */ __name((v) => v.type === "custom" && (!(v.opts && v.opts.kind) || v.opts.kind === "outline"), "isOutlineView");
  var OUTLINE_SIGNATURE = "registerOutlineViews";
  var subPagesOn = /* @__PURE__ */ __name((config) => (config.fields || []).some((f) => f.id === SUBPAGE && f.active !== false), "subPagesOn");
  var MAX_DEPTH = 100;
  function* ancestorsOf(record, fieldId) {
    const seen = /* @__PURE__ */ new Set([record.guid]);
    for (let parent = record.linkedRecord(fieldId); parent && !seen.has(parent.guid) && seen.size <= MAX_DEPTH; parent = parent.linkedRecord(fieldId)) {
      seen.add(parent.guid);
      yield parent;
    }
  }
  __name(ancestorsOf, "ancestorsOf");
  function subtreeRecords(records, root, fieldId) {
    const children = /* @__PURE__ */ new Map();
    for (const r of records) {
      const parent = r.linkedRecord(fieldId);
      if (!parent) continue;
      if (!children.has(parent.guid)) children.set(parent.guid, []);
      children.get(parent.guid).push(r);
    }
    const subtree = [root];
    const seen = /* @__PURE__ */ new Set([root.guid]);
    for (let i = 0; i < subtree.length; i++) {
      for (const c of children.get(subtree[i].guid) || []) {
        if (!seen.has(c.guid)) {
          seen.add(c.guid);
          subtree.push(c);
        }
      }
    }
    return subtree;
  }
  __name(subtreeRecords, "subtreeRecords");
  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
  var KBD_SLOT = (IS_MAC ? "mac" : "win") + (window.thymerDesktopAPI ? "_electron" : "_web");
  var ACTIONS = {
    "nav.togglefold": { mac: "Meta+/", win: "Ctrl+/", hint: "Fold", run: /* @__PURE__ */ __name((v) => v.fold("item", "toggle"), "run") },
    "nav.togglefolddescendants": { mac: "Meta+Shift+?", win: "Ctrl+Shift+?", hint: "Fold descendants", run: /* @__PURE__ */ __name((v) => v.fold("descendants", "toggle"), "run") },
    "nav.foldchildren": { mac: "Meta+,", win: "Ctrl+,", run: /* @__PURE__ */ __name((v) => v.fold("children", "fold"), "run") },
    "nav.unfoldchildren": { mac: "Meta+.", win: "Ctrl+.", run: /* @__PURE__ */ __name((v) => v.fold("children", "unfold"), "run") },
    "nav.foldcascade": { mac: "Meta+Shift+,", win: "Ctrl+Shift+<", run: /* @__PURE__ */ __name((v) => v.foldCascade(), "run") },
    "nav.unfoldcascade": { mac: "Meta+Shift+.", win: "Ctrl+Shift+>", run: /* @__PURE__ */ __name((v) => v.unfoldCascade(), "run") },
    "panel.zoom_out": { mac: "Alt+ArrowUp", win: "Alt+ArrowUp", hint: "Zoom out", run: /* @__PURE__ */ __name((v) => v.zoomOut(), "run") },
    "panel.zoom_in": { mac: "Alt+ArrowDown", win: "Alt+ArrowDown", hint: "Zoom", run: /* @__PURE__ */ __name((v) => v.zoomIn(), "run") },
    "collection.trash_record": { mac: "Meta+Backspace", win: "Ctrl+Delete", hint: "Trash", run: /* @__PURE__ */ __name((v) => v.trash(), "run") },
    "plugin.outlinehints": { mac: "Shift+?", win: "Shift+?", run: /* @__PURE__ */ __name((v) => v.pageHints(), "run") },
    "nav.unfolddescendants": { run: /* @__PURE__ */ __name((v) => v.fold("descendants", "unfold"), "run") },
    "nav.folddescendants": { run: /* @__PURE__ */ __name((v) => v.fold("descendants", "fold"), "run") },
    "nav.togglefoldchildren": { hint: "Fold children", run: /* @__PURE__ */ __name((v) => v.fold("children", "toggle"), "run") },
    "nav.foldcontainer": { run: /* @__PURE__ */ __name((v) => v.fold("all", "fold"), "run") },
    "nav.unfoldcontainer": { run: /* @__PURE__ */ __name((v) => v.fold("all", "unfold"), "run") },
    "nav.togglefoldcontainer": { hint: "Fold all", run: /* @__PURE__ */ __name((v) => v.fold("all", "toggle"), "run") }
  };
  var DEFAULT_KEYS = Object.fromEntries(Object.entries(ACTIONS).map(([action, def]) => [action, (IS_MAC ? def.mac : def.win) || ""]));
  var SHIFTED_CODE_KEYS = {
    Minus: "_",
    Equal: "+",
    BracketLeft: "{",
    BracketRight: "}",
    Semicolon: ":",
    Quote: '"',
    Backquote: "~",
    Backslash: "|",
    Comma: "<",
    Period: ">",
    Slash: "?"
  };
  var SHIFTED_CHARS = /* @__PURE__ */ new Set([...Object.values(SHIFTED_CODE_KEYS), ...")!@#$%^&*("]);

  // global/dist/collection-code.txt
  var collection_code_default = '"use strict";\nvar plugins = (() => {\n  var __defProp = Object.defineProperty;\n  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;\n  var __getOwnPropNames = Object.getOwnPropertyNames;\n  var __hasOwnProp = Object.prototype.hasOwnProperty;\n  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });\n  var __export = (target, all) => {\n    for (var name in all)\n      __defProp(target, name, { get: all[name], enumerable: true });\n  };\n  var __copyProps = (to, from, except, desc) => {\n    if (from && typeof from === "object" || typeof from === "function") {\n      for (let key of __getOwnPropNames(from))\n        if (!__hasOwnProp.call(to, key) && key !== except)\n          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });\n    }\n    return to;\n  };\n  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);\n\n  // collection/plugin.js\n  var plugin_exports = {};\n  __export(plugin_exports, {\n    Plugin: () => Plugin\n  });\n\n  // view.js\n  var ENUM_COLORS = [\n    "red",\n    "orange",\n    "green",\n    "cyan",\n    "blue",\n    "purple",\n    "pink",\n    "fuchsia",\n    "rose",\n    "stone",\n    "teal",\n    "sky",\n    "indigo",\n    "zinc",\n    "yellow"\n  ];\n  var MODIFIED = "updated_at";\n  var CREATED = "created_at";\n  var DATE_FORMAT = new Intl.DateTimeFormat(void 0, { year: "numeric", month: "short", day: "numeric" });\n  function timeAgo(date) {\n    if (!date) return "";\n    const seconds = Math.floor((Date.now() - date.getTime()) / 1e3);\n    if (seconds < 60) return "just now";\n    const minutes = Math.floor(seconds / 60);\n    if (minutes < 60) return `${minutes}m ago`;\n    const hours = Math.floor(minutes / 60);\n    if (hours < 24) return `${hours}h ago`;\n    const days = Math.floor(hours / 24);\n    if (days < 30) return `${days}d ago`;\n    const months = Math.floor(days / 30);\n    if (months < 12) return `${months}mo ago`;\n    return `${Math.floor(months / 12)}y ago`;\n  }\n  __name(timeAgo, "timeAgo");\n  function withAncestors(records, parentFieldId) {\n    const byGuid = new Map(records.map((record) => [record.guid, record]));\n    const added = /* @__PURE__ */ new Set();\n    if (parentFieldId) {\n      records.forEach((record) => {\n        for (const parent of ancestorsOf(record, parentFieldId)) {\n          if (byGuid.has(parent.guid)) break;\n          byGuid.set(parent.guid, parent);\n          added.add(parent.guid);\n        }\n      });\n    }\n    return { records: Array.from(byGuid.values()), added };\n  }\n  __name(withAncestors, "withAncestors");\n  function buildHierarchy(records, parentFieldId) {\n    const nodes = /* @__PURE__ */ new Map();\n    records.forEach((record) => {\n      const parent = parentFieldId ? record.linkedRecord(parentFieldId) : null;\n      nodes.set(record.guid, {\n        id: record.guid,\n        name: record.getName() || "Unknown",\n        parentGuid: parent ? parent.guid : null,\n        record,\n        children: []\n      });\n    });\n    const rootNodes = [];\n    nodes.forEach((node) => {\n      if (node.parentGuid && nodes.has(node.parentGuid)) {\n        nodes.get(node.parentGuid).children.push(node);\n      } else {\n        rootNodes.push(node);\n      }\n    });\n    const reachable = /* @__PURE__ */ new Set();\n    const walk = /* @__PURE__ */ __name((node) => {\n      if (reachable.has(node.id)) return;\n      reachable.add(node.id);\n      node.children.forEach(walk);\n    }, "walk");\n    rootNodes.forEach(walk);\n    nodes.forEach((node) => {\n      if (!reachable.has(node.id)) {\n        const parent = nodes.get(node.parentGuid);\n        if (parent) {\n          parent.children = parent.children.filter((c) => c !== node);\n        }\n        rootNodes.push(node);\n        walk(node);\n      }\n    });\n    return { nodes, rootNodes };\n  }\n  __name(buildHierarchy, "buildHierarchy");\n  var SUBPAGE = "parent_page";\n  var isOutlineView = /* @__PURE__ */ __name((v) => v.type === "custom" && (!(v.opts && v.opts.kind) || v.opts.kind === "outline"), "isOutlineView");\n  var subPagesOn = /* @__PURE__ */ __name((config) => (config.fields || []).some((f) => f.id === SUBPAGE && f.active !== false), "subPagesOn");\n  var MAX_DEPTH = 100;\n  function* ancestorsOf(record, fieldId) {\n    const seen = /* @__PURE__ */ new Set([record.guid]);\n    for (let parent = record.linkedRecord(fieldId); parent && !seen.has(parent.guid) && seen.size <= MAX_DEPTH; parent = parent.linkedRecord(fieldId)) {\n      seen.add(parent.guid);\n      yield parent;\n    }\n  }\n  __name(ancestorsOf, "ancestorsOf");\n  function subtreeRecords(records, root, fieldId) {\n    const children = /* @__PURE__ */ new Map();\n    for (const r of records) {\n      const parent = r.linkedRecord(fieldId);\n      if (!parent) continue;\n      if (!children.has(parent.guid)) children.set(parent.guid, []);\n      children.get(parent.guid).push(r);\n    }\n    const subtree = [root];\n    const seen = /* @__PURE__ */ new Set([root.guid]);\n    for (let i = 0; i < subtree.length; i++) {\n      for (const c of children.get(subtree[i].guid) || []) {\n        if (!seen.has(c.guid)) {\n          seen.add(c.guid);\n          subtree.push(c);\n        }\n      }\n    }\n    return subtree;\n  }\n  __name(subtreeRecords, "subtreeRecords");\n  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);\n  var KBD_SLOT = (IS_MAC ? "mac" : "win") + (window.thymerDesktopAPI ? "_electron" : "_web");\n  var ACTIONS = {\n    "nav.togglefold": { mac: "Meta+/", win: "Ctrl+/", hint: "Fold", run: /* @__PURE__ */ __name((v) => v.fold("item", "toggle"), "run") },\n    "nav.togglefolddescendants": { mac: "Meta+Shift+?", win: "Ctrl+Shift+?", hint: "Fold descendants", run: /* @__PURE__ */ __name((v) => v.fold("descendants", "toggle"), "run") },\n    "nav.foldchildren": { mac: "Meta+,", win: "Ctrl+,", run: /* @__PURE__ */ __name((v) => v.fold("children", "fold"), "run") },\n    "nav.unfoldchildren": { mac: "Meta+.", win: "Ctrl+.", run: /* @__PURE__ */ __name((v) => v.fold("children", "unfold"), "run") },\n    "nav.foldcascade": { mac: "Meta+Shift+,", win: "Ctrl+Shift+<", run: /* @__PURE__ */ __name((v) => v.foldCascade(), "run") },\n    "nav.unfoldcascade": { mac: "Meta+Shift+.", win: "Ctrl+Shift+>", run: /* @__PURE__ */ __name((v) => v.unfoldCascade(), "run") },\n    "panel.zoom_out": { mac: "Alt+ArrowUp", win: "Alt+ArrowUp", hint: "Zoom out", run: /* @__PURE__ */ __name((v) => v.zoomOut(), "run") },\n    "panel.zoom_in": { mac: "Alt+ArrowDown", win: "Alt+ArrowDown", hint: "Zoom", run: /* @__PURE__ */ __name((v) => v.zoomIn(), "run") },\n    "collection.trash_record": { mac: "Meta+Backspace", win: "Ctrl+Delete", hint: "Trash", run: /* @__PURE__ */ __name((v) => v.trash(), "run") },\n    "plugin.outlinehints": { mac: "Shift+?", win: "Shift+?", run: /* @__PURE__ */ __name((v) => v.pageHints(), "run") },\n    "nav.unfolddescendants": { run: /* @__PURE__ */ __name((v) => v.fold("descendants", "unfold"), "run") },\n    "nav.folddescendants": { run: /* @__PURE__ */ __name((v) => v.fold("descendants", "fold"), "run") },\n    "nav.togglefoldchildren": { hint: "Fold children", run: /* @__PURE__ */ __name((v) => v.fold("children", "toggle"), "run") },\n    "nav.foldcontainer": { run: /* @__PURE__ */ __name((v) => v.fold("all", "fold"), "run") },\n    "nav.unfoldcontainer": { run: /* @__PURE__ */ __name((v) => v.fold("all", "unfold"), "run") },\n    "nav.togglefoldcontainer": { hint: "Fold all", run: /* @__PURE__ */ __name((v) => v.fold("all", "toggle"), "run") }\n  };\n  var DEFAULT_KEYS = Object.fromEntries(Object.entries(ACTIONS).map(([action, def]) => [action, (IS_MAC ? def.mac : def.win) || ""]));\n  var KEY_MODIFIERS = ["Meta", "Ctrl", "Alt", "Shift"];\n  var NAMED_KEYS = [\n    "Escape",\n    "Enter",\n    "Tab",\n    "Space",\n    "Backspace",\n    "Delete",\n    "ArrowUp",\n    "ArrowDown",\n    "ArrowLeft",\n    "ArrowRight",\n    "Home",\n    "End",\n    "PageUp",\n    "PageDown",\n    "F1",\n    "F2",\n    "F3",\n    "F4",\n    "F5",\n    "F6",\n    "F7",\n    "F8",\n    "F9",\n    "F10",\n    "F11",\n    "F12",\n    "NumpadEnter",\n    "Insert"\n  ];\n  function normalizeKey(s) {\n    const parts = s.split("+").map((p) => p.trim());\n    if (parts.some((p) => !p)) return null;\n    const mods = /* @__PURE__ */ new Set();\n    for (const p of parts.slice(0, -1)) {\n      const m = KEY_MODIFIERS.find((k) => k.toLowerCase() === p.toLowerCase());\n      if (!m) return null;\n      mods.add(m);\n    }\n    let key = parts[parts.length - 1];\n    if (/\\p{So}/u.test(key)) return null;\n    if (key.length === 1) key = key.toUpperCase();\n    else key = { copy: "C", cut: "X", paste: "V" }[key.toLowerCase()] || NAMED_KEYS.find((k) => k.toLowerCase() === key.toLowerCase());\n    return key ? [...KEY_MODIFIERS.filter((m) => mods.has(m)), key].join("+") : null;\n  }\n  __name(normalizeKey, "normalizeKey");\n  var CODE_KEYS = {\n    Minus: "-",\n    Equal: "=",\n    BracketLeft: "[",\n    BracketRight: "]",\n    Semicolon: ";",\n    Quote: "\'",\n    Backquote: "`",\n    Backslash: "\\\\",\n    Comma: ",",\n    Period: ".",\n    Slash: "/"\n  };\n  var SHIFTED_CODE_KEYS = {\n    Minus: "_",\n    Equal: "+",\n    BracketLeft: "{",\n    BracketRight: "}",\n    Semicolon: ":",\n    Quote: \'"\',\n    Backquote: "~",\n    Backslash: "|",\n    Comma: "<",\n    Period: ">",\n    Slash: "?"\n  };\n  function eventKeyName(e) {\n    if (e.isComposing || e.key === "Dead") return "";\n    const mods = (e.metaKey ? "Meta+" : "") + (e.ctrlKey ? "Ctrl+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "");\n    if (e.code === "BracketLeft") return mods + "[";\n    if (e.code === "BracketRight") return mods + "]";\n    if (e.code === "Space") return mods + "Space";\n    if (!e.key || e.key.length !== 1) return mods + e.key;\n    const c = e.key.charCodeAt(0);\n    if (c >= 32 && c <= 126) return mods + e.key.toUpperCase();\n    let k = /^Key([A-Z])$/.exec(e.code)?.[1];\n    const digit = /^Digit(\\d)$/.exec(e.code)?.[1];\n    if (digit) k = e.shiftKey ? ")!@#$%^&*("[Number(digit)] : digit;\n    k ??= (e.shiftKey ? SHIFTED_CODE_KEYS : CODE_KEYS)[e.code];\n    return mods + (k || e.key.toUpperCase());\n  }\n  __name(eventKeyName, "eventKeyName");\n  function parseShortcuts(source) {\n    const entries = [];\n    if (/^\\{\\s*\\}$/.test(source.trim())) return entries;\n    for (const raw of source.split("\\n")) {\n      const line = raw.trim();\n      if (!line || line.startsWith("//") || line === "{" || line === "}") continue;\n      const m = line.match(/^(?:"(?<action>[^"]*)"|\'(?<action>[^\']*)\')\\s*:\\s*(?:"(?<key>[^"]*)"|\'(?<key>[^\']*)\')\\s*,?/);\n      const rest = m && line.slice(m[0].length).trim();\n      if (!m || rest && !rest.startsWith("//")) return null;\n      const { action, key } = m.groups;\n      if (!action && !key) return null;\n      if (action && !action.includes(".")) return null;\n      const normalized = key ? normalizeKey(key) : "";\n      if (normalized === null) return null;\n      entries.push({ action: action.toLowerCase(), key: normalized });\n    }\n    return entries;\n  }\n  __name(parseShortcuts, "parseShortcuts");\n  var internalsChecked = false;\n  var internalsWaits = 0;\n  function accountShortcuts() {\n    let root = window.g_focusedComponent;\n    while (root?.parent) root = root.parent;\n    const user = root?.sideBar?.activeUser;\n    if (!user) return void 0;\n    const settings = user.acct_json;\n    return settings && typeof settings === "object" ? settings.kbd || {} : null;\n  }\n  __name(accountShortcuts, "accountShortcuts");\n  var keymapSource = null;\n  var keymap = null;\n  function foldKeymap() {\n    const source = accountShortcuts()?.[KBD_SLOT] || "";\n    if (keymap && source === keymapSource) return keymap;\n    const keys = { ...DEFAULT_KEYS };\n    for (const { action, key } of parseShortcuts(source) || []) {\n      if (key) {\n        for (const a in keys) if (keys[a] === key && a !== action) keys[a] = "";\n      }\n      if (action in keys) keys[action] = key;\n    }\n    const byKey = /* @__PURE__ */ new Map();\n    for (const a in keys) if (keys[a]) byKey.set(keys[a], a);\n    keymapSource = source;\n    keymap = { keys, byKey };\n    return keymap;\n  }\n  __name(foldKeymap, "foldKeymap");\n  var KEY_GLYPHS = {\n    Space: "Space",\n    ArrowRight: "\\u2192",\n    ArrowLeft: "\\u2190",\n    Escape: "Esc",\n    Enter: "\\u21B5",\n    Tab: "\\u21E5",\n    ArrowUp: "\\u2191",\n    ArrowDown: "\\u2193",\n    PageUp: "PgUp",\n    PageDown: "PgDn",\n    Delete: "Del",\n    Backspace: IS_MAC ? "\\u232B" : "Bksp"\n  };\n  var SHIFTED_CHARS = /* @__PURE__ */ new Set([...Object.values(SHIFTED_CODE_KEYS), ...")!@#$%^&*("]);\n  function keyLabel(key) {\n    if (!key) return "";\n    let parts = key.split("+");\n    const last = parts.pop();\n    if (SHIFTED_CHARS.has(last)) parts = parts.filter((m) => m !== "Shift");\n    const k = KEY_GLYPHS[last] || last;\n    if (!IS_MAC) return [...parts.map((m) => m === "Meta" ? "Ctrl" : m), k].join("+");\n    const glyph = { Meta: "\\u2318", Ctrl: "\\u2303", Alt: "\\u2325", Shift: "\\u21E7" };\n    return parts.map((m) => glyph[m]).join("") + k;\n  }\n  __name(keyLabel, "keyLabel");\n  var KBDMOD_GLYPHS = /* @__PURE__ */ new Set(["\\u232B", "\\u2326", "\\u21B5", "\\u21E7", "\\u2303", "\\u2325", "\\u2318", "\\u2192", "\\u2190", "\\u2191", "\\u2193", "\\u2195", "\\u2194", "\\u21E5"]);\n  function kbdHtml(text) {\n    const esc = { "&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;", "\'": "&#39;" };\n    return Array.from(text, (c) => KBDMOD_GLYPHS.has(c) ? `<span class="kbdmod ${IS_MAC ? "kbdmod-mac" : ""}">${c}</span>` : esc[c] || c).join("");\n  }\n  __name(kbdHtml, "kbdHtml");\n  var KEYS_BODY_CLASS = "plg-outline-keys";\n  function keyHints(mode, zoomed, itemName) {\n    const cmd = IS_MAC ? "\\u2318" : "Ctrl+";\n    const shift = IS_MAC ? "\\u21E7" : "Shift+";\n    const { keys } = foldKeymap();\n    const up = keys["nav.unfoldcascade"], down = keys["nav.foldcascade"];\n    const modsOf = /* @__PURE__ */ __name((k) => k.split("+").slice(0, -1).join("+"), "modsOf");\n    const cascade = up && down && modsOf(up) === modsOf(down) ? keyLabel(up) + keyLabel(down.split("+").pop()) : [up, down].filter(Boolean).map(keyLabel).join(" ");\n    const mono = "statusbar--kbd-modifier";\n    const hint = /* @__PURE__ */ __name((action, cls) => [keyLabel(keys[action]), ACTIONS[action].hint, cls], "hint");\n    const hints = mode === "peek" ? [\n      ["Esc", "Exit Peek", mono],\n      ["\\u21B5", "Open", mono],\n      ["\\u2195 \\u2194", "Browse", mono]\n    ] : mode === "props" ? [\n      ["\\u2195", "Previous / next property", mono],\n      ["\\u21B5", "Edit / save", mono],\n      ["Esc", "Exit", mono]\n    ] : mode === "field" ? [\n      ["\\u21B5", "Save", mono],\n      ["Esc", "Exit", mono]\n    ] : [\n      ["/", "Search", mono],\n      ["Space", "Peek", mono],\n      ["\\u21B5", "Open", mono],\n      ["R", "Rename", mono],\n      [`${cmd}\\u21B5`, "Open Aside", mono],\n      [`${shift}\\u21B5`, `Create ${itemName}`, mono],\n      [IS_MAC ? "\\u2325\\u21B5" : "Alt+\\u21B5", "Create Above", mono],\n      hint("collection.trash_record", mono),\n      ["E", "Edit", mono],\n      ["\\u21E5", "Indent", mono],\n      [`${shift}\\u21E5`, "Outdent", mono],\n      [`${cmd}${shift}\\u2191\\u2193`, "Reorder", mono],\n      hint("panel.zoom_in"),\n      ...zoomed ? [hint("panel.zoom_out")] : [],\n      hint("nav.togglefold"),\n      hint("nav.togglefoldchildren"),\n      hint("nav.togglefolddescendants"),\n      [cascade, "Fold level"],\n      hint("nav.togglefoldcontainer")\n    ];\n    return hints.filter(([k]) => k);\n  }\n  __name(keyHints, "keyHints");\n  function hintsHtml(hints) {\n    return hints.map(([k, label, cls]) => `<span class="statusbar-item${cls ? " " + cls : ""}"><span class="statusbar--kbd">${kbdHtml(k)}</span> <span class="statusbar--kbd-label">${label}</span></span>`).join("");\n  }\n  __name(hintsHtml, "hintsHtml");\n  var KeyHints = class {\n    static {\n      __name(this, "KeyHints");\n    }\n    constructor(ui) {\n      this.ui = ui;\n    }\n    dispose() {\n      document.body.classList.remove(KEYS_BODY_CLASS);\n      if (this.keysObserver) this.keysObserver.disconnect();\n      if (this.keysItem) this.keysItem.remove();\n      this.keysItem = this.keysObserver = null;\n    }\n    /**\n     * Show or hide the Outline key hints. A plugin can only APPEND status-bar\n     * items (they land on the right), so the hints are one item of ours,\n     * pinned over the left edge by CSS while the body class hides the app\'s\n     * own hints there. One item, shared by every view instance.\n     */\n    showKeyHints(on, mode = null, zoomed = false, itemName = "Page") {\n      const map = foldKeymap();\n      if (map !== this.keysMap) {\n        this.keysMap = map;\n        this.keysEpoch = (this.keysEpoch || 0) + 1;\n      }\n      document.body.classList.toggle(KEYS_BODY_CLASS, on);\n      if (!on) {\n        this.keysStart = 0;\n        return;\n      }\n      const state = `${mode}|${zoomed}|${itemName}|${this.keysEpoch}`;\n      if (!this.keysItem) {\n        this.keysItem = this.ui.addStatusBarItem({ htmlLabel: "" });\n        const $el = this.keysItem.getElement();\n        if ($el) {\n          $el.classList.add("outline-keys");\n          const $bar = $el.closest(".statusbar--status-bar");\n          const $right = $bar && $bar.querySelector(".statusbar--right");\n          if ($right) {\n            const fit = /* @__PURE__ */ __name(() => {\n              $el.style.right = `${$right.offsetWidth + 10}px`;\n              this.renderKeyHints();\n            }, "fit");\n            this.keysObserver = new ResizeObserver(fit);\n            this.keysObserver.observe($right);\n            this.keysObserver.observe($bar);\n          }\n        }\n      }\n      if (this.keysState !== state) {\n        this.keysState = state;\n        this.keysHints = keyHints(mode, zoomed, itemName);\n        this.keysStart = 0;\n        this.renderKeyHints();\n      }\n    }\n    /** The hint elements as laid out, or [] when the strip isn\'t showing. */\n    keyHintItems() {\n      const $el = this.keysItem && this.keysItem.getElement();\n      const $label = $el && $el.querySelector(".statusbar-item--label");\n      return $label ? Array.from($label.children) : [];\n    }\n    /** How many leading items sit on the strip\'s visible first line. */\n    visibleKeyHints() {\n      const items = this.keyHintItems();\n      if (!items.length) return 0;\n      const at = items.findIndex((i) => i.offsetTop > items[0].offsetTop);\n      return at === -1 ? items.length : at;\n    }\n    /**\n     * Draw the page of hints starting at `keysStart`. The More hint (the paging\n     * key) leads whenever anything is out of view, and is left off when the\n     * whole set fits without it.\n     */\n    renderKeyHints() {\n      if (!this.keysItem || !this.keysHints) return;\n      const page = this.keysHints.slice(this.keysStart);\n      const more = keyLabel(foldKeymap().keys["plugin.outlinehints"]);\n      this.keysMore = !!more;\n      this.keysItem.setHtmlLabel(hintsHtml(more ? [[more, "More"], ...page] : page));\n      if (more && this.keysStart === 0 && this.visibleKeyHints() === page.length + 1) {\n        this.keysMore = false;\n        this.keysItem.setHtmlLabel(hintsHtml(page));\n      }\n    }\n    /** Show the next page of hints: from the first one out of view, else from the top. */\n    pageKeyHints() {\n      if (!this.keysHints) return;\n      const lead = this.keysMore ? 1 : 0;\n      const shown = this.visibleKeyHints() - lead;\n      const next = this.keysStart + Math.max(1, shown);\n      this.keysStart = shown < this.keyHintItems().length - lead && next < this.keysHints.length ? next : 0;\n      this.renderKeyHints();\n    }\n  };\n  function createOutlineView(viewContext, host, hints) {\n    const plugin = host.plugin;\n    const viewId = host.view.id;\n    const ui = plugin.ui;\n    const nativePeek = (() => {\n      const view = host.nativeView;\n      const ok = view && [\n        "startRecordPreview",\n        "commitRecordPreview",\n        "dismissRecordPreview",\n        "getPeekStatusBarContext"\n      ].every((name) => typeof view[name] === "function");\n      return ok ? view : null;\n    })();\n    const canShowOptions = !!nativePeek && typeof nativePeek.showOptionsDropdown === "function";\n    const collectionGuid = /* @__PURE__ */ __name(() => plugin.collection.getGuid(), "collectionGuid");\n    const storageKey = `outline-collapsed:${plugin.getConfiguration().name}:${viewId}`;\n    let collapsed = /* @__PURE__ */ new Set();\n    try {\n      collapsed = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));\n    } catch (err) {\n      collapsed = /* @__PURE__ */ new Set();\n    }\n    let searchOpen = null;\n    let searchKey = null;\n    let contextGuids = /* @__PURE__ */ new Set();\n    let viewFocused = false;\n    let hierarchy = null;\n    let zoomGuid = null;\n    let lastRecords = null;\n    let $zoom = null;\n    let rows = [];\n    let selectedIndex = 0;\n    let selectedGuid = null;\n    let $root = null;\n    let $list = null;\n    let $note = null;\n    let $menu = null;\n    let peekedGuid = null;\n    let propMode = null;\n    let pendingNameEditGuid = null;\n    let $inlineInput = null;\n    let renderHeld = false;\n    let placingGuid = null;\n    let win = { start: 0, end: 0 };\n    const heightCache = /* @__PURE__ */ new Map();\n    let rowEstimate = 30;\n    let $topPad = null;\n    let $bottomPad = null;\n    let scrollers = null;\n    let scrollRaf = 0;\n    let renderFields = [];\n    let renderStamp = false;\n    const fieldsById = /* @__PURE__ */ __name(() => {\n      const map = {};\n      (plugin.getConfiguration().fields || []).forEach((f) => {\n        map[f.id] = f;\n      });\n      return map;\n    }, "fieldsById");\n    const hierarchyFieldId = /* @__PURE__ */ __name(() => subPagesOn(plugin.getConfiguration()) ? SUBPAGE : null, "hierarchyFieldId");\n    const isExpanded = /* @__PURE__ */ __name((node) => node.id === zoomGuid || (searchOpen ? searchOpen.has(node.id) : !collapsed.has(node.id)), "isExpanded");\n    const visibleFields = /* @__PURE__ */ __name(() => {\n      const byId = fieldsById();\n      return viewContext.getVisiblePropertyIds().map((id) => byId[id]).filter((field) => field && field.id !== "title" && field.id !== MODIFIED && field.type !== "banner");\n    }, "visibleFields");\n    const showsStamp = /* @__PURE__ */ __name(() => viewContext.getVisiblePropertyIds().includes(MODIFIED), "showsStamp");\n    const propValue = /* @__PURE__ */ __name((record, field) => {\n      if (field.type === "choice") {\n        const label = record.prop(field.id).choiceLabel();\n        if (!label) return null;\n        const choice = (field.choices || []).findLast((c) => c.label === label);\n        return { text: label, color: ENUM_COLORS[Number(choice && choice.color)] || "zinc" };\n      }\n      if (field.type === "record") {\n        const linked = record.linkedRecord(field.id);\n        return linked ? { text: linked.getName(), guid: linked.guid } : null;\n      }\n      if (field.type === "number") {\n        const num = record.number(field.id);\n        return num === null ? null : { text: String(num) };\n      }\n      if (field.type === "datetime") {\n        const date = record.date(field.id);\n        if (!date) return null;\n        return { text: field.id === CREATED ? timeAgo(date) : DATE_FORMAT.format(date) };\n      }\n      const text = record.text(field.id);\n      return text ? { text } : null;\n    }, "propValue");\n    const openToMatches = /* @__PURE__ */ __name((matches) => {\n      const open = /* @__PURE__ */ new Set();\n      const visit = /* @__PURE__ */ __name((node) => {\n        const hasMatchBelow = node.children.map(visit).some(Boolean);\n        if (hasMatchBelow) open.add(node.id);\n        return hasMatchBelow || matches.has(node.id);\n      }, "visit");\n      hierarchy.rootNodes.forEach(visit);\n      return open;\n    }, "openToMatches");\n    const findMatches = /* @__PURE__ */ __name((delivered) => {\n      const $input = appSearchInput();\n      const words = ($input ? $input.value : "").toLowerCase().split(/\\s+/).filter(Boolean);\n      if (words.length) {\n        const hits = delivered.filter((r) => {\n          const name = (r.getName() || "").toLowerCase();\n          return words.every((w) => name.includes(w));\n        });\n        if (hits.length) return { matches: new Set(hits.map((r) => r.guid)), query: words.join(" ") };\n      }\n      return { matches: new Set(delivered.map((r) => r.guid)), query: words.join(" ") };\n    }, "findMatches");\n    const flatten = /* @__PURE__ */ __name(() => {\n      const out = [];\n      const visit = /* @__PURE__ */ __name((node, depth, parent) => {\n        out.push({ node, depth, parent });\n        if (isExpanded(node)) {\n          node.children.forEach((child) => visit(child, depth + 1, node));\n        }\n      }, "visit");\n      hierarchy.rootNodes.forEach((root) => visit(root, 0, null));\n      return out;\n    }, "flatten");\n    const setSelection = /* @__PURE__ */ __name((index, block = "nearest") => {\n      selectedIndex = Math.max(0, Math.min(index, rows.length - 1));\n      selectedGuid = rows[selectedIndex] ? rows[selectedIndex].node.id : null;\n      if (!$list) return;\n      ensureRendered(selectedIndex);\n      $list.querySelectorAll(".outline-row").forEach(($row) => {\n        $row.classList.toggle("selected", Number($row.dataset.index) === selectedIndex);\n      });\n      const $selected = $list.querySelector(`.outline-row[data-index="${selectedIndex}"]`);\n      if ($selected) {\n        $selected.style.scrollMarginTop = `${Math.max(0, ...(scrollers || []).map(topInset))}px`;\n        $selected.scrollIntoView({ block });\n      }\n      if (isPeeking() && rows[selectedIndex] && rows[selectedIndex].node.id !== peekedGuid) {\n        showPeek();\n      }\n    }, "setSelection");\n    const canFold = /* @__PURE__ */ __name((node) => node.children.length > 0, "canFold");\n    const saveCollapsed = /* @__PURE__ */ __name(() => localStorage.setItem(storageKey, JSON.stringify([...collapsed])), "saveCollapsed");\n    const setFolded = /* @__PURE__ */ __name((nodes, fold) => {\n      for (const node of nodes) {\n        if (!canFold(node) || node.id === zoomGuid) continue;\n        if (searchOpen) {\n          if (fold) searchOpen.delete(node.id);\n          else searchOpen.add(node.id);\n        } else if (fold) collapsed.add(node.id);\n        else collapsed.delete(node.id);\n      }\n      if (!searchOpen) saveCollapsed();\n    }, "setFolded");\n    const nodesUnder = /* @__PURE__ */ __name((node) => {\n      const out = [];\n      const visit = /* @__PURE__ */ __name((n) => n.children.forEach((child) => {\n        out.push(child);\n        visit(child);\n      }), "visit");\n      visit(node);\n      return out;\n    }, "nodesUnder");\n    const foldSet = /* @__PURE__ */ __name((nodes, op) => {\n      const foldable = nodes.filter(canFold);\n      if (!foldable.length) return;\n      setFolded(foldable, op === "toggle" ? foldable.some(isExpanded) : op === "fold");\n    }, "foldSet");\n    const cascade = /* @__PURE__ */ __name((node, op) => {\n      const levels = [[node]];\n      const walk = /* @__PURE__ */ __name((n, depth) => {\n        if (!isExpanded(n)) return;\n        n.children.forEach((child) => {\n          (levels[depth + 1] ??= []).push(child);\n          walk(child, depth + 1);\n        });\n      }, "walk");\n      walk(node, 0);\n      if (op === "fold") {\n        for (let d = levels.length - 2; d >= 0; d--) {\n          const open = levels[d].filter((n) => canFold(n) && isExpanded(n));\n          if (open.length) return setFolded(open, true);\n        }\n      } else {\n        for (let d = levels.length - 1; d >= 0; d--) {\n          const shut = levels[d].filter((n) => canFold(n) && !isExpanded(n));\n          if (shut.length) return setFolded(shut, false);\n        }\n      }\n    }, "cascade");\n    const refold = /* @__PURE__ */ __name((guid) => {\n      if (guid) selectedGuid = guid;\n      renderRows();\n    }, "refold");\n    const toggle = /* @__PURE__ */ __name((node) => {\n      if (node.id === zoomGuid) return;\n      setFolded([node], isExpanded(node));\n      refold(node.id);\n    }, "toggle");\n    const actionOps = {\n      fold(scope, op) {\n        const { node } = rows[selectedIndex];\n        foldSet({\n          item: /* @__PURE__ */ __name(() => [node], "item"),\n          children: /* @__PURE__ */ __name(() => node.children, "children"),\n          descendants: /* @__PURE__ */ __name(() => nodesUnder(node), "descendants"),\n          // The tree as a whole: the zoomed branch below its root, or everything.\n          all: /* @__PURE__ */ __name(() => zoomGuid ? hierarchy.rootNodes.flatMap(nodesUnder) : hierarchy.rootNodes.flatMap((root) => [root, ...nodesUnder(root)]), "all")\n        }[scope](), op);\n        refold();\n      },\n      foldCascade() {\n        const { node, parent } = rows[selectedIndex];\n        if (canFold(node) && isExpanded(node)) {\n          cascade(node, "fold");\n          refold();\n        } else if (parent) {\n          cascade(parent, "fold");\n          refold(parent.id);\n        } else {\n          setFolded(hierarchy.rootNodes.filter(isExpanded), true);\n          refold();\n        }\n      },\n      unfoldCascade() {\n        cascade(rows[selectedIndex].node, "unfold");\n        refold();\n      },\n      pageHints() {\n        hints.pageKeyHints();\n      },\n      trash() {\n        const { node } = rows[selectedIndex];\n        const gone = /* @__PURE__ */ new Set([node.id, ...nodesUnder(node).map((n) => n.id)]);\n        const next = rows.slice(selectedIndex + 1).find((r) => !gone.has(r.node.id)) || rows[selectedIndex - 1];\n        const fieldId = hierarchyFieldId();\n        if (node.id === zoomGuid) {\n          const parent = node.record.linkedRecord(fieldId);\n          zoomTo(parent ? parent.guid : null);\n        }\n        if (next) follow(next.node.id);\n        plugin.collection.getAllRecords().then((records) => {\n          subtreeRecords(records, node.record, fieldId).reverse().forEach((r) => r.trash());\n          afterWrite();\n        });\n      },\n      zoomIn() {\n        zoomTo(rows[selectedIndex].node.id);\n      },\n      zoomOut() {\n        if (!zoomGuid) return;\n        const zoomed = hierarchy && hierarchy.nodes.get(zoomGuid);\n        const parent = zoomed ? zoomed.record.linkedRecord(hierarchyFieldId()) : null;\n        const from = zoomGuid;\n        zoomTo(parent ? parent.guid : null);\n        const back = rows.findIndex((r) => r.node.id === from);\n        if (back !== -1) setSelection(back, "start");\n      }\n    };\n    const runAction = /* @__PURE__ */ __name((action) => {\n      if (rows[selectedIndex]) ACTIONS[action].run(actionOps);\n    }, "runAction");\n    const keysAreOurs = /* @__PURE__ */ __name(() => {\n      const $focused = document.activeElement;\n      if ($focused && $focused !== document.body && $root && !$root.contains($focused)) return false;\n      return !($focused && $focused.classList && $focused.classList.contains("outline-inline-input"));\n    }, "keysAreOurs");\n    const onShortcutKey = /* @__PURE__ */ __name((e) => {\n      if (!viewFocused || !$root || $menu || propMode || !rows.length) return;\n      if (!keysAreOurs()) return;\n      const action = foldKeymap().byKey.get(eventKeyName(e));\n      if (!action) return;\n      e.preventDefault();\n      e.stopImmediatePropagation();\n      runAction(action);\n    }, "onShortcutKey");\n    const restack = /* @__PURE__ */ __name(() => {\n      if (!$list) return;\n      const $rows = Array.from($list.querySelectorAll(".outline-row"));\n      $rows.forEach(($r) => {\n        const $props = $r.querySelector(".outline-props");\n        const $title = $r.querySelector(".outline-title");\n        if ($props && $title && $props.parentElement !== $title) {\n          $title.insertBefore($props, $r.querySelector(".outline-time, .outline-row-menu"));\n        }\n        $r.classList.remove("is-stacked");\n      });\n      const needsStacking = $rows.map(($r) => {\n        const $name = $r.querySelector(".outline-name");\n        if (!$name || !$r.querySelector(".outline-props")) return false;\n        return $name.scrollWidth > $name.clientWidth + 1;\n      });\n      $rows.forEach(($r, i) => {\n        if (!needsStacking[i]) return;\n        $r.classList.add("is-stacked");\n        const $props = $r.querySelector(".outline-props");\n        $props.style.paddingLeft = `${Number($r.dataset.indent) + TWISTY_W + ROW_GAP}px`;\n        $r.insertBefore($props, $r.querySelector(".outline-propedit"));\n      });\n    }, "restack");\n    const selectNext = /* @__PURE__ */ __name((delta) => {\n      if (!rows.length) return;\n      setSelection((selectedIndex + delta + rows.length) % rows.length);\n    }, "selectNext");\n    const openSelected = /* @__PURE__ */ __name((otherPanel) => {\n      const current = rows[selectedIndex];\n      if (!current) return;\n      if (otherPanel) viewContext.openRecordInOtherPanel(current.node.id);\n      else viewContext.openRecordInThisPanel(current.node.id);\n    }, "openSelected");\n    const focusView = /* @__PURE__ */ __name(() => {\n      const $focused = document.activeElement;\n      if ($focused instanceof HTMLElement && $focused !== document.body) $focused.blur();\n    }, "focusView");\n    const appChrome = /* @__PURE__ */ __name(() => $root && $root.closest(".custom-view") || null, "appChrome");\n    const appSearchInput = /* @__PURE__ */ __name(() => {\n      const $chrome = appChrome();\n      return $chrome && $chrome.querySelector(".records-view-query-wrap input") || null;\n    }, "appSearchInput");\n    const focusAppSearch = /* @__PURE__ */ __name(() => {\n      const $input = appSearchInput();\n      if (!$input) return false;\n      $input.focus();\n      return true;\n    }, "focusAppSearch");\n    const isPeeking = /* @__PURE__ */ __name(() => {\n      try {\n        return !!nativePeek && !!nativePeek.getPeekStatusBarContext();\n      } catch (err) {\n        return false;\n      }\n    }, "isPeeking");\n    let hintTimer = null;\n    const hintMode = /* @__PURE__ */ __name(() => {\n      if (isPeeking()) return "peek";\n      const $focused = document.activeElement;\n      if ($root && $root.contains($focused) && $focused.classList.contains("outline-inline-input")) return "field";\n      if (propMode) return $menu ? "field" : "props";\n      return null;\n    }, "hintMode");\n    const syncKeyHints = /* @__PURE__ */ __name(() => {\n      if (viewFocused) warnInternals();\n      if (viewFocused) hints.showKeyHints(true, hintMode(), !!zoomGuid, viewContext.getRecordTypeName());\n    }, "syncKeyHints");\n    const stopHintTimer = /* @__PURE__ */ __name(() => {\n      if (hintTimer) clearInterval(hintTimer);\n      hintTimer = null;\n    }, "stopHintTimer");\n    const hidePeek = /* @__PURE__ */ __name(() => {\n      if (isPeeking()) nativePeek.dismissRecordPreview();\n    }, "hidePeek");\n    const commitPeek = /* @__PURE__ */ __name(() => {\n      nativePeek.commitRecordPreview();\n    }, "commitPeek");\n    const showPeek = /* @__PURE__ */ __name(() => {\n      const current = rows[selectedIndex];\n      if (!current || !nativePeek) return;\n      peekedGuid = current.node.id;\n      nativePeek.startRecordPreview(current.node.id);\n    }, "showPeek");\n    const warnInternals = /* @__PURE__ */ __name(() => {\n      if (internalsChecked) return;\n      if (accountShortcuts() === void 0 && ++internalsWaits < 10) return;\n      internalsChecked = true;\n      const missing = [];\n      if (!nativePeek) missing.push("peek on Space");\n      if (!canShowOptions) missing.push("the \\u22EF page menu");\n      if (!accountShortcuts()) missing.push("your custom shortcuts");\n      if (!missing.length) return;\n      console.warn("[Outline] app internals changed, re-check them against this Thymer build:", missing);\n      ui.addToaster({\n        title: "Outline needs updating",\n        message: `Thymer changed internals the outline relies on. Not working until the plugin is re-checked against this build: ${missing.join(", ")}.`,\n        dismissible: true\n      });\n    }, "warnInternals");\n    const ROW_PAD_X = 8;\n    const TWISTY_W = 16;\n    const ROW_GAP = 6;\n    const DEPTH_STEP = 20;\n    const ICON_OFFSET = ROW_PAD_X + TWISTY_W + ROW_GAP;\n    const createRecord = /* @__PURE__ */ __name(() => {\n      const guid = viewContext.createRecord();\n      if (!guid) return;\n      pendingNameEditGuid = guid;\n      setTimeout(() => {\n        if (pendingNameEditGuid) renderRows();\n      }, 150);\n    }, "createRecord");\n    const onDocumentClick = /* @__PURE__ */ __name((e) => {\n      if ($menu && !$menu.contains(e.target)) closeMenu();\n    }, "onDocumentClick");\n    const closeMenu = /* @__PURE__ */ __name(() => {\n      if ($menu) {\n        $menu.remove();\n        $menu = null;\n        document.removeEventListener("click", onDocumentClick, true);\n        syncKeyHints();\n      }\n    }, "closeMenu");\n    const showMenu = /* @__PURE__ */ __name((items, x, y, filterPlaceholder) => {\n      closeMenu();\n      if (!$root) return;\n      $menu = document.createElement("div");\n      $menu.className = "outline-menu";\n      const $items = document.createElement("div");\n      let $filter = null;\n      let shown = items;\n      let cursor = 0;\n      const confirm = /* @__PURE__ */ __name((index) => {\n        const item = shown[index];\n        if (!item) return;\n        closeMenu();\n        item.onSelect();\n      }, "confirm");\n      const move = /* @__PURE__ */ __name((delta) => {\n        if (!shown.length) return;\n        $items.children[cursor].classList.remove("is-selected");\n        cursor = (cursor + delta + shown.length) % shown.length;\n        const $sel = $items.children[cursor];\n        $sel.classList.add("is-selected");\n        $sel.scrollIntoView({ block: "nearest" });\n      }, "move");\n      const paint = /* @__PURE__ */ __name(() => {\n        const needle = $filter ? $filter.value.trim().toLowerCase() : "";\n        shown = items.filter((item) => !needle || item.label.toLowerCase().includes(needle));\n        if (cursor >= shown.length) cursor = 0;\n        $items.innerHTML = "";\n        shown.forEach((item, index) => {\n          const $item = document.createElement("div");\n          $item.className = "outline-menu-item";\n          if (item.active) $item.classList.add("is-active");\n          if (index === cursor) $item.classList.add("is-selected");\n          $item.appendChild(ui.createIcon(item.icon || "ti-align-left"));\n          const $label = document.createElement("span");\n          $label.textContent = item.label;\n          $item.appendChild($label);\n          $item.addEventListener("click", (e) => {\n            e.stopPropagation();\n            confirm(index);\n          });\n          $items.appendChild($item);\n        });\n      }, "paint");\n      const onMenuKeyDown = /* @__PURE__ */ __name((e) => {\n        e.stopPropagation();\n        switch (e.key) {\n          case "ArrowDown":\n            e.preventDefault();\n            move(1);\n            break;\n          case "ArrowUp":\n            e.preventDefault();\n            move(-1);\n            break;\n          case "Enter":\n            e.preventDefault();\n            confirm(cursor);\n            break;\n          case "Escape":\n            e.preventDefault();\n            closeMenu();\n            break;\n          case "Tab":\n            e.preventDefault();\n            break;\n        }\n      }, "onMenuKeyDown");\n      $menu.addEventListener("keydown", onMenuKeyDown);\n      if (filterPlaceholder) {\n        $menu.classList.add("has-filter");\n        $filter = document.createElement("input");\n        $filter.type = "text";\n        $filter.spellcheck = false;\n        $filter.className = "form-input outline-menu-filter";\n        $filter.placeholder = filterPlaceholder;\n        $filter.addEventListener("input", () => {\n          cursor = 0;\n          paint();\n        });\n        $filter.addEventListener("click", (e) => e.stopPropagation());\n        $menu.appendChild($filter);\n      }\n      $menu.appendChild($items);\n      paint();\n      $root.appendChild($menu);\n      const rootRect = $root.getBoundingClientRect();\n      const menuW = $menu.offsetWidth;\n      const left = Math.max(0, Math.min(x - rootRect.left, rootRect.width - menuW));\n      $menu.style.left = `${left}px`;\n      $menu.style.top = `${y - rootRect.top}px`;\n      document.addEventListener("click", onDocumentClick, true);\n      if ($filter) {\n        $filter.focus();\n      } else {\n        $menu.tabIndex = -1;\n        $menu.focus();\n      }\n      syncKeyHints();\n    }, "showMenu");\n    const inZoom = /* @__PURE__ */ __name((record, parentFieldId) => {\n      if (record.guid === zoomGuid) return true;\n      for (const parent of ancestorsOf(record, parentFieldId)) {\n        if (parent.guid === zoomGuid) return true;\n      }\n      return false;\n    }, "inZoom");\n    const rebuild = /* @__PURE__ */ __name(() => {\n      if (!lastRecords) return;\n      const parentFieldId = hierarchyFieldId();\n      if (zoomGuid && !parentFieldId) zoomGuid = null;\n      const scoped = zoomGuid ? lastRecords.filter((r) => inZoom(r, parentFieldId)) : lastRecords;\n      const completed = withAncestors(scoped, parentFieldId);\n      if (zoomGuid) {\n        completed.records = completed.records.filter((r) => inZoom(r, parentFieldId));\n        const kept = new Set(completed.records.map((r) => r.guid));\n        completed.added = new Set([...completed.added].filter((g) => kept.has(g)));\n      }\n      hierarchy = buildHierarchy(completed.records, parentFieldId);\n      const { matches, query } = findMatches(scoped);\n      contextGuids = completed.added.size || query ? new Set(completed.records.map((r) => r.guid).filter((g) => !matches.has(g))) : /* @__PURE__ */ new Set();\n      if (query) {\n        const key = `${zoomGuid}|${query}|${[...matches].sort().join(",")}`;\n        if (key !== searchKey || !searchOpen) {\n          searchOpen = openToMatches(matches);\n          searchKey = key;\n        }\n      } else {\n        searchOpen = null;\n        searchKey = null;\n      }\n      if (!$list) mount();\n      renderNote();\n      renderZoomBar();\n      renderRows();\n    }, "rebuild");\n    const zoomTo = /* @__PURE__ */ __name((guid) => {\n      zoomGuid = guid || null;\n      selectedIndex = 0;\n      selectedGuid = null;\n      rebuild();\n      (scrollers || []).forEach((el) => {\n        el.scrollTop = 0;\n      });\n      if (rows.length) setSelection(0);\n      syncKeyHints();\n    }, "zoomTo");\n    const takeZoomHandoff = /* @__PURE__ */ __name(() => {\n      const raw = document.documentElement.dataset.outlineZoom;\n      if (!raw) return;\n      let req = null;\n      try {\n        req = JSON.parse(raw);\n      } catch (err) {\n        req = null;\n      }\n      if (!req || req.collection !== collectionGuid()) return;\n      delete document.documentElement.dataset.outlineZoom;\n      if (Date.now() - (req.at || 0) > 1e4) return;\n      zoomGuid = req.guid || null;\n      selectedIndex = 0;\n      selectedGuid = null;\n    }, "takeZoomHandoff");\n    const renderZoomBar = /* @__PURE__ */ __name(() => {\n      if (!$zoom) return;\n      $zoom.innerHTML = "";\n      if (!zoomGuid) return;\n      const parentFieldId = hierarchyFieldId();\n      const target = plugin.data.getRecord(zoomGuid);\n      if (!target) return;\n      const chain = [...ancestorsOf(target, parentFieldId)].reverse().concat([target]);\n      const $all = document.createElement("button");\n      $all.type = "button";\n      $all.className = "button-minimal button-small outline-zoom-step";\n      $all.textContent = "All";\n      $all.title = "Show the whole collection";\n      $all.addEventListener("click", () => zoomTo(null));\n      $zoom.appendChild($all);\n      chain.forEach((record, i) => {\n        const $sep = document.createElement("span");\n        $sep.className = "outline-zoom-sep ti ti-chevron-right";\n        const $step = document.createElement("button");\n        $step.type = "button";\n        $step.className = "button-minimal button-small outline-zoom-step" + (i === chain.length - 1 ? " is-current" : "");\n        const $label = document.createElement("span");\n        $label.textContent = record.getName() || "Untitled";\n        $step.appendChild($label);\n        $step.title = record.getName() || "";\n        $step.addEventListener("click", () => zoomTo(record.guid));\n        $zoom.append($sep, $step);\n      });\n    }, "renderZoomBar");\n    const renderNote = /* @__PURE__ */ __name(() => {\n      if (!$note) return;\n      $note.textContent = hierarchyFieldId() ? "" : \'Sub-pages are off in this collection, so rows are flat. Run "Outline: install into a collection..." to turn them on.\';\n    }, "renderNote");\n    const EDITABLE_TYPES = ["text", "number", "choice", "record"];\n    const EDIT_SKIP_IDS = ["title", "icon", "collection"];\n    const editableFields = /* @__PURE__ */ __name(() => {\n      const ord = orderField();\n      const canEdit = /* @__PURE__ */ __name((f) => f && f.active !== false && !f.read_only && EDITABLE_TYPES.includes(f.type) && !EDIT_SKIP_IDS.includes(f.id) && !(ord && f.id === ord.id), "canEdit");\n      const shown = visibleFields().filter(canEdit);\n      const rest = (plugin.getConfiguration().fields || []).filter((f) => canEdit(f) && !shown.some((s) => s.id === f.id));\n      const title = fieldsById()["title"];\n      return title ? [title, ...shown, ...rest] : [...shown, ...rest];\n    }, "editableFields");\n    const fieldText = /* @__PURE__ */ __name((record, field) => {\n      if (field.id === "title") return record.getName() || "";\n      const value = propValue(record, field);\n      return value ? value.text : "";\n    }, "fieldText");\n    const afterWrite = /* @__PURE__ */ __name(() => setTimeout(() => renderRows(), 60), "afterWrite");\n    const doneEditing = /* @__PURE__ */ __name(() => {\n      focusView();\n      afterWrite();\n    }, "doneEditing");\n    const pending = /* @__PURE__ */ new Map();\n    let settleTimer = 0;\n    const SETTLE_MS = 3e3;\n    const notePending = /* @__PURE__ */ __name((guid, key, value) => {\n      pending.set(guid, { ...pending.get(guid), [key]: value });\n      clearTimeout(settleTimer);\n      settleTimer = setTimeout(() => {\n        pending.clear();\n        rebuild();\n      }, SETTLE_MS);\n    }, "notePending");\n    const settled = /* @__PURE__ */ __name((records) => {\n      const byGuid = new Map(records.map((r) => [r.guid, r]));\n      const fieldId = hierarchyFieldId();\n      const ord = orderField();\n      for (const [guid, p] of pending) {\n        const record = byGuid.get(guid);\n        if (!record) continue;\n        if ("parent" in p) {\n          const linked = fieldId ? record.linkedRecord(fieldId) : null;\n          if ((linked ? linked.guid : null) !== p.parent) return false;\n        }\n        if ("order" in p && ord && record.prop(ord.id).number() !== p.order) return false;\n      }\n      pending.clear();\n      clearTimeout(settleTimer);\n      return true;\n    }, "settled");\n    let followGuid = null;\n    let followTimer = 0;\n    const follow = /* @__PURE__ */ __name((guid) => {\n      followGuid = guid;\n      clearTimeout(followTimer);\n      followTimer = setTimeout(() => {\n        followGuid = null;\n      }, 3e3);\n    }, "follow");\n    const toast = /* @__PURE__ */ __name((title, message) => ui.addToaster({ title, message, dismissible: true, autoDestroyTime: 4e3 }), "toast");\n    const orderField = /* @__PURE__ */ __name(() => {\n      const view = (plugin.getConfiguration().views || []).find((v) => v.id === viewId);\n      const field = view && view.opts ? fieldsById()[view.opts.order_field_id] : null;\n      if (!field || field.type !== "number" || field.active === false) return null;\n      const desc = view.sort_field_id === field.id && view.sort_dir === "desc";\n      return { id: field.id, label: field.label, dir: desc ? -1 : 1 };\n    }, "orderField");\n    const orderOf = /* @__PURE__ */ __name((node, ord) => {\n      const p = pending.get(node.id);\n      if (p && "order" in p) return p.order;\n      return node.record.prop(ord.id).number();\n    }, "orderOf");\n    const parentOf = /* @__PURE__ */ __name((node) => {\n      const parent = node.parentGuid ? hierarchy.nodes.get(node.parentGuid) : null;\n      return parent && parent.children.includes(node) ? parent : null;\n    }, "parentOf");\n    const childList = /* @__PURE__ */ __name((parent) => parent ? parent.children : hierarchy.rootNodes, "childList");\n    const followsOrder = /* @__PURE__ */ __name((list, ord) => {\n      let last = null;\n      for (const n of list) {\n        const v = orderOf(n, ord);\n        if (v === null) continue;\n        if (last !== null && ord.dir * (v - last) < 0) return false;\n        last = v;\n      }\n      return true;\n    }, "followsOrder");\n    const positionWrites = /* @__PURE__ */ __name((node, kids, index, ord) => {\n      const list = [...kids];\n      list.splice(index, 0, node);\n      const n = list.length;\n      return list.map((m, i) => ({ node: m, value: ord.dir > 0 ? i + 1 : n - i })).filter(({ node: m, value }) => orderOf(m, ord) !== value);\n    }, "positionWrites");\n    const writeParent = /* @__PURE__ */ __name((node, parent) => node.record.setSubPageOf(parent ? parent.id : null) !== false, "writeParent");\n    const rearrange = /* @__PURE__ */ __name((op) => {\n      const current = rows[selectedIndex];\n      if (!current || !hierarchy || !hierarchyFieldId()) return;\n      const node = current.node;\n      if (contextGuids.size || searchOpen) {\n        toast("Clear the search to rearrange", "With a search or filter on, the outline shows only part of each level.");\n        return;\n      }\n      if (node.id === zoomGuid) return;\n      const parent = parentOf(node);\n      const siblings = childList(parent);\n      const at = siblings.indexOf(node);\n      let target = parent;\n      let index;\n      if (op === "indent") {\n        if (at <= 0) return;\n        target = siblings[at - 1];\n        index = target.children.length;\n      } else if (op === "outdent") {\n        if (!parent || parent.id === zoomGuid) return;\n        target = parentOf(parent);\n        index = childList(target).indexOf(parent) + 1;\n      } else {\n        index = at + (op === "down" ? 1 : -1);\n        if (index < 0 || index >= siblings.length) return;\n      }\n      const ord = orderField();\n      if (!ord && (op === "up" || op === "down")) {\n        toast("No Order property", \'Run "Outline: install into a collection\\u2026" to add one; sibling order is stored there.\');\n        return;\n      }\n      const kids = childList(target).filter((n) => n !== node);\n      if (ord && !(followsOrder(siblings, ord) && followsOrder(kids, ord))) {\n        toast(`Sort by ${ord.label} to rearrange`, `The rows aren\'t in ${ord.label} order, so a new position wouldn\'t show.`);\n        return;\n      }\n      const writes = ord ? positionWrites(node, kids, index, ord) : [];\n      if (target !== parent) {\n        if (!writeParent(node, target)) {\n          toast("Couldn\'t move the page", "The app refused the new parent.");\n          return;\n        }\n        notePending(node.id, "parent", target ? target.id : null);\n      }\n      writes.forEach(({ node: n, value }) => {\n        n.record.prop(ord.id).set(value);\n        notePending(n.id, "order", value);\n      });\n      const from = childList(parent);\n      from.splice(from.indexOf(node), 1);\n      childList(target).splice(index, 0, node);\n      node.parentGuid = target ? target.id : null;\n      if (target && collapsed.has(target.id)) {\n        collapsed.delete(target.id);\n        saveCollapsed();\n      }\n      follow(node.id);\n      renderRows();\n    }, "rearrange");\n    const createBeside = /* @__PURE__ */ __name(async (where) => {\n      const current = rows[selectedIndex];\n      if (!current || !hierarchy || placingGuid) return;\n      const node = current.node;\n      const refuse = /* @__PURE__ */ __name((title, message) => {\n        if (where === "below") createRecord();\n        else if (title) toast(title, message);\n      }, "refuse");\n      if (contextGuids.size || searchOpen) {\n        refuse("Clear the search to create above", "With a search or filter on, the outline shows only part of each level.");\n        return;\n      }\n      if (node.id === zoomGuid) {\n        refuse();\n        return;\n      }\n      const parent = parentOf(node);\n      const siblings = childList(parent);\n      const ord = orderField();\n      if (!ord) {\n        refuse("No Order property", `Run "Outline: install into a collection\\u2026" to add one; a new page\'s place is stored there.`);\n        return;\n      }\n      if (!followsOrder(siblings, ord)) {\n        refuse(`Sort by ${ord.label} to create above`, `The rows aren\'t in ${ord.label} order, so the new page\'s place wouldn\'t show.`);\n        return;\n      }\n      const guid = viewContext.createRecord();\n      if (!guid) return;\n      placingGuid = guid;\n      let record = null;\n      for (let i = 0; i < 30 && !record; i++) {\n        record = (await plugin.collection.getAllRecords()).find((r) => r.guid === guid);\n        if (!record) await new Promise((r) => setTimeout(r, 100));\n      }\n      placingGuid = null;\n      if (!record) {\n        rebuild();\n        return;\n      }\n      if (parent && writeParent({ record }, parent)) notePending(guid, "parent", parent.id);\n      positionWrites({ id: guid, record }, siblings, siblings.indexOf(node) + (where === "below" ? 1 : 0), ord).forEach(({ node: n, value }) => {\n        n.record.prop(ord.id).set(value);\n        notePending(n.id, "order", value);\n      });\n      pendingNameEditGuid = guid;\n      follow(guid);\n    }, "createBeside");\n    const editText = /* @__PURE__ */ __name(($cell, value, { onCommit, onCancel }) => {\n      const $input = document.createElement("input");\n      $input.type = "text";\n      $input.className = "outline-inline-input";\n      $input.value = value || "";\n      let done = false;\n      $inlineInput = $input;\n      const finish = /* @__PURE__ */ __name((commit) => {\n        if (done) return;\n        done = true;\n        $inlineInput = null;\n        if (commit) onCommit($input.value.trim());\n        else if (onCancel) onCancel();\n        if (renderHeld) afterWrite();\n        syncKeyHints();\n      }, "finish");\n      $input.addEventListener("keydown", (e) => {\n        e.stopPropagation();\n        if (e.key === "Enter") {\n          e.preventDefault();\n          finish(true);\n        } else if (e.key === "Escape") {\n          e.preventDefault();\n          finish(false);\n        }\n      });\n      $input.addEventListener("blur", () => finish(true));\n      $input.addEventListener("mouseup", (e) => e.stopPropagation());\n      $cell.replaceWith($input);\n      $input.focus();\n      $input.select();\n      syncKeyHints();\n    }, "editText");\n    const startNameEdit = /* @__PURE__ */ __name((node, isNew) => {\n      if (!$list) return;\n      const $row = $list.querySelector(`.outline-row[data-guid="${node.id}"]`);\n      const $name = $row && $row.querySelector(".outline-name");\n      if (!$name) return;\n      const finish = /* @__PURE__ */ __name((text) => {\n        if (isNew && !text) node.record.trash();\n        else if (text !== null) node.record.prop("title").set(text);\n        doneEditing();\n      }, "finish");\n      editText($name, node.record.getName(), { onCommit: finish, onCancel: /* @__PURE__ */ __name(() => finish(null), "onCancel") });\n    }, "startNameEdit");\n    const recordCandidates = /* @__PURE__ */ __name(async (field, node) => {\n      if (!field.filter_colguid || field.filter_colguid === collectionGuid()) {\n        const banned = new Set(field.id === SUBPAGE ? nodesUnder(node).map((n) => n.id) : []);\n        return [...hierarchy.nodes.values()].filter((n) => n.id !== node.id && !banned.has(n.id)).map((n) => ({ guid: n.id, name: n.name }));\n      }\n      const other = plugin.data.getPluginByGuid(field.filter_colguid);\n      if (!other || !other.getAllRecords) return [];\n      const records = await other.getAllRecords();\n      return records.map((r) => ({ guid: r.guid, name: r.getName() || "Unknown" }));\n    }, "recordCandidates");\n    const editField = /* @__PURE__ */ __name((node, field, $cell) => {\n      const record = node.record;\n      const prop = /* @__PURE__ */ __name(() => record.prop(field.id), "prop");\n      if (field.id === "title" || field.type === "text" || field.type === "number") {\n        editText($cell, fieldText(record, field), {\n          onCommit: /* @__PURE__ */ __name((text) => {\n            if (field.type === "number") {\n              prop().set(text === "" ? null : Number(text));\n            } else {\n              prop().set(text);\n            }\n            doneEditing();\n          }, "onCommit"),\n          onCancel: /* @__PURE__ */ __name(() => {\n            focusView();\n            renderRows();\n          }, "onCancel")\n        });\n        return;\n      }\n      const rect = $cell.getBoundingClientRect();\n      const icon = field.icon || "ti-align-left";\n      if (field.type === "choice") {\n        const current = prop().choiceLabel();\n        const items = (field.choices || []).filter((c) => c.active !== false).map((c) => ({\n          label: c.label,\n          icon: c.icon || icon,\n          active: c.label === current,\n          onSelect: /* @__PURE__ */ __name(() => {\n            prop().setChoice(c.label);\n            doneEditing();\n          }, "onSelect")\n        }));\n        items.push({\n          label: "Clear",\n          icon: "ti-x",\n          onSelect: /* @__PURE__ */ __name(() => {\n            prop().set(null);\n            doneEditing();\n          }, "onSelect")\n        });\n        showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);\n        return;\n      }\n      if (field.type === "record") {\n        const linked = record.linkedRecord(field.id);\n        const link = /* @__PURE__ */ __name((guid) => {\n          if (field.id === SUBPAGE) record.setSubPageOf(guid);\n          else prop().set(guid);\n        }, "link");\n        recordCandidates(field, node).then((candidates) => {\n          if (viewContext.isDestroyed()) return;\n          const items = [{\n            label: "None",\n            icon: "ti-x",\n            active: !linked,\n            onSelect: /* @__PURE__ */ __name(() => {\n              link(null);\n              doneEditing();\n            }, "onSelect")\n          }];\n          candidates.forEach((c) => items.push({\n            label: c.name,\n            icon,\n            active: linked && linked.guid === c.guid,\n            onSelect: /* @__PURE__ */ __name(() => {\n              link(c.guid);\n              doneEditing();\n            }, "onSelect")\n          }));\n          showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);\n        });\n      }\n    }, "editField");\n    const editSelectedField = /* @__PURE__ */ __name(() => {\n      if (!propMode || !$list) return;\n      const $row = $list.querySelector(`.outline-row[data-guid="${propMode.guid}"]`);\n      const current = rows.find((r) => r.node.id === propMode.guid);\n      const fields = editableFields();\n      const field = fields[propMode.index];\n      if (!$row || !current || !field) return;\n      const $cell = $row.querySelector(`.outline-pe-row[data-index="${propMode.index}"] .outline-pe-value`);\n      if ($cell) editField(current.node, field, $cell);\n    }, "editSelectedField");\n    const paintPropSelection = /* @__PURE__ */ __name(() => {\n      if (!$list) return;\n      $list.querySelectorAll(".outline-pe-row").forEach(($r) => {\n        $r.classList.toggle("is-selected", Number($r.dataset.index) === propMode.index);\n      });\n    }, "paintPropSelection");\n    const exitPropMode = /* @__PURE__ */ __name(() => {\n      propMode = null;\n      renderRows();\n      focusView();\n      syncKeyHints();\n    }, "exitPropMode");\n    const buildPropEditor = /* @__PURE__ */ __name((node, indent) => {\n      const $panel = document.createElement("div");\n      $panel.className = "outline-propedit";\n      $panel.style.paddingLeft = `${indent + TWISTY_W + ROW_GAP}px`;\n      $panel.addEventListener("mouseup", (e) => e.stopPropagation());\n      const fields = editableFields();\n      if (propMode.index >= fields.length) propMode.index = 0;\n      fields.forEach((field, index) => {\n        const $prow = document.createElement("div");\n        $prow.className = "outline-pe-row";\n        $prow.dataset.index = String(index);\n        if (index === propMode.index) $prow.classList.add("is-selected");\n        const $icon = ui.createIcon(field.icon || "ti-align-left");\n        $icon.classList.add("outline-pe-icon");\n        $prow.appendChild($icon);\n        const $label = document.createElement("span");\n        $label.className = "outline-pe-label";\n        $label.textContent = field.label;\n        $prow.appendChild($label);\n        const $value = document.createElement("span");\n        $value.className = "outline-pe-value";\n        const text = fieldText(node.record, field);\n        $value.textContent = text || "Empty";\n        if (!text) $value.classList.add("is-empty");\n        $prow.appendChild($value);\n        $prow.addEventListener("mouseup", (e) => {\n          e.stopPropagation();\n          if (e.button !== 0) return;\n          propMode.index = index;\n          paintPropSelection();\n          editField(node, field, $value);\n        });\n        $panel.appendChild($prow);\n      });\n      return $panel;\n    }, "buildPropEditor");\n    const propChip = /* @__PURE__ */ __name((field, value) => {\n      const $prop = document.createElement("span");\n      $prop.className = "outline-prop";\n      const $icon = ui.createIcon(field.icon || "ti-align-left");\n      $icon.classList.add("outline-prop-icon");\n      $prop.appendChild($icon);\n      const $value = document.createElement("span");\n      if (value.color) {\n        $value.className = "outline-pill";\n        $value.style.background = `var(--enum-${value.color}-bg)`;\n        $value.style.color = `var(--enum-${value.color}-fg)`;\n      } else if (value.guid) {\n        $value.className = "outline-link";\n      } else {\n        $value.className = "outline-prop-text";\n      }\n      $value.textContent = value.text;\n      $prop.appendChild($value);\n      if (value.guid) {\n        const $arrow = document.createElement("span");\n        $arrow.className = "outline-link-arrow";\n        $arrow.textContent = "\\u2197";\n        $value.appendChild($arrow);\n        $prop.addEventListener("click", (e) => {\n          e.stopPropagation();\n          viewContext.openRecordInThisPanel(value.guid);\n        });\n      }\n      return $prop;\n    }, "propChip");\n    const OVERSCAN_PX = 1e3;\n    const MARGIN_PX = 300;\n    const rowHeight = /* @__PURE__ */ __name((i) => heightCache.get(rows[i].node.id) ?? rowEstimate, "rowHeight");\n    const sumHeights = /* @__PURE__ */ __name((from, to) => {\n      let y = 0;\n      for (let i = from; i < to; i++) y += rowHeight(i);\n      return y;\n    }, "sumHeights");\n    const attachScroller = /* @__PURE__ */ __name(() => {\n      if (scrollers && (scrollers[0] || document.body).contains($list)) return;\n      detachScroller();\n      if (!$list.isConnected) return;\n      scrollers = [];\n      for (let el = $list.parentElement; el && el !== document.body; el = el.parentElement) {\n        const oy = getComputedStyle(el).overflowY;\n        if (oy === "auto" || oy === "scroll") scrollers.push(el);\n      }\n      [...scrollers, window].forEach((t) => t.addEventListener("scroll", onScroll, { passive: true }));\n    }, "attachScroller");\n    const detachScroller = /* @__PURE__ */ __name(() => {\n      if (scrollers) [...scrollers, window].forEach((t) => t.removeEventListener("scroll", onScroll));\n      if (scrollRaf) cancelAnimationFrame(scrollRaf);\n      scrollers = null;\n      scrollRaf = 0;\n    }, "detachScroller");\n    const onScroll = /* @__PURE__ */ __name(() => {\n      if (scrollRaf) return;\n      scrollRaf = requestAnimationFrame(() => {\n        scrollRaf = 0;\n        renderWindow(false);\n      });\n    }, "onScroll");\n    const topInset = /* @__PURE__ */ __name((el) => {\n      const $bar = el.querySelector(".panel-bar--tabsbar");\n      return $bar && getComputedStyle($bar).position === "sticky" ? $bar.offsetHeight : 0;\n    }, "topInset");\n    const viewportInList = /* @__PURE__ */ __name(() => {\n      const listTop = $list.getBoundingClientRect().top;\n      let top = 0;\n      let bottom = window.innerHeight;\n      for (const el of scrollers || []) {\n        const elTop = el.getBoundingClientRect().top + topInset(el);\n        top = Math.max(top, elTop);\n        bottom = Math.min(bottom, el.getBoundingClientRect().top + el.clientHeight);\n      }\n      return { from: top - listTop, to: bottom - listTop };\n    }, "viewportInList");\n    const rangeFor = /* @__PURE__ */ __name((pad) => {\n      const { from, to } = viewportInList();\n      const lo = from - pad;\n      const hi = to + pad;\n      let y = 0;\n      let start = -1;\n      let end = rows.length;\n      for (let i = 0; i < rows.length; i++) {\n        if (y >= hi) {\n          end = i;\n          break;\n        }\n        const h = rowHeight(i);\n        if (start === -1 && y + h > lo) start = i;\n        y += h;\n      }\n      if (start === -1) start = Math.max(0, end - 1);\n      return { start, end };\n    }, "rangeFor");\n    const updatePads = /* @__PURE__ */ __name(() => {\n      $topPad.style.height = `${sumHeights(0, win.start)}px`;\n      $bottomPad.style.height = `${sumHeights(win.end, rows.length)}px`;\n    }, "updatePads");\n    const renderWindow = /* @__PURE__ */ __name((force, depth = 0) => {\n      if (!$list || !$topPad || !rows.length) return;\n      if (!force) {\n        const need = rangeFor(MARGIN_PX);\n        if (need.start >= win.start && need.end <= win.end) return;\n      }\n      win = rangeFor(OVERSCAN_PX);\n      while ($topPad.nextSibling && $topPad.nextSibling !== $bottomPad) {\n        $topPad.nextSibling.remove();\n      }\n      const $frag = document.createDocumentFragment();\n      for (let i = win.start; i < win.end; i++) $frag.appendChild(buildRow(i));\n      $list.insertBefore($frag, $bottomPad);\n      restack();\n      let changed = false;\n      let estimated = heightCache.size > 0;\n      for (let $r = $topPad.nextSibling; $r && $r !== $bottomPad; $r = $r.nextSibling) {\n        const h = $r.offsetHeight;\n        if (!h) continue;\n        if (!estimated && !$r.classList.contains("is-stacked") && !$r.querySelector(".outline-propedit")) {\n          estimated = true;\n          rowEstimate = h;\n        }\n        if (heightCache.get($r.dataset.guid) !== h) {\n          heightCache.set($r.dataset.guid, h);\n          changed = true;\n        }\n      }\n      updatePads();\n      if (changed && depth < 2) renderWindow(false, depth + 1);\n    }, "renderWindow");\n    const ensureRendered = /* @__PURE__ */ __name((index) => {\n      if (!$topPad || !rows.length || index >= win.start && index < win.end) return;\n      if (scrollers) {\n        const { from, to } = viewportInList();\n        const top = sumHeights(0, index);\n        const bottom = top + rowHeight(index);\n        const delta = top < from ? top - from : bottom > to ? bottom - to : 0;\n        if (delta) {\n          for (const el of [...scrollers, document.scrollingElement]) {\n            const before = el.scrollTop;\n            el.scrollTop += delta;\n            if (el.scrollTop !== before) break;\n          }\n        }\n      }\n      renderWindow(true);\n    }, "ensureRendered");\n    const renderRows = /* @__PURE__ */ __name(() => {\n      if (!$list) return;\n      if ($inlineInput && $inlineInput.isConnected) {\n        renderHeld = true;\n        return;\n      }\n      renderHeld = false;\n      renderFields = visibleFields();\n      renderStamp = showsStamp();\n      const heldScroll = (scrollers || []).map((el) => [el, el.scrollTop]);\n      $list.innerHTML = "";\n      $topPad = $bottomPad = null;\n      win = { start: 0, end: 0 };\n      rows = hierarchy ? flatten() : [];\n      const rowIndexOf = /* @__PURE__ */ __name((guid) => rows.findIndex((r) => r.node.id === guid), "rowIndexOf");\n      let at = followGuid ? rowIndexOf(followGuid) : -1;\n      for (let n = hierarchy && hierarchy.nodes.get(selectedGuid), d = 0; at === -1 && n && d < MAX_DEPTH; n = hierarchy.nodes.get(n.parentGuid), d++) {\n        at = rowIndexOf(n.id);\n      }\n      if (at !== -1) selectedIndex = at;\n      if (rows.length === 0) {\n        const $empty = document.createElement("div");\n        $empty.className = "outline-empty";\n        $empty.textContent = "No records";\n        $list.appendChild($empty);\n        return;\n      }\n      $topPad = document.createElement("div");\n      $bottomPad = document.createElement("div");\n      $topPad.className = $bottomPad.className = "outline-pad";\n      $list.append($topPad, $bottomPad);\n      attachScroller();\n      updatePads();\n      heldScroll.forEach(([el, top]) => {\n        el.scrollTop = top;\n      });\n      renderWindow(true);\n      if (!scrollers) {\n        requestAnimationFrame(() => {\n          if (!$list) return;\n          attachScroller();\n          renderWindow(false);\n        });\n      }\n      setSelection(selectedIndex);\n      if (pendingNameEditGuid) {\n        const at2 = rows.findIndex((r) => r.node.id === pendingNameEditGuid);\n        pendingNameEditGuid = null;\n        if (at2 !== -1) {\n          setSelection(at2);\n          startNameEdit(rows[at2].node, true);\n        }\n      }\n    }, "renderRows");\n    const buildRow = /* @__PURE__ */ __name((index) => {\n      const { node, depth } = rows[index];\n      const fields = renderFields;\n      const hasChildren = node.children.length > 0;\n      const indent = ROW_PAD_X + depth * DEPTH_STEP;\n      const $row = document.createElement("div");\n      $row.className = "outline-row";\n      if (contextGuids.has(node.id)) $row.classList.add("is-context");\n      $row.dataset.index = String(index);\n      if (index === selectedIndex) $row.classList.add("selected");\n      $row.dataset.guid = node.id;\n      $row.dataset.indent = String(indent);\n      const $title = document.createElement("div");\n      $title.className = "outline-title";\n      $title.style.paddingLeft = `${indent}px`;\n      const $twisty = document.createElement("span");\n      $twisty.className = "outline-twisty";\n      if (hasChildren) {\n        $twisty.style.setProperty("--twisty-reach", `${indent}px`);\n        $twisty.appendChild(ui.createIcon("ti-chevron-right"));\n        $twisty.classList.toggle("expanded", isExpanded(node));\n        $twisty.addEventListener("mouseup", (e) => {\n          if (e.button !== 0) return;\n          e.stopPropagation();\n          e.preventDefault();\n          toggle(node);\n        });\n      }\n      $title.appendChild($twisty);\n      const $icon = ui.createIcon(node.record.getIcon(true) || "ti-file");\n      $icon.classList.add("outline-icon");\n      $title.appendChild($icon);\n      const $name = document.createElement("span");\n      $name.className = "outline-name";\n      $name.textContent = node.name;\n      $title.appendChild($name);\n      if (hasChildren && !isExpanded(node)) {\n        const $count = document.createElement("span");\n        $count.className = "outline-count";\n        $count.textContent = String(node.children.length);\n        $title.appendChild($count);\n      }\n      const chips = fields.map((field) => ({ field, value: propValue(node.record, field) })).filter((entry) => entry.value);\n      if (chips.length) {\n        const $props = document.createElement("span");\n        $props.className = "outline-props";\n        chips.forEach(({ field, value }) => $props.appendChild(propChip(field, value)));\n        $title.appendChild($props);\n      }\n      if (renderStamp) {\n        const $time = document.createElement("span");\n        $time.className = "outline-time";\n        $time.textContent = timeAgo(node.record.date(MODIFIED));\n        $title.appendChild($time);\n      }\n      if (canShowOptions) {\n        const $opts = document.createElement("button");\n        $opts.type = "button";\n        $opts.className = "outline-row-menu button-none button-small button-minimal-hover tooltip";\n        $opts.setAttribute("aria-label", "Options");\n        $opts.dataset.tooltip = "Options";\n        $opts.dataset.tooltipDir = "top";\n        $opts.appendChild(ui.createIcon("ti-dots"));\n        $opts.addEventListener("mouseup", (e) => {\n          e.stopPropagation();\n          e.preventDefault();\n        });\n        $opts.addEventListener("click", (e) => {\n          e.stopPropagation();\n          e.preventDefault();\n          setSelection(index);\n          nativePeek.showOptionsDropdown($opts, node.id);\n        });\n        $title.appendChild($opts);\n      }\n      $row.appendChild($title);\n      if (propMode && propMode.guid === node.id) {\n        $row.appendChild(buildPropEditor(node, indent));\n      }\n      $row.addEventListener("mouseup", (e) => {\n        if (e.button !== 0 && e.button !== 1) return;\n        hidePeek();\n        setSelection(index);\n        if (e.button === 0 && e.shiftKey) {\n          e.preventDefault();\n          return;\n        }\n        if (e.button === 1 || e.metaKey || e.ctrlKey) {\n          viewContext.openRecordInOtherPanel(node.id);\n        } else {\n          viewContext.openRecordInThisPanel(node.id);\n        }\n        e.preventDefault();\n      });\n      return $row;\n    }, "buildRow");\n    const mount = /* @__PURE__ */ __name(() => {\n      const $element = viewContext.getElement();\n      $element.innerHTML = "";\n      $root = document.createElement("div");\n      $root.className = "outline-root collection-list-view";\n      $zoom = document.createElement("div");\n      $zoom.className = "outline-zoom";\n      $root.appendChild($zoom);\n      $note = document.createElement("div");\n      $note.className = "outline-note";\n      $root.appendChild($note);\n      $list = document.createElement("div");\n      $list.className = "outline-list";\n      $root.appendChild($list);\n      if (viewContext.supportsCreateRecord()) {\n        const $create = document.createElement("button");\n        $create.type = "button";\n        $create.className = "collection-list-create-card";\n        $create.style.paddingLeft = `calc(var(--list-row-overhang) + ${ICON_OFFSET}px)`;\n        $create.appendChild(ui.createIcon("ti-plus"));\n        const $label = document.createElement("span");\n        $label.textContent = `New ${viewContext.getRecordTypeName()}`;\n        $create.appendChild($label);\n        const $kbd = document.createElement("kbd");\n        $kbd.className = "collection-list-create-card-shortcut";\n        $kbd.textContent = "\\u21E7\\u21B5";\n        $create.appendChild($kbd);\n        $create.addEventListener("click", (e) => {\n          e.stopPropagation();\n          createRecord();\n        });\n        $root.appendChild($create);\n      }\n      $element.appendChild($root);\n    }, "mount");\n    return {\n      onLoad: /* @__PURE__ */ __name(() => {\n        if (!plugin.outlineCssInjected) ui.injectCSS(\n          /* css */\n          `\n				.outline-root {\n					position: relative;\n					display: flex;\n					flex-direction: column;\n					font-family: var(--font-sans);\n					font-size: var(--text-size-normal);\n					color: var(--text-default);\n				}\n				.outline-note {\n					font-size: 12px;\n					color: var(--enum-orange-fg, #c60);\n				}\n				.outline-note:empty {\n					display: none;\n				}\n				.outline-zoom {\n					display: flex;\n					align-items: center;\n					min-width: 0;\n					overflow: hidden;\n					margin-bottom: 6px;\n				}\n				.outline-zoom:empty {\n					display: none;\n				}\n				.outline-zoom-sep {\n					flex: none;\n					opacity: .45;\n					font-size: 13px;\n				}\n				.outline-zoom-step {\n					display: inline-flex;\n					flex: 0 1 auto;\n					min-width: 3em;\n					max-width: 16em;\n				}\n				.outline-zoom-step:first-child {\n					flex: none;\n					min-width: 0;\n				}\n				.outline-zoom-step.is-current {\n					flex-shrink: 0.3;\n					font-weight: 600;\n				}\n				.outline-zoom-step > span {\n					overflow: hidden;\n					text-overflow: ellipsis;\n					white-space: nowrap;\n					min-width: 0;\n				}\n				.outline-menu {\n					position: absolute;\n					z-index: 20;\n					min-width: 180px;\n					padding: 4px;\n					background: var(--cmdpal-bg-color);\n					border: 1px solid var(--cmdpal-border-color);\n					border-radius: var(--radius-normal);\n					box-shadow: var(--cmdpal-box-shadow);\n				}\n				.outline-menu.has-filter {\n					min-width: 250px;\n				}\n				.outline-menu-filter {\n					width: 100%;\n					margin-bottom: 4px;\n					background: transparent;\n				}\n				.outline-menu-item {\n					display: flex;\n					align-items: center;\n					gap: 6px;\n					padding: 5px 8px;\n					border-radius: var(--radius-normal);\n					color: var(--cmdpal-fg-color);\n					font-size: var(--text-size-small);\n					cursor: pointer;\n				}\n				.outline-menu-item:hover {\n					background: var(--cmdpal-hover-bg-color);\n					color: var(--cmdpal-hover-fg-color);\n				}\n				/* the current value, as the app\'s .autocomplete--current */\n				.outline-menu-item.is-active {\n					background: var(--cmdpal-current-bg-color);\n					color: var(--cmdpal-current-fg-color);\n					font-weight: 700;\n				}\n				/* the keyboard highlight, as .autocomplete--option-selected */\n				.outline-menu-item.is-selected,\n				.outline-menu-item.is-selected:hover {\n					background: var(--cmdpal-selected-bg-color);\n					color: var(--cmdpal-selected-fg-color);\n				}\n				.outline-pad { flex: none; }\n				/*\n				 * Key hints: our status-bar item is pinned over the bar\'s left\n				 * edge while the app\'s own hints there are hidden. Absolute\n				 * against the bar escapes .statusbar--right\'s overflow clip.\n				 */\n				.outline-keys { display: none !important; }\n				body.${KEYS_BODY_CLASS} .statusbar--status-bar { position: relative; }\n				body.${KEYS_BODY_CLASS} .statusbar--left > * { display: none !important; }\n				body.${KEYS_BODY_CLASS} .outline-keys {\n					display: flex !important;\n					position: absolute;\n					left: 0;\n					top: 0;\n					bottom: 0;\n					align-items: center;\n					margin: 0;\n					padding: 0;\n					overflow: hidden;\n				}\n				.outline-keys .statusbar-item--icon { display: none; }\n				.outline-keys .statusbar-item--label {\n					display: flex;\n					flex-wrap: wrap;\n					align-items: center;\n					column-gap: 5px;\n					row-gap: 20px;\n					height: 19px;\n					overflow: hidden;\n					font-size: 12px;\n				}\n				.outline-list {\n					display: flex;\n					flex-direction: column;\n				}\n				.outline-row {\n					padding: 4px 12px 4px 0;\n					cursor: pointer;\n					user-select: none;\n					border-radius: var(--radius-normal);\n				}\n				.outline-row:hover {\n					background: var(--prop-bg-hover);\n				}\n				.outline-row.selected {\n					background: var(--cards-bg-focused);\n				}\n				.outline-title {\n					display: flex;\n					align-items: center;\n					gap: 6px;\n				}\n				.outline-twisty {\n					display: inline-flex;\n					align-items: center;\n					justify-content: center;\n					width: 16px;\n					height: 16px;\n					flex: 0 0 16px;\n					color: var(--text-muted);\n					border-radius: 3px;\n					position: relative;\n				}\n				/*\n				 * The chevron alone is a 16px target beside a row that opens on\n				 * click, so misses zoom into the page. This invisible box widens\n				 * the target to the full row height, left across the indent to the\n				 * row edge, and right across the gap to the page icon. The\n				 * chevron rotates inside it, not the twisty, so the box stays put.\n				 */\n				.outline-twisty:not(:empty)::before {\n					content: "";\n					position: absolute;\n					top: -7px;\n					bottom: -7px;\n					left: calc(-1 * var(--twisty-reach, 0px));\n					right: -${ROW_GAP}px;\n				}\n				.outline-twisty > * {\n					transition: transform 0.12s ease;\n				}\n				.outline-twisty.expanded > * {\n					transform: rotate(90deg);\n				}\n				.outline-twisty:hover {\n					background: var(--ed-fold-icon-hover-bg);\n				}\n				.outline-icon {\n					color: var(--text-muted);\n					flex: 0 0 auto;\n				}\n				/*\n				 * Our collection-icons fork broadcasts its "Hide icons in\n				 * collection views" switch as this body attribute; honor it so\n				 * the Outline view matches the built-in List view. Inert when\n				 * that plugin is absent \\u2014 the attribute is never set.\n				 */\n				body[data-plg-collection-icons-listview-icons="hide"] .outline-icon {\n					display: none;\n				}\n				.outline-name {\n					flex: 0 1 auto;\n					min-width: 0;\n					font-weight: 600;\n					white-space: nowrap;\n					overflow: hidden;\n					text-overflow: ellipsis;\n				}\n				/*\n				 * A row the filter dropped, kept only to hold a match\'s place.\n				 * Dimmed rather than hidden: it still has to read as the path\n				 * down to the match, and it is still a working row \\u2014 clickable,\n				 * foldable, editable. The matches themselves are left alone, so\n				 * an unfiltered tree looks exactly as it always did.\n				 *\n				 * Recoloring the name alone was not enough to see, at either\n				 * --text-subtle (text-500, one step off the default \\u2014 invisible)\n				 * or --text-muted (text-800). Fading the WHOLE row instead takes\n				 * the name, the icon, the chips and the timestamp down together,\n				 * which is what makes the matched rows pop out of the column; the\n				 * name also loses its bold, so weight carries the same signal\n				 * where a theme\'s colors are close together.\n				 */\n				.outline-row.is-context {\n					opacity: .45;\n				}\n				.outline-row.is-context .outline-name {\n					font-weight: 400;\n				}\n				/* Full strength again on hover or focus \\u2014 a faded row is still a\n				   working row, and it should not look inert while pointed at. */\n				.outline-row.is-context:hover,\n				.outline-row.is-context.selected {\n					opacity: 1;\n				}\n				.outline-count {\n					flex: 0 0 auto;\n					font-size: var(--text-size-small);\n					color: var(--text-subtle);\n				}\n				/*\n				 * A fixed column, not shrink-to-fit: the chips are pushed up\n				 * against the stamp, so a stamp that is one character shorter\n				 * ("1h ago" against "16m ago") would otherwise leave that row\'s\n				 * chips ending at a different x from every other row\'s.\n				 */\n				.outline-time {\n					flex: 0 0 auto;\n					min-width: 8ch;\n					text-align: right;\n					font-size: var(--text-size-small);\n					color: var(--text-muted);\n				}\n				/* Native: .collection-list-card-menu, shown on hover or on the\n				   focused card of a focused view. */\n				/* At the right end of line 1, like native\'s top-right corner. The\n				   chips already push themselves and the stamp right; with none on\n				   the line, the button takes the free space instead (two auto\n				   margins on one line would split it). */\n				.outline-row-menu {\n					flex: 0 0 auto;\n					margin-left: auto;\n					opacity: 0;\n				}\n				.outline-props ~ .outline-row-menu {\n					margin-left: 0;\n				}\n				.outline-row:hover .outline-row-menu,\n				.focused-component .outline-row.selected .outline-row-menu {\n					opacity: 1;\n				}\n				/*\n				 * Chips are pushed to the right, so they and the timestamp read\n				 * as one right-hand column instead of trailing the name at a\n				 * different x on every row.\n				 *\n				 * This is the ONLY auto margin on the line. Giving the stamp one\n				 * as well splits the free space evenly between the two, which\n				 * left the chips floating mid-row at a position that tracked the\n				 * name\'s length \\u2014 the opposite of aligned.\n				 */\n				.outline-props {\n					display: inline-flex;\n					align-items: center;\n					flex: 0 0 auto;\n					gap: 10px;\n					margin-left: auto;\n					padding-right: 10px;\n				}\n				/*\n				 * Two-line fallback: the chips are moved out of the title line\n				 * (restack()), which keeps that line unwrappable \\u2014 the name\n				 * ellipsises and the timestamp stays put, as native does. The\n				 * left offset is set inline, since it follows the row\'s depth.\n				 */\n				/* Wrapped, the chips are left-aligned under the row icon: there\n				   is no stamp on line 2 to align them against, and a lone\n				   right-aligned run reads as belonging to the row below. */\n				.outline-row.is-stacked .outline-props {\n					display: flex;\n					justify-content: flex-start;\n					margin-left: 0;\n					margin-top: 2px;\n					padding-right: 0;\n				}\n				.outline-prop {\n					display: inline-flex;\n					align-items: center;\n					gap: 4px;\n					font-size: var(--text-size-small);\n				}\n				.outline-prop-icon {\n					color: var(--text-xmuted);\n				}\n				.outline-prop-text {\n					color: var(--text-muted);\n				}\n				.outline-pill {\n					border-radius: 4px;\n					padding: 1px 6px;\n				}\n				.outline-link {\n					color: var(--ed-inlineref-fg);\n					border-radius: 4px;\n					padding: 1px 6px;\n					background: var(--ed-backlink-bg);\n				}\n				.outline-link:hover {\n					color: var(--ed-inlineref-hover-color);\n				}\n				.outline-link-arrow {\n					margin-left: 3px;\n					opacity: 0.7;\n				}\n				/* the property list E opens under a row */\n				.outline-propedit {\n					display: flex;\n					flex-direction: column;\n					gap: 1px;\n					margin-top: 4px;\n					padding-bottom: 2px;\n				}\n				.outline-pe-row {\n					display: flex;\n					align-items: center;\n					gap: 6px;\n					padding: 3px 6px;\n					border-radius: var(--radius-normal);\n					font-size: var(--text-size-small);\n					cursor: pointer;\n				}\n				.outline-pe-row:hover {\n					background: var(--prop-bg-hover);\n				}\n				.outline-pe-row.is-selected {\n					background: var(--cmdpal-selected-bg-color);\n					color: var(--cmdpal-selected-fg-color);\n				}\n				.outline-pe-icon {\n					color: var(--text-xmuted);\n					flex: 0 0 auto;\n				}\n				.outline-pe-label {\n					flex: 0 0 140px;\n					color: var(--text-muted);\n					white-space: nowrap;\n					overflow: hidden;\n					text-overflow: ellipsis;\n				}\n				.outline-pe-row.is-selected .outline-pe-label {\n					color: inherit;\n				}\n				.outline-pe-value {\n					flex: 1 1 auto;\n					min-width: 0;\n					white-space: nowrap;\n					overflow: hidden;\n					text-overflow: ellipsis;\n				}\n				.outline-pe-value.is-empty {\n					color: var(--text-xmuted);\n				}\n				.outline-inline-input {\n					flex: 1 1 auto;\n					min-width: 0;\n					padding: 1px 4px;\n					border: var(--input-border-focus);\n					border-radius: 3px;\n					background: var(--panel-bg-color);\n					color: var(--text-default);\n					font-family: var(--font-sans);\n					font-size: inherit;\n					font-weight: inherit;\n					outline: none;\n				}\n				.outline-empty {\n					padding: 40px;\n					text-align: center;\n					color: var(--text-muted);\n				}\n			`\n        );\n        plugin.outlineCssInjected = true;\n        viewContext.makeNormalLayout();\n        mount();\n        document.addEventListener("keydown", onShortcutKey, true);\n      }, "onLoad"),\n      onRefresh: /* @__PURE__ */ __name(({ records }) => {\n        lastRecords = records;\n        takeZoomHandoff();\n        if (pending.size && !settled(records)) return;\n        if (placingGuid && records.some((r) => r.guid === placingGuid)) return;\n        rebuild();\n      }, "onRefresh"),\n      // Width decides which rows stack onto two lines, so every measured\n      // height is suspect after a resize.\n      onPanelResize: /* @__PURE__ */ __name(() => {\n        heightCache.clear();\n        renderWindow(true);\n      }, "onPanelResize"),\n      onDestroy: /* @__PURE__ */ __name(() => {\n        document.removeEventListener("keydown", onShortcutKey, true);\n        stopHintTimer();\n        if (viewFocused) hints.showKeyHints(false);\n        detachScroller();\n        $topPad = $bottomPad = null;\n        closeMenu();\n        hidePeek();\n        propMode = null;\n        pendingNameEditGuid = null;\n        hierarchy = null;\n        rows = [];\n        $root = null;\n        $list = null;\n        $note = null;\n        $zoom = null;\n        $menu = null;\n        lastRecords = null;\n      }, "onDestroy"),\n      // Enter from the sidebar, a click, or a panel switch lands here.\n      onFocus: /* @__PURE__ */ __name(() => {\n        viewFocused = true;\n        syncKeyHints();\n        if (!hintTimer) hintTimer = setInterval(syncKeyHints, 300);\n        if (rows.length) setSelection(selectedIndex);\n      }, "onFocus"),\n      onBlur: /* @__PURE__ */ __name(() => {\n        viewFocused = false;\n        stopHintTimer();\n        hints.showKeyHints(false);\n      }, "onBlur"),\n      onKeyboardNavigation: /* @__PURE__ */ __name(({ e }) => {\n        if ($menu) return;\n        if (!keysAreOurs()) return;\n        const current = rows[selectedIndex];\n        if (!current) return;\n        const plain = !e.metaKey && !e.ctrlKey && !e.altKey;\n        if (propMode) {\n          const fields = editableFields();\n          if (e.key === "ArrowDown" || e.key === "ArrowUp") {\n            e.preventDefault();\n            const step = e.key === "ArrowDown" ? 1 : -1;\n            propMode.index = (propMode.index + step + fields.length) % fields.length;\n            paintPropSelection();\n            return;\n          }\n          if (e.key === "Enter") {\n            e.preventDefault();\n            editSelectedField();\n            return;\n          }\n          if (e.key === "Escape" || e.key === "e" || e.key === "E") {\n            e.preventDefault();\n            exitPropMode();\n            return;\n          }\n          return;\n        }\n        if ((e.key === "e" || e.key === "E") && plain) {\n          e.preventDefault();\n          if (editableFields().length) {\n            propMode = { guid: current.node.id, index: 0 };\n            renderRows();\n            syncKeyHints();\n          }\n          return;\n        }\n        if ((e.key === "r" || e.key === "R" || e.key === "F2") && plain) {\n          e.preventDefault();\n          startNameEdit(current.node, false);\n          return;\n        }\n        if (e.key === "Enter" && e.shiftKey) {\n          e.preventDefault();\n          createBeside("below");\n          return;\n        }\n        if (e.key === "Enter" && e.altKey && !e.metaKey && !e.ctrlKey) {\n          e.preventDefault();\n          createBeside("above");\n          return;\n        }\n        if (e.key === "/" && plain) {\n          if (focusAppSearch()) e.preventDefault();\n          return;\n        }\n        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {\n          e.preventDefault();\n          if (isPeeking()) commitPeek();\n          else openSelected(true);\n          return;\n        }\n        if (e.key === "Escape" && isPeeking()) {\n          e.preventDefault();\n          hidePeek();\n          return;\n        }\n        if (e.key === " ") {\n          e.preventDefault();\n          showPeek();\n          return;\n        }\n        if (e.key === "Tab" && plain) {\n          e.preventDefault();\n          rearrange(e.shiftKey ? "outdent" : "indent");\n          return;\n        }\n        if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {\n          e.preventDefault();\n          rearrange(e.key === "ArrowDown" ? "down" : "up");\n          return;\n        }\n        if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowDown" || e.key === "ArrowUp")) {\n          e.preventDefault();\n          const hasChildren = current.node.children.length > 0;\n          if (e.key === "ArrowDown") {\n            if (hasChildren && !isExpanded(current.node)) toggle(current.node);\n            selectNext(1);\n          } else if (hasChildren && isExpanded(current.node)) {\n            toggle(current.node);\n          } else if (current.parent) {\n            setFolded([current.parent], true);\n            refold(current.parent.id);\n          } else if (selectedIndex === 0) {\n            focusAppSearch();\n          } else {\n            selectNext(-1);\n          }\n          return;\n        }\n        switch (e.key) {\n          case "ArrowDown":\n            e.preventDefault();\n            selectNext(1);\n            break;\n          case "ArrowUp":\n            e.preventDefault();\n            if (selectedIndex === 0) focusAppSearch();\n            else selectNext(-1);\n            break;\n          // \u2190/\u2192 cycle rows like \u2191/\u2193 do. They also have to be swallowed:\n          // left alone, the app moves the panel left/right.\n          case "ArrowRight":\n            e.preventDefault();\n            selectNext(1);\n            break;\n          case "ArrowLeft":\n            e.preventDefault();\n            selectNext(-1);\n            break;\n          case "Home":\n            e.preventDefault();\n            setSelection(0);\n            break;\n          case "End":\n            e.preventDefault();\n            setSelection(rows.length - 1);\n            break;\n          case "Enter":\n            e.preventDefault();\n            if (isPeeking()) commitPeek();\n            else openSelected(false);\n            break;\n        }\n      }, "onKeyboardNavigation")\n    };\n  }\n  __name(createOutlineView, "createOutlineView");\n\n  // collection/no-extras.js\n  function no_extras_default() {\n  }\n  __name(no_extras_default, "default");\n\n  // collection/plugin.js\n  var Plugin = class extends CollectionPlugin {\n    static {\n      __name(this, "Plugin");\n    }\n    onLoad() {\n      this.hints = new KeyHints(this.ui);\n      this.registerOutlineViews();\n      no_extras_default(this);\n    }\n    onUnload() {\n      this.hints.dispose();\n    }\n    /**\n     * Register every Outline view in the collection, whatever its id: a fixed id\n     * would come unhooked by a rename or a hand-made second view. This runs on\n     * every rebuild of the collection plugin (each config save makes a new one),\n     * so a view added in settings is picked up without further action.\n     */\n    registerOutlineViews() {\n      const views = (this.getConfiguration().views || []).filter(isOutlineView);\n      for (const view of views) {\n        this.views.register(view.id, (viewContext) => createOutlineView(\n          viewContext,\n          { plugin: this, view, nativeView: this.pendingNativeView || null },\n          this.hints\n        ));\n        this.captureNativeView(view.id);\n      }\n    }\n    /**\n     * Not SDK: the SDK plugin class extends the app\'s internal collection plugin,\n     * so `customViewHooks` is the Map views.register() writes into, and the app\n     * calls each entry with its internal records view. register() drops that\n     * argument, so wrap the entry and park the view for the factory above, which\n     * runs synchronously inside it. Missing internals leave nativeView null.\n     */\n    captureNativeView(viewId) {\n      const hooks = this.customViewHooks;\n      const make = hooks instanceof Map ? hooks.get(viewId) : null;\n      if (typeof make !== "function") return;\n      hooks.set(viewId, (view) => {\n        this.pendingNativeView = view;\n        try {\n          return make(view);\n        } finally {\n          this.pendingNativeView = null;\n        }\n      });\n    }\n  };\n  return __toCommonJS(plugin_exports);\n})();\n';

  // global/plugin.js
  var PANEL_ID = "outline-installer";
  var STUB = "class Plugin extends CollectionPlugin {\n  onLoad() {\n    // Put your custom code here...\n  }\n}\n";
  var isStub = /* @__PURE__ */ __name((code) => !code || !code.trim() || code.includes("// Put your custom code here"), "isStub");
  var EXTRAS_MARKER = "outline-extras:";
  var subPageField = /* @__PURE__ */ __name((collectionGuid) => ({
    id: SUBPAGE,
    label: "Sub-page of",
    many: false,
    read_only: false,
    active: true,
    type: "record",
    filter_colguid: collectionGuid
  }), "subPageField");
  var ORDER_LABEL = "Order";
  var newFieldId = /* @__PURE__ */ __name(() => {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const bytes = crypto.getRandomValues(new Uint8Array(14));
    return "f" + Array.from(bytes, (b) => alphabet[b % 32]).join("");
  }, "newFieldId");
  var orderFieldEntry = /* @__PURE__ */ __name((id) => ({
    id,
    label: ORDER_LABEL,
    icon: "ti-list-tree",
    many: false,
    read_only: true,
    active: true,
    type: "number"
  }), "orderFieldEntry");
  var VIEW_ENTRY = {
    id: "outline",
    label: "Outline",
    type: "custom",
    icon: "ti-list-tree",
    shown: true,
    description: "",
    query: "",
    read_only: false,
    opts: {},
    field_ids: ["title"],
    group_by_field_id: null,
    sort_field_id: "title",
    sort_dir: "asc"
  };
  var ROOT_CLASS = "hier-crumbs";
  var ACTIONS_CLASS = "hier-actions";
  var STYLE_ID = "hier-style";
  var PICKER_ID = "hier-picker";
  var CSS = `
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
  var Plugin = class extends AppPlugin {
    static {
      __name(this, "Plugin");
    }
    onLoad() {
      this.ui.registerCustomPanelType(PANEL_ID, (panel) => {
        panel.setTitle("Install Outline view");
        this.render(panel);
      });
      this.ui.addCommandPaletteCommand({
        label: "Outline: install into a collection...",
        icon: "ti-list-tree",
        onSelected: /* @__PURE__ */ __name(() => this.open(), "onSelected")
      });
      this.loadHierarchy();
    }
    async open() {
      const panel = await this.ui.createPanel();
      if (panel) panel.navigateToCustomType(PANEL_ID);
    }
    onUnload() {
      clearTimeout(this._timer);
      for (const id of this._handlers || []) this.events.off(id);
      for (const obs of this._observers?.values() || []) obs.disconnect();
      document.querySelectorAll(`.${ROOT_CLASS}, .${ACTIONS_CLASS}, #${PICKER_ID}, .hier-menu`).forEach((n) => n.remove());
      document.getElementById(STYLE_ID)?.remove();
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
      return subPagesOn(api.getConfiguration());
    }
    /** The collection's Outline views, if its code slot holds the Outline code. */
    ourViews(api) {
      if (!this.code(api).includes(OUTLINE_SIGNATURE)) return [];
      return (api.getConfiguration().views || []).filter(isOutlineView);
    }
    code(api) {
      return (api.getExistingCodeAndConfig() || {}).code || "";
    }
    /**
     * What the collection's code slot holds:
     *
     *   'current'   this build of the Outline code
     *   'outdated'  another build of it
     *   'merged'    the Outline code with somebody's additions built in
     *   'free'      nothing, or the app's placeholder
     *   'occupied'  somebody else's code
     *
     * Why it matters: saveCode() REPLACES a collection's code outright, there is
     * no merge. Writing over a collection that has formulas or a custom record
     * title would delete them, so only 'free', 'outdated' and 'current' slots are
     * ever written.
     */
    codeState(api) {
      const code = this.code(api);
      if (code.trim() === collection_code_default.trim()) return "current";
      if (code.includes(OUTLINE_SIGNATURE)) return code.includes(EXTRAS_MARKER) ? "merged" : "outdated";
      return isStub(code) ? "free" : "occupied";
    }
    status(api) {
      return {
        name: api.getName(),
        subPages: this.hasSubPages(api),
        views: (api.getConfiguration().views || []).filter(isOutlineView).length,
        // What Install would still change in the config; empty when it's all set up.
        steps: this.plan(api).steps,
        code: this.codeState(api)
      };
    }
    // --- installer actions --------------------------------------------------
    /**
     * What Install would change in a collection's config to reach: sub-pages on,
     * an active read-only Order property, and an Outline view sorted by it and
     * bound to it (opts.order_field_id). `conf` is a copy of the config with those
     * changes made, `steps` one entry per change: what it concerns and the line
     * Install logs for it. No steps: nothing to change. The status row and
     * install() both read this, so they can't disagree.
     */
    plan(api) {
      const conf = JSON.parse(JSON.stringify(api.getConfiguration()));
      const steps = [];
      const ours = (conf.views || []).filter(isOutlineView);
      if (!subPagesOn(conf)) {
        steps.push({ what: "subpages", log: "Turning on sub-pages..." });
        const old = (conf.fields || []).find((f) => f.id === SUBPAGE);
        if (old) old.active = true;
        else conf.fields = (conf.fields || []).concat([subPageField(api.getGuid())]);
      }
      const fields = conf.fields || [];
      const bound = ours.map((v) => v.opts && v.opts.order_field_id).find(Boolean);
      let order = fields.find((f) => f.id === bound && f.type === "number") || fields.find((f) => f.type === "number" && (f.label || "").trim().toLowerCase() === ORDER_LABEL.toLowerCase());
      if (!order) {
        steps.push({ what: "order", log: `Adding the ${ORDER_LABEL} property...` });
        const taken = new Set(fields.map((f) => f.id));
        let id;
        do
          id = newFieldId();
        while (taken.has(id));
        order = orderFieldEntry(id);
        conf.fields = fields.concat([order]);
      } else if (order.active === false) {
        steps.push({ what: "order", log: `Restoring the ${order.label} property...` });
        order.active = true;
      }
      if (order.read_only !== true) {
        steps.push({ what: "order", log: `Making the ${order.label} property read-only...` });
        order.read_only = true;
      }
      if (!ours.length) {
        steps.push({ what: "view", log: `Adding the Outline view, sorted by ${order.label}...` });
        const taken = new Set((conf.views || []).map((v) => v.id));
        let id = VIEW_ENTRY.id;
        for (let n = 2; taken.has(id); n++) id = `${VIEW_ENTRY.id}${n}`;
        conf.views = (conf.views || []).concat([Object.assign({}, VIEW_ENTRY, {
          id,
          sort_field_id: order.id,
          sort_dir: "asc",
          opts: { order_field_id: order.id }
        })]);
      } else {
        for (const v of ours) {
          const opts = v.opts || {};
          if (opts.order_field_id === order.id) continue;
          steps.push({ what: "order", log: `Binding the ${v.label} view to ${order.label}...` });
          v.opts = Object.assign({}, opts, { order_field_id: order.id });
        }
      }
      return { conf, steps };
    }
    /**
     * Brings a collection to: sub-pages on, an Order property, one Outline view
     * sorted by it and bound to it (opts.order_field_id), the current code.
     * Running it twice changes nothing the second time.
     */
    async install(guid, log) {
      let api = this.resolve(guid);
      if (!api) {
        log("That collection is gone.");
        return;
      }
      if (this.codeState(api) === "occupied") {
        log("This collection has code of its own, and installing would replace it. Nothing was written.");
        return;
      }
      const { conf, steps } = this.plan(api);
      for (const step of steps) log(step.log);
      if (steps.length) {
        api = await this.saveConfig(api, conf, guid, log);
        if (!api) return;
      }
      const state = this.codeState(api);
      if (state === "merged") {
        log("Left the code alone: it has other code merged in. Update it by rebuilding with your additions.");
      } else if (state === "current") {
        log("Code is already up to date.");
      } else {
        log(state === "outdated" ? "Updating the view code..." : "Writing the view code...");
        if (!await this.writeCode(api, collection_code_default, log)) return;
        log("Done. Open the collection and click the Outline tab.");
      }
      this.buildIndex();
    }
    /**
     * Save a collection config and hand back a fresh handle (the old one is
     * stale after any write), or null after logging why not. A refused save is
     * reported as a refusal: saveConfiguration() returns false when the user
     * lacks permission on the collection, it does not throw, so an unchecked
     * call reports success and writes nothing.
     */
    async saveConfig(api, conf, guid, log) {
      if (!await api.saveConfiguration(conf)) {
        log("The workspace refused that change. You may not have permission to edit this collection.");
        return null;
      }
      const fresh = this.resolve(guid);
      if (!fresh) log("That collection is gone.");
      return fresh;
    }
    /** Write the collection's plugin code; false, after logging, when the app refuses. */
    async writeCode(api, source, log) {
      if (await api.saveCode(source)) return true;
      log("The workspace refused that change. You may not have permission to edit this plugin.");
      return false;
    }
    /**
     * Removes the Outline views, and the code when it is only the Outline code.
     * Never touches sub-pages or the Order property: they hold the data.
     */
    async uninstall(guid, log) {
      let api = this.resolve(guid);
      if (!api) {
        log("That collection is gone.");
        return;
      }
      const state = this.codeState(api);
      const conf = api.getConfiguration();
      const mine = (conf.views || []).filter(isOutlineView);
      if (mine.length) {
        log(`Removing ${mine.length} Outline view(s)...`);
        conf.views = conf.views.filter((v) => !isOutlineView(v));
        api = await this.saveConfig(api, conf, guid, log);
        if (!api) return;
      }
      if (state === "current" || state === "outdated") {
        log("Clearing the view code...");
        if (!await this.writeCode(api, STUB, log)) return;
      } else {
        log("Left the code alone: it is not only the Outline code.");
      }
      log("Sub-pages and the Order property are untouched.");
      this.buildIndex();
    }
    // --- hierarchy: breadcrumb and page commands -----------------------------
    loadHierarchy() {
      this._handlers = [];
      this._observers = /* @__PURE__ */ new Map();
      this._timer = 0;
      this._index = /* @__PURE__ */ new Map();
      if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        document.head.appendChild(style);
      }
      const commands = [
        ["show", "Show this page", "ti-list-tree", () => this.openOutline()],
        ["newchild", "New child page\u2026", "ti-plus", () => this.newPage("child")],
        ["newsibling", "New sibling page\u2026", "ti-plus", () => this.newPage("sibling")],
        ["move", "Move page under\u2026", "ti-arrows-move", () => this.moveUnder()]
      ];
      this._actions = commands.map(([id, , , run]) => [`plugin.outline${id}`, run]);
      for (const [, label, icon, run] of commands) {
        this.ui.addCommandPaletteCommand({ label: `Outline: ${label}`, icon, onSelected: run });
      }
      for (const ev of ["panel.navigated", "panel.focused"]) {
        this._handlers.push(this.events.on(ev, () => this.schedule()));
      }
      this._handlers.push(this.events.on("panel.closed", (ev) => {
        const id = ev.panel?.getId?.();
        this._observers.get(id)?.disconnect();
        this._observers.delete(id);
      }));
      this._handlers.push(this.events.on("record.updated", () => this.schedule(), { collection: "*" }));
      for (const ev of ["record.created", "record.moved"]) {
        this._handlers.push(this.events.on(ev, (e) => this.onRecordPlaced(e), { collection: "*" }));
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
      const index = /* @__PURE__ */ new Map();
      const apis = (await this.data.getAllCollections()).filter((api) => this.hierarchyOf(api));
      const lists = await Promise.all(apis.map((api) => api.getAllRecords()));
      apis.forEach((api, i) => {
        for (const r of lists[i]) index.set(r.guid, api.getGuid());
      });
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
      return [...ancestorsOf(record, SUBPAGE)].reverse();
    }
    schedule() {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.renderCrumbs(), 30);
    }
    renderCrumbs() {
      for (const panel of this.ui.getPanels?.() ?? []) {
        let record = null, root = null;
        try {
          record = panel.getActiveRecord();
        } catch {
        }
        try {
          root = panel.getElement();
        } catch {
        }
        if (!root) continue;
        try {
          this.renderCrumb(panel, record, root, root.closest(".panel") ?? root);
        } catch (e) {
          console.warn("[outline]", e);
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
        this._observers.get(panel.getId())?.disconnect();
        this._observers.delete(panel.getId());
        return;
      }
      this.observe(panel, frame);
      if (!oldActions) {
        const box = el("div", root);
        box.className = ACTIONS_CLASS;
        for (const [action, run] of this._actions) {
          const b = el("button", box);
          b.setAttribute("data-action", action);
          b.addEventListener("click", run);
        }
      }
      const ancestors = this.ancestors(record);
      const key = record.guid + "|" + ancestors.map((a) => a.guid + ":" + (a.getName() ?? "")).join("|");
      if (old && old.dataset.key === key && old.isConnected) return;
      const host = frame.querySelector(".panel-context-row");
      if (!host) return;
      const crumbs = el("span");
      crumbs.className = ROOT_CLASS;
      crumbs.dataset.key = key;
      const hidden = ancestors.length > 3 ? ancestors.slice(1, -2) : [];
      const shown = hidden.length ? [ancestors[0], null, ...ancestors.slice(-2)] : ancestors;
      for (const a of shown) {
        const sep = el("span", crumbs);
        sep.className = "hier-sep ti ti-chevron-right";
        const crumb = el("button", crumbs);
        crumb.type = "button";
        crumb.className = "button-minimal button-small hier-crumb" + (a ? "" : " is-more");
        el("span", crumb, a ? a.getName() || "Untitled" : "\u2026");
        crumb.title = a ? a.getName() ?? "" : hidden.map((h) => h.getName()).join(" \u203A ");
        crumb.addEventListener("click", (e) => {
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
      document.querySelector(".hier-menu")?.remove();
      const menu = el("div");
      menu.className = "hier-menu";
      records.forEach((r, i) => {
        const b = el("button", menu, r.getName() || "Untitled");
        b.type = "button";
        b.className = "button-minimal button-small";
        b.style.paddingLeft = `${8 + i * 12}px`;
        b.title = r.getName() ?? "";
        b.addEventListener("click", (e) => {
          close();
          this.openPage(panel, r.guid, e.metaKey || e.ctrlKey);
        });
      });
      const rect = anchor.getBoundingClientRect();
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom + 4}px`;
      const close = /* @__PURE__ */ __name(() => {
        menu.remove();
        document.removeEventListener("mousedown", outside, true);
        document.removeEventListener("keydown", esc, true);
      }, "close");
      const outside = /* @__PURE__ */ __name((e) => {
        if (!menu.contains(e.target)) close();
      }, "outside");
      const esc = /* @__PURE__ */ __name((e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }, "esc");
      document.addEventListener("mousedown", outside, true);
      document.addEventListener("keydown", esc, true);
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
      if (aside) target = await this.ui.createPanel({ afterPanel: panel }) ?? panel;
      target.navigateTo({ type: "edit_panel", rootId: guid, subId: null, workspaceGuid: this.getWorkspaceGuid() });
      if (aside) this.ui.setActivePanel(target);
    }
    /** The active panel's page and its hierarchy context, or null (with a toast). */
    activePage() {
      const panel = this.ui.getActivePanel();
      const record = panel?.getActiveRecord() ?? null;
      const ctx = this.context(record);
      if (!ctx) {
        this.toast("This page isn't in a collection with an Outline view.");
        return null;
      }
      return { panel, record, ctx };
    }
    toast(message) {
      this.ui.addToaster({ title: "Outline", message, dismissible: true, autoDestroyTime: 3500 });
    }
    async newPage(kind) {
      const a = this.activePage();
      if (!a) return;
      const parent = kind === "child" ? a.record : this.parentOf(a.record);
      const where = parent ? `under ${parent.getName() || "Untitled"}` : "at the top level";
      const title = await this.prompt(`New page ${where}`);
      if (!title) return;
      const guid = a.ctx.collection.createRecord(title);
      if (!guid) return;
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
      const banned = new Set(subtreeRecords(all, a.record, SUBPAGE).map((r) => r.guid));
      const current = this.parentOf(a.record)?.guid ?? null;
      const options = all.filter((r) => !banned.has(r.guid) && r.guid !== current).map((r) => ({
        guid: r.guid,
        title: r.getName() || "Untitled",
        path: this.ancestors(r).map((x) => x.getName() || "Untitled").join(" \u203A ")
      }));
      if (current) options.unshift({ guid: null, title: "Top level", path: "Remove the parent" });
      const pick = await this.pick(`Move "${a.record.getName() || "Untitled"}" under\u2026`, options);
      if (pick === void 0) return;
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
      a.panel.navigateTo({ type: "overview", rootId: collection, subId: a.ctx.viewId, workspaceGuid: this.getWorkspaceGuid() });
    }
    /** Free-text prompt. Resolves to the trimmed text, or null on Escape / empty. */
    prompt(heading) {
      return this.overlay(heading, null).then((v) => v === void 0 ? null : v);
    }
    /** Fuzzy pick from [{guid, title, path}]. Resolves to the guid (null allowed), or undefined. */
    pick(heading, options) {
      return this.overlay(heading, options);
    }
    overlay(heading, options) {
      document.getElementById(PICKER_ID)?.remove();
      const prevFocus = document.activeElement;
      return new Promise((resolve) => {
        const wrap = el("div");
        wrap.id = PICKER_ID;
        const box = el("div", wrap);
        box.className = "hier-box";
        el("div", box, heading).className = "hier-head";
        const input = el("input", box);
        input.type = "text";
        input.spellcheck = false;
        const list = el("div", box);
        list.className = "hier-list";
        input.placeholder = options ? "Search pages\u2026" : "Title";
        let shown = [];
        let sel = 0;
        const tail = /* @__PURE__ */ __name((path) => {
          const parts = path.split(" \u203A ");
          let out = parts.pop() ?? "";
          while (parts.length && out.length + parts[parts.length - 1].length < 90) out = parts.pop() + " \u203A " + out;
          return parts.length ? "\u2026 \u203A " + out : out;
        }, "tail");
        const done = /* @__PURE__ */ __name((value) => {
          wrap.remove();
          try {
            prevFocus?.focus?.();
          } catch {
          }
          resolve(value);
        }, "done");
        const draw = /* @__PURE__ */ __name(() => {
          if (!options) return;
          const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
          const esc = /* @__PURE__ */ __name((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "esc");
          const starts = terms.map((t) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(t)}`, "iu"));
          shown = options.filter((o) => {
            o._hay ??= (o.title + " " + o.path).toLowerCase();
            return terms.every((t) => o._hay.includes(t));
          });
          const score = /* @__PURE__ */ __name((o) => starts.reduce((n, re) => n + (re.test(o.title) ? 3 : re.test(o.path) ? 1 : 0), 0), "score");
          for (const o of shown) o._score = score(o);
          shown.sort((x, y) => y._score - x._score || x.path.length - y.path.length);
          shown = shown.slice(0, 60);
          sel = Math.min(sel, Math.max(0, shown.length - 1));
          list.textContent = "";
          if (!shown.length) {
            el("div", list, "No matches").className = "hier-empty";
            return;
          }
          shown.forEach((o, i) => {
            const row = el("div", list);
            row.className = "hier-opt" + (i === sel ? " is-sel" : "");
            el("div", row, o.title).className = "hier-opt-title";
            el("div", row, tail(o.path) || "Top level").className = "hier-opt-path";
            row.addEventListener("mousedown", (e) => {
              e.preventDefault();
              done(o.guid);
            });
          });
          list.children[sel]?.scrollIntoView({ block: "nearest" });
        }, "draw");
        input.addEventListener("input", () => {
          sel = 0;
          draw();
        });
        input.addEventListener("keydown", (e) => {
          e.stopPropagation();
          if (e.key === "Escape") {
            e.preventDefault();
            done(void 0);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (!options) done(input.value.trim() || void 0);
            else if (shown[sel]) done(shown[sel].guid);
          } else if (options && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            if (!shown.length) return;
            list.children[sel].classList.remove("is-sel");
            sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
            list.children[sel].classList.add("is-sel");
            list.children[sel].scrollIntoView({ block: "nearest" });
          }
        });
        wrap.addEventListener("mousedown", (e) => {
          if (e.target === wrap) done(void 0);
        });
        document.body.appendChild(wrap);
        draw();
        input.focus();
      });
    }
    // --- installer panel ----------------------------------------------------
    async render(panel) {
      const root = panel.getElement();
      if (!root) return;
      while (root.firstChild) root.removeChild(root.firstChild);
      const wrap = el("div", root);
      wrap.style.cssText = "padding:24px;max-width:760px;margin:0 auto;";
      const h = el("h2", wrap, "Install the Outline view");
      h.style.cssText = "margin:0 0 4px;";
      const sub = el("p", wrap, "Pick a collection. Installing turns on sub-pages, adds an Order property and an Outline view sorted by it, and writes the view code.");
      sub.style.cssText = "margin:0 0 20px;opacity:.7;";
      let collections = [];
      try {
        collections = await this.data.getAllCollections();
      } catch (err) {
        el("p", wrap, `Could not read collections: ${String(err)}`);
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
      const box = el("div", parent);
      box.style.cssText = "display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid var(--border-color,rgba(128,128,128,.25));";
      this.paintRow(box, guid, []);
    }
    paintRow(box, guid, notes) {
      while (box.firstChild) box.removeChild(box.firstChild);
      const api = this.resolve(guid);
      if (!api) return;
      const s = this.status(api);
      const left = el("div", box);
      left.style.cssText = "flex:1;min-width:0;";
      const title = el("div", left, s.name);
      title.style.cssText = "font-weight:600;";
      const bits = [];
      bits.push(s.subPages ? "sub-pages on" : "sub-pages off");
      bits.push(s.views ? "Outline view" : "no Outline view");
      if (s.views && s.steps.some((step) => step.what === "order")) bits.push("Order property not set up");
      bits.push({
        current: "view code installed",
        outdated: "older view code installed",
        merged: "view code installed, with other code merged in",
        free: "no code",
        occupied: "has other code"
      }[s.code]);
      const meta = el("div", left, bits.join(" \xB7 "));
      meta.style.cssText = "font-size:12px;opacity:.7;margin-top:2px;";
      const caution = s.code === "occupied" ? `This collection has code of its own, and a collection holds only one piece of code, so Outline can't be installed here without replacing it. To have both, build the Outline code with yours merged in (README: "Other code in the same collection") and paste that in; this row then offers the rest of the setup.` : s.code === "merged" ? "The installer sets up the properties and the view here but never writes this code. Update it by rebuilding with your additions." : "";
      if (caution) {
        const warn = el("div", left, caution);
        warn.style.cssText = "font-size:12px;margin-top:4px;color:var(--enum-orange-fg,#c60);";
      }
      for (const note of notes) {
        const line = el("div", left, note);
        line.style.cssText = "font-size:12px;margin-top:4px;opacity:.85;";
      }
      if (s.code === "occupied") return;
      const run = /* @__PURE__ */ __name((label, fn, primary) => {
        const btn = el("button", box, label);
        if (primary) btn.className = "button-primary";
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          const log = [];
          const push = /* @__PURE__ */ __name((m) => {
            log.push(m);
            this.paintRow(box, guid, log);
          }, "push");
          try {
            await fn(guid, push);
          } catch (err) {
            log.push(`Failed: ${String(err)}`);
          }
          this.paintRow(box, guid, log);
          setTimeout(() => this.paintRow(box, guid, log), 500);
        });
        return btn;
      }, "run");
      const hasCode = s.code !== "free";
      const present = s.views > 0 && hasCode;
      const complete = present && !s.steps.length && s.code !== "outdated";
      if (!complete) {
        run(
          s.code === "outdated" ? "Update" : present ? "Repair" : "Install",
          (g, l) => this.install(g, l),
          true
        );
      }
      if (present) run("Remove", (g, l) => this.uninstall(g, l), false);
      if (complete) {
        const ok = el("div", box, "Installed");
        ok.style.cssText = "font-size:12px;opacity:.6;align-self:center;";
      }
    }
  };
  function el(tag, parent, text) {
    const node = document.createElement(tag);
    if (text !== void 0) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  __name(el, "el");
  return __toCommonJS(plugin_exports);
})();

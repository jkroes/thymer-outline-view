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

  // collection/plugin.js
  var plugin_exports = {};
  __export(plugin_exports, {
    Plugin: () => Plugin
  });

  // view.js
  var ENUM_COLORS = [
    "red",
    "orange",
    "green",
    "cyan",
    "blue",
    "purple",
    "pink",
    "fuchsia",
    "rose",
    "stone",
    "teal",
    "sky",
    "indigo",
    "zinc",
    "yellow"
  ];
  function timeAgo(date) {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1e3);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }
  __name(timeAgo, "timeAgo");
  function withAncestors(records, parentFieldId) {
    const byGuid = new Map(records.map((record) => [record.guid, record]));
    const added = /* @__PURE__ */ new Set();
    if (parentFieldId) {
      records.forEach((record) => {
        for (const parent of ancestorsOf(record, parentFieldId)) {
          if (byGuid.has(parent.guid)) break;
          byGuid.set(parent.guid, parent);
          added.add(parent.guid);
        }
      });
    }
    return { records: Array.from(byGuid.values()), added };
  }
  __name(withAncestors, "withAncestors");
  function buildHierarchy(records, parentFieldId) {
    const nodes = /* @__PURE__ */ new Map();
    records.forEach((record) => {
      const parent = parentFieldId ? record.linkedRecord(parentFieldId) : null;
      nodes.set(record.guid, {
        id: record.guid,
        name: record.getName() || "Unknown",
        parentGuid: parent ? parent.guid : null,
        record,
        children: []
      });
    });
    const rootNodes = [];
    nodes.forEach((node) => {
      if (node.parentGuid && nodes.has(node.parentGuid)) {
        nodes.get(node.parentGuid).children.push(node);
      } else {
        rootNodes.push(node);
      }
    });
    const reachable = /* @__PURE__ */ new Set();
    const walk = /* @__PURE__ */ __name((node) => {
      if (reachable.has(node.id)) return;
      reachable.add(node.id);
      node.children.forEach(walk);
    }, "walk");
    rootNodes.forEach(walk);
    nodes.forEach((node) => {
      if (!reachable.has(node.id)) {
        const parent = nodes.get(node.parentGuid);
        if (parent) {
          parent.children = parent.children.filter((c) => c !== node);
        }
        rootNodes.push(node);
        walk(node);
      }
    });
    return { nodes, rootNodes };
  }
  __name(buildHierarchy, "buildHierarchy");
  var SUBPAGE = "parent_page";
  var isOutlineView = /* @__PURE__ */ __name((v) => v.type === "custom" && (!(v.opts && v.opts.kind) || v.opts.kind === "outline"), "isOutlineView");
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
  var KEY_MODIFIERS = ["Meta", "Ctrl", "Alt", "Shift"];
  var NAMED_KEYS = [
    "Escape",
    "Enter",
    "Tab",
    "Space",
    "Backspace",
    "Delete",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
    "NumpadEnter",
    "Insert"
  ];
  function normalizeKey(s) {
    const parts = s.split("+").map((p) => p.trim());
    if (parts.some((p) => !p)) return null;
    const mods = /* @__PURE__ */ new Set();
    for (const p of parts.slice(0, -1)) {
      const m = KEY_MODIFIERS.find((k) => k.toLowerCase() === p.toLowerCase());
      if (!m) return null;
      mods.add(m);
    }
    let key = parts[parts.length - 1];
    if (/\p{So}/u.test(key)) return null;
    if (key.length === 1) key = key.toUpperCase();
    else key = { copy: "C", cut: "X", paste: "V" }[key.toLowerCase()] || NAMED_KEYS.find((k) => k.toLowerCase() === key.toLowerCase());
    return key ? [...KEY_MODIFIERS.filter((m) => mods.has(m)), key].join("+") : null;
  }
  __name(normalizeKey, "normalizeKey");
  var CODE_KEYS = {
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Semicolon: ";",
    Quote: "'",
    Backquote: "`",
    Backslash: "\\",
    Comma: ",",
    Period: ".",
    Slash: "/"
  };
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
  function eventKeyName(e) {
    if (e.isComposing || e.key === "Dead") return "";
    const mods = (e.metaKey ? "Meta+" : "") + (e.ctrlKey ? "Ctrl+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "");
    if (e.code === "BracketLeft") return mods + "[";
    if (e.code === "BracketRight") return mods + "]";
    if (e.code === "Space") return mods + "Space";
    if (!e.key || e.key.length !== 1) return mods + e.key;
    const c = e.key.charCodeAt(0);
    if (c >= 32 && c <= 126) return mods + e.key.toUpperCase();
    let k = /^Key([A-Z])$/.exec(e.code)?.[1];
    const digit = /^Digit(\d)$/.exec(e.code)?.[1];
    if (digit) k = e.shiftKey ? ")!@#$%^&*("[Number(digit)] : digit;
    k ??= (e.shiftKey ? SHIFTED_CODE_KEYS : CODE_KEYS)[e.code];
    return mods + (k || e.key.toUpperCase());
  }
  __name(eventKeyName, "eventKeyName");
  function parseShortcuts(source) {
    const entries = [];
    if (/^\{\s*\}$/.test(source.trim())) return entries;
    for (const raw of source.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("//") || line === "{" || line === "}") continue;
      const m = line.match(/^(?:"(?<action>[^"]*)"|'(?<action>[^']*)')\s*:\s*(?:"(?<key>[^"]*)"|'(?<key>[^']*)')\s*,?/);
      const rest = m && line.slice(m[0].length).trim();
      if (!m || rest && !rest.startsWith("//")) return null;
      const { action, key } = m.groups;
      if (!action && !key) return null;
      if (action && !action.includes(".")) return null;
      const normalized = key ? normalizeKey(key) : "";
      if (normalized === null) return null;
      entries.push({ action: action.toLowerCase(), key: normalized });
    }
    return entries;
  }
  __name(parseShortcuts, "parseShortcuts");
  var internalsChecked = false;
  var internalsWaits = 0;
  function accountShortcuts() {
    let root = window.g_focusedComponent;
    while (root?.parent) root = root.parent;
    const user = root?.sideBar?.activeUser;
    if (!user) return void 0;
    const settings = user.acct_json;
    return settings && typeof settings === "object" ? settings.kbd || {} : null;
  }
  __name(accountShortcuts, "accountShortcuts");
  var keymapSource = null;
  var keymap = null;
  function foldKeymap() {
    const source = accountShortcuts()?.[KBD_SLOT] || "";
    if (keymap && source === keymapSource) return keymap;
    const keys = { ...DEFAULT_KEYS };
    for (const { action, key } of parseShortcuts(source) || []) {
      if (key) {
        for (const a in keys) if (keys[a] === key && a !== action) keys[a] = "";
      }
      if (action in keys) keys[action] = key;
    }
    const byKey = /* @__PURE__ */ new Map();
    for (const a in keys) if (keys[a]) byKey.set(keys[a], a);
    keymapSource = source;
    keymap = { keys, byKey };
    return keymap;
  }
  __name(foldKeymap, "foldKeymap");
  var KEY_GLYPHS = {
    Space: "Space",
    ArrowRight: "\u2192",
    ArrowLeft: "\u2190",
    Escape: "Esc",
    Enter: "\u21B5",
    Tab: "\u21E5",
    ArrowUp: "\u2191",
    ArrowDown: "\u2193",
    PageUp: "PgUp",
    PageDown: "PgDn",
    Delete: "Del",
    Backspace: IS_MAC ? "\u232B" : "Bksp"
  };
  var SHIFTED_CHARS = /* @__PURE__ */ new Set([...Object.values(SHIFTED_CODE_KEYS), ...")!@#$%^&*("]);
  function keyLabel(key) {
    if (!key) return "";
    let parts = key.split("+");
    const last = parts.pop();
    if (SHIFTED_CHARS.has(last)) parts = parts.filter((m) => m !== "Shift");
    const k = KEY_GLYPHS[last] || last;
    if (!IS_MAC) return [...parts.map((m) => m === "Meta" ? "Ctrl" : m), k].join("+");
    const glyph = { Meta: "\u2318", Ctrl: "\u2303", Alt: "\u2325", Shift: "\u21E7" };
    return parts.map((m) => glyph[m]).join("") + k;
  }
  __name(keyLabel, "keyLabel");
  var KBDMOD_GLYPHS = /* @__PURE__ */ new Set(["\u232B", "\u2326", "\u21B5", "\u21E7", "\u2303", "\u2325", "\u2318", "\u2192", "\u2190", "\u2191", "\u2193", "\u2195", "\u2194", "\u21E5"]);
  function kbdHtml(text) {
    const esc = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return Array.from(text, (c) => KBDMOD_GLYPHS.has(c) ? `<span class="kbdmod ${IS_MAC ? "kbdmod-mac" : ""}">${c}</span>` : esc[c] || c).join("");
  }
  __name(kbdHtml, "kbdHtml");
  var KEYS_BODY_CLASS = "plg-outline-keys";
  function keyHints(mode, zoomed, itemName) {
    const cmd = IS_MAC ? "\u2318" : "Ctrl+";
    const shift = IS_MAC ? "\u21E7" : "Shift+";
    const { keys } = foldKeymap();
    const up = keys["nav.unfoldcascade"], down = keys["nav.foldcascade"];
    const modsOf = /* @__PURE__ */ __name((k) => k.split("+").slice(0, -1).join("+"), "modsOf");
    const cascade = up && down && modsOf(up) === modsOf(down) ? keyLabel(up) + keyLabel(down.split("+").pop()) : [up, down].filter(Boolean).map(keyLabel).join(" ");
    const mono = "statusbar--kbd-modifier";
    const hint = /* @__PURE__ */ __name((action, cls) => [keyLabel(keys[action]), ACTIONS[action].hint, cls], "hint");
    const hints = mode === "peek" ? [
      ["Esc", "Exit Peek", mono],
      ["\u21B5", "Open", mono],
      ["\u2195 \u2194", "Browse", mono]
    ] : mode === "props" ? [
      ["\u2195", "Previous / next property", mono],
      ["\u21B5", "Edit / save", mono],
      ["Esc", "Exit", mono]
    ] : mode === "field" ? [
      ["\u21B5", "Save", mono],
      ["Esc", "Exit", mono]
    ] : [
      ["/", "Search", mono],
      ["Space", "Peek", mono],
      ["\u21B5", "Open", mono],
      ["R", "Rename", mono],
      [`${cmd}\u21B5`, "Open Aside", mono],
      [`${shift}\u21B5`, `Create ${itemName}`, mono],
      [IS_MAC ? "\u2325\u21B5" : "Alt+\u21B5", "Create Above", mono],
      hint("collection.trash_record", mono),
      ["E", "Edit", mono],
      ["\u21E5", "Indent", mono],
      [`${shift}\u21E5`, "Outdent", mono],
      [`${cmd}${shift}\u2191\u2193`, "Reorder", mono],
      hint("panel.zoom_in"),
      ...zoomed ? [hint("panel.zoom_out")] : [],
      hint("nav.togglefold"),
      hint("nav.togglefoldchildren"),
      hint("nav.togglefolddescendants"),
      [cascade, "Fold level"],
      hint("nav.togglefoldcontainer")
    ];
    return hints.filter(([k]) => k);
  }
  __name(keyHints, "keyHints");
  function hintsHtml(hints) {
    return hints.map(([k, label, cls]) => `<span class="statusbar-item${cls ? " " + cls : ""}"><span class="statusbar--kbd">${kbdHtml(k)}</span> <span class="statusbar--kbd-label">${label}</span></span>`).join("");
  }
  __name(hintsHtml, "hintsHtml");
  var KeyHints = class {
    static {
      __name(this, "KeyHints");
    }
    constructor(ui) {
      this.ui = ui;
    }
    dispose() {
      document.body.classList.remove(KEYS_BODY_CLASS);
      if (this.keysObserver) this.keysObserver.disconnect();
      if (this.keysItem) this.keysItem.remove();
      this.keysItem = this.keysObserver = null;
    }
    /**
     * Show or hide the Outline key hints. A plugin can only APPEND status-bar
     * items (they land on the right), so the hints are one item of ours,
     * pinned over the left edge by CSS while the body class hides the app's
     * own hints there. One item, shared by every view instance.
     */
    showKeyHints(on, mode = null, zoomed = false, itemName = "Page") {
      const map = foldKeymap();
      if (map !== this.keysMap) {
        this.keysMap = map;
        this.keysEpoch = (this.keysEpoch || 0) + 1;
      }
      document.body.classList.toggle(KEYS_BODY_CLASS, on);
      if (!on) {
        this.keysStart = 0;
        return;
      }
      const state = `${mode}|${zoomed}|${itemName}|${this.keysEpoch}`;
      if (!this.keysItem) {
        this.keysItem = this.ui.addStatusBarItem({ htmlLabel: "" });
        const $el = this.keysItem.getElement();
        if ($el) {
          $el.classList.add("outline-keys");
          const $bar = $el.closest(".statusbar--status-bar");
          const $right = $bar && $bar.querySelector(".statusbar--right");
          if ($right) {
            const fit = /* @__PURE__ */ __name(() => {
              $el.style.right = `${$right.offsetWidth + 10}px`;
              this.renderKeyHints();
            }, "fit");
            this.keysObserver = new ResizeObserver(fit);
            this.keysObserver.observe($right);
            this.keysObserver.observe($bar);
          }
        }
      }
      if (this.keysState !== state) {
        this.keysState = state;
        this.keysHints = keyHints(mode, zoomed, itemName);
        this.keysStart = 0;
        this.renderKeyHints();
      }
    }
    /** The hint elements as laid out, or [] when the strip isn't showing. */
    keyHintItems() {
      const $el = this.keysItem && this.keysItem.getElement();
      const $label = $el && $el.querySelector(".statusbar-item--label");
      return $label ? Array.from($label.children) : [];
    }
    /** How many leading items sit on the strip's visible first line. */
    visibleKeyHints() {
      const items = this.keyHintItems();
      if (!items.length) return 0;
      const at = items.findIndex((i) => i.offsetTop > items[0].offsetTop);
      return at === -1 ? items.length : at;
    }
    /**
     * Draw the page of hints starting at `keysStart`. The More hint (the paging
     * key) leads whenever anything is out of view, and is left off when the
     * whole set fits without it.
     */
    renderKeyHints() {
      if (!this.keysItem || !this.keysHints) return;
      const page = this.keysHints.slice(this.keysStart);
      const more = keyLabel(foldKeymap().keys["plugin.outlinehints"]);
      this.keysMore = !!more;
      this.keysItem.setHtmlLabel(hintsHtml(more ? [[more, "More"], ...page] : page));
      if (more && this.keysStart === 0 && this.visibleKeyHints() === page.length + 1) {
        this.keysMore = false;
        this.keysItem.setHtmlLabel(hintsHtml(page));
      }
    }
    /** Show the next page of hints: from the first one out of view, else from the top. */
    pageKeyHints() {
      if (!this.keysHints) return;
      const lead = this.keysMore ? 1 : 0;
      const shown = this.visibleKeyHints() - lead;
      const next = this.keysStart + Math.max(1, shown);
      this.keysStart = shown < this.keyHintItems().length - lead && next < this.keysHints.length ? next : 0;
      this.renderKeyHints();
    }
  };
  function createOutlineView(viewContext, host, hints) {
    const plugin = host.plugin;
    const viewId = host.view.id;
    const ui = plugin.ui;
    const nativePeek = (() => {
      const view = host.nativeView;
      const ok = view && [
        "startRecordPreview",
        "commitRecordPreview",
        "dismissRecordPreview",
        "getPeekStatusBarContext"
      ].every((name) => typeof view[name] === "function");
      return ok ? view : null;
    })();
    const canShowOptions = !!nativePeek && typeof nativePeek.showOptionsDropdown === "function";
    const collectionGuid = /* @__PURE__ */ __name(() => plugin.collection.getGuid(), "collectionGuid");
    const storageKey = `outline-collapsed:${plugin.getConfiguration().name}:${viewId}`;
    let collapsed = /* @__PURE__ */ new Set();
    try {
      collapsed = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
    } catch (err) {
      collapsed = /* @__PURE__ */ new Set();
    }
    let searchOpen = null;
    let searchKey = null;
    let contextGuids = /* @__PURE__ */ new Set();
    let viewFocused = false;
    let hierarchy = null;
    let zoomGuid = null;
    let lastRecords = null;
    let $zoom = null;
    let rows = [];
    let selectedIndex = 0;
    let selectedGuid = null;
    let $root = null;
    let $list = null;
    let $note = null;
    let $menu = null;
    let peekedGuid = null;
    let propMode = null;
    let pendingNameEditGuid = null;
    let $inlineInput = null;
    let renderHeld = false;
    let placingGuid = null;
    let win = { start: 0, end: 0 };
    const heightCache = /* @__PURE__ */ new Map();
    let rowEstimate = 30;
    let $topPad = null;
    let $bottomPad = null;
    let scrollers = null;
    let scrollRaf = 0;
    let renderFields = [];
    const fieldsById = /* @__PURE__ */ __name(() => {
      const map = {};
      (plugin.getConfiguration().fields || []).forEach((f) => {
        map[f.id] = f;
      });
      return map;
    }, "fieldsById");
    const hierarchyFieldId = /* @__PURE__ */ __name(() => subPagesOn(plugin.getConfiguration()) ? SUBPAGE : null, "hierarchyFieldId");
    const isExpanded = /* @__PURE__ */ __name((node) => node.id === zoomGuid || (searchOpen ? searchOpen.has(node.id) : !collapsed.has(node.id)), "isExpanded");
    const visibleFields = /* @__PURE__ */ __name(() => {
      const byId = fieldsById();
      return viewContext.getVisiblePropertyIds().map((id) => byId[id]).filter((field) => field && field.id !== "title" && field.type !== "datetime" && field.type !== "banner");
    }, "visibleFields");
    const propValue = /* @__PURE__ */ __name((record, field) => {
      if (field.type === "choice") {
        const label = record.prop(field.id).choiceLabel();
        if (!label) return null;
        const choice = (field.choices || []).findLast((c) => c.label === label);
        return { text: label, color: ENUM_COLORS[Number(choice && choice.color)] || "zinc" };
      }
      if (field.type === "record") {
        const linked = record.linkedRecord(field.id);
        return linked ? { text: linked.getName(), guid: linked.guid } : null;
      }
      if (field.type === "number") {
        const num = record.number(field.id);
        return num === null ? null : { text: String(num) };
      }
      const text = record.text(field.id);
      return text ? { text } : null;
    }, "propValue");
    const openToMatches = /* @__PURE__ */ __name((matches) => {
      const open = /* @__PURE__ */ new Set();
      const visit = /* @__PURE__ */ __name((node) => {
        const hasMatchBelow = node.children.map(visit).some(Boolean);
        if (hasMatchBelow) open.add(node.id);
        return hasMatchBelow || matches.has(node.id);
      }, "visit");
      hierarchy.rootNodes.forEach(visit);
      return open;
    }, "openToMatches");
    const findMatches = /* @__PURE__ */ __name((delivered) => {
      const $input = appSearchInput();
      const words = ($input ? $input.value : "").toLowerCase().split(/\s+/).filter(Boolean);
      if (words.length) {
        const hits = delivered.filter((r) => {
          const name = (r.getName() || "").toLowerCase();
          return words.every((w) => name.includes(w));
        });
        if (hits.length) return { matches: new Set(hits.map((r) => r.guid)), query: words.join(" ") };
      }
      return { matches: new Set(delivered.map((r) => r.guid)), query: words.join(" ") };
    }, "findMatches");
    const flatten = /* @__PURE__ */ __name(() => {
      const out = [];
      const visit = /* @__PURE__ */ __name((node, depth, parent) => {
        out.push({ node, depth, parent });
        if (isExpanded(node)) {
          node.children.forEach((child) => visit(child, depth + 1, node));
        }
      }, "visit");
      hierarchy.rootNodes.forEach((root) => visit(root, 0, null));
      return out;
    }, "flatten");
    const setSelection = /* @__PURE__ */ __name((index, block = "nearest") => {
      selectedIndex = Math.max(0, Math.min(index, rows.length - 1));
      selectedGuid = rows[selectedIndex] ? rows[selectedIndex].node.id : null;
      if (!$list) return;
      ensureRendered(selectedIndex);
      $list.querySelectorAll(".outline-row").forEach(($row) => {
        $row.classList.toggle("selected", Number($row.dataset.index) === selectedIndex);
      });
      const $selected = $list.querySelector(`.outline-row[data-index="${selectedIndex}"]`);
      if ($selected) {
        $selected.style.scrollMarginTop = `${Math.max(0, ...(scrollers || []).map(topInset))}px`;
        $selected.scrollIntoView({ block });
      }
      if (isPeeking() && rows[selectedIndex] && rows[selectedIndex].node.id !== peekedGuid) {
        showPeek();
      }
    }, "setSelection");
    const canFold = /* @__PURE__ */ __name((node) => node.children.length > 0, "canFold");
    const saveCollapsed = /* @__PURE__ */ __name(() => localStorage.setItem(storageKey, JSON.stringify([...collapsed])), "saveCollapsed");
    const setFolded = /* @__PURE__ */ __name((nodes, fold) => {
      for (const node of nodes) {
        if (!canFold(node) || node.id === zoomGuid) continue;
        if (searchOpen) {
          if (fold) searchOpen.delete(node.id);
          else searchOpen.add(node.id);
        } else if (fold) collapsed.add(node.id);
        else collapsed.delete(node.id);
      }
      if (!searchOpen) saveCollapsed();
    }, "setFolded");
    const nodesUnder = /* @__PURE__ */ __name((node) => {
      const out = [];
      const visit = /* @__PURE__ */ __name((n) => n.children.forEach((child) => {
        out.push(child);
        visit(child);
      }), "visit");
      visit(node);
      return out;
    }, "nodesUnder");
    const foldSet = /* @__PURE__ */ __name((nodes, op) => {
      const foldable = nodes.filter(canFold);
      if (!foldable.length) return;
      setFolded(foldable, op === "toggle" ? foldable.some(isExpanded) : op === "fold");
    }, "foldSet");
    const cascade = /* @__PURE__ */ __name((node, op) => {
      const levels = [[node]];
      const walk = /* @__PURE__ */ __name((n, depth) => {
        if (!isExpanded(n)) return;
        n.children.forEach((child) => {
          (levels[depth + 1] ??= []).push(child);
          walk(child, depth + 1);
        });
      }, "walk");
      walk(node, 0);
      if (op === "fold") {
        for (let d = levels.length - 2; d >= 0; d--) {
          const open = levels[d].filter((n) => canFold(n) && isExpanded(n));
          if (open.length) return setFolded(open, true);
        }
      } else {
        for (let d = levels.length - 1; d >= 0; d--) {
          const shut = levels[d].filter((n) => canFold(n) && !isExpanded(n));
          if (shut.length) return setFolded(shut, false);
        }
      }
    }, "cascade");
    const refold = /* @__PURE__ */ __name((guid) => {
      if (guid) selectedGuid = guid;
      renderRows();
    }, "refold");
    const toggle = /* @__PURE__ */ __name((node) => {
      if (node.id === zoomGuid) return;
      setFolded([node], isExpanded(node));
      refold(node.id);
    }, "toggle");
    const actionOps = {
      fold(scope, op) {
        const { node } = rows[selectedIndex];
        foldSet({
          item: /* @__PURE__ */ __name(() => [node], "item"),
          children: /* @__PURE__ */ __name(() => node.children, "children"),
          descendants: /* @__PURE__ */ __name(() => nodesUnder(node), "descendants"),
          // The tree as a whole: the zoomed branch below its root, or everything.
          all: /* @__PURE__ */ __name(() => zoomGuid ? hierarchy.rootNodes.flatMap(nodesUnder) : hierarchy.rootNodes.flatMap((root) => [root, ...nodesUnder(root)]), "all")
        }[scope](), op);
        refold();
      },
      foldCascade() {
        const { node, parent } = rows[selectedIndex];
        if (canFold(node) && isExpanded(node)) {
          cascade(node, "fold");
          refold();
        } else if (parent) {
          cascade(parent, "fold");
          refold(parent.id);
        } else {
          setFolded(hierarchy.rootNodes.filter(isExpanded), true);
          refold();
        }
      },
      unfoldCascade() {
        cascade(rows[selectedIndex].node, "unfold");
        refold();
      },
      pageHints() {
        hints.pageKeyHints();
      },
      trash() {
        const { node } = rows[selectedIndex];
        const gone = /* @__PURE__ */ new Set([node.id, ...nodesUnder(node).map((n) => n.id)]);
        const next = rows.slice(selectedIndex + 1).find((r) => !gone.has(r.node.id)) || rows[selectedIndex - 1];
        const fieldId = hierarchyFieldId();
        if (node.id === zoomGuid) {
          const parent = node.record.linkedRecord(fieldId);
          zoomTo(parent ? parent.guid : null);
        }
        if (next) follow(next.node.id);
        plugin.collection.getAllRecords().then((records) => {
          subtreeRecords(records, node.record, fieldId).reverse().forEach((r) => r.trash());
          afterWrite();
        });
      },
      zoomIn() {
        zoomTo(rows[selectedIndex].node.id);
      },
      zoomOut() {
        if (!zoomGuid) return;
        const zoomed = hierarchy && hierarchy.nodes.get(zoomGuid);
        const parent = zoomed ? zoomed.record.linkedRecord(hierarchyFieldId()) : null;
        const from = zoomGuid;
        zoomTo(parent ? parent.guid : null);
        const back = rows.findIndex((r) => r.node.id === from);
        if (back !== -1) setSelection(back, "start");
      }
    };
    const runAction = /* @__PURE__ */ __name((action) => {
      if (rows[selectedIndex]) ACTIONS[action].run(actionOps);
    }, "runAction");
    const keysAreOurs = /* @__PURE__ */ __name(() => {
      const $focused = document.activeElement;
      if ($focused && $focused !== document.body && $root && !$root.contains($focused)) return false;
      return !($focused && $focused.classList && $focused.classList.contains("outline-inline-input"));
    }, "keysAreOurs");
    const onShortcutKey = /* @__PURE__ */ __name((e) => {
      if (!viewFocused || !$root || $menu || propMode || !rows.length) return;
      if (!keysAreOurs()) return;
      const action = foldKeymap().byKey.get(eventKeyName(e));
      if (!action) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      runAction(action);
    }, "onShortcutKey");
    const restack = /* @__PURE__ */ __name(() => {
      if (!$list) return;
      const $rows = Array.from($list.querySelectorAll(".outline-row"));
      $rows.forEach(($r) => {
        const $props = $r.querySelector(".outline-props");
        const $title = $r.querySelector(".outline-title");
        if ($props && $title && $props.parentElement !== $title) {
          $title.insertBefore($props, $r.querySelector(".outline-time"));
        }
        $r.classList.remove("is-stacked");
      });
      const needsStacking = $rows.map(($r) => {
        const $name = $r.querySelector(".outline-name");
        if (!$name || !$r.querySelector(".outline-props")) return false;
        return $name.scrollWidth > $name.clientWidth + 1;
      });
      $rows.forEach(($r, i) => {
        if (!needsStacking[i]) return;
        $r.classList.add("is-stacked");
        const $props = $r.querySelector(".outline-props");
        $props.style.paddingLeft = `${Number($r.dataset.indent) + TWISTY_W + ROW_GAP}px`;
        $r.insertBefore($props, $r.querySelector(".outline-propedit"));
      });
    }, "restack");
    const selectNext = /* @__PURE__ */ __name((delta) => {
      if (!rows.length) return;
      setSelection((selectedIndex + delta + rows.length) % rows.length);
    }, "selectNext");
    const openSelected = /* @__PURE__ */ __name((otherPanel) => {
      const current = rows[selectedIndex];
      if (!current) return;
      if (otherPanel) viewContext.openRecordInOtherPanel(current.node.id);
      else viewContext.openRecordInThisPanel(current.node.id);
    }, "openSelected");
    const focusView = /* @__PURE__ */ __name(() => {
      const $focused = document.activeElement;
      if ($focused instanceof HTMLElement && $focused !== document.body) $focused.blur();
    }, "focusView");
    const appChrome = /* @__PURE__ */ __name(() => $root && $root.closest(".custom-view") || null, "appChrome");
    const appSearchInput = /* @__PURE__ */ __name(() => {
      const $chrome = appChrome();
      return $chrome && $chrome.querySelector(".records-view-query-wrap input") || null;
    }, "appSearchInput");
    const focusAppSearch = /* @__PURE__ */ __name(() => {
      const $input = appSearchInput();
      if (!$input) return false;
      $input.focus();
      return true;
    }, "focusAppSearch");
    const isPeeking = /* @__PURE__ */ __name(() => {
      try {
        return !!nativePeek && !!nativePeek.getPeekStatusBarContext();
      } catch (err) {
        return false;
      }
    }, "isPeeking");
    let hintTimer = null;
    const hintMode = /* @__PURE__ */ __name(() => {
      if (isPeeking()) return "peek";
      const $focused = document.activeElement;
      if ($root && $root.contains($focused) && $focused.classList.contains("outline-inline-input")) return "field";
      if (propMode) return $menu ? "field" : "props";
      return null;
    }, "hintMode");
    const syncKeyHints = /* @__PURE__ */ __name(() => {
      if (viewFocused) warnInternals();
      if (viewFocused) hints.showKeyHints(true, hintMode(), !!zoomGuid, viewContext.getRecordTypeName());
    }, "syncKeyHints");
    const stopHintTimer = /* @__PURE__ */ __name(() => {
      if (hintTimer) clearInterval(hintTimer);
      hintTimer = null;
    }, "stopHintTimer");
    const hidePeek = /* @__PURE__ */ __name(() => {
      if (isPeeking()) nativePeek.dismissRecordPreview();
    }, "hidePeek");
    const commitPeek = /* @__PURE__ */ __name(() => {
      nativePeek.commitRecordPreview();
    }, "commitPeek");
    const showPeek = /* @__PURE__ */ __name(() => {
      const current = rows[selectedIndex];
      if (!current || !nativePeek) return;
      peekedGuid = current.node.id;
      nativePeek.startRecordPreview(current.node.id);
    }, "showPeek");
    const warnInternals = /* @__PURE__ */ __name(() => {
      if (internalsChecked) return;
      if (accountShortcuts() === void 0 && ++internalsWaits < 10) return;
      internalsChecked = true;
      const missing = [];
      if (!nativePeek) missing.push("peek on Space");
      if (!canShowOptions) missing.push("the \u22EF page menu");
      if (!accountShortcuts()) missing.push("your custom shortcuts");
      if (!missing.length) return;
      console.warn("[Outline] app internals changed, re-check them against this Thymer build:", missing);
      ui.addToaster({
        title: "Outline needs updating",
        message: `Thymer changed internals the outline relies on. Not working until the plugin is re-checked against this build: ${missing.join(", ")}.`,
        dismissible: true
      });
    }, "warnInternals");
    const ROW_PAD_X = 8;
    const TWISTY_W = 16;
    const ROW_GAP = 6;
    const DEPTH_STEP = 20;
    const ICON_OFFSET = ROW_PAD_X + TWISTY_W + ROW_GAP;
    const createRecord = /* @__PURE__ */ __name(() => {
      const guid = viewContext.createRecord();
      if (!guid) return;
      pendingNameEditGuid = guid;
      setTimeout(() => {
        if (pendingNameEditGuid) renderRows();
      }, 150);
    }, "createRecord");
    const onDocumentClick = /* @__PURE__ */ __name((e) => {
      if ($menu && !$menu.contains(e.target)) closeMenu();
    }, "onDocumentClick");
    const closeMenu = /* @__PURE__ */ __name(() => {
      if ($menu) {
        $menu.remove();
        $menu = null;
        document.removeEventListener("click", onDocumentClick, true);
        syncKeyHints();
      }
    }, "closeMenu");
    const showMenu = /* @__PURE__ */ __name((items, x, y, filterPlaceholder) => {
      closeMenu();
      if (!$root) return;
      $menu = document.createElement("div");
      $menu.className = "outline-menu";
      const $items = document.createElement("div");
      let $filter = null;
      let shown = items;
      let cursor = 0;
      const confirm = /* @__PURE__ */ __name((index) => {
        const item = shown[index];
        if (!item) return;
        closeMenu();
        item.onSelect();
      }, "confirm");
      const move = /* @__PURE__ */ __name((delta) => {
        if (!shown.length) return;
        $items.children[cursor].classList.remove("is-selected");
        cursor = (cursor + delta + shown.length) % shown.length;
        const $sel = $items.children[cursor];
        $sel.classList.add("is-selected");
        $sel.scrollIntoView({ block: "nearest" });
      }, "move");
      const paint = /* @__PURE__ */ __name(() => {
        const needle = $filter ? $filter.value.trim().toLowerCase() : "";
        shown = items.filter((item) => !needle || item.label.toLowerCase().includes(needle));
        if (cursor >= shown.length) cursor = 0;
        $items.innerHTML = "";
        shown.forEach((item, index) => {
          const $item = document.createElement("div");
          $item.className = "outline-menu-item";
          if (item.active) $item.classList.add("is-active");
          if (index === cursor) $item.classList.add("is-selected");
          $item.appendChild(ui.createIcon(item.icon || "ti-align-left"));
          const $label = document.createElement("span");
          $label.textContent = item.label;
          $item.appendChild($label);
          $item.addEventListener("click", (e) => {
            e.stopPropagation();
            confirm(index);
          });
          $items.appendChild($item);
        });
      }, "paint");
      const onMenuKeyDown = /* @__PURE__ */ __name((e) => {
        e.stopPropagation();
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            move(1);
            break;
          case "ArrowUp":
            e.preventDefault();
            move(-1);
            break;
          case "Enter":
            e.preventDefault();
            confirm(cursor);
            break;
          case "Escape":
            e.preventDefault();
            closeMenu();
            break;
          case "Tab":
            e.preventDefault();
            break;
        }
      }, "onMenuKeyDown");
      $menu.addEventListener("keydown", onMenuKeyDown);
      if (filterPlaceholder) {
        $menu.classList.add("has-filter");
        $filter = document.createElement("input");
        $filter.type = "text";
        $filter.spellcheck = false;
        $filter.className = "form-input outline-menu-filter";
        $filter.placeholder = filterPlaceholder;
        $filter.addEventListener("input", () => {
          cursor = 0;
          paint();
        });
        $filter.addEventListener("click", (e) => e.stopPropagation());
        $menu.appendChild($filter);
      }
      $menu.appendChild($items);
      paint();
      $root.appendChild($menu);
      const rootRect = $root.getBoundingClientRect();
      const menuW = $menu.offsetWidth;
      const left = Math.max(0, Math.min(x - rootRect.left, rootRect.width - menuW));
      $menu.style.left = `${left}px`;
      $menu.style.top = `${y - rootRect.top}px`;
      document.addEventListener("click", onDocumentClick, true);
      if ($filter) {
        $filter.focus();
      } else {
        $menu.tabIndex = -1;
        $menu.focus();
      }
      syncKeyHints();
    }, "showMenu");
    const inZoom = /* @__PURE__ */ __name((record, parentFieldId) => {
      if (record.guid === zoomGuid) return true;
      for (const parent of ancestorsOf(record, parentFieldId)) {
        if (parent.guid === zoomGuid) return true;
      }
      return false;
    }, "inZoom");
    const rebuild = /* @__PURE__ */ __name(() => {
      if (!lastRecords) return;
      const parentFieldId = hierarchyFieldId();
      if (zoomGuid && !parentFieldId) zoomGuid = null;
      const scoped = zoomGuid ? lastRecords.filter((r) => inZoom(r, parentFieldId)) : lastRecords;
      const completed = withAncestors(scoped, parentFieldId);
      if (zoomGuid) {
        completed.records = completed.records.filter((r) => inZoom(r, parentFieldId));
        const kept = new Set(completed.records.map((r) => r.guid));
        completed.added = new Set([...completed.added].filter((g) => kept.has(g)));
      }
      hierarchy = buildHierarchy(completed.records, parentFieldId);
      const { matches, query } = findMatches(scoped);
      contextGuids = completed.added.size || query ? new Set(completed.records.map((r) => r.guid).filter((g) => !matches.has(g))) : /* @__PURE__ */ new Set();
      if (query) {
        const key = `${zoomGuid}|${query}|${[...matches].sort().join(",")}`;
        if (key !== searchKey || !searchOpen) {
          searchOpen = openToMatches(matches);
          searchKey = key;
        }
      } else {
        searchOpen = null;
        searchKey = null;
      }
      if (!$list) mount();
      renderNote();
      renderZoomBar();
      renderRows();
    }, "rebuild");
    const zoomTo = /* @__PURE__ */ __name((guid) => {
      zoomGuid = guid || null;
      selectedIndex = 0;
      selectedGuid = null;
      rebuild();
      (scrollers || []).forEach((el) => {
        el.scrollTop = 0;
      });
      if (rows.length) setSelection(0);
      syncKeyHints();
    }, "zoomTo");
    const takeZoomHandoff = /* @__PURE__ */ __name(() => {
      const raw = document.documentElement.dataset.outlineZoom;
      if (!raw) return;
      let req = null;
      try {
        req = JSON.parse(raw);
      } catch (err) {
        req = null;
      }
      if (!req || req.collection !== collectionGuid()) return;
      delete document.documentElement.dataset.outlineZoom;
      if (Date.now() - (req.at || 0) > 1e4) return;
      zoomGuid = req.guid || null;
      selectedIndex = 0;
      selectedGuid = null;
    }, "takeZoomHandoff");
    const renderZoomBar = /* @__PURE__ */ __name(() => {
      if (!$zoom) return;
      $zoom.innerHTML = "";
      if (!zoomGuid) return;
      const parentFieldId = hierarchyFieldId();
      const target = plugin.data.getRecord(zoomGuid);
      if (!target) return;
      const chain = [...ancestorsOf(target, parentFieldId)].reverse().concat([target]);
      const $all = document.createElement("button");
      $all.type = "button";
      $all.className = "button-minimal button-small outline-zoom-step";
      $all.textContent = "All";
      $all.title = "Show the whole collection";
      $all.addEventListener("click", () => zoomTo(null));
      $zoom.appendChild($all);
      chain.forEach((record, i) => {
        const $sep = document.createElement("span");
        $sep.className = "outline-zoom-sep ti ti-chevron-right";
        const $step = document.createElement("button");
        $step.type = "button";
        $step.className = "button-minimal button-small outline-zoom-step" + (i === chain.length - 1 ? " is-current" : "");
        const $label = document.createElement("span");
        $label.textContent = record.getName() || "Untitled";
        $step.appendChild($label);
        $step.title = record.getName() || "";
        $step.addEventListener("click", () => zoomTo(record.guid));
        $zoom.append($sep, $step);
      });
    }, "renderZoomBar");
    const renderNote = /* @__PURE__ */ __name(() => {
      if (!$note) return;
      $note.textContent = hierarchyFieldId() ? "" : 'Sub-pages are off in this collection, so rows are flat. Run "Outline: install into a collection..." to turn them on.';
    }, "renderNote");
    const EDITABLE_TYPES = ["text", "number", "choice", "record"];
    const EDIT_SKIP_IDS = ["title", "icon", "collection"];
    const editableFields = /* @__PURE__ */ __name(() => {
      const ord = orderField();
      const canEdit = /* @__PURE__ */ __name((f) => f && f.active !== false && !f.read_only && EDITABLE_TYPES.includes(f.type) && !EDIT_SKIP_IDS.includes(f.id) && !(ord && f.id === ord.id), "canEdit");
      const shown = visibleFields().filter(canEdit);
      const rest = (plugin.getConfiguration().fields || []).filter((f) => canEdit(f) && !shown.some((s) => s.id === f.id));
      const title = fieldsById()["title"];
      return title ? [title, ...shown, ...rest] : [...shown, ...rest];
    }, "editableFields");
    const fieldText = /* @__PURE__ */ __name((record, field) => {
      if (field.id === "title") return record.getName() || "";
      const value = propValue(record, field);
      return value ? value.text : "";
    }, "fieldText");
    const afterWrite = /* @__PURE__ */ __name(() => setTimeout(() => renderRows(), 60), "afterWrite");
    const doneEditing = /* @__PURE__ */ __name(() => {
      focusView();
      afterWrite();
    }, "doneEditing");
    const pending = /* @__PURE__ */ new Map();
    let settleTimer = 0;
    const SETTLE_MS = 3e3;
    const notePending = /* @__PURE__ */ __name((guid, key, value) => {
      pending.set(guid, { ...pending.get(guid), [key]: value });
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        pending.clear();
        rebuild();
      }, SETTLE_MS);
    }, "notePending");
    const settled = /* @__PURE__ */ __name((records) => {
      const byGuid = new Map(records.map((r) => [r.guid, r]));
      const fieldId = hierarchyFieldId();
      const ord = orderField();
      for (const [guid, p] of pending) {
        const record = byGuid.get(guid);
        if (!record) continue;
        if ("parent" in p) {
          const linked = fieldId ? record.linkedRecord(fieldId) : null;
          if ((linked ? linked.guid : null) !== p.parent) return false;
        }
        if ("order" in p && ord && record.prop(ord.id).number() !== p.order) return false;
      }
      pending.clear();
      clearTimeout(settleTimer);
      return true;
    }, "settled");
    let followGuid = null;
    let followTimer = 0;
    const follow = /* @__PURE__ */ __name((guid) => {
      followGuid = guid;
      clearTimeout(followTimer);
      followTimer = setTimeout(() => {
        followGuid = null;
      }, 3e3);
    }, "follow");
    const toast = /* @__PURE__ */ __name((title, message) => ui.addToaster({ title, message, dismissible: true, autoDestroyTime: 4e3 }), "toast");
    const orderField = /* @__PURE__ */ __name(() => {
      const view = (plugin.getConfiguration().views || []).find((v) => v.id === viewId);
      const field = view && view.opts ? fieldsById()[view.opts.order_field_id] : null;
      if (!field || field.type !== "number" || field.active === false) return null;
      const desc = view.sort_field_id === field.id && view.sort_dir === "desc";
      return { id: field.id, label: field.label, dir: desc ? -1 : 1 };
    }, "orderField");
    const orderOf = /* @__PURE__ */ __name((node, ord) => {
      const p = pending.get(node.id);
      if (p && "order" in p) return p.order;
      return node.record.prop(ord.id).number();
    }, "orderOf");
    const parentOf = /* @__PURE__ */ __name((node) => {
      const parent = node.parentGuid ? hierarchy.nodes.get(node.parentGuid) : null;
      return parent && parent.children.includes(node) ? parent : null;
    }, "parentOf");
    const childList = /* @__PURE__ */ __name((parent) => parent ? parent.children : hierarchy.rootNodes, "childList");
    const followsOrder = /* @__PURE__ */ __name((list, ord) => {
      let last = null;
      for (const n of list) {
        const v = orderOf(n, ord);
        if (v === null) continue;
        if (last !== null && ord.dir * (v - last) < 0) return false;
        last = v;
      }
      return true;
    }, "followsOrder");
    const positionWrites = /* @__PURE__ */ __name((node, kids, index, ord) => {
      const list = [...kids];
      list.splice(index, 0, node);
      const n = list.length;
      return list.map((m, i) => ({ node: m, value: ord.dir > 0 ? i + 1 : n - i })).filter(({ node: m, value }) => orderOf(m, ord) !== value);
    }, "positionWrites");
    const writeParent = /* @__PURE__ */ __name((node, parent) => node.record.setSubPageOf(parent ? parent.id : null) !== false, "writeParent");
    const rearrange = /* @__PURE__ */ __name((op) => {
      const current = rows[selectedIndex];
      if (!current || !hierarchy || !hierarchyFieldId()) return;
      const node = current.node;
      if (contextGuids.size || searchOpen) {
        toast("Clear the search to rearrange", "With a search or filter on, the outline shows only part of each level.");
        return;
      }
      if (node.id === zoomGuid) return;
      const parent = parentOf(node);
      const siblings = childList(parent);
      const at = siblings.indexOf(node);
      let target = parent;
      let index;
      if (op === "indent") {
        if (at <= 0) return;
        target = siblings[at - 1];
        index = target.children.length;
      } else if (op === "outdent") {
        if (!parent || parent.id === zoomGuid) return;
        target = parentOf(parent);
        index = childList(target).indexOf(parent) + 1;
      } else {
        index = at + (op === "down" ? 1 : -1);
        if (index < 0 || index >= siblings.length) return;
      }
      const ord = orderField();
      if (!ord && (op === "up" || op === "down")) {
        toast("No Order property", 'Run "Outline: install into a collection\u2026" to add one; sibling order is stored there.');
        return;
      }
      const kids = childList(target).filter((n) => n !== node);
      if (ord && !(followsOrder(siblings, ord) && followsOrder(kids, ord))) {
        toast(`Sort by ${ord.label} to rearrange`, `The rows aren't in ${ord.label} order, so a new position wouldn't show.`);
        return;
      }
      const writes = ord ? positionWrites(node, kids, index, ord) : [];
      if (target !== parent) {
        if (!writeParent(node, target)) {
          toast("Couldn't move the page", "The app refused the new parent.");
          return;
        }
        notePending(node.id, "parent", target ? target.id : null);
      }
      writes.forEach(({ node: n, value }) => {
        n.record.prop(ord.id).set(value);
        notePending(n.id, "order", value);
      });
      const from = childList(parent);
      from.splice(from.indexOf(node), 1);
      childList(target).splice(index, 0, node);
      node.parentGuid = target ? target.id : null;
      if (target && collapsed.has(target.id)) {
        collapsed.delete(target.id);
        saveCollapsed();
      }
      follow(node.id);
      renderRows();
    }, "rearrange");
    const createBeside = /* @__PURE__ */ __name(async (where) => {
      const current = rows[selectedIndex];
      if (!current || !hierarchy || placingGuid) return;
      const node = current.node;
      const refuse = /* @__PURE__ */ __name((title, message) => {
        if (where === "below") createRecord();
        else if (title) toast(title, message);
      }, "refuse");
      if (contextGuids.size || searchOpen) {
        refuse("Clear the search to create above", "With a search or filter on, the outline shows only part of each level.");
        return;
      }
      if (node.id === zoomGuid) {
        refuse();
        return;
      }
      const parent = parentOf(node);
      const siblings = childList(parent);
      const ord = orderField();
      if (!ord) {
        refuse("No Order property", `Run "Outline: install into a collection\u2026" to add one; a new page's place is stored there.`);
        return;
      }
      if (!followsOrder(siblings, ord)) {
        refuse(`Sort by ${ord.label} to create above`, `The rows aren't in ${ord.label} order, so the new page's place wouldn't show.`);
        return;
      }
      const guid = viewContext.createRecord();
      if (!guid) return;
      placingGuid = guid;
      let record = null;
      for (let i = 0; i < 30 && !record; i++) {
        record = (await plugin.collection.getAllRecords()).find((r) => r.guid === guid);
        if (!record) await new Promise((r) => setTimeout(r, 100));
      }
      placingGuid = null;
      if (!record) {
        rebuild();
        return;
      }
      if (parent && writeParent({ record }, parent)) notePending(guid, "parent", parent.id);
      positionWrites({ id: guid, record }, siblings, siblings.indexOf(node) + (where === "below" ? 1 : 0), ord).forEach(({ node: n, value }) => {
        n.record.prop(ord.id).set(value);
        notePending(n.id, "order", value);
      });
      pendingNameEditGuid = guid;
      follow(guid);
    }, "createBeside");
    const editText = /* @__PURE__ */ __name(($cell, value, { onCommit, onCancel }) => {
      const $input = document.createElement("input");
      $input.type = "text";
      $input.className = "outline-inline-input";
      $input.value = value || "";
      let done = false;
      $inlineInput = $input;
      const finish = /* @__PURE__ */ __name((commit) => {
        if (done) return;
        done = true;
        $inlineInput = null;
        if (commit) onCommit($input.value.trim());
        else if (onCancel) onCancel();
        if (renderHeld) afterWrite();
        syncKeyHints();
      }, "finish");
      $input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      });
      $input.addEventListener("blur", () => finish(true));
      $input.addEventListener("mouseup", (e) => e.stopPropagation());
      $cell.replaceWith($input);
      $input.focus();
      $input.select();
      syncKeyHints();
    }, "editText");
    const startNameEdit = /* @__PURE__ */ __name((node, isNew) => {
      if (!$list) return;
      const $row = $list.querySelector(`.outline-row[data-guid="${node.id}"]`);
      const $name = $row && $row.querySelector(".outline-name");
      if (!$name) return;
      const finish = /* @__PURE__ */ __name((text) => {
        if (isNew && !text) node.record.trash();
        else if (text !== null) node.record.prop("title").set(text);
        doneEditing();
      }, "finish");
      editText($name, node.record.getName(), { onCommit: finish, onCancel: /* @__PURE__ */ __name(() => finish(null), "onCancel") });
    }, "startNameEdit");
    const recordCandidates = /* @__PURE__ */ __name(async (field, node) => {
      if (!field.filter_colguid || field.filter_colguid === collectionGuid()) {
        const banned = new Set(field.id === SUBPAGE ? nodesUnder(node).map((n) => n.id) : []);
        return [...hierarchy.nodes.values()].filter((n) => n.id !== node.id && !banned.has(n.id)).map((n) => ({ guid: n.id, name: n.name }));
      }
      const other = plugin.data.getPluginByGuid(field.filter_colguid);
      if (!other || !other.getAllRecords) return [];
      const records = await other.getAllRecords();
      return records.map((r) => ({ guid: r.guid, name: r.getName() || "Unknown" }));
    }, "recordCandidates");
    const editField = /* @__PURE__ */ __name((node, field, $cell) => {
      const record = node.record;
      const prop = /* @__PURE__ */ __name(() => record.prop(field.id), "prop");
      if (field.id === "title" || field.type === "text" || field.type === "number") {
        editText($cell, fieldText(record, field), {
          onCommit: /* @__PURE__ */ __name((text) => {
            if (field.type === "number") {
              prop().set(text === "" ? null : Number(text));
            } else {
              prop().set(text);
            }
            doneEditing();
          }, "onCommit"),
          onCancel: /* @__PURE__ */ __name(() => {
            focusView();
            renderRows();
          }, "onCancel")
        });
        return;
      }
      const rect = $cell.getBoundingClientRect();
      const icon = field.icon || "ti-align-left";
      if (field.type === "choice") {
        const current = prop().choiceLabel();
        const items = (field.choices || []).filter((c) => c.active !== false).map((c) => ({
          label: c.label,
          icon: c.icon || icon,
          active: c.label === current,
          onSelect: /* @__PURE__ */ __name(() => {
            prop().setChoice(c.label);
            doneEditing();
          }, "onSelect")
        }));
        items.push({
          label: "Clear",
          icon: "ti-x",
          onSelect: /* @__PURE__ */ __name(() => {
            prop().set(null);
            doneEditing();
          }, "onSelect")
        });
        showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);
        return;
      }
      if (field.type === "record") {
        const linked = record.linkedRecord(field.id);
        const link = /* @__PURE__ */ __name((guid) => {
          if (field.id === SUBPAGE) record.setSubPageOf(guid);
          else prop().set(guid);
        }, "link");
        recordCandidates(field, node).then((candidates) => {
          if (viewContext.isDestroyed()) return;
          const items = [{
            label: "None",
            icon: "ti-x",
            active: !linked,
            onSelect: /* @__PURE__ */ __name(() => {
              link(null);
              doneEditing();
            }, "onSelect")
          }];
          candidates.forEach((c) => items.push({
            label: c.name,
            icon,
            active: linked && linked.guid === c.guid,
            onSelect: /* @__PURE__ */ __name(() => {
              link(c.guid);
              doneEditing();
            }, "onSelect")
          }));
          showMenu(items, rect.left, rect.bottom + 2, `${field.label}...`);
        });
      }
    }, "editField");
    const editSelectedField = /* @__PURE__ */ __name(() => {
      if (!propMode || !$list) return;
      const $row = $list.querySelector(`.outline-row[data-guid="${propMode.guid}"]`);
      const current = rows.find((r) => r.node.id === propMode.guid);
      const fields = editableFields();
      const field = fields[propMode.index];
      if (!$row || !current || !field) return;
      const $cell = $row.querySelector(`.outline-pe-row[data-index="${propMode.index}"] .outline-pe-value`);
      if ($cell) editField(current.node, field, $cell);
    }, "editSelectedField");
    const paintPropSelection = /* @__PURE__ */ __name(() => {
      if (!$list) return;
      $list.querySelectorAll(".outline-pe-row").forEach(($r) => {
        $r.classList.toggle("is-selected", Number($r.dataset.index) === propMode.index);
      });
    }, "paintPropSelection");
    const exitPropMode = /* @__PURE__ */ __name(() => {
      propMode = null;
      renderRows();
      focusView();
      syncKeyHints();
    }, "exitPropMode");
    const buildPropEditor = /* @__PURE__ */ __name((node, indent) => {
      const $panel = document.createElement("div");
      $panel.className = "outline-propedit";
      $panel.style.paddingLeft = `${indent + TWISTY_W + ROW_GAP}px`;
      $panel.addEventListener("mouseup", (e) => e.stopPropagation());
      const fields = editableFields();
      if (propMode.index >= fields.length) propMode.index = 0;
      fields.forEach((field, index) => {
        const $prow = document.createElement("div");
        $prow.className = "outline-pe-row";
        $prow.dataset.index = String(index);
        if (index === propMode.index) $prow.classList.add("is-selected");
        const $icon = ui.createIcon(field.icon || "ti-align-left");
        $icon.classList.add("outline-pe-icon");
        $prow.appendChild($icon);
        const $label = document.createElement("span");
        $label.className = "outline-pe-label";
        $label.textContent = field.label;
        $prow.appendChild($label);
        const $value = document.createElement("span");
        $value.className = "outline-pe-value";
        const text = fieldText(node.record, field);
        $value.textContent = text || "Empty";
        if (!text) $value.classList.add("is-empty");
        $prow.appendChild($value);
        $prow.addEventListener("mouseup", (e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          propMode.index = index;
          paintPropSelection();
          editField(node, field, $value);
        });
        $panel.appendChild($prow);
      });
      return $panel;
    }, "buildPropEditor");
    const propChip = /* @__PURE__ */ __name((field, value) => {
      const $prop = document.createElement("span");
      $prop.className = "outline-prop";
      const $icon = ui.createIcon(field.icon || "ti-align-left");
      $icon.classList.add("outline-prop-icon");
      $prop.appendChild($icon);
      const $value = document.createElement("span");
      if (value.color) {
        $value.className = "outline-pill";
        $value.style.background = `var(--enum-${value.color}-bg)`;
        $value.style.color = `var(--enum-${value.color}-fg)`;
      } else if (value.guid) {
        $value.className = "outline-link";
      } else {
        $value.className = "outline-prop-text";
      }
      $value.textContent = value.text;
      $prop.appendChild($value);
      if (value.guid) {
        const $arrow = document.createElement("span");
        $arrow.className = "outline-link-arrow";
        $arrow.textContent = "\u2197";
        $value.appendChild($arrow);
        $prop.addEventListener("click", (e) => {
          e.stopPropagation();
          viewContext.openRecordInThisPanel(value.guid);
        });
      }
      return $prop;
    }, "propChip");
    const OVERSCAN_PX = 1e3;
    const MARGIN_PX = 300;
    const rowHeight = /* @__PURE__ */ __name((i) => heightCache.get(rows[i].node.id) ?? rowEstimate, "rowHeight");
    const sumHeights = /* @__PURE__ */ __name((from, to) => {
      let y = 0;
      for (let i = from; i < to; i++) y += rowHeight(i);
      return y;
    }, "sumHeights");
    const attachScroller = /* @__PURE__ */ __name(() => {
      if (scrollers && (scrollers[0] || document.body).contains($list)) return;
      detachScroller();
      if (!$list.isConnected) return;
      scrollers = [];
      for (let el = $list.parentElement; el && el !== document.body; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === "auto" || oy === "scroll") scrollers.push(el);
      }
      [...scrollers, window].forEach((t) => t.addEventListener("scroll", onScroll, { passive: true }));
    }, "attachScroller");
    const detachScroller = /* @__PURE__ */ __name(() => {
      if (scrollers) [...scrollers, window].forEach((t) => t.removeEventListener("scroll", onScroll));
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      scrollers = null;
      scrollRaf = 0;
    }, "detachScroller");
    const onScroll = /* @__PURE__ */ __name(() => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        renderWindow(false);
      });
    }, "onScroll");
    const topInset = /* @__PURE__ */ __name((el) => {
      const $bar = el.querySelector(".panel-bar--tabsbar");
      return $bar && getComputedStyle($bar).position === "sticky" ? $bar.offsetHeight : 0;
    }, "topInset");
    const viewportInList = /* @__PURE__ */ __name(() => {
      const listTop = $list.getBoundingClientRect().top;
      let top = 0;
      let bottom = window.innerHeight;
      for (const el of scrollers || []) {
        const elTop = el.getBoundingClientRect().top + topInset(el);
        top = Math.max(top, elTop);
        bottom = Math.min(bottom, el.getBoundingClientRect().top + el.clientHeight);
      }
      return { from: top - listTop, to: bottom - listTop };
    }, "viewportInList");
    const rangeFor = /* @__PURE__ */ __name((pad) => {
      const { from, to } = viewportInList();
      const lo = from - pad;
      const hi = to + pad;
      let y = 0;
      let start = -1;
      let end = rows.length;
      for (let i = 0; i < rows.length; i++) {
        if (y >= hi) {
          end = i;
          break;
        }
        const h = rowHeight(i);
        if (start === -1 && y + h > lo) start = i;
        y += h;
      }
      if (start === -1) start = Math.max(0, end - 1);
      return { start, end };
    }, "rangeFor");
    const updatePads = /* @__PURE__ */ __name(() => {
      $topPad.style.height = `${sumHeights(0, win.start)}px`;
      $bottomPad.style.height = `${sumHeights(win.end, rows.length)}px`;
    }, "updatePads");
    const renderWindow = /* @__PURE__ */ __name((force, depth = 0) => {
      if (!$list || !$topPad || !rows.length) return;
      if (!force) {
        const need = rangeFor(MARGIN_PX);
        if (need.start >= win.start && need.end <= win.end) return;
      }
      win = rangeFor(OVERSCAN_PX);
      while ($topPad.nextSibling && $topPad.nextSibling !== $bottomPad) {
        $topPad.nextSibling.remove();
      }
      const $frag = document.createDocumentFragment();
      for (let i = win.start; i < win.end; i++) $frag.appendChild(buildRow(i));
      $list.insertBefore($frag, $bottomPad);
      restack();
      let changed = false;
      let estimated = heightCache.size > 0;
      for (let $r = $topPad.nextSibling; $r && $r !== $bottomPad; $r = $r.nextSibling) {
        const h = $r.offsetHeight;
        if (!h) continue;
        if (!estimated && !$r.classList.contains("is-stacked") && !$r.querySelector(".outline-propedit")) {
          estimated = true;
          rowEstimate = h;
        }
        if (heightCache.get($r.dataset.guid) !== h) {
          heightCache.set($r.dataset.guid, h);
          changed = true;
        }
      }
      updatePads();
      if (changed && depth < 2) renderWindow(false, depth + 1);
    }, "renderWindow");
    const ensureRendered = /* @__PURE__ */ __name((index) => {
      if (!$topPad || !rows.length || index >= win.start && index < win.end) return;
      if (scrollers) {
        const { from, to } = viewportInList();
        const top = sumHeights(0, index);
        const bottom = top + rowHeight(index);
        const delta = top < from ? top - from : bottom > to ? bottom - to : 0;
        if (delta) {
          for (const el of [...scrollers, document.scrollingElement]) {
            const before = el.scrollTop;
            el.scrollTop += delta;
            if (el.scrollTop !== before) break;
          }
        }
      }
      renderWindow(true);
    }, "ensureRendered");
    const renderRows = /* @__PURE__ */ __name(() => {
      if (!$list) return;
      if ($inlineInput && $inlineInput.isConnected) {
        renderHeld = true;
        return;
      }
      renderHeld = false;
      renderFields = visibleFields();
      const heldScroll = (scrollers || []).map((el) => [el, el.scrollTop]);
      $list.innerHTML = "";
      $topPad = $bottomPad = null;
      win = { start: 0, end: 0 };
      rows = hierarchy ? flatten() : [];
      const rowIndexOf = /* @__PURE__ */ __name((guid) => rows.findIndex((r) => r.node.id === guid), "rowIndexOf");
      let at = followGuid ? rowIndexOf(followGuid) : -1;
      for (let n = hierarchy && hierarchy.nodes.get(selectedGuid), d = 0; at === -1 && n && d < MAX_DEPTH; n = hierarchy.nodes.get(n.parentGuid), d++) {
        at = rowIndexOf(n.id);
      }
      if (at !== -1) selectedIndex = at;
      if (rows.length === 0) {
        const $empty = document.createElement("div");
        $empty.className = "outline-empty";
        $empty.textContent = "No records";
        $list.appendChild($empty);
        return;
      }
      $topPad = document.createElement("div");
      $bottomPad = document.createElement("div");
      $topPad.className = $bottomPad.className = "outline-pad";
      $list.append($topPad, $bottomPad);
      attachScroller();
      updatePads();
      heldScroll.forEach(([el, top]) => {
        el.scrollTop = top;
      });
      renderWindow(true);
      if (!scrollers) {
        requestAnimationFrame(() => {
          if (!$list) return;
          attachScroller();
          renderWindow(false);
        });
      }
      setSelection(selectedIndex);
      if (pendingNameEditGuid) {
        const at2 = rows.findIndex((r) => r.node.id === pendingNameEditGuid);
        pendingNameEditGuid = null;
        if (at2 !== -1) {
          setSelection(at2);
          startNameEdit(rows[at2].node, true);
        }
      }
    }, "renderRows");
    const buildRow = /* @__PURE__ */ __name((index) => {
      const { node, depth } = rows[index];
      const fields = renderFields;
      const hasChildren = node.children.length > 0;
      const indent = ROW_PAD_X + depth * DEPTH_STEP;
      const $row = document.createElement("div");
      $row.className = "outline-row";
      if (contextGuids.has(node.id)) $row.classList.add("is-context");
      $row.dataset.index = String(index);
      if (index === selectedIndex) $row.classList.add("selected");
      $row.dataset.guid = node.id;
      $row.dataset.indent = String(indent);
      const $title = document.createElement("div");
      $title.className = "outline-title";
      $title.style.paddingLeft = `${indent}px`;
      const $twisty = document.createElement("span");
      $twisty.className = "outline-twisty";
      if (hasChildren) {
        $twisty.style.setProperty("--twisty-reach", `${indent}px`);
        $twisty.appendChild(ui.createIcon("ti-chevron-right"));
        $twisty.classList.toggle("expanded", isExpanded(node));
        $twisty.addEventListener("mouseup", (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          toggle(node);
        });
      }
      $title.appendChild($twisty);
      const $icon = ui.createIcon(node.record.getIcon(true) || "ti-file");
      $icon.classList.add("outline-icon");
      $title.appendChild($icon);
      const $name = document.createElement("span");
      $name.className = "outline-name";
      $name.textContent = node.name;
      $title.appendChild($name);
      if (hasChildren && !isExpanded(node)) {
        const $count = document.createElement("span");
        $count.className = "outline-count";
        $count.textContent = String(node.children.length);
        $title.appendChild($count);
      }
      const chips = fields.map((field) => ({ field, value: propValue(node.record, field) })).filter((entry) => entry.value);
      if (chips.length) {
        const $props = document.createElement("span");
        $props.className = "outline-props";
        chips.forEach(({ field, value }) => $props.appendChild(propChip(field, value)));
        $title.appendChild($props);
      }
      const $time = document.createElement("span");
      $time.className = "outline-time";
      $time.textContent = timeAgo(node.record.date("Modified"));
      $title.appendChild($time);
      if (canShowOptions) {
        const $opts = document.createElement("button");
        $opts.type = "button";
        $opts.className = "outline-row-menu button-none button-small button-minimal-hover tooltip";
        $opts.setAttribute("aria-label", "Options");
        $opts.dataset.tooltip = "Options";
        $opts.dataset.tooltipDir = "top";
        $opts.appendChild(ui.createIcon("ti-dots"));
        $opts.addEventListener("mouseup", (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
        $opts.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          setSelection(index);
          nativePeek.showOptionsDropdown($opts, node.id);
        });
        $title.appendChild($opts);
      }
      $row.appendChild($title);
      if (propMode && propMode.guid === node.id) {
        $row.appendChild(buildPropEditor(node, indent));
      }
      $row.addEventListener("mouseup", (e) => {
        if (e.button !== 0 && e.button !== 1) return;
        hidePeek();
        setSelection(index);
        if (e.button === 0 && e.shiftKey) {
          e.preventDefault();
          return;
        }
        if (e.button === 1 || e.metaKey || e.ctrlKey) {
          viewContext.openRecordInOtherPanel(node.id);
        } else {
          viewContext.openRecordInThisPanel(node.id);
        }
        e.preventDefault();
      });
      return $row;
    }, "buildRow");
    const mount = /* @__PURE__ */ __name(() => {
      const $element = viewContext.getElement();
      $element.innerHTML = "";
      $root = document.createElement("div");
      $root.className = "outline-root collection-list-view";
      $zoom = document.createElement("div");
      $zoom.className = "outline-zoom";
      $root.appendChild($zoom);
      $note = document.createElement("div");
      $note.className = "outline-note";
      $root.appendChild($note);
      $list = document.createElement("div");
      $list.className = "outline-list";
      $root.appendChild($list);
      if (viewContext.supportsCreateRecord()) {
        const $create = document.createElement("button");
        $create.type = "button";
        $create.className = "collection-list-create-card";
        $create.style.paddingLeft = `calc(var(--list-row-overhang) + ${ICON_OFFSET}px)`;
        $create.appendChild(ui.createIcon("ti-plus"));
        const $label = document.createElement("span");
        $label.textContent = `New ${viewContext.getRecordTypeName()}`;
        $create.appendChild($label);
        const $kbd = document.createElement("kbd");
        $kbd.className = "collection-list-create-card-shortcut";
        $kbd.textContent = "\u21E7\u21B5";
        $create.appendChild($kbd);
        $create.addEventListener("click", (e) => {
          e.stopPropagation();
          createRecord();
        });
        $root.appendChild($create);
      }
      $element.appendChild($root);
    }, "mount");
    return {
      onLoad: /* @__PURE__ */ __name(() => {
        if (!plugin.outlineCssInjected) ui.injectCSS(
          /* css */
          `
				.outline-root {
					position: relative;
					display: flex;
					flex-direction: column;
					font-family: var(--font-sans);
					font-size: var(--text-size-normal);
					color: var(--text-default);
				}
				.outline-note {
					font-size: 12px;
					color: var(--enum-orange-fg, #c60);
				}
				.outline-note:empty {
					display: none;
				}
				.outline-zoom {
					display: flex;
					align-items: center;
					min-width: 0;
					overflow: hidden;
					margin-bottom: 6px;
				}
				.outline-zoom:empty {
					display: none;
				}
				.outline-zoom-sep {
					flex: none;
					opacity: .45;
					font-size: 13px;
				}
				.outline-zoom-step {
					display: inline-flex;
					flex: 0 1 auto;
					min-width: 3em;
					max-width: 16em;
				}
				.outline-zoom-step:first-child {
					flex: none;
					min-width: 0;
				}
				.outline-zoom-step.is-current {
					flex-shrink: 0.3;
					font-weight: 600;
				}
				.outline-zoom-step > span {
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					min-width: 0;
				}
				.outline-menu {
					position: absolute;
					z-index: 20;
					min-width: 180px;
					padding: 4px;
					background: var(--cmdpal-bg-color);
					border: 1px solid var(--cmdpal-border-color);
					border-radius: var(--radius-normal);
					box-shadow: var(--cmdpal-box-shadow);
				}
				.outline-menu.has-filter {
					min-width: 250px;
				}
				.outline-menu-filter {
					width: 100%;
					margin-bottom: 4px;
					background: transparent;
				}
				.outline-menu-item {
					display: flex;
					align-items: center;
					gap: 6px;
					padding: 5px 8px;
					border-radius: var(--radius-normal);
					color: var(--cmdpal-fg-color);
					font-size: var(--text-size-small);
					cursor: pointer;
				}
				.outline-menu-item:hover {
					background: var(--cmdpal-hover-bg-color);
					color: var(--cmdpal-hover-fg-color);
				}
				/* the current value, as the app's .autocomplete--current */
				.outline-menu-item.is-active {
					background: var(--cmdpal-current-bg-color);
					color: var(--cmdpal-current-fg-color);
					font-weight: 700;
				}
				/* the keyboard highlight, as .autocomplete--option-selected */
				.outline-menu-item.is-selected,
				.outline-menu-item.is-selected:hover {
					background: var(--cmdpal-selected-bg-color);
					color: var(--cmdpal-selected-fg-color);
				}
				.outline-pad { flex: none; }
				/*
				 * Key hints: our status-bar item is pinned over the bar's left
				 * edge while the app's own hints there are hidden. Absolute
				 * against the bar escapes .statusbar--right's overflow clip.
				 */
				.outline-keys { display: none !important; }
				body.${KEYS_BODY_CLASS} .statusbar--status-bar { position: relative; }
				body.${KEYS_BODY_CLASS} .statusbar--left > * { display: none !important; }
				body.${KEYS_BODY_CLASS} .outline-keys {
					display: flex !important;
					position: absolute;
					left: 0;
					top: 0;
					bottom: 0;
					align-items: center;
					margin: 0;
					padding: 0;
					overflow: hidden;
				}
				.outline-keys .statusbar-item--icon { display: none; }
				.outline-keys .statusbar-item--label {
					display: flex;
					flex-wrap: wrap;
					align-items: center;
					column-gap: 5px;
					row-gap: 20px;
					height: 19px;
					overflow: hidden;
					font-size: 12px;
				}
				.outline-list {
					display: flex;
					flex-direction: column;
				}
				.outline-row {
					padding: 4px 12px 4px 0;
					cursor: pointer;
					user-select: none;
					border-radius: var(--radius-normal);
				}
				.outline-row:hover {
					background: var(--prop-bg-hover);
				}
				.outline-row.selected {
					background: var(--cards-bg-focused);
				}
				.outline-title {
					display: flex;
					align-items: center;
					gap: 6px;
				}
				.outline-twisty {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 16px;
					height: 16px;
					flex: 0 0 16px;
					color: var(--text-muted);
					border-radius: 3px;
					position: relative;
				}
				/*
				 * The chevron alone is a 16px target beside a row that opens on
				 * click, so misses zoom into the page. This invisible box widens
				 * the target to the full row height, left across the indent to the
				 * row edge, and right across the gap to the page icon. The
				 * chevron rotates inside it, not the twisty, so the box stays put.
				 */
				.outline-twisty:not(:empty)::before {
					content: "";
					position: absolute;
					top: -7px;
					bottom: -7px;
					left: calc(-1 * var(--twisty-reach, 0px));
					right: -${ROW_GAP}px;
				}
				.outline-twisty > * {
					transition: transform 0.12s ease;
				}
				.outline-twisty.expanded > * {
					transform: rotate(90deg);
				}
				.outline-twisty:hover {
					background: var(--ed-fold-icon-hover-bg);
				}
				.outline-icon {
					color: var(--text-muted);
					flex: 0 0 auto;
				}
				/*
				 * Our collection-icons fork broadcasts its "Hide icons in
				 * collection views" switch as this body attribute; honor it so
				 * the Outline view matches the built-in List view. Inert when
				 * that plugin is absent \u2014 the attribute is never set.
				 */
				body[data-plg-collection-icons-listview-icons="hide"] .outline-icon {
					display: none;
				}
				.outline-name {
					flex: 0 1 auto;
					min-width: 0;
					font-weight: 600;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				/*
				 * A row the filter dropped, kept only to hold a match's place.
				 * Dimmed rather than hidden: it still has to read as the path
				 * down to the match, and it is still a working row \u2014 clickable,
				 * foldable, editable. The matches themselves are left alone, so
				 * an unfiltered tree looks exactly as it always did.
				 *
				 * Recoloring the name alone was not enough to see, at either
				 * --text-subtle (text-500, one step off the default \u2014 invisible)
				 * or --text-muted (text-800). Fading the WHOLE row instead takes
				 * the name, the icon, the chips and the timestamp down together,
				 * which is what makes the matched rows pop out of the column; the
				 * name also loses its bold, so weight carries the same signal
				 * where a theme's colors are close together.
				 */
				.outline-row.is-context {
					opacity: .45;
				}
				.outline-row.is-context .outline-name {
					font-weight: 400;
				}
				/* Full strength again on hover or focus \u2014 a faded row is still a
				   working row, and it should not look inert while pointed at. */
				.outline-row.is-context:hover,
				.outline-row.is-context.selected {
					opacity: 1;
				}
				.outline-count {
					flex: 0 0 auto;
					font-size: var(--text-size-small);
					color: var(--text-subtle);
				}
				/*
				 * A fixed column, not shrink-to-fit: the chips are pushed up
				 * against the stamp, so a stamp that is one character shorter
				 * ("1h ago" against "16m ago") would otherwise leave that row's
				 * chips ending at a different x from every other row's.
				 */
				.outline-time {
					flex: 0 0 auto;
					min-width: 8ch;
					text-align: right;
					font-size: var(--text-size-small);
					color: var(--text-muted);
				}
				/* Native: .collection-list-card-menu, shown on hover or on the
				   focused card of a focused view. */
				/* At the right end of line 1, like native's top-right corner. The
				   chips already push themselves and the stamp right; with none on
				   the line, the button takes the free space instead (two auto
				   margins on one line would split it). */
				.outline-row-menu {
					flex: 0 0 auto;
					margin-left: auto;
					opacity: 0;
				}
				.outline-props ~ .outline-row-menu {
					margin-left: 0;
				}
				.outline-row:hover .outline-row-menu,
				.focused-component .outline-row.selected .outline-row-menu {
					opacity: 1;
				}
				/*
				 * Chips are pushed to the right, so they and the timestamp read
				 * as one right-hand column instead of trailing the name at a
				 * different x on every row.
				 *
				 * This is the ONLY auto margin on the line. Giving the stamp one
				 * as well splits the free space evenly between the two, which
				 * left the chips floating mid-row at a position that tracked the
				 * name's length \u2014 the opposite of aligned.
				 */
				.outline-props {
					display: inline-flex;
					align-items: center;
					flex: 0 0 auto;
					gap: 10px;
					margin-left: auto;
					padding-right: 10px;
				}
				/*
				 * Two-line fallback: the chips are moved out of the title line
				 * (restack()), which keeps that line unwrappable \u2014 the name
				 * ellipsises and the timestamp stays put, as native does. The
				 * left offset is set inline, since it follows the row's depth.
				 */
				/* Wrapped, the chips are left-aligned under the row icon: there
				   is no stamp on line 2 to align them against, and a lone
				   right-aligned run reads as belonging to the row below. */
				.outline-row.is-stacked .outline-props {
					display: flex;
					justify-content: flex-start;
					margin-left: 0;
					margin-top: 2px;
					padding-right: 0;
				}
				.outline-prop {
					display: inline-flex;
					align-items: center;
					gap: 4px;
					font-size: var(--text-size-small);
				}
				.outline-prop-icon {
					color: var(--text-xmuted);
				}
				.outline-prop-text {
					color: var(--text-muted);
				}
				.outline-pill {
					border-radius: 4px;
					padding: 1px 6px;
				}
				.outline-link {
					color: var(--ed-inlineref-fg);
					border-radius: 4px;
					padding: 1px 6px;
					background: var(--ed-backlink-bg);
				}
				.outline-link:hover {
					color: var(--ed-inlineref-hover-color);
				}
				.outline-link-arrow {
					margin-left: 3px;
					opacity: 0.7;
				}
				/* the property list E opens under a row */
				.outline-propedit {
					display: flex;
					flex-direction: column;
					gap: 1px;
					margin-top: 4px;
					padding-bottom: 2px;
				}
				.outline-pe-row {
					display: flex;
					align-items: center;
					gap: 6px;
					padding: 3px 6px;
					border-radius: var(--radius-normal);
					font-size: var(--text-size-small);
					cursor: pointer;
				}
				.outline-pe-row:hover {
					background: var(--prop-bg-hover);
				}
				.outline-pe-row.is-selected {
					background: var(--cmdpal-selected-bg-color);
					color: var(--cmdpal-selected-fg-color);
				}
				.outline-pe-icon {
					color: var(--text-xmuted);
					flex: 0 0 auto;
				}
				.outline-pe-label {
					flex: 0 0 140px;
					color: var(--text-muted);
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.outline-pe-row.is-selected .outline-pe-label {
					color: inherit;
				}
				.outline-pe-value {
					flex: 1 1 auto;
					min-width: 0;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.outline-pe-value.is-empty {
					color: var(--text-xmuted);
				}
				.outline-inline-input {
					flex: 1 1 auto;
					min-width: 0;
					padding: 1px 4px;
					border: var(--input-border-focus);
					border-radius: 3px;
					background: var(--panel-bg-color);
					color: var(--text-default);
					font-family: var(--font-sans);
					font-size: inherit;
					font-weight: inherit;
					outline: none;
				}
				.outline-empty {
					padding: 40px;
					text-align: center;
					color: var(--text-muted);
				}
			`
        );
        plugin.outlineCssInjected = true;
        viewContext.makeNormalLayout();
        mount();
        document.addEventListener("keydown", onShortcutKey, true);
      }, "onLoad"),
      onRefresh: /* @__PURE__ */ __name(({ records }) => {
        lastRecords = records;
        takeZoomHandoff();
        if (pending.size && !settled(records)) return;
        if (placingGuid && records.some((r) => r.guid === placingGuid)) return;
        rebuild();
      }, "onRefresh"),
      // Width decides which rows stack onto two lines, so every measured
      // height is suspect after a resize.
      onPanelResize: /* @__PURE__ */ __name(() => {
        heightCache.clear();
        renderWindow(true);
      }, "onPanelResize"),
      onDestroy: /* @__PURE__ */ __name(() => {
        document.removeEventListener("keydown", onShortcutKey, true);
        stopHintTimer();
        if (viewFocused) hints.showKeyHints(false);
        detachScroller();
        $topPad = $bottomPad = null;
        closeMenu();
        hidePeek();
        propMode = null;
        pendingNameEditGuid = null;
        hierarchy = null;
        rows = [];
        $root = null;
        $list = null;
        $note = null;
        $zoom = null;
        $menu = null;
        lastRecords = null;
      }, "onDestroy"),
      // Enter from the sidebar, a click, or a panel switch lands here.
      onFocus: /* @__PURE__ */ __name(() => {
        viewFocused = true;
        syncKeyHints();
        if (!hintTimer) hintTimer = setInterval(syncKeyHints, 300);
        if (rows.length) setSelection(selectedIndex);
      }, "onFocus"),
      onBlur: /* @__PURE__ */ __name(() => {
        viewFocused = false;
        stopHintTimer();
        hints.showKeyHints(false);
      }, "onBlur"),
      onKeyboardNavigation: /* @__PURE__ */ __name(({ e }) => {
        if ($menu) return;
        if (!keysAreOurs()) return;
        const current = rows[selectedIndex];
        if (!current) return;
        const plain = !e.metaKey && !e.ctrlKey && !e.altKey;
        if (propMode) {
          const fields = editableFields();
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const step = e.key === "ArrowDown" ? 1 : -1;
            propMode.index = (propMode.index + step + fields.length) % fields.length;
            paintPropSelection();
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            editSelectedField();
            return;
          }
          if (e.key === "Escape" || e.key === "e" || e.key === "E") {
            e.preventDefault();
            exitPropMode();
            return;
          }
          return;
        }
        if ((e.key === "e" || e.key === "E") && plain) {
          e.preventDefault();
          if (editableFields().length) {
            propMode = { guid: current.node.id, index: 0 };
            renderRows();
            syncKeyHints();
          }
          return;
        }
        if ((e.key === "r" || e.key === "R" || e.key === "F2") && plain) {
          e.preventDefault();
          startNameEdit(current.node, false);
          return;
        }
        if (e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          createBeside("below");
          return;
        }
        if (e.key === "Enter" && e.altKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          createBeside("above");
          return;
        }
        if (e.key === "/" && plain) {
          if (focusAppSearch()) e.preventDefault();
          return;
        }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (isPeeking()) commitPeek();
          else openSelected(true);
          return;
        }
        if (e.key === "Escape" && isPeeking()) {
          e.preventDefault();
          hidePeek();
          return;
        }
        if (e.key === " ") {
          e.preventDefault();
          showPeek();
          return;
        }
        if (e.key === "Tab" && plain) {
          e.preventDefault();
          rearrange(e.shiftKey ? "outdent" : "indent");
          return;
        }
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
          e.preventDefault();
          rearrange(e.key === "ArrowDown" ? "down" : "up");
          return;
        }
        if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
          e.preventDefault();
          const hasChildren = current.node.children.length > 0;
          if (e.key === "ArrowDown") {
            if (hasChildren && !isExpanded(current.node)) toggle(current.node);
            selectNext(1);
          } else if (hasChildren && isExpanded(current.node)) {
            toggle(current.node);
          } else if (current.parent) {
            setFolded([current.parent], true);
            refold(current.parent.id);
          } else if (selectedIndex === 0) {
            focusAppSearch();
          } else {
            selectNext(-1);
          }
          return;
        }
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            selectNext(1);
            break;
          case "ArrowUp":
            e.preventDefault();
            if (selectedIndex === 0) focusAppSearch();
            else selectNext(-1);
            break;
          // ←/→ cycle rows like ↑/↓ do. They also have to be swallowed:
          // left alone, the app moves the panel left/right.
          case "ArrowRight":
            e.preventDefault();
            selectNext(1);
            break;
          case "ArrowLeft":
            e.preventDefault();
            selectNext(-1);
            break;
          case "Home":
            e.preventDefault();
            setSelection(0);
            break;
          case "End":
            e.preventDefault();
            setSelection(rows.length - 1);
            break;
          case "Enter":
            e.preventDefault();
            if (isPeeking()) commitPeek();
            else openSelected(false);
            break;
        }
      }, "onKeyboardNavigation")
    };
  }
  __name(createOutlineView, "createOutlineView");

  // collection/no-extras.js
  function no_extras_default() {
  }
  __name(no_extras_default, "default");

  // collection/plugin.js
  var Plugin = class extends CollectionPlugin {
    static {
      __name(this, "Plugin");
    }
    onLoad() {
      this.hints = new KeyHints(this.ui);
      this.registerOutlineViews();
      no_extras_default(this);
    }
    onUnload() {
      this.hints.dispose();
    }
    /**
     * Register every Outline view in the collection, whatever its id: a fixed id
     * would come unhooked by a rename or a hand-made second view. This runs on
     * every rebuild of the collection plugin (each config save makes a new one),
     * so a view added in settings is picked up without further action.
     */
    registerOutlineViews() {
      const views = (this.getConfiguration().views || []).filter(isOutlineView);
      for (const view of views) {
        this.views.register(view.id, (viewContext) => createOutlineView(
          viewContext,
          { plugin: this, view, nativeView: this.pendingNativeView || null },
          this.hints
        ));
        this.captureNativeView(view.id);
      }
    }
    /**
     * Not SDK: the SDK plugin class extends the app's internal collection plugin,
     * so `customViewHooks` is the Map views.register() writes into, and the app
     * calls each entry with its internal records view. register() drops that
     * argument, so wrap the entry and park the view for the factory above, which
     * runs synchronously inside it. Missing internals leave nativeView null.
     */
    captureNativeView(viewId) {
      const hooks = this.customViewHooks;
      const make = hooks instanceof Map ? hooks.get(viewId) : null;
      if (typeof make !== "function") return;
      hooks.set(viewId, (view) => {
        this.pendingNativeView = view;
        try {
          return make(view);
        } finally {
          this.pendingNativeView = null;
        }
      });
    }
  };
  return __toCommonJS(plugin_exports);
})();

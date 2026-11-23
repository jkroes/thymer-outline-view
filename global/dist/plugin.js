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

  // global/plugin.js
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
      this.loadHierarchy();
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
      const code = (api.getExistingCodeAndConfig() || {}).code || "";
      if (!code.includes(OUTLINE_SIGNATURE)) return [];
      return (api.getConfiguration().views || []).filter(isOutlineView);
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

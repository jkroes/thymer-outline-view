/// <reference path="../sdk/types.d.ts" />
/**
 * Outline — the collection half: the code that goes in a collection's own plugin
 * slot and draws its Outline views.
 *
 * A collection has ONE code slot. To put other code in the same collection (a
 * formula, a custom record title, another plugin's custom view), merge it in at
 * build time instead of editing the built file: write an "extras" module
 *
 *     export default function (plugin) {
 *         plugin.properties.formula('Total', ({ record }) => ...);
 *     }
 *
 * and build with it (`node collection/build.mjs --extras <file>`; see
 * collection/deploy.mjs for the per-collection routine). It runs at the end of
 * onLoad with the collection plugin as its argument. An extras module that
 * registers a Custom view of its own must give that view an `opts.kind` other
 * than "outline", or this code draws it as an outline (see isOutlineView).
 *
 * Module-style source: it will not run until built.
 */

import { createOutlineView, isOutlineView, KeyHints } from '../view.js';
import extras from 'outline-extras';

export class Plugin extends CollectionPlugin {

	onLoad() {
		this.hints = new KeyHints(this.ui);
		this.registerOutlineViews();
		extras(this);
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
				this.hints,
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
		if (typeof make !== 'function') return;
		hooks.set(viewId, (view) => {
			this.pendingNativeView = view;
			try {
				return make(view);
			} finally {
				this.pendingNativeView = null;
			}
		});
	}
}

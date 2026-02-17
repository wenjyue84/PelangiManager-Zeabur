/**
 * lazy-loader.js — On-demand ES module loader for tab-specific code
 *
 * Instead of eagerly importing all 35+ tab modules at page load,
 * this loader maps each tab to its required modules and loads them
 * only when the user navigates to that tab.
 *
 * Modules are loaded once and cached — subsequent visits to the same
 * tab skip the import entirely.
 *
 * The module-registry.js still handles the window.* bridge, but it is
 * now split into per-tab registration functions that run after the
 * lazy import completes.
 */

/** Set of tab names whose modules have already been loaded */
const _loadedModules = new Set();

/**
 * Map each tab name to the module-registry chunk that registers
 * its window.* globals.  The paths are relative to the site root
 * (served by Express static middleware).
 *
 * Each entry is an array of ES module paths to import().
 * The modules self-register on window.* or are bridged by
 * module-registry-<tab>.js shim files.
 */
const TAB_MODULE_MAP = {
  'dashboard': ['/public/js/module-chunks/dashboard-chunk.js'],
  'live-chat': ['/public/js/module-chunks/live-chat-chunk.js'],
  'understanding': ['/public/js/module-chunks/understanding-chunk.js'],
  'intents': ['/public/js/module-chunks/intents-chunk.js'],
  'responses': ['/public/js/module-chunks/responses-chunk.js'],
  'chat-simulator': ['/public/js/module-chunks/chat-simulator-chunk.js'],
  'staff-review': ['/public/js/module-chunks/staff-review-chunk.js'],
  'testing': ['/public/js/module-chunks/testing-chunk.js'],
  'performance': ['/public/js/module-chunks/performance-chunk.js'],
  'settings': ['/public/js/module-chunks/settings-chunk.js'],
  'help': ['/public/js/module-chunks/help-chunk.js'],
};

/**
 * Lazy-load modules for a given tab.
 * Safe to call multiple times — only loads once per tab.
 *
 * @param {string} tabName  Canonical tab name (after alias resolution)
 * @returns {Promise<void>}
 */
export async function ensureTabModules(tabName) {
  if (_loadedModules.has(tabName)) return;

  const modules = TAB_MODULE_MAP[tabName];
  if (!modules || modules.length === 0) {
    // No lazy modules for this tab (e.g. whatsapp-accounts placeholder)
    return;
  }

  const t0 = performance.now();

  try {
    // Import all chunks for this tab in parallel
    await Promise.all(modules.map(path => import(path)));
    _loadedModules.add(tabName);
    const elapsed = (performance.now() - t0).toFixed(0);
    console.log(`[LazyLoader] Loaded modules for "${tabName}" in ${elapsed}ms`);
  } catch (err) {
    console.error(`[LazyLoader] Failed to load modules for "${tabName}":`, err);
    // Don't add to _loadedModules so next attempt will retry
    throw err;
  }
}

/**
 * Check if a tab's modules have already been loaded.
 * @param {string} tabName
 * @returns {boolean}
 */
export function isTabLoaded(tabName) {
  return _loadedModules.has(tabName);
}

// Expose to global scope for tabs.js (non-module script)
window._ensureTabModules = ensureTabModules;
window._isTabLoaded = isTabLoaded;

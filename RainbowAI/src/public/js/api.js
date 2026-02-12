/**
 * API proxy module - re-exports the global api() from core/utils.js
 * This allows ES6 modules to import { api } while the real implementation
 * lives in core/utils.js (loaded as a regular script for global scope).
 */
export function api(path, opts = {}) {
  return window.api(path, opts);
}

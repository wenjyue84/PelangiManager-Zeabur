/**
 * Toast proxy module - re-exports the global toast() from core/utils.js
 * This allows ES6 modules to import { toast } while the real implementation
 * lives in core/utils.js (loaded as a regular script for global scope).
 */
export function toast(msg, type = 'success') {
  return window.toast(msg, type);
}

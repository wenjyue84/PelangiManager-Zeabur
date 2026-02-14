/**
 * Global Helper Functions Module
 * Utility functions used across the Rainbow dashboard
 */

import { api, toast } from '../core/utils.js';

/**
 * Close a modal by ID
 * @param {string} id - Modal element ID
 */
export function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

/**
 * Reload configuration from disk and refresh current tab
 * Calls /reload API endpoint and reloads the active tab
 */
export async function reloadConfig() {
  try {
    await api('/reload', { method: 'POST' });
    toast('Config reloaded from disk');
    const activeTab = document.querySelector('.tab-active')?.dataset.tab || 'dashboard';
    window.loadTab(activeTab);
  } catch (e) {
    toast(e.message, 'error');
  }
}

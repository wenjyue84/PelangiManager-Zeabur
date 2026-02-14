/**
 * Chat Simulator Tab Loader
 *
 * Main loader for the Chat Simulator tab
 * Handles sub-tab initialization (Quick Test / Live Simulation)
 */

import { switchSimulatorTab } from './chat-simulator-helpers.js';

/**
 * Load Chat Simulator tab (merged Preview + Real Chat)
 * @param {string|null} subTab - Optional sub-tab ID ('quick-test' or 'live-simulation')
 */
export async function loadChatSimulator(subTab = null) {
  // Load specified sub-tab or default to Quick Test
  const effectiveSubTab = subTab || 'quick-test';
  // switchSimulatorTab already calls loadRealChat() for live-simulation,
  // so we don't call it again below to avoid duplicate concurrent calls
  // that can destroy DOM elements before the second call reads them.
  switchSimulatorTab(effectiveSubTab, false);

  // Load preview chat
  if (typeof loadPreview === 'function') {
    loadPreview();
  }
}

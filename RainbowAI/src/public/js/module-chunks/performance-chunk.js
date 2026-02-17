/**
 * performance-chunk.js — Lazy-loaded modules for the Performance tab
 * Extracted from module-registry.js (Phases 1-partial, 14, 15)
 */

import { loadPerformance } from '/public/js/modules/performance.js';

import {
  toggleFeedbackSettings,
  onFeedbackSettingChange,
  saveFeedbackSettings
} from '/public/js/modules/feedback-settings.js';

import {
  loadFeedbackStats,
  refreshFeedbackStats,
  loadIntentAccuracy,
  refreshIntentAccuracy,
  refreshPerformanceData,
  cleanupPerformance
} from '/public/js/modules/performance-stats.js';

// ─── Window globals ──────────────────────────────────────────────

window.loadPerformance = loadPerformance;
window.toggleFeedbackSettings = toggleFeedbackSettings;
window.onFeedbackSettingChange = onFeedbackSettingChange;
window.saveFeedbackSettings = saveFeedbackSettings;
window.loadFeedbackStats = loadFeedbackStats;
window.refreshFeedbackStats = refreshFeedbackStats;
window.loadIntentAccuracy = loadIntentAccuracy;
window.refreshIntentAccuracy = refreshIntentAccuracy;
window.refreshPerformanceData = refreshPerformanceData;
window.cleanupPerformance = cleanupPerformance;

console.log('[LazyChunk] Performance modules registered');

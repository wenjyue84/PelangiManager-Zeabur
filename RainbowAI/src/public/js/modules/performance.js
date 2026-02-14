/**
 * Performance Tab Loader
 *
 * Displays performance metrics:
 * - Feedback stats (thumbs up/down from guests)
 * - Intent accuracy (classification success rates)
 */

import { toast } from '../core/utils.js';

/**
 * Load Performance tab (merged Feedback Stats + Intent Accuracy)
 */
export async function loadPerformance() {
  try {
    // Load feedback stats
    if (typeof loadFeedbackStats === 'function') {
      await loadFeedbackStats();
    }

    // Load intent accuracy
    if (typeof loadIntentAccuracy === 'function') {
      await loadIntentAccuracy();
    }
  } catch (err) {
    console.error('[Performance] Failed to load:', err);
    toast(err.message, 'error');
  }
}

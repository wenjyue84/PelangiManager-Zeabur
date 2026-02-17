/**
 * Performance Stats Module
 * Loads and displays feedback stats and intent accuracy metrics
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

// Module-level state
let feedbackRefreshInterval = null;
let intentAccuracyRefreshInterval = null;

/**
 * Load feedback statistics
 * Shows overall stats, by-intent breakdown, by-tier breakdown, and recent feedback
 */
export async function loadFeedbackStats() {
  try {
    // Show loading
    document.getElementById('feedback-loading').classList.remove('hidden');
    document.getElementById('feedback-empty').classList.add('hidden');
    document.getElementById('feedback-overall-stats').classList.add('hidden');

    // Fetch stats
    const response = await api('/feedback/stats');
    const stats = response.stats; // Extract stats from response wrapper

    // Hide loading
    document.getElementById('feedback-loading').classList.add('hidden');

    // Check if we have data
    if (!stats || !stats.overall || stats.overall.totalFeedback === 0) {
      document.getElementById('feedback-empty').classList.remove('hidden');
      return;
    }

    // Show stats
    document.getElementById('feedback-overall-stats').classList.remove('hidden');

    // Update overall stats
    document.getElementById('feedback-total').textContent = stats.overall.totalFeedback;
    document.getElementById('feedback-thumbs-up').textContent = stats.overall.thumbsUp;
    document.getElementById('feedback-thumbs-down').textContent = stats.overall.thumbsDown;
    document.getElementById('feedback-satisfaction').textContent = stats.overall.satisfactionRate + '%';

    // Update by intent table
    const intentTbody = document.getElementById('feedback-by-intent-tbody');
    if (stats.byIntent && stats.byIntent.length > 0) {
      intentTbody.innerHTML = stats.byIntent
        .sort((a, b) => b.totalFeedback - a.totalFeedback)
        .map(item => '<tr class="border-b last:border-b-0">' +
          '<td class="px-4 py-2">' + esc(item.intent) + '</td>' +
          '<td class="px-4 py-2 text-right font-medium">' + item.totalFeedback + '</td>' +
          '<td class="px-4 py-2 text-right text-green-600">' + item.thumbsUp + '</td>' +
          '<td class="px-4 py-2 text-right text-red-500">' + item.thumbsDown + '</td>' +
          '<td class="px-4 py-2 text-right font-medium">' + Math.round(item.satisfactionRate) + '%</td>' +
          '</tr>')
        .join('');
    } else {
      intentTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-neutral-400">No intent feedback data</td></tr>';
    }

    // Update by tier table
    const tierTbody = document.getElementById('feedback-by-tier-tbody');
    if (stats.byTier && stats.byTier.length > 0) {
      const tierLabels = {
        't1': '🚨 Priority Keywords',
        't2': '⚡ Smart Matching',
        't3': '📚 Learning Examples',
        't4': '🤖 AI Fallback',
        'llm': '🤖 AI Fallback'
      };
      tierTbody.innerHTML = stats.byTier.map(item => '<tr class="border-b last:border-b-0">' +
        '<td class="px-4 py-2">' + (tierLabels[item.tier] || esc(item.tier)) + '</td>' +
        '<td class="px-4 py-2 text-right font-medium">' + item.totalFeedback + '</td>' +
        '<td class="px-4 py-2 text-right text-green-600">' + item.thumbsUp + '</td>' +
        '<td class="px-4 py-2 text-right text-red-500">' + item.thumbsDown + '</td>' +
        '<td class="px-4 py-2 text-right font-medium">' + Math.round(item.satisfactionRate) + '%</td>' +
        '</tr>').join('');
    } else {
      tierTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-neutral-400">No tier feedback data</td></tr>';
    }

    // Fetch recent feedback
    const recentResponse = await api('/feedback/recent?limit=20');
    const recentTbody = document.getElementById('feedback-recent-tbody');
    if (recentResponse && recentResponse.feedback && recentResponse.feedback.length > 0) {
      recentTbody.innerHTML = recentResponse.feedback.map(item => {
        const date = new Date(item.createdAt);
        const formattedDate = date.toLocaleString('en-MY', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        const ratingIcon = item.rating === 1 ? '👍' : '👎';
        const ratingClass = item.rating === 1 ? 'text-green-600' : 'text-red-500';
        return '<tr class="border-b last:border-b-0">' +
          '<td class="px-4 py-2 text-xs">' + formattedDate + '</td>' +
          '<td class="px-4 py-2">' + esc(item.phoneNumber) + '</td>' +
          '<td class="px-4 py-2">' + esc(item.intent || 'unknown') + '</td>' +
          '<td class="px-4 py-2 text-xs">' + esc(item.tier || '-') + '</td>' +
          '<td class="px-4 py-2 text-center ' + ratingClass + '">' + ratingIcon + '</td>' +
          '</tr>';
      }).join('');
    } else {
      recentTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-neutral-400">No recent feedback</td></tr>';
    }

    // Setup auto-refresh every 30 seconds when tab is active
    if (!feedbackRefreshInterval) {
      feedbackRefreshInterval = setInterval(() => {
        const feedbackTab = document.getElementById('tab-feedback-stats');
        if (feedbackTab && !feedbackTab.classList.contains('hidden')) {
          loadFeedbackStats();
        }
      }, 30000);
    }
  } catch (err) {
    console.error('Failed to load feedback stats:', err);
    document.getElementById('feedback-loading').classList.add('hidden');
    document.getElementById('feedback-empty').classList.remove('hidden');
    toast('Failed to load feedback data', 'error');
  }
}

/**
 * Refresh feedback statistics
 */
export async function refreshFeedbackStats() {
  toast('Refreshing feedback data...', 'info');
  await loadFeedbackStats();
  toast('Feedback data updated', 'success');
}

/**
 * Load intent accuracy statistics
 * Shows overall accuracy, by-intent breakdown, by-tier breakdown, and by-model breakdown
 */
export async function loadIntentAccuracy() {
  try {
    // Show loading
    document.getElementById('intent-accuracy-loading').classList.remove('hidden');
    document.getElementById('intent-accuracy-empty').classList.add('hidden');
    document.getElementById('intent-accuracy-overall-stats').classList.add('hidden');

    // Fetch stats
    const response = await api('/intent/accuracy');

    // Hide loading
    document.getElementById('intent-accuracy-loading').classList.add('hidden');

    // Check if we have data
    if (!response || !response.accuracy || response.accuracy.overall.total === 0) {
      document.getElementById('intent-accuracy-empty').classList.remove('hidden');
      return;
    }

    const stats = response.accuracy;

    // Show stats
    document.getElementById('intent-accuracy-overall-stats').classList.remove('hidden');

    // Update overall stats
    document.getElementById('intent-accuracy-total').textContent = stats.overall.total;
    document.getElementById('intent-accuracy-correct').textContent = stats.overall.correct;
    document.getElementById('intent-accuracy-incorrect').textContent = stats.overall.incorrect;
    document.getElementById('intent-accuracy-rate').textContent =
      stats.overall.accuracyRate !== null ? Math.round(stats.overall.accuracyRate) + '%' : 'N/A';

    // Update by intent table
    const intentTbody = document.getElementById('intent-accuracy-by-intent-tbody');
    if (stats.byIntent && stats.byIntent.length > 0) {
      intentTbody.innerHTML = stats.byIntent
        .sort((a, b) => b.total - a.total)
        .map(item => '<tr class="border-b last:border-b-0">' +
          '<td class="px-4 py-2">' + esc(item.intent) + '</td>' +
          '<td class="px-4 py-2 text-right font-medium">' + item.total + '</td>' +
          '<td class="px-4 py-2 text-right text-green-600">' + item.correct + '</td>' +
          '<td class="px-4 py-2 text-right text-red-500">' + item.incorrect + '</td>' +
          '<td class="px-4 py-2 text-right font-medium">' +
          (item.accuracyRate !== null ? Math.round(item.accuracyRate) + '%' : 'N/A') + '</td>' +
          '<td class="px-4 py-2 text-right text-neutral-600">' +
          (item.avgConfidence !== null ? (item.avgConfidence * 100).toFixed(0) + '%' : 'N/A') + '</td>' +
          '</tr>')
        .join('');
    } else {
      intentTbody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-neutral-400">No intent accuracy data</td></tr>';
    }

    // Update by tier table
    const tierTbody = document.getElementById('intent-accuracy-by-tier-tbody');
    if (stats.byTier && stats.byTier.length > 0) {
      const tierLabels = {
        't1': '🚨 Priority Keywords',
        't2': '⚡ Smart Matching',
        't3': '📚 Learning Examples',
        't4': '🤖 AI Fallback',
        'llm': '🤖 AI Fallback'
      };
      tierTbody.innerHTML = stats.byTier.map(item => '<tr class="border-b last:border-b-0">' +
        '<td class="px-4 py-2">' + (tierLabels[item.tier] || esc(item.tier)) + '</td>' +
        '<td class="px-4 py-2 text-right font-medium">' + item.total + '</td>' +
        '<td class="px-4 py-2 text-right text-green-600">' + item.correct + '</td>' +
        '<td class="px-4 py-2 text-right text-red-500">' + item.incorrect + '</td>' +
        '<td class="px-4 py-2 text-right font-medium">' +
        (item.accuracyRate !== null ? Math.round(item.accuracyRate) + '%' : 'N/A') + '</td>' +
        '<td class="px-4 py-2 text-right text-neutral-600">' +
        (item.avgConfidence !== null ? (item.avgConfidence * 100).toFixed(0) + '%' : 'N/A') + '</td>' +
        '</tr>').join('');
    } else {
      tierTbody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-neutral-400">No tier accuracy data</td></tr>';
    }

    // Update by model table
    const modelTbody = document.getElementById('intent-accuracy-by-model-tbody');
    if (stats.byModel && stats.byModel.length > 0) {
      modelTbody.innerHTML = stats.byModel.map(item => '<tr class="border-b last:border-b-0">' +
        '<td class="px-4 py-2">' + esc(item.model) + '</td>' +
        '<td class="px-4 py-2 text-right font-medium">' + item.total + '</td>' +
        '<td class="px-4 py-2 text-right text-green-600">' + item.correct + '</td>' +
        '<td class="px-4 py-2 text-right text-red-500">' + item.incorrect + '</td>' +
        '<td class="px-4 py-2 text-right font-medium">' +
        (item.accuracyRate !== null ? Math.round(item.accuracyRate) + '%' : 'N/A') + '</td>' +
        '</tr>').join('');
    } else {
      modelTbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-neutral-400">No model accuracy data (T4 tier not used or no validated predictions)</td></tr>';
    }

    // Setup auto-refresh every 30 seconds when tab is active
    if (!intentAccuracyRefreshInterval) {
      intentAccuracyRefreshInterval = setInterval(() => {
        const accuracyTab = document.getElementById('tab-intent-accuracy');
        if (accuracyTab && !accuracyTab.classList.contains('hidden')) {
          loadIntentAccuracy();
        }
      }, 30000);
    }
  } catch (err) {
    console.error('Failed to load intent accuracy:', err);
    document.getElementById('intent-accuracy-loading').classList.add('hidden');
    document.getElementById('intent-accuracy-empty').classList.remove('hidden');
    toast('Failed to load intent accuracy data', 'error');
  }
}

/**
 * Refresh intent accuracy statistics
 */
export async function refreshIntentAccuracy() {
  toast('Refreshing intent accuracy data...', 'info');
  await loadIntentAccuracy();
  toast('Intent accuracy data updated', 'success');
}

/**
 * Refresh all performance data (feedback + intent accuracy)
 */
export async function refreshPerformanceData() {
  toast('Refreshing performance data...', 'info');
  await Promise.all([loadFeedbackStats(), loadIntentAccuracy()]);
  toast('Performance data updated', 'success');
}

/**
 * Cleanup (US-160)
 * Called when navigating away from the performance tab to stop background polling
 */
export function cleanupPerformance() {
  if (feedbackRefreshInterval) {
    clearInterval(feedbackRefreshInterval);
    feedbackRefreshInterval = null;
  }
  if (intentAccuracyRefreshInterval) {
    clearInterval(intentAccuracyRefreshInterval);
    intentAccuracyRefreshInterval = null;
  }
  console.log('[Performance] Cleanup: cleared all intervals');
}

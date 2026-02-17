/**
 * staff-review-chunk.js — Lazy-loaded modules for the Staff Review tab
 * Extracted from module-registry.js (Phase 17)
 */

import {
  loadStaffReview,
  markPredictionCorrect,
  showCorrectionDropdown,
  submitCorrection,
  refreshStaffReview,
  bulkApproveAll,
  bulkRejectAll,
  bulkApproveAboveThreshold,
  bulkRejectBelowThreshold,
  bulkApproveByIntent,
  bulkRejectByIntent,
  switchStaffReviewTab
} from '/public/js/modules/staff-review.js';

// ─── Window globals ──────────────────────────────────────────────

window.loadStaffReview = loadStaffReview;
window.markPredictionCorrect = markPredictionCorrect;
window.showCorrectionDropdown = showCorrectionDropdown;
window.submitCorrection = submitCorrection;
window.refreshStaffReview = refreshStaffReview;
window.bulkApproveAll = bulkApproveAll;
window.bulkRejectAll = bulkRejectAll;
window.bulkApproveAboveThreshold = bulkApproveAboveThreshold;
window.bulkRejectBelowThreshold = bulkRejectBelowThreshold;
window.bulkApproveByIntent = bulkApproveByIntent;
window.bulkRejectByIntent = bulkRejectByIntent;
window.switchStaffReviewTab = switchStaffReviewTab;

console.log('[LazyChunk] Staff Review modules registered');

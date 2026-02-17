/**
 * intents-chunk.js — Lazy-loaded modules for the Smart Routing (Intents) tab
 * Extracted from module-registry.js (Phases 5, 6, 10, 11)
 */

import {
  loadIntents,
  changeRouting,
  changeWorkflowId,
  toggleIntent,
  toggleTimeSensitive,
  changeConfidence,
  deleteIntent,
  editUnknownSettings,
  saveUnknownSettings,
  closeUnknownSettings
} from '/public/js/modules/intents.js';

import {
  buildSmartestRouting,
  buildPerformanceRouting,
  buildBalancedRouting,
  routingMatchesTemplate,
  getSavedTemplates,
  saveTemplates,
  renderTemplateButtons,
  showIntentsTemplateHelp,
  detectActiveTemplate,
  applyTemplate,
  showSaveTemplateModal,
  submitSaveTemplate,
  deleteTemplate as deleteRoutingTemplate,
  saveCurrentAsCustom
} from '/public/js/modules/routing-templates.js';

import {
  showAddIntent,
  onAddIntentRoutingChange,
  submitAddIntent,
  testClassifier
} from '/public/js/modules/intent-helpers.js';

import {
  loadRegexPatterns,
  renderRegexPatterns,
  addRegexPattern,
  removeRegexPattern,
  saveRegexPatterns
} from '/public/js/modules/regex-patterns.js';

// ─── Window globals ──────────────────────────────────────────────

window.loadIntents = loadIntents;
window.changeRouting = changeRouting;
window.changeWorkflowId = changeWorkflowId;
window.toggleIntent = toggleIntent;
window.toggleTimeSensitive = toggleTimeSensitive;
window.changeConfidence = changeConfidence;
window.deleteIntent = deleteIntent;
window.editUnknownSettings = editUnknownSettings;
window.saveUnknownSettings = saveUnknownSettings;
window.closeUnknownSettings = closeUnknownSettings;
window.renderTemplateButtons = renderTemplateButtons;
window.showIntentsTemplateHelp = showIntentsTemplateHelp;
window.detectActiveTemplate = detectActiveTemplate;
window.applyTemplate = applyTemplate;
window.showSaveTemplateModal = showSaveTemplateModal;
window.submitSaveTemplate = submitSaveTemplate;
window.deleteTemplate = deleteRoutingTemplate;
window.saveCurrentAsCustom = saveCurrentAsCustom;
window.showAddIntent = showAddIntent;
window.onAddIntentRoutingChange = onAddIntentRoutingChange;
window.submitAddIntent = submitAddIntent;
window.testClassifier = testClassifier;
window.loadRegexPatterns = loadRegexPatterns;
window.renderRegexPatterns = renderRegexPatterns;
window.addRegexPattern = addRegexPattern;
window.removeRegexPattern = removeRegexPattern;
window.saveRegexPatterns = saveRegexPatterns;

console.log('[LazyChunk] Intents/Smart Routing modules registered');

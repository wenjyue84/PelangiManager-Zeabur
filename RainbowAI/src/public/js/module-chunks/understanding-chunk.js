/**
 * understanding-chunk.js — Lazy-loaded modules for the Understanding tab
 * Extracted from module-registry.js (Phases 1-partial, 34)
 */

import { loadUnderstanding } from '/public/js/modules/understanding.js';

import {
  loadIntentManagerData,
  toggleTier,
  loadTierStates,
  updateTier4StatusLabel,
  setupTierToggles,
  saveTierState,
  renderIntentList,
  getExampleCount,
  getExamplesList,
  renderExampleIntentList,
  selectIntent,
  selectExampleIntent,
  renderKeywords,
  renderExamples,
  addKeyword,
  removeKeyword,
  addExample,
  removeExample,
  saveKeywords,
  saveExamples,
  loadTierThresholds,
  handleTierThresholdChange,
  resetTierThreshold,
  testIntentManager,
  exportIntentData,
  updateTierUI,
  resetToDefaults,
  toggleHelp,
  renderQuickAddIntentSelect,
  quickAddKeyword,
  quickAddExample
} from '/public/js/modules/intent-manager.js';

// ─── Window globals ──────────────────────────────────────────────

window.loadUnderstanding = loadUnderstanding;
window.loadIntentManagerData = loadIntentManagerData;
window.toggleTier = toggleTier;
window.loadTierStates = loadTierStates;
window.updateTier4StatusLabel = updateTier4StatusLabel;
window.setupTierToggles = setupTierToggles;
window.saveTierState = saveTierState;
window.renderIntentList = renderIntentList;
window.getExampleCount = getExampleCount;
window.getExamplesList = getExamplesList;
window.renderExampleIntentList = renderExampleIntentList;
window.selectIntent = selectIntent;
window.selectExampleIntent = selectExampleIntent;
window.renderKeywords = renderKeywords;
window.renderExamples = renderExamples;
window.addKeyword = addKeyword;
window.removeKeyword = removeKeyword;
window.addExample = addExample;
window.removeExample = removeExample;
window.saveKeywords = saveKeywords;
window.saveExamples = saveExamples;
window.loadTierThresholds = loadTierThresholds;
window.handleTierThresholdChange = handleTierThresholdChange;
window.resetTierThreshold = resetTierThreshold;
window.testIntentManager = testIntentManager;
window.exportIntentData = exportIntentData;
window.updateTierUI = updateTierUI;
window.resetToDefaults = resetToDefaults;
window.toggleHelp = toggleHelp;
window.renderQuickAddIntentSelect = renderQuickAddIntentSelect;
window.quickAddKeyword = quickAddKeyword;
window.quickAddExample = quickAddExample;

console.log('[LazyChunk] Understanding modules registered');

/**
 * dashboard-chunk.js — Lazy-loaded modules for the Dashboard tab
 * Extracted from module-registry.js (Phases 2, 4, 5-partial, 8, 18, 35-partial)
 */

import {
  restartServer,
  runDashboardProviderSpeedTest,
  initActivityStream,
  disconnectActivityStream,
  toggleActivityExpand,
  filterActivityByCategory,
  cleanupDashboardHelpers
} from '/public/js/modules/dashboard-helpers.js';

import { loadSystemStatus, testAIProvider } from '/public/js/modules/system-status.js';

import {
  loadDashboard,
  toggleDashboardAiModels,
  dismissChecklist,
  quickActionAddWhatsApp,
  quickActionTrainIntent,
  quickActionTestChat,
  refreshDashboard,
  startStatusPolling,
  stopStatusPolling,
  startEditingLabel,
  finishEditingLabel
} from '/public/js/modules/dashboard.js';

import {
  showAddInstance,
  onPhoneInput,
  refreshWhatsAppList,
  submitAddInstance,
  logoutInstance,
  removeInstance
} from '/public/js/modules/whatsapp-instances.js';

import { loadWhatsappAccounts } from '/public/js/modules/whatsapp-accounts.js';

import { loadStatus } from '/public/js/modules/status.js';

import {
  toggleTemplateHelp,
  applyIntentTemplate,
  saveCurrentAsCustom as saveIntentTemplateAsCustom,
  renderSettingsTemplateButtons,
  applySettingsTemplate,
  detectActiveSettingsTemplate,
  settingsMatchTemplate
} from '/public/js/modules/dashboard-templates.js';

// ─── Window globals ──────────────────────────────────────────────

window.restartServer = restartServer;
window.runDashboardProviderSpeedTest = runDashboardProviderSpeedTest;
window.initActivityStream = initActivityStream;
window.disconnectActivityStream = disconnectActivityStream;
window.toggleActivityExpand = toggleActivityExpand;
window.filterActivityByCategory = filterActivityByCategory;
window.cleanupDashboardHelpers = cleanupDashboardHelpers;
window.loadSystemStatus = loadSystemStatus;
window.testAIProvider = testAIProvider;
window.loadDashboard = loadDashboard;
window.toggleDashboardAiModels = toggleDashboardAiModels;
window.dismissChecklist = dismissChecklist;
window.quickActionAddWhatsApp = quickActionAddWhatsApp;
window.quickActionTrainIntent = quickActionTrainIntent;
window.quickActionTestChat = quickActionTestChat;
window.refreshDashboard = refreshDashboard;
window.startStatusPolling = startStatusPolling;
window.stopStatusPolling = stopStatusPolling;
window.startEditingLabel = startEditingLabel;
window.finishEditingLabel = finishEditingLabel;
window.showAddInstance = showAddInstance;
window.onPhoneInput = onPhoneInput;
window.refreshWhatsAppList = refreshWhatsAppList;
window.submitAddInstance = submitAddInstance;
window.logoutInstance = logoutInstance;
window.removeInstance = removeInstance;
window.loadWhatsappAccounts = loadWhatsappAccounts;
window.loadStatus = loadStatus;
window.toggleTemplateHelp = toggleTemplateHelp;
window.applyIntentTemplate = applyIntentTemplate;
// Note: saveCurrentAsCustom is overridden by intents-chunk; here we set the dashboard-templates version
if (!window.saveCurrentAsCustom) window.saveCurrentAsCustom = saveIntentTemplateAsCustom;
window.renderSettingsTemplateButtons = renderSettingsTemplateButtons;
window.applySettingsTemplate = applySettingsTemplate;
window.detectActiveSettingsTemplate = detectActiveSettingsTemplate;
window.settingsMatchTemplate = settingsMatchTemplate;

console.log('[LazyChunk] Dashboard modules registered');

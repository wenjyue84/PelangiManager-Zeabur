// ═══════════════════════════════════════════════════════════════════
// Real Chat State - Shared mutable state for all real-chat sub-modules
// ═══════════════════════════════════════════════════════════════════

import { createTranslationHelper } from '../helpers/translation-helper.js';

export const $ = {
  conversations: [],
  activePhone: null,
  autoRefresh: null,
  instances: {},
  pendingTranslation: null,
  lastLog: null,
  waStatusPoll: null,
  waWasConnected: null,
  selectedFile: null,
  lastRefreshAt: Date.now(),
  searchOpen: false,
  addExampleText: ''
};

// Translation helper (shared module with live-chat)
export const translationHelper = createTranslationHelper({
  prefix: 'rc-',
  api: typeof api !== 'undefined' ? api : window.api,
  toast: typeof toast !== 'undefined' ? toast : window.toast,
  onSend: null  // Set by core module after init
});

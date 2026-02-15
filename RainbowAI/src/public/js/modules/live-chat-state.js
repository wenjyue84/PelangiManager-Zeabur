// ═══════════════════════════════════════════════════════════════════
// Live Chat State - Shared mutable state for all live-chat sub-modules
// ═══════════════════════════════════════════════════════════════════
//
// All sub-modules import $ and mutate the same object.
// ES6 module imports are live bindings — changes visible everywhere.
//
// Globals from utils-global.js (loaded before modules):
//   api, escapeHtml, escapeAttr, formatRelativeTime
// ═══════════════════════════════════════════════════════════════════

export var $ = {
  conversations: [],
  activePhone: null,
  autoRefresh: null,
  instances: {},
  pendingTranslation: null,
  translateMode: false,
  translateLang: 'ms',
  translatePreview: null,
  translateDebounce: null,
  selectedFile: null,
  searchOpen: false,
  searchQuery: '',
  searchMatches: [],
  searchCurrent: -1,
  lastMessages: [],
  searchDebounce: null,
  activeFilter: 'all',
  contactPanelOpen: false,
  contactDetails: {},
  contactSaveTimer: null,
  contextMenuMsgIdx: null,
  contextMenuCloseHandler: null,
  replyingToMsgIdx: null,
  replyingToContent: '',
  currentMode: 'autopilot',
  pendingApprovals: [],
  currentApprovalId: null,
  aiHelpLoading: false,
  waStatusPoll: null,
  waWasConnected: null,
  chatDropdownPhone: null
};

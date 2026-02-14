// ═══════════════════════════════════════════════════════════════════
// Real Chat Module - WhatsApp conversation management
// ═══════════════════════════════════════════════════════════════════
//
// Features:
// - Real-time WhatsApp conversation logs (3s auto-refresh with visual feedback)
// - Multi-instance support with filtering
// - Developer mode with rich metadata badges (uses MetadataBadges component)
// - Expandable metadata panel per message (KB files, model, tier, routing)
// - Message search with highlighting (uses SearchPanel component)
// - Translation mode with live preview (uses shared translation-helper)
// - Manual reply interface
//
// State Management:
// - Uses StateManager for devMode (persisted)
// - Translation state managed by translation-helper (translateMode, translateLang)
// - Module-level variables for runtime state (conversations, activePhone, etc.)
//
// Dependencies: StateManager, Utils (api, escapeHtml, formatDateTime, etc.)
//               MetadataBadges (components/metadata-badges.js)
//               SearchPanel (components/search-panel.js)
//               translation-helper (helpers/translation-helper.js)
// ═══════════════════════════════════════════════════════════════════

import { createTranslationHelper } from '../helpers/translation-helper.js';

const RealChat = (function () {
  // ─── Private State ────────────────────────────────────────────────

  // Runtime state (not persisted)
  let _rcConversations = [];
  let _rcActivePhone = null;
  let _rcAutoRefresh = null;
  let _rcInstances = {};  // instanceId -> label map
  let _rcPendingTranslation = null;  // Stores pending translation data (deprecated - use translationHelper.preview)
  let _rcLastLog = null;  // Last fetched conversation log (for edit modal)
  let _rcWaStatusPoll = null;
  let _rcWaWasConnected = null;  // for one-time disconnect alert
  let _rcSelectedFile = null;  // { file: File, type: 'photo'|'document' }
  let _rcLastRefreshAt = Date.now(); // For refresh timestamp display
  let _rcSearchOpen = false;

  // Translation helper (shared module with live-chat)
  // Note: api and toast are global functions from utils.js
  const translationHelper = createTranslationHelper({
    prefix: 'rc-',
    api: typeof api !== 'undefined' ? api : window.api,
    toast: typeof toast !== 'undefined' ? toast : window.toast,
    onSend: async () => await refreshActiveChat()
  });

  // Persisted state managed by StateManager (deprecated for translation - use translationHelper)
  // - StateManager.get/set('realChat.devMode')

  // ─── Auto-refresh UI helpers ──────────────────────────────────────

  /**
   * Update refresh timestamp indicator
   */
  function updateRefreshTimestamp() {
    const el = document.getElementById('rc-last-refresh');
    if (!el) return;

    const elapsed = Math.floor((Date.now() - _rcLastRefreshAt) / 1000);
    if (elapsed < 2) {
      el.textContent = 'Updated just now';
    } else if (elapsed < 60) {
      el.textContent = 'Updated ' + elapsed + 's ago';
    } else {
      el.textContent = 'Updated ' + Math.floor(elapsed / 60) + 'm ago';
    }
  }

  /**
   * Flash animation for new messages
   * @param {number} count - Number of new messages
   */
  function flashNewMessages(count) {
    const container = document.getElementById('rc-messages');
    if (!container) return;

    // Find the last N bubbles and add flash animation
    const bubbles = container.querySelectorAll('.rc-bubble-wrap');
    if (bubbles.length < count) return;

    for (let i = bubbles.length - count; i < bubbles.length; i++) {
      const bubble = bubbles[i];
      bubble.classList.add('rc-message-flash');
      // Remove animation class after it completes
      setTimeout(() => bubble.classList.remove('rc-message-flash'), 1200);
    }
  }

  // ─── Developer Mode ───────────────────────────────────────────────

  /**
   * Toggle developer mode (shows AI metadata in chat bubbles)
   */
  function toggleDevMode() {
    const currentMode = StateManager.get('realChat.devMode');
    const newMode = !currentMode;
    StateManager.set('realChat.devMode', newMode);

    const btn = document.getElementById('rc-dev-toggle');
    if (newMode) {
      btn.classList.add('active');
      btn.textContent = '🔧 Dev ✓';
    } else {
      btn.classList.remove('active');
      btn.textContent = '🔧 Dev';
    }

    // Show/hide message search toggle
    const searchToggle = document.getElementById('rc-search-toggle');
    if (searchToggle) searchToggle.style.display = newMode ? '' : 'none';

    // If dev mode off, close search bar too
    if (!newMode && _rcSearchOpen) {
      toggleRcSearch();
    }

    // Re-render current chat to show/hide metadata
    if (_rcActivePhone) refreshActiveChat();
  }

  /** Toggle the message search bar */
  function toggleRcSearch() {
    _rcSearchOpen = !_rcSearchOpen;
    if (typeof SearchPanel !== 'undefined') {
      if (_rcSearchOpen) {
        SearchPanel.init({ containerId: 'rc-search-container', messagesContainerId: 'rc-messages' });
        SearchPanel.open();
      } else {
        SearchPanel.close();
      }
    }
  }

  // ─── Translation Mode (using shared translation-helper) ──────────

  /**
   * Toggle translation mode (with live preview)
   */
  function toggleTranslateMode() {
    translationHelper.toggleTranslate();
    const btn = document.getElementById('rc-translate-toggle');
    if (btn) {
      btn.textContent = translationHelper.mode ? '🌐 Translate ✓' : '🌐 Translate';
    }
  }

  /**
   * Handle language selector change
   */
  function handleLangChange() {
    translationHelper.handleLangChange();
  }

  /**
   * Handle input change for translation preview
   */
  function onInputChange() {
    translationHelper.onInputTranslate();
  }

  // ─── WhatsApp connection status (same as Live Chat) ───────────────

  function updateRcConnectionStatus(statusData) {
    const bar = document.getElementById('rc-wa-status-bar');
    if (!bar) return;
    const instances = (statusData && statusData.whatsappInstances) || [];
    const connected = instances.some(i => i.state === 'open');
    bar.classList.remove('wa-connected', 'wa-disconnected');
    bar.classList.add(connected ? 'wa-connected' : 'wa-disconnected');
    const text = bar.querySelector('.wa-connection-text');
    if (text) {
      text.textContent = connected ? 'WhatsApp Connected' : 'Disconnected';
    }
    // removed link logic
    if (_rcWaWasConnected === true && !connected) {
      _rcWaWasConnected = false;
      alert('WhatsApp disconnected. Messages cannot be sent. Check Connect \u2192 Dashboard or scan QR at /admin/whatsapp-qr.');
    } else {
      _rcWaWasConnected = connected;
    }
  }

  async function pollRcConnectionStatus() {
    const content = document.getElementById('live-simulation-content');
    if (content && content.classList.contains('hidden')) return;
    try {
      const statusData = await api('/status');
      updateRcConnectionStatus(statusData);
    } catch (e) { }
  }

  // ─── Translation Modal ────────────────────────────────────────────

  /**
   * Show translation confirmation modal
   */
  function showTranslateModal() {
    if (!_rcPendingTranslation) return;

    const modal = document.getElementById('rc-translate-modal');
    const originalEl = document.getElementById('rc-translate-original');
    const translatedEl = document.getElementById('rc-translate-translated');
    const langEl = document.getElementById('rc-translate-lang-name');

    originalEl.textContent = _rcPendingTranslation.original;
    translatedEl.textContent = _rcPendingTranslation.translated;
    langEl.textContent = _rcPendingTranslation.targetLang.toUpperCase();

    modal.style.display = 'flex';
  }

  /**
   * Close translation confirmation modal
   */
  function closeTranslateModal() {
    const modal = document.getElementById('rc-translate-modal');
    modal.style.display = 'none';
    _rcPendingTranslation = null;

    // Re-enable send button
    const btn = document.getElementById('rc-send-btn');
    btn.disabled = false;

    // Focus back to input
    const input = document.getElementById('rc-input-box');
    input.focus();
  }

  /**
   * Confirm and send translated message
   */
  async function confirmTranslation() {
    if (!_rcPendingTranslation || !_rcActivePhone) {
      closeTranslateModal();
      return;
    }

    const modal = document.getElementById('rc-translate-modal');
    const confirmBtn = modal.querySelector('.rc-translate-btn.send');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Sending...';

    try {
      // Get the instanceId from the active conversation
      const log = _rcConversations.find(c => c.phone === _rcActivePhone);
      const instanceId = log?.instanceId;

      // Send the translated message
      await api('/conversations/' + encodeURIComponent(_rcActivePhone) + '/send', {
        method: 'POST',
        body: { message: _rcPendingTranslation.translated, instanceId }
      });

      // Clear input
      const input = document.getElementById('rc-input-box');
      input.value = '';
      input.style.height = '40px';

      // Close modal
      closeTranslateModal();

      // Refresh the chat to show the sent message
      await refreshActiveChat();
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Send';
    }
  }

  // ─── Main Load Function ───────────────────────────────────────────

  /**
   * Load Real Chat tab - fetch conversations and setup auto-refresh (3s with visual feedback)
   */
  async function loadRealChat() {
    // Restore developer mode button state
    const devMode = StateManager.get('realChat.devMode');
    const devBtn = document.getElementById('rc-dev-toggle');
    if (devMode) {
      devBtn.classList.add('active');
      devBtn.textContent = '🔧 Dev ✓';
    }

    // Restore search toggle visibility based on dev mode
    const searchToggle = document.getElementById('rc-search-toggle');
    if (searchToggle) searchToggle.style.display = devMode ? '' : 'none';

    // Initialize SearchPanel component
    if (typeof SearchPanel !== 'undefined') {
      SearchPanel.init({ containerId: 'rc-search-container', messagesContainerId: 'rc-messages' });
    }

    // Restore translation mode button state
    const translateMode = StateManager.get('realChat.translateMode');
    const translateLang = StateManager.get('realChat.translateLang');
    const translateBtn = document.getElementById('rc-translate-toggle');
    const langSelector = document.getElementById('rc-lang-selector');
    if (translateMode) {
      translateBtn.classList.add('active');
      translateBtn.textContent = '🌐 Translate ✓';
      langSelector.style.display = '';
      langSelector.value = translateLang;
    }

    try {
      // Load conversations and WhatsApp instances in parallel
      const [convos, statusData] = await Promise.all([
        api('/conversations'),
        api('/status')
      ]);
      _rcConversations = convos;

      // Build instance map from WhatsApp instances
      _rcInstances = {};
      if (statusData.whatsappInstances) {
        for (const inst of statusData.whatsappInstances) {
          _rcInstances[inst.id] = inst.label || inst.id;
        }
      }
      updateRcConnectionStatus(statusData);
      buildInstanceFilter();
      renderConversationList(convos);
      _rcLastRefreshAt = Date.now();
      updateRefreshTimestamp();

      // Feature: Auto-open last active conversation if none selected
      if (_rcConversations.length > 0 && _rcActivePhone === null) {
        openConversation(_rcConversations[0].phone);
      }

      // Auto-refresh every 3 seconds while on this tab
      clearInterval(_rcAutoRefresh);
      _rcAutoRefresh = setInterval(async () => {
        if (document.getElementById('live-simulation-content')?.classList.contains('hidden')) {
          clearInterval(_rcAutoRefresh);
          return;
        }

        // Show refreshing state
        const indicator = document.getElementById('rc-refresh-indicator');
        if (indicator) indicator.classList.add('refreshing');

        try {
          const fresh = await api('/conversations');
          _rcConversations = fresh;
          buildInstanceFilter(); // Rebuild dropdown to keep counts updated
          renderConversationList(_rcConversations); // Use global _rcConversations, not fresh

          // Highlight new messages with flash animation
          if (_rcActivePhone) {
            const oldCount = _rcLastLog?.messages.length || 0;
            await refreshActiveChat();
            const newCount = _rcLastLog?.messages.length || 0;
            if (newCount > oldCount) {
              flashNewMessages(newCount - oldCount);
            }
          }

          // Update timestamp
          updateRefreshTimestamp();
        } catch (e) {
          console.error('[RealChat] Refresh error:', e);
        } finally {
          if (indicator) indicator.classList.remove('refreshing');
        }
      }, 3000);

      clearInterval(_rcWaStatusPoll);
      _rcWaStatusPoll = setInterval(pollRcConnectionStatus, 15000);

      // Update refresh timestamp display every second
      clearInterval(window._rcTimestampUpdater);
      window._rcTimestampUpdater = setInterval(() => {
        if (document.getElementById('live-simulation-content')?.classList.contains('hidden')) {
          clearInterval(window._rcTimestampUpdater);
          return;
        }
        updateRefreshTimestamp();
      }, 1000);
    } catch (err) {
      console.error('[RealChat] Failed to load conversations:', err);
    }
  }

  // ─── Instance Filter ──────────────────────────────────────────────

  /**
   * Build instance filter dropdown with conversation counts
   */
  function buildInstanceFilter() {
    const select = document.getElementById('rc-instance-filter');
    // Collect unique instanceIds from conversations + known instances
    const instanceIds = new Set();
    for (const c of _rcConversations) {
      if (c.instanceId) instanceIds.add(c.instanceId);
    }
    for (const id of Object.keys(_rcInstances)) {
      instanceIds.add(id);
    }

    const currentVal = select.value;
    let html = '<option value="">All Instances (' + _rcConversations.length + ')</option>';
    for (const id of instanceIds) {
      const fullLabel = _rcInstances[id] || id;
      const count = _rcConversations.filter(c => c.instanceId === id).length;

      // Shorten label by removing phone number and keeping only name + instance type
      // "Pelangi Capsule Hostel (60103084289) - Mainline" → "Pelangi Capsule Hostel - Mainline"
      let shortLabel = fullLabel.replace(/\s*\([0-9]+\)\s*/g, ' ').trim();
      // If still too long (>30 chars), truncate
      if (shortLabel.length > 30) {
        shortLabel = shortLabel.substring(0, 27) + '...';
      }

      html += '<option value="' + escapeHtml(id) + '" title="' + escapeAttr(fullLabel) + '">' +
        escapeHtml(shortLabel) + ' (' + count + ')</option>';
    }
    // Add "Unknown" option for conversations without instanceId
    const unknownCount = _rcConversations.filter(c => !c.instanceId).length;
    if (unknownCount > 0) {
      html += '<option value="__unknown__">Unknown Instance (' + unknownCount + ')</option>';
    }
    select.innerHTML = html;
    select.value = currentVal;
  }

  // ─── Conversation List ────────────────────────────────────────────

  /**
   * Render conversation list sidebar with filtering
   * @param {Array} conversations - List of conversation objects
   */
  function renderConversationList(conversations) {
    const list = document.getElementById('rc-chat-list');
    if (!list) return;
    let empty = document.getElementById('rc-sidebar-empty');

    // Detach the empty-state element before any innerHTML to prevent it from being destroyed
    if (empty && empty.parentNode) {
      empty.parentNode.removeChild(empty);
    }

    if (!conversations.length) {
      list.innerHTML = '';
      if (empty) {
        empty.style.display = '';
        list.appendChild(empty);
      }
      return;
    }

    const searchVal = (document.getElementById('rc-search').value || '').toLowerCase();
    const instanceVal = document.getElementById('rc-instance-filter').value;

    let filtered = conversations;
    // Filter by instance
    if (instanceVal === '__unknown__') {
      filtered = filtered.filter(c => !c.instanceId);
    } else if (instanceVal) {
      filtered = filtered.filter(c => c.instanceId === instanceVal);
    }
    // Filter by search text
    if (searchVal) {
      filtered = filtered.filter(c =>
        (c.pushName || '').toLowerCase().includes(searchVal) ||
        c.phone.toLowerCase().includes(searchVal) ||
        (c.lastMessage || '').toLowerCase().includes(searchVal)
      );
    }

    if (!filtered.length) {
      list.innerHTML = '<div class="rc-sidebar-empty"><p>No matching conversations.</p></div>';
      return;
    }

    list.innerHTML = filtered.map(c => {
      const initials = (c.pushName || '?').slice(0, 2).toUpperCase();
      const time = formatRelativeTime(c.lastMessageAt);
      const preview = c.lastMessageRole === 'assistant' ? '🤖 ' + c.lastMessage : c.lastMessage;
      const isActive = c.phone === _rcActivePhone ? ' active' : '';
      const instanceLabel = c.instanceId ? (_rcInstances[c.instanceId] || c.instanceId) : '';
      const instanceBadge = instanceLabel ? '<span class="rc-instance-badge">' + escapeHtml(instanceLabel) + '</span>' : '';
      return '<div class="rc-chat-item' + isActive + '" onclick="openConversation(\'' + escapeAttr(c.phone) + '\')">' +
        '<div class="rc-avatar">' + initials + '</div>' +
        '<div class="rc-chat-info">' +
        '<div class="rc-chat-name">' + escapeHtml(c.pushName || c.phone) + ' ' + instanceBadge + '</div>' +
        '<div class="rc-chat-preview">' + escapeHtml(preview) + '</div>' +
        '</div>' +
        '<div class="rc-chat-meta">' +
        '<div class="rc-chat-time">' + time + '</div>' +
        '<div class="rc-chat-count">' + c.messageCount + '</div>' +
        '</div>' +
        '</div>';
    }).join('');

    // Re-attach empty-state element (hidden) so future calls can find it
    if (empty) {
      empty.style.display = 'none';
      list.appendChild(empty);
    }
  }

  /**
   * Filter conversations based on search input and instance filter
   */
  function filterConversations() {
    console.log('[RealChat] Filter triggered');
    renderConversationList(_rcConversations);
  }

  // ─── Chat View ────────────────────────────────────────────────────

  /**
   * Open a conversation and load its messages
   * @param {string} phone - Phone number to open
   */
  async function openConversation(phone) {
    _rcActivePhone = phone;
    // Highlight in sidebar
    document.querySelectorAll('.rc-chat-item').forEach(el => el.classList.remove('active'));
    const items = document.querySelectorAll('.rc-chat-item');
    items.forEach(el => { if (el.onclick?.toString().includes(phone)) el.classList.add('active'); });

    // Clear any pending file or reply state
    clearRcFile();
    // cancelRcReply(); // TODO: Add reply cancel if implemented later


    try {
      const log = await api('/conversations/' + encodeURIComponent(phone));
      renderChatView(log);
    } catch (err) {
      console.error('[RealChat] Failed to load conversation:', err);
    }
  }

  /**
   * Render chat view with messages
   * @param {Object} log - Conversation log object
   */
  function renderChatView(log) {
    _rcLastLog = log;
    document.getElementById('rc-empty-state').style.display = 'none';
    const chat = document.getElementById('rc-active-chat');
    chat.style.display = 'flex';

    const initials = (log.pushName || '?').slice(0, 2).toUpperCase();
    document.getElementById('rc-active-avatar').textContent = initials;
    document.getElementById('rc-active-name').textContent = log.pushName || 'Unknown';

    // Show phone + instance badge
    const phoneEl = document.getElementById('rc-active-phone');
    const instanceEl = document.getElementById('rc-active-instance');
    phoneEl.firstChild.textContent = log.phone + ' ';
    if (log.instanceId) {
      const label = _rcInstances[log.instanceId] || log.instanceId;
      instanceEl.textContent = label;
      instanceEl.style.display = '';
    } else {
      instanceEl.style.display = 'none';
    }

    // Stats
    const instanceStat = log.instanceId ? ' | Instance: ' + (_rcInstances[log.instanceId] || log.instanceId) : '';
    document.getElementById('rc-stat-total').textContent = log.messages.length + ' messages';
    document.getElementById('rc-stat-started').textContent = 'Started: ' + formatDateTime(log.createdAt);
    document.getElementById('rc-stat-last').textContent = 'Last active: ' + formatRelativeTime(log.updatedAt) + instanceStat;

    // Render messages with date separators
    const container = document.getElementById('rc-messages');
    let html = '';
    let lastDate = '';

    const devMode = StateManager.get('realChat.devMode');

    for (const msg of log.messages) {
      const msgDate = new Date(msg.timestamp).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
      if (msgDate !== lastDate) {
        html += '<div class="rc-date-sep"><span>' + msgDate + '</span></div>';
        lastDate = msgDate;
      }

      const isGuest = msg.role === 'user';
      const side = isGuest ? 'guest' : 'ai';
      const time = new Date(msg.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
      const msgIndex = log.messages.indexOf(msg);

      let footer = '<span class="rc-bubble-time">' + time + '</span>';
      if (isGuest) {
        footer += '<button type="button" class="rc-bubble-add-example" onclick="openAddToTrainingExampleModal(' + msgIndex + ')" title="Add to Training Examples (Understanding)">📚 Add example</button>';
      }
      if (!isGuest && msg.manual) {
        footer += '<span class="rc-bubble-manual">✋ Manual</span>';
      }
      if (!isGuest && msg.intent) {
        footer += '<span class="rc-bubble-intent">' + escapeHtml(msg.intent) + '</span>';
      }
      if (!isGuest && msg.confidence !== undefined) {
        const pct = Math.round(msg.confidence * 100);
        const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#ca8a04' : '#dc2626';
        footer += '<span class="rc-bubble-confidence" style="color:' + color + '">' + pct + '%</span>';
      }

      // Editable bot message: static_reply (intent) or workflow (workflowId + stepId)
      const canEdit = !isGuest && !msg.manual && (
        (msg.routedAction === 'static_reply' && msg.intent) ||
        (msg.routedAction === 'workflow' && msg.workflowId && msg.stepId)
      );
      if (canEdit) {
        footer += '<button type="button" class="rc-bubble-edit" onclick="openRcEditModal(' + msgIndex + ')" title="Save to Responses (static reply / system message / workflow step)">✏️ Edit</button>';
      }

      // Developer mode metadata with rich badges (uses MetadataBadges component)
      let devMeta = '';
      let kbFilesBadge = '';
      if (devMode && !isGuest && !msg.manual && typeof MetadataBadges !== 'undefined') {
        var badges = MetadataBadges.getMetadataBadges(msg, {
          showSentiment: true,
          kbClickHandler: 'openKBFileFromPreview'
        });

        // Build expandable details rows
        var detailsId = 'rc-meta-details-' + msgIndex;
        var detailRows = [];
        if (msg.source)    detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Tier:</span><span class="rc-detail-value">' + escapeHtml(MetadataBadges.getTierLabel(msg.source)) + ' (' + escapeHtml(msg.source) + ')</span></div>');
        if (msg.intent)    detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Intent:</span><span class="rc-detail-value">' + escapeHtml(msg.intent) + '</span></div>');
        if (msg.routedAction) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Action:</span><span class="rc-detail-value">' + escapeHtml(msg.routedAction) + '</span></div>');
        if (msg.messageType) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Type:</span><span class="rc-detail-value">' + escapeHtml(msg.messageType) + '</span></div>');
        if (msg.model)     detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Model:</span><span class="rc-detail-value">' + escapeHtml(msg.model) + '</span></div>');
        if (msg.responseTime) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Time:</span><span class="rc-detail-value">' + (msg.responseTime / 1000).toFixed(2) + 's (' + msg.responseTime + 'ms)</span></div>');
        if (msg.confidence !== undefined) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Confidence:</span><span class="rc-detail-value">' + (msg.confidence * 100).toFixed(1) + '%</span></div>');
        if (msg.kbFiles && msg.kbFiles.length > 0) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">KB Files:</span><span class="rc-detail-value">' + msg.kbFiles.map(function(f){ return escapeHtml(f); }).join(', ') + '</span></div>');

        var expandBtn = detailRows.length > 0
          ? '<button class="rc-dev-expand-btn" onclick="toggleMetaDetails(\'' + detailsId + '\')" title="Show/hide details">&#9660; Details</button>'
          : '';
        var detailsPanel = detailRows.length > 0
          ? '<div id="' + detailsId + '" class="rc-dev-details" style="display:none;">' + detailRows.join('') + '</div>'
          : '';

        if (badges.inline) {
          devMeta = '<div class="rc-dev-meta"><div class="rc-dev-badges">' + badges.inline + expandBtn + '</div>' + detailsPanel + '</div>';
        }
        kbFilesBadge = badges.kbFiles || '';
      } else if (devMode && !isGuest && !msg.manual) {
        // Fallback plain text when MetadataBadges not loaded
        var parts = [];
        if (msg.source) { var sl = { regex: '🚨 Priority Keywords', fuzzy: '⚡ Smart Matching', semantic: '📚 Learning Examples', llm: '🤖 AI Fallback' }; parts.push('Detection: ' + (sl[msg.source] || msg.source)); }
        if (msg.intent) parts.push('Intent: ' + escapeHtml(msg.intent));
        if (msg.routedAction) parts.push('Routed to: ' + escapeHtml(msg.routedAction));
        if (msg.model) parts.push('Model: ' + escapeHtml(msg.model));
        if (msg.responseTime) parts.push('Time: ' + (msg.responseTime / 1000).toFixed(1) + 's');
        if (msg.confidence !== undefined) parts.push('Confidence: ' + Math.round(msg.confidence * 100) + '%');
        if (parts.length > 0) devMeta = '<div class="rc-dev-meta">' + parts.join(' | ') + '</div>';
      }

      const isSystem = hasSystemContent(msg.content);
      const displayContent = formatMessage(msg.content);
      const systemClass = isSystem ? ' lc-system-msg' : '';

      const textExtra = canEdit ? ' rc-bubble-text-editable cursor-pointer hover:opacity-90' : '';
      const textOnclick = canEdit ? ' onclick="openRcEditModal(' + msgIndex + ')"' : '';
      html += '<div class="rc-bubble-wrap ' + side + '">' +
        '<div class="rc-bubble ' + side + systemClass + '">' +
        '<div class="rc-bubble-text' + textExtra + '"' + textOnclick + ' title="' + (canEdit ? 'Click to edit and save to Responses' : '') + '">' + displayContent + '</div>' + // displayContent is already escaped/formatted
        '<div class="rc-bubble-footer">' + footer + '</div>' +
        devMeta +
        kbFilesBadge +
        '</div>' +
        '</div>';
    }

    container.innerHTML = html;
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Re-run search highlighting if search is active
    if (_rcSearchOpen && typeof SearchPanel !== 'undefined' && SearchPanel.isActive()) {
      SearchPanel.reapply();
    }
  }

  /** Toggle expandable metadata details panel */
  function toggleMetaDetails(detailsId) {
    var el = document.getElementById(detailsId);
    if (!el) return;
    var hidden = el.style.display === 'none';
    el.style.display = hidden ? '' : 'none';
    // Update expand button arrow
    var parent = el.parentElement;
    var btn = parent ? parent.querySelector('.rc-dev-expand-btn') : null;
    if (btn) {
      btn.innerHTML = hidden ? '&#9650; Details' : '&#9660; Details';
    }
  }

  /**
   * Refresh the active chat (reload messages)
   */
  async function refreshActiveChat() {
    if (!_rcActivePhone) return;
    try {
      const log = await api('/conversations/' + encodeURIComponent(_rcActivePhone));
      renderChatView(log);
    } catch { }
  }

  // ─── Chat Actions ─────────────────────────────────────────────────

  /**
   * Delete the active conversation
   */
  async function deleteActiveChat() {
    if (!_rcActivePhone) return;
    if (!confirm('Delete this conversation log? This cannot be undone.')) return;
    try {
      await api('/conversations/' + encodeURIComponent(_rcActivePhone), { method: 'DELETE' });
      _rcActivePhone = null;
      document.getElementById('rc-active-chat').style.display = 'none';
      document.getElementById('rc-empty-state').style.display = '';
      loadRealChat();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  /**
   * Send manual reply from input box
   */
  async function sendManualReply() {
    if (!_rcActivePhone) return;
    const input = document.getElementById('rc-input-box');
    const message = input.value.trim();

    // Check for file upload first
    if (_rcSelectedFile) {
      await sendRcMedia();
      return;
    }

    if (!message) return;

    const btn = document.getElementById('rc-send-btn');
    btn.disabled = true;

    try {
      // Check if translation preview is active (user pressed Enter with preview visible)
      let messageToSend = message;
      if (translationHelper.preview) {
        const translatedMsg = translationHelper.getMessageToSend(false); // false = use translated
        if (translatedMsg) {
          messageToSend = translatedMsg.text;
        }
      }

      // Get the instanceId from the active conversation
      const log = _rcConversations.find(c => c.phone === _rcActivePhone);
      const instanceId = log?.instanceId;

      await api('/conversations/' + encodeURIComponent(_rcActivePhone) + '/send', {
        method: 'POST',
        body: { message: messageToSend, instanceId }
      });

      // Clear input and translation preview
      translationHelper.clearAfterSend();

      // Refresh the chat to show the sent message
      await refreshActiveChat();
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  // ─── Message Formatting ───────────────────────────────────────────

  function formatMessage(content) {
    if (!content) return '';
    if (hasSystemContent(content)) {
      return formatSystemContent(content);
    }

    // Media tags: [type: filename]
    const mediaRegex = /^\[(photo|video|document): (.*?)\]/i;
    const match = content.match(mediaRegex);
    if (match) {
      const type = match[1].toLowerCase();
      const filename = match[2];
      let icon = '';
      if (type === 'photo') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
      else if (type === 'video') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
      else icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>';

      return `<div class="rc-media-placeholder">
                <div class="rc-file-thumb-icon" style="width:32px;height:32px;background:#e9edef;color:#54656f;">${icon}</div>
                <div class="rc-media-filename">${escapeHtml(filename)}</div>
              </div>`;
    }

    // Standard text (escape and newlines)
    return escapeHtml(content).replace(/\n/g, '<br>');
  }

  // ─── File Attachment ──────────────────────────────────────────────

  function toggleRcAttachMenu() {
    const menu = document.getElementById('rc-attach-menu');
    if (!menu) return;
    const isVisible = menu.style.display !== 'none';
    menu.style.display = isVisible ? 'none' : '';
  }

  function pickRcFile(type) {
    const menu = document.getElementById('rc-attach-menu');
    if (menu) menu.style.display = 'none';

    const input = type === 'photo'
      ? document.getElementById('rc-file-photo')
      : document.getElementById('rc-file-doc');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  function rcFileSelected(inputEl, type) {
    if (!inputEl.files || !inputEl.files[0]) return;
    const file = inputEl.files[0];

    // 16MB limit
    if (file.size > 16 * 1024 * 1024) {
      alert('File too large. Maximum size is 16 MB.');
      inputEl.value = '';
      return;
    }

    _rcSelectedFile = { file: file, type: type };
    showRcFilePreview(file);
  }

  function showRcFilePreview(file) {
    const preview = document.getElementById('rc-file-preview');
    const thumbEl = document.getElementById('rc-file-preview-thumb');
    const nameEl = document.getElementById('rc-file-preview-name');
    const sizeEl = document.getElementById('rc-file-preview-size');
    if (!preview) return;

    if (nameEl) nameEl.textContent = file.name;
    const sizeKB = file.size / 1024;
    if (sizeEl) sizeEl.textContent = sizeKB < 1024
      ? sizeKB.toFixed(1) + ' KB'
      : (sizeKB / 1024).toFixed(1) + ' MB';

    // Thumbnail
    if (thumbEl) {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        thumbEl.innerHTML = '<img src="' + url + '" alt="preview" style="width:48px;height:48px;object-fit:cover;border-radius:6px;">';
      } else if (file.type.startsWith('video/')) {
        thumbEl.innerHTML = '<div class="rc-file-thumb-icon" style="background:#e8f5e9;"><svg width="24" height="24" viewBox="0 0 24 24" fill="#00a884"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div>';
      } else {
        thumbEl.innerHTML = '<div class="rc-file-thumb-icon" style="background:#e3f2fd;"><svg width="24" height="24" viewBox="0 0 24 24" fill="#1976d2"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg></div>';
      }
    }

    preview.style.display = '';
  }

  function clearRcFile() {
    _rcSelectedFile = null;
    const preview = document.getElementById('rc-file-preview');
    if (preview) preview.style.display = 'none';
    const captionEl = document.getElementById('rc-file-caption');
    if (captionEl) captionEl.value = '';
    const photoInput = document.getElementById('rc-file-photo');
    if (photoInput) photoInput.value = '';
    const docInput = document.getElementById('rc-file-doc');
    if (docInput) docInput.value = '';
  }

  async function sendRcMedia() {
    if (!_rcActivePhone || !_rcSelectedFile) return;

    const btn = document.getElementById('rc-send-btn');
    btn.disabled = true;

    const caption = (document.getElementById('rc-file-caption')?.value || '').trim();
    // Get instanceId
    const log = _rcConversations.find(c => c.phone === _rcActivePhone);
    const instanceId = log ? log.instanceId : '';

    const formData = new FormData();
    formData.append('file', _rcSelectedFile.file);
    formData.append('caption', caption);
    formData.append('instanceId', instanceId || '');

    try {
      const response = await fetch((typeof window !== 'undefined' ? window.API : '') + '/conversations/' + encodeURIComponent(_rcActivePhone) + '/send-media', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      clearRcFile();
      await refreshActiveChat();
      if (window.toast) window.toast('Sent ' + (data.mediaType || 'file'), 'success');
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
    }
  }

  // ─── Input Handlers ───────────────────────────────────────────────

  /**
   * Auto-resize textarea as user types and trigger translation preview
   * @param {HTMLTextAreaElement} textarea - Input element
   */
  function autoResizeInput(textarea) {
    textarea.style.height = '40px';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    // Trigger translation preview if mode is enabled
    onInputChange();
  }

  /**
   * Handle Enter key in input box (send message)
   * Supports translation preview:
   * - Enter: send translated message (if preview active)
   * - Ctrl+Enter: send original message (if preview active)
   * - Shift+Enter: new line
   * @param {KeyboardEvent} event - Keydown event
   */
  function handleInputKeydown(event) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return; // Shift+Enter = new line (default behavior)

    // If translation preview is active
    if (translationHelper.preview) {
      event.preventDefault();
      if (event.ctrlKey) {
        // Ctrl+Enter: send original
        sendOriginalMessage();
      } else {
        // Enter: send translated
        sendManualReply();
      }
      return;
    }

    // No preview: normal send
    if (!event.ctrlKey) {
      event.preventDefault();
      sendManualReply();
    }
  }

  /**
   * Send original message when translation preview is active (Ctrl+Enter)
   */
  async function sendOriginalMessage() {
    if (!_rcActivePhone || !translationHelper.preview) return;

    const input = document.getElementById('rc-input-box');
    const btn = document.getElementById('rc-send-btn');
    btn.disabled = true;

    try {
      const originalMsg = translationHelper.getMessageToSend(true); // true = use original
      if (!originalMsg) return;

      const log = _rcConversations.find(c => c.phone === _rcActivePhone);
      const instanceId = log?.instanceId;

      await api('/conversations/' + encodeURIComponent(_rcActivePhone) + '/send', {
        method: 'POST',
        body: { message: originalMsg.text, instanceId }
      });

      // Clear input and translation preview
      translationHelper.clearAfterSend();

      // Refresh the chat to show the sent message
      await refreshActiveChat();
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  // ─── Edit Response Modal (save to Responses / workflow) ─────────────

  const RC_EDIT_LONG_THRESHOLD = 300; // chars above which show single textarea

  /**
   * Open edit modal for a bot message. Fetches current knowledge/templates/workflows and builds form.
   * @param {number} msgIndex - Index in _rcLastLog.messages
   */
  async function openRcEditModal(msgIndex) {
    if (!_rcLastLog || !_rcLastLog.messages[msgIndex]) return;
    const msg = _rcLastLog.messages[msgIndex];
    if (msg.role !== 'assistant' || msg.manual) return;

    const isStatic = msg.routedAction === 'static_reply' && msg.intent;
    const isWorkflow = msg.routedAction === 'workflow' && msg.workflowId && msg.stepId;
    if (!isStatic && !isWorkflow) return;

    const formEl = document.getElementById('rc-edit-form');
    const saveBtnsEl = document.getElementById('rc-edit-save-buttons');
    const modal = document.getElementById('rc-edit-modal');
    if (!formEl || !saveBtnsEl || !modal) return;

    formEl.innerHTML = '<div class="text-sm text-neutral-500">Loading…</div>';
    saveBtnsEl.innerHTML = '';
    modal.style.display = 'flex';

    let languages = { en: msg.content || '', ms: '', zh: '' };
    let templateLangs = null;
    let workflowName = '';
    let stepIndex = 0;

    try {
      if (isStatic) {
        const [knowledge, templates] = await Promise.all([
          api('/knowledge'),
          api('/templates')
        ]);
        const staticEntry = (knowledge.static || []).find(e => e.intent === msg.intent);
        if (staticEntry && staticEntry.response) {
          languages = {
            en: staticEntry.response.en || '',
            ms: staticEntry.response.ms || '',
            zh: staticEntry.response.zh || ''
          };
        }
        const tmpl = templates && templates[msg.intent];
        if (tmpl) {
          templateLangs = { en: tmpl.en || '', ms: tmpl.ms || '', zh: tmpl.zh || '' };
        }
      } else if (isWorkflow) {
        const wfData = await api('/workflows');
        const workflow = (wfData.workflows || []).find(w => w.id === msg.workflowId);
        if (workflow) {
          workflowName = workflow.name || msg.workflowId;
          const step = (workflow.steps || []).find(s => s.id === msg.stepId);
          if (step && step.message) {
            stepIndex = workflow.steps.indexOf(step) + 1;
            languages = {
              en: step.message.en || '',
              ms: step.message.ms || '',
              zh: step.message.zh || ''
            };
          }
        }
      }
    } catch (err) {
      formEl.innerHTML = '<div class="text-sm text-red-600">Failed to load: ' + escapeHtml(err.message) + '</div>';
      return;
    }

    const isLong = msg.content && msg.content.length > RC_EDIT_LONG_THRESHOLD;

    window._rcEditState = {
      msgIndex,
      isStatic,
      isWorkflow,
      intent: msg.intent,
      workflowId: msg.workflowId,
      stepId: msg.stepId,
      templateKey: msg.intent,
      isLong,
      templateLangs,
      currentStaticLangs: isStatic ? { en: languages.en, ms: languages.ms, zh: languages.zh } : null,
      currentWorkflowLangs: isWorkflow ? { en: languages.en, ms: languages.ms, zh: languages.zh } : null
    };

    if (isLong) {
      formEl.innerHTML =
        '<p class="text-xs text-neutral-500 mb-2">Message is long. Edit below and save to update the response template (the message already sent cannot be changed).</p>' +
        '<textarea id="rc-edit-single" class="w-full border border-neutral-300 rounded-lg p-3 text-sm resize-y" rows="8" placeholder="Response text">' +
        escapeHtml(languages.en) +
        '</textarea>';
    } else {
      formEl.innerHTML =
        '<div class="space-y-2">' +
        '<div><label class="text-xs text-neutral-500 font-medium">English</label><textarea id="rc-edit-en" class="w-full border border-neutral-300 rounded-lg p-2 text-sm resize-y" rows="3">' + escapeHtml(languages.en) + '</textarea></div>' +
        '<div><label class="text-xs text-neutral-500 font-medium">Malay</label><textarea id="rc-edit-ms" class="w-full border border-neutral-300 rounded-lg p-2 text-sm resize-y" rows="2">' + escapeHtml(languages.ms) + '</textarea></div>' +
        '<div><label class="text-xs text-neutral-500 font-medium">Chinese</label><textarea id="rc-edit-zh" class="w-full border border-neutral-300 rounded-lg p-2 text-sm resize-y" rows="2">' + escapeHtml(languages.zh) + '</textarea></div>' +
        '</div>';
    }

    let saveButtons = '';
    if (isStatic) {
      saveButtons += '<button type="button" class="rc-translate-btn send" onclick="saveRcEdit(\'static_reply\')">Save to Static Reply</button>';
      if (templateLangs) saveButtons += ' <button type="button" class="rc-translate-btn send" style="background:#0ea5e9" onclick="saveRcEdit(\'template\')">Save to System Message</button>';
    }
    if (isWorkflow) {
      saveButtons += '<button type="button" class="rc-translate-btn send" style="background:#6366f1" onclick="saveRcEdit(\'workflow\')">Save to Workflow Step</button>';
    }
    saveBtnsEl.innerHTML = saveButtons;
  }

  function closeRcEditModal() {
    const modal = document.getElementById('rc-edit-modal');
    if (modal) modal.style.display = 'none';
    window._rcEditState = null;
  }

  // ─── Add to Training Example Modal (Live Simulation → Understanding) ─────

  /** Store message text for confirmAddToTrainingExample */
  let _rcAddExampleText = '';

  /**
   * Open modal to add a guest message as a training example. Call with message index in _rcLastLog.messages.
   * @param {number} msgIndex - Index in _rcLastLog.messages
   */
  async function openAddToTrainingExampleModal(msgIndex) {
    if (!_rcLastLog || !_rcLastLog.messages[msgIndex]) return;
    const msg = _rcLastLog.messages[msgIndex];
    if (msg.role !== 'user') return;

    const modal = document.getElementById('rc-add-example-modal');
    const textEl = document.getElementById('rc-add-example-text');
    const selectEl = document.getElementById('rc-add-example-intent');
    const btnEl = document.getElementById('rc-add-example-btn');
    if (!modal || !textEl || !selectEl || !btnEl) return;

    _rcAddExampleText = (msg.content || '').trim();
    if (!_rcAddExampleText) return;

    textEl.textContent = _rcAddExampleText;
    selectEl.innerHTML = '<option value="">Loading intents…</option>';
    modal.style.display = 'flex';

    let suggestedIntent = '';
    const nextMsg = _rcLastLog.messages[msgIndex + 1];
    if (nextMsg && nextMsg.role === 'assistant' && nextMsg.intent) {
      suggestedIntent = nextMsg.intent;
    }

    try {
      const data = await api('/intent-manager/examples');
      const intents = (data && data.intents) ? data.intents : [];
      selectEl.innerHTML = intents.length === 0
        ? '<option value="">No intents in examples</option>'
        : intents.map(function (i) {
          const intent = i.intent || '';
          const selected = intent === suggestedIntent ? ' selected' : '';
          return '<option value="' + escapeAttr(intent) + '"' + selected + '>' + escapeHtml(intent) + '</option>';
        }).join('');
      if (suggestedIntent && !intents.some(function (i) { return i.intent === suggestedIntent; })) {
        selectEl.selectedIndex = 0;
      }
    } catch (err) {
      selectEl.innerHTML = '<option value="">Failed to load intents</option>';
      console.error('[RealChat] Failed to load examples:', err);
    }
  }

  function closeAddToTrainingExampleModal() {
    const modal = document.getElementById('rc-add-example-modal');
    if (modal) modal.style.display = 'none';
    _rcAddExampleText = '';
  }

  /**
   * Add the stored message text to the selected intent's training examples and save. Called from modal button.
   */
  async function confirmAddToTrainingExample() {
    const selectEl = document.getElementById('rc-add-example-intent');
    const btnEl = document.getElementById('rc-add-example-btn');
    if (!selectEl || !btnEl || !_rcAddExampleText) return;

    const intent = (selectEl.value || '').trim();
    if (!intent) {
      if (window.toast) window.toast('Select an intent', 'error');
      else alert('Select an intent');
      return;
    }

    btnEl.disabled = true;
    btnEl.textContent = 'Saving…';

    const toast = window.toast;
    try {
      const data = await api('/intent-manager/examples');
      const intents = (data && data.intents) ? data.intents : [];
      const intentData = intents.find(function (i) { return i.intent === intent; });
      if (!intentData) {
        if (toast) toast('Intent not found', 'error');
        else alert('Intent not found');
        btnEl.disabled = false;
        btnEl.textContent = 'Add to Training Examples';
        return;
      }

      let payload;
      if (Array.isArray(intentData.examples)) {
        const examples = intentData.examples.slice();
        if (examples.includes(_rcAddExampleText)) {
          if (toast) toast('Example already exists for this intent', 'warning');
          else alert('Example already exists for this intent');
          btnEl.disabled = false;
          btnEl.textContent = 'Add to Training Examples';
          return;
        }
        examples.push(_rcAddExampleText);
        payload = { examples };
      } else if (intentData.examples && typeof intentData.examples === 'object') {
        const flat = Object.values(intentData.examples).flat();
        if (flat.includes(_rcAddExampleText)) {
          if (toast) toast('Example already exists for this intent', 'warning');
          else alert('Example already exists for this intent');
          btnEl.disabled = false;
          btnEl.textContent = 'Add to Training Examples';
          return;
        }
        const updated = { ...intentData.examples };
        if (!updated.en) updated.en = [];
        updated.en.push(_rcAddExampleText);
        payload = { examples: updated };
      } else {
        payload = { examples: [_rcAddExampleText] };
      }

      await api('/intent-manager/examples/' + encodeURIComponent(intent), {
        method: 'PUT',
        body: payload
      });

      if (toast) toast('Added to training examples. Restart server to reload semantic matcher.', 'success');
      else alert('Added to training examples. Restart server to reload semantic matcher.');
      closeAddToTrainingExampleModal();
    } catch (err) {
      if (toast) toast('Failed to save: ' + (err.message || 'Unknown error'), 'error');
      else alert('Failed to save: ' + err.message);
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Add to Training Examples';
    }
  }

  /**
   * Save edit to static reply (knowledge), system message (template), or workflow step.
   * Called from global onclick.
   */
  async function saveRcEdit(target) {
    const state = window._rcEditState;
    if (!state) return;

    let en, ms, zh;
    if (state.isLong) {
      const single = document.getElementById('rc-edit-single');
      en = single ? single.value.trim() : '';
      if (target === 'static_reply' && state.currentStaticLangs) {
        ms = state.currentStaticLangs.ms || '';
        zh = state.currentStaticLangs.zh || '';
      } else if (target === 'template' && state.templateLangs) {
        ms = state.templateLangs.ms || '';
        zh = state.templateLangs.zh || '';
      } else if (target === 'workflow' && state.currentWorkflowLangs) {
        ms = state.currentWorkflowLangs.ms || '';
        zh = state.currentWorkflowLangs.zh || '';
      } else {
        ms = '';
        zh = '';
      }
    } else {
      en = (document.getElementById('rc-edit-en') && document.getElementById('rc-edit-en').value) || '';
      ms = (document.getElementById('rc-edit-ms') && document.getElementById('rc-edit-ms').value) || '';
      zh = (document.getElementById('rc-edit-zh') && document.getElementById('rc-edit-zh').value) || '';
    }

    const toast = window.toast;
    try {
      if (target === 'static_reply' && state.isStatic) {
        await api('/knowledge/' + encodeURIComponent(state.intent), {
          method: 'PUT',
          body: { response: { en, ms, zh } }
        });
        if (toast) toast('Static reply "' + state.intent + '" updated', 'success');
      } else if (target === 'template' && state.isStatic && state.templateKey) {
        await api('/templates/' + encodeURIComponent(state.templateKey), {
          method: 'PUT',
          body: { en, ms, zh }
        });
        if (toast) toast('System message "' + state.templateKey + '" updated', 'success');
      } else if (target === 'workflow' && state.isWorkflow) {
        await api('/workflows/' + encodeURIComponent(state.workflowId) + '/steps/' + encodeURIComponent(state.stepId), {
          method: 'PATCH',
          body: { message: { en, ms, zh } }
        });
        if (toast) toast('Workflow step updated', 'success');
      }
      closeRcEditModal();
    } catch (err) {
      if (toast) toast('Failed to save: ' + (err.message || 'Unknown error'), 'error');
      else alert('Failed to save: ' + err.message);
    }
  }

  // ─── Public API ───────────────────────────────────────────────────

  return {
    loadRealChat,
    toggleDevMode,
    toggleRcSearch,
    toggleTranslateMode,
    handleLangChange,
    toggleMetaDetails,
    showTranslateModal,
    closeTranslateModal,
    confirmTranslation,
    buildInstanceFilter,
    renderConversationList,
    filterConversations,
    openConversation,
    renderChatView,
    refreshActiveChat,
    deleteActiveChat,
    sendManualReply,
    autoResizeInput,
    handleInputKeydown,
    openRcEditModal,
    closeRcEditModal,
    saveRcEdit,
    openAddToTrainingExampleModal,
    closeAddToTrainingExampleModal,
    confirmAddToTrainingExample,
    toggleRcAttachMenu,
    pickRcFile,
    rcFileSelected,
    clearRcFile
  };
})();

// Expose RealChat functions to global scope for template onclick handlers
window.loadRealChat = RealChat.loadRealChat;
window.toggleDevMode = RealChat.toggleDevMode;
window.toggleRcSearch = RealChat.toggleRcSearch;
window.toggleTranslateMode = RealChat.toggleTranslateMode;
window.handleLangChange = RealChat.handleLangChange;
window.toggleMetaDetails = RealChat.toggleMetaDetails;
window.closeTranslateModal = RealChat.closeTranslateModal;
window.confirmTranslation = RealChat.confirmTranslation;
window.filterConversations = RealChat.filterConversations;
window.refreshActiveChat = RealChat.refreshActiveChat;
window.deleteActiveChat = RealChat.deleteActiveChat;
window.sendManualReply = RealChat.sendManualReply;
window.autoResizeInput = RealChat.autoResizeInput;
window.handleInputKeydown = RealChat.handleInputKeydown;
window.openConversation = RealChat.openConversation;
window.openRcEditModal = RealChat.openRcEditModal;
window.closeRcEditModal = RealChat.closeRcEditModal;
window.saveRcEdit = RealChat.saveRcEdit;
window.openAddToTrainingExampleModal = RealChat.openAddToTrainingExampleModal;
window.closeAddToTrainingExampleModal = RealChat.closeAddToTrainingExampleModal;
window.confirmAddToTrainingExample = RealChat.confirmAddToTrainingExample;
window.toggleRcAttachMenu = RealChat.toggleRcAttachMenu;
window.pickRcFile = RealChat.pickRcFile;
window.rcFileSelected = RealChat.rcFileSelected;
window.clearRcFile = RealChat.clearRcFile;

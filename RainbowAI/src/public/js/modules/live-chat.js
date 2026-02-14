// ═══════════════════════════════════════════════════════════════════
// Live Chat Module - Clean customer support interface
// ═══════════════════════════════════════════════════════════════════
//
// WhatsApp Web-style chat for human support staff.
// No developer metadata — just conversations and replies.
// Supports sending text, images/videos, and documents.
//
// Dependencies: api, escapeHtml, escapeAttr, formatRelativeTime (utils-global.js)
// ═══════════════════════════════════════════════════════════════════

const LiveChat = (function () {
  var api = typeof window !== 'undefined' ? window.api : null;
  var API = typeof window !== 'undefined' ? window.API : '';

  let _conversations = [];
  let _activePhone = null;
  let _autoRefresh = null;
  let _instances = {};
  let _pendingTranslation = null;
  let _translateMode = false;
  let _translateLang = 'ms';
  let _translatePreview = null;   // { original, translated, targetLang } when preview visible
  let _translateDebounce = null;
  let _selectedFile = null;  // { file: File, type: 'photo'|'document' }
  let _searchOpen = false;
  let _searchQuery = '';
  let _searchMatches = [];  // indices into _lastMessages that match
  let _searchCurrent = -1;  // index into _searchMatches
  let _lastMessages = [];   // cached messages from last renderChat
  let _searchDebounce = null;
  let _activeFilter = 'all';
  let _contactPanelOpen = false;
  let _contactDetails = {};
  let _contactSaveTimer = null;
  let _contextMenuMsgIdx = null;
  let _contextMenuCloseHandler = null;
  let _replyingToMsgIdx = null;
  let _replyingToContent = '';
  let _currentMode = 'autopilot';  // Current conversation mode: 'autopilot' | 'copilot' | 'manual'
  let _pendingApprovals = [];      // Pending approvals for active conversation
  let _currentApprovalId = null;   // Currently displayed approval ID
  let _aiHelpLoading = false;      // Help me button loading state
  let _waStatusPoll = null;       // Interval for connection status
  let _waWasConnected = null;     // true/false previous run; null = not yet set (for one-time disconnect alert)

  // ─── WhatsApp connection status (Live Chat + same as Chat Simulator) ───

  function updateConnectionStatus(statusData) {
    var bar = document.getElementById('lc-wa-status-bar');
    if (!bar) return;
    var instances = (statusData && statusData.whatsappInstances) || [];
    var connected = instances.some(function (i) { return i.state === 'open'; });
    bar.classList.remove('wa-connected', 'wa-disconnected');
    bar.classList.add(connected ? 'wa-connected' : 'wa-disconnected');
    var text = bar.querySelector('.wa-connection-text');
    if (text) {
      text.textContent = connected ? 'WhatsApp Connected' : 'Disconnected';
    }
    // removed link logic
    if (_waWasConnected === true && !connected) {
      _waWasConnected = false;
      alert('WhatsApp disconnected. Messages cannot be sent. Check Connect \u2192 Dashboard or scan QR at /admin/whatsapp-qr.');
    } else {
      _waWasConnected = connected;
    }
  }

  async function pollConnectionStatus() {
    var section = document.getElementById('tab-live-chat');
    if (section && section.classList.contains('hidden')) return;
    try {
      var statusData = await api('/status');
      updateConnectionStatus(statusData);
    } catch (e) { }
  }

  // ─── Main Load ──────────────────────────────────────────────────

  async function loadLiveChat() {
    // Restore translate state
    var translateBtn = document.getElementById('lc-translate-toggle');
    var langSelector = document.getElementById('lc-lang-selector');
    if (_translateMode && translateBtn) {
      translateBtn.classList.add('active');
      langSelector.style.display = '';
      langSelector.value = _translateLang;
    }

    try {
      var results = await Promise.all([
        api('/conversations'),
        api('/status')
      ]);
      _conversations = results[0];
      var statusData = results[1];

      _instances = {};
      if (statusData.whatsappInstances) {
        for (var i = 0; i < statusData.whatsappInstances.length; i++) {
          var inst = statusData.whatsappInstances[i];
          _instances[inst.id] = inst.label || inst.id;
        }
      }
      updateConnectionStatus(statusData);
      buildInstanceFilter();
      renderList(_conversations);

      // WhatsApp Web style: show last active conversation in Guest support Chat when none selected
      if (_conversations.length > 0 && _activePhone === null) {
        openConversation(_conversations[0].phone);
      }

      var container = document.getElementById('lc-messages');
      if (container && !container._lcContextMenuBound) {
        container._lcContextMenuBound = true;
        container.addEventListener('click', handleMessageChevronClick);
        bindContextMenuActions();
      }

      clearInterval(_autoRefresh);
      _autoRefresh = setInterval(async function () {
        var section = document.getElementById('tab-live-chat');
        if (section && section.classList.contains('hidden')) {
          clearInterval(_autoRefresh);
          return;
        }
        try {
          var fresh = await api('/conversations');
          _conversations = fresh;
          buildInstanceFilter();
          renderList(_conversations);
          if (_activePhone) {
            await refreshChat();
            // Check for pending approvals in copilot mode
            if (_currentMode === 'copilot') {
              await checkPendingApprovals();
            }
          }
        } catch (e) { }
      }, 10000);

      clearInterval(_waStatusPoll);
      _waStatusPoll = setInterval(pollConnectionStatus, 15000);
    } catch (err) {
      console.error('[LiveChat] Load failed:', err);
    }
  }

  /** Strip @s.whatsapp.net / @g.us from phone for display only. */
  function formatPhoneForDisplay(phone) {
    if (!phone || typeof phone !== 'string') return phone || '';
    return phone.replace(/@s\.whatsapp\.net$/i, '').replace(/@g\.us$/i, '');
  }

  // ─── Instance Filter ────────────────────────────────────────────

  function buildInstanceFilter() {
    var select = document.getElementById('lc-instance-filter');
    if (!select) return;
    var instanceIds = new Set();
    for (var i = 0; i < _conversations.length; i++) {
      if (_conversations[i].instanceId) instanceIds.add(_conversations[i].instanceId);
    }
    var keys = Object.keys(_instances);
    for (var k = 0; k < keys.length; k++) {
      instanceIds.add(keys[k]);
    }

    var currentVal = select.value;
    var html = '<option value="">All (' + _conversations.length + ')</option>';
    instanceIds.forEach(function (id) {
      var fullLabel = _instances[id] || id;
      var count = _conversations.filter(function (c) { return c.instanceId === id; }).length;
      var shortLabel = fullLabel.replace(/\s*\([0-9]+\)\s*/g, ' ').trim();
      if (shortLabel.length > 30) shortLabel = shortLabel.substring(0, 27) + '...';
      html += '<option value="' + escapeHtml(id) + '" title="' + escapeAttr(fullLabel) + '">' +
        escapeHtml(shortLabel) + ' (' + count + ')</option>';
    });
    var unknownCount = _conversations.filter(function (c) { return !c.instanceId; }).length;
    if (unknownCount > 0) {
      html += '<option value="__unknown__">Unknown (' + unknownCount + ')</option>';
    }
    select.innerHTML = html;
    select.value = currentVal;
  }

  // ─── Conversation List ──────────────────────────────────────────

  function renderList(conversations) {
    var list = document.getElementById('lc-chat-list');
    var empty = document.getElementById('lc-sidebar-empty');
    if (!list) return;

    if (!conversations.length) {
      if (empty) empty.style.display = '';
      list.innerHTML = '';
      if (empty) list.appendChild(empty);
      return;
    }
    if (empty) empty.style.display = 'none';

    var searchEl = document.getElementById('lc-search');
    var searchVal = (searchEl ? searchEl.value : '').toLowerCase();
    var instanceEl = document.getElementById('lc-instance-filter');
    var instanceVal = instanceEl ? instanceEl.value : '';

    var filtered = conversations;
    if (instanceVal === '__unknown__') {
      filtered = filtered.filter(function (c) { return !c.instanceId; });
    } else if (instanceVal) {
      filtered = filtered.filter(function (c) { return c.instanceId === instanceVal; });
    }
    if (searchVal) {
      filtered = filtered.filter(function (c) {
        return (c.pushName || '').toLowerCase().includes(searchVal) ||
          c.phone.toLowerCase().includes(searchVal) ||
          (c.lastMessage || '').toLowerCase().includes(searchVal);
      });
    }

    // Apply filter chips
    if (_activeFilter === 'unread') {
      filtered = filtered.filter(function (c) { return (c.unreadCount || 0) > 0; });
    } else if (_activeFilter === 'favourites') {
      filtered = filtered.filter(function (c) { return c.favourite; });
    } else if (_activeFilter === 'groups') {
      filtered = filtered.filter(function (c) { return c.phone && c.phone.indexOf('@g.us') !== -1; });
    }

    // Sort: pinned first, then by most recent
    filtered.sort(function (a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.lastMessageAt - a.lastMessageAt;
    });

    if (!filtered.length) {
      list.innerHTML = '<div class="lc-sidebar-empty"><p>No matching conversations.</p></div>';
      return;
    }

    list.innerHTML = filtered.map(function (c) {
      var initials = (c.pushName || '?').slice(0, 2).toUpperCase();
      var time = formatRelativeTime(c.lastMessageAt);
      var preview = c.lastMessage || '';
      if (c.lastMessageRole === 'assistant') preview = 'Rainbow: ' + preview;
      if (preview.length > 45) preview = preview.substring(0, 42) + '...';
      var isActive = c.phone === _activePhone ? ' active' : '';
      var unreadCount = typeof c.unreadCount === 'number' ? c.unreadCount : 0;
      var unread = unreadCount > 0 ? '<div class="lc-unread">' + Math.min(unreadCount, 99) + '</div>' : '';

      // Hover action: only dropdown (pin/star available inside menu)
      var chevronSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
      var hoverActions = '<div class="lc-hover-actions">' +
        '<button class="lc-ha-btn lc-ha-menu" onclick="event.stopPropagation();lcToggleChatDropdown(\'' + escapeAttr(c.phone) + '\',this)" title="More options">' + chevronSvg + '</button>' +
        '</div>';

      // Bottom-right indicators
      var bottomIcons = '';
      if (c.favourite) bottomIcons += '<span class="lc-fav-indicator" title="Favourite"><svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>';
      if (c.pinned) bottomIcons += '<span class="lc-pin-indicator" title="Pinned"><svg width="12" height="12" viewBox="0 0 24 24" fill="#8696a0" stroke="none"><path d="M9 4v6l-2 4h10l-2-4V4M12 14v7M8 4h8"/></svg></span>';

      return '<div class="lc-chat-item' + isActive + '" onclick="lcOpenConversation(\'' + escapeAttr(c.phone) + '\')">' +
        '<div class="lc-avatar">' + initials + '</div>' +
        '<div class="lc-chat-info">' +
        '<div class="lc-chat-top">' +
        '<span class="lc-chat-name">' + escapeHtml(c.pushName || formatPhoneForDisplay(c.phone)) + '</span>' +
        '<span class="lc-chat-time">' + time + '</span>' +
        hoverActions +
        '</div>' +
        '<div class="lc-chat-bottom">' +
        '<span class="lc-chat-preview">' + escapeHtml(preview) + '</span>' +
        '<span class="lc-bottom-icons">' + bottomIcons + unread + '</span>' +
        '</div>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  function filterConversations() {
    renderList(_conversations);
  }

  // ─── Chat View ──────────────────────────────────────────────────

  /**
   * Check if message contains technical/system content (JSON payload with intent/confidence).
   * Returns true if message has system metadata that should be visually distinguished.
   */
  function hasSystemContent(content) {
    if (!content || typeof content !== 'string') return false;
    return content.indexOf('\n\n{"intent":') > 0 || content.indexOf('Please note: I may not have complete information') > 0;
  }

  /**
   * Extract just the user-facing message from technical content.
   * Returns the main message without JSON payload.
   */
  function getUserMessage(content) {
    if (!content || typeof content !== 'string') return content;
    var s = content;
    var jsonStart = s.indexOf('\n\n{"intent":');
    if (jsonStart > 0) s = s.slice(0, jsonStart).trim();
    var disclaimerIdx = s.indexOf('Please note: I may not have complete information');
    if (disclaimerIdx > 0) s = s.slice(0, disclaimerIdx).replace(/\n+$/, '').trim();
    return s;
  }

  /**
   * Format system/technical content for display with syntax highlighting.
   * Shows the full message including JSON payload in a readable format.
   */
  function formatSystemContent(content) {
    if (!content || typeof content !== 'string') return escapeHtml(content);

    var parts = content.split('\n\n{"intent":');
    if (parts.length === 1) return escapeHtml(content); // No JSON payload

    var userMsg = parts[0].trim();
    var jsonPart = '{"intent":' + parts[1];

    // Pretty-print JSON if valid
    var prettyJson = jsonPart;
    try {
      var parsed = JSON.parse(jsonPart);
      prettyJson = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Keep original if parsing fails
    }

    return '<div class="lc-user-msg">' + escapeHtml(userMsg) + '</div>' +
      '<div class="lc-system-data">' +
      '<div class="lc-system-label">System Debug Info:</div>' +
      '<pre class="lc-system-json">' + escapeHtml(prettyJson) + '</pre>' +
      '</div>';
  }

  /** Returns { icon, label } for non-text placeholder content (e.g. [Voice message], [Image]) or null */
  function getNonTextPlaceholder(content) {
    if (!content || typeof content !== 'string') return null;
    var trimmed = content.trim();
    var map = {
      '[Voice message]': { label: 'Voice message', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>' },
      '[Image]': { label: 'Image', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' },
      '[Video]': { label: 'Video', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>' },
      '[Sticker]': { label: 'Sticker', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' },
      '[Document]': { label: 'Document', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>' },
      '[Contact]': { label: 'Contact', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
      '[Location]': { label: 'Location', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>' }
    };
    return map[trimmed] || null;
  }

  async function openConversation(phone) {
    _activePhone = phone;
    clearFile();
    cancelReply();
    hideTranslatePreview();
    // Reload contact details if panel is open
    if (_contactPanelOpen) loadContactDetails();
    document.querySelectorAll('.lc-chat-item').forEach(function (el) { el.classList.remove('active'); });
    document.querySelectorAll('.lc-chat-item').forEach(function (el) {
      if (el.onclick && el.onclick.toString().includes(phone)) el.classList.add('active');
    });

    try {
      var log = await api('/conversations/' + encodeURIComponent(phone));
      renderChat(log);
      // Mark as read when opening (WhatsApp-style: badge clears after viewing)
      await api('/conversations/' + encodeURIComponent(phone) + '/read', { method: 'PATCH' }).catch(function () { });
      // Refresh list so sidebar unread badge updates
      var idx = _conversations.findIndex(function (c) { return c.phone === phone; });
      if (idx >= 0) _conversations[idx].unreadCount = 0;
      renderList(_conversations);

      // Load current mode for this conversation
      try {
        if (log && log.responseMode) {
          // Per-conversation mode (persisted to disk)
          _currentMode = log.responseMode;
        } else {
          // Fall back to global default from settings
          var status = await api('/status');
          _currentMode = status.response_modes?.default_mode || 'autopilot';
        }
        updateModeUI(_currentMode);

        // Check for pending approvals if in copilot mode
        if (_currentMode === 'copilot') {
          await checkPendingApprovals();
        }
      } catch (err) {
        console.error('[LiveChat] Failed to load mode:', err);
      }
    } catch (err) {
      console.error('[LiveChat] Failed to load conversation:', err);
    }
  }

  function renderChat(log) {
    document.getElementById('lc-empty-state').style.display = 'none';
    var chat = document.getElementById('lc-active-chat');
    chat.style.display = 'flex';

    var initials = (log.pushName || '?').slice(0, 2).toUpperCase();
    document.getElementById('lc-header-avatar').textContent = initials;
    document.getElementById('lc-header-name').textContent = log.pushName || 'Unknown';
    document.getElementById('lc-header-phone').textContent = '+' + formatPhoneForDisplay(log.phone);

    _lastMessages = log.messages || [];

    var container = document.getElementById('lc-messages');
    var html = '';
    var lastDate = '';
    var query = _searchOpen ? _searchQuery.toLowerCase() : '';

    for (var i = 0; i < _lastMessages.length; i++) {
      var msg = _lastMessages[i];
      var msgDate = new Date(msg.timestamp).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
      if (msgDate !== lastDate) {
        html += '<div class="lc-date-sep"><span>' + msgDate + '</span></div>';
        lastDate = msgDate;
      }

      var isGuest = msg.role === 'user';
      var side = isGuest ? 'guest' : 'bot';
      var time = new Date(msg.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
      var content = msg.content || '';
      var isSystemMsg = !isGuest && hasSystemContent(content);
      var displayContent = isGuest ? content : (isSystemMsg ? content : getUserMessage(content));

      var checkmark = '';
      if (!isGuest) {
        checkmark = '<svg class="lc-checkmark" viewBox="0 0 16 11" fill="currentColor"><path d="M11.07.65l-6.53 6.53L1.97 4.6l-.72.72 3.29 3.29 7.25-7.25-.72-.71z"/><path d="M5.54 7.18L4.82 6.46l-.72.72 1.44 1.44.72-.72-.72-.72z"/></svg>';
      }

      var manualTag = '';
      if (!isGuest && msg.manual) {
        manualTag = '<span class="lc-manual-tag">Staff</span>';
      }

      // Determine if this message is the current search focus
      var isCurrentMatch = _searchCurrent >= 0 && _searchMatches[_searchCurrent] === i;
      var isAnyMatch = query && displayContent.toLowerCase().includes(query);

      // Render media placeholders for [photo:], [video:], [document:] and non-text labels [Voice message], [Image], etc.
      var bubbleContent = '';
      var nonTextPlaceholder = getNonTextPlaceholder(displayContent);
      var mediaMatch = displayContent.match(/^\[(photo|video|document):\s*(.+?)\](.*)$/s);

      if (isSystemMsg) {
        // System message with debug info - show full formatted content
        bubbleContent = '<div class="lc-bubble-text">' + formatSystemContent(displayContent) + '</div>';
      } else if (nonTextPlaceholder) {
        bubbleContent = '<div class="lc-media-placeholder">' + nonTextPlaceholder.icon + '<span class="lc-media-filename">' + escapeHtml(nonTextPlaceholder.label) + '</span></div>';
      } else if (mediaMatch) {
        var mediaType = mediaMatch[1];
        var fileName = mediaMatch[2];
        var caption = mediaMatch[3].trim();
        var icon = mediaType === 'photo' ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>'
          : mediaType === 'video' ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>'
            : '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>';
        bubbleContent = '<div class="lc-media-placeholder">' + icon + '<span class="lc-media-filename">' + escapeHtml(fileName) + '</span></div>';
        if (caption) {
          bubbleContent += '<div class="lc-bubble-text">' + highlightText(caption, query, isCurrentMatch) + '</div>';
        }
      } else {
        bubbleContent = '<div class="lc-bubble-text">' + highlightText(displayContent, query, isCurrentMatch) + '</div>';
      }

      var matchClass = isCurrentMatch ? ' lc-search-focus' : (isAnyMatch ? ' lc-search-match' : '');
      var systemClass = isSystemMsg ? ' lc-system-msg' : '';
      var chevronSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

      html += '<div class="lc-bubble-wrap ' + side + '" data-msg-idx="' + i + '">' +
        '<div class="lc-bubble ' + side + matchClass + systemClass + '">' +
        bubbleContent +
        '<div class="lc-bubble-meta">' +
        manualTag +
        '<span class="lc-bubble-time">' + time + '</span>' +
        checkmark +
        '<button type="button" class="lc-bubble-chevron" data-msg-idx="' + i + '" title="Message options" aria-label="Message options">' + chevronSvg + '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    }

    container.innerHTML = html;

    if (container && !container._lcContextMenuBound) {
      container._lcContextMenuBound = true;
      container.addEventListener('click', handleMessageChevronClick);
      bindContextMenuActions();
    }

    // If searching and there's a current match, scroll to it; otherwise scroll to bottom
    if (_searchCurrent >= 0 && _searchMatches.length > 0) {
      scrollToMatch(_searchMatches[_searchCurrent]);
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }

  /**
   * Highlight search query in text. Escapes HTML first, then wraps matches.
   */
  function highlightText(text, query, isFocused) {
    var escaped = escapeHtml(text);
    if (!query) return escaped;
    // Build a regex from the escaped query (also escape the query for regex)
    var escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('(' + escapedQuery + ')', 'gi');
    var cls = isFocused ? 'lc-hl lc-hl-focus' : 'lc-hl';
    return escaped.replace(re, '<mark class="' + cls + '">$1</mark>');
  }

  async function refreshChat() {
    if (!_activePhone) return;
    try {
      var log = await api('/conversations/' + encodeURIComponent(_activePhone));
      renderChat(log);
    } catch (e) { }
  }

  // ─── Actions ────────────────────────────────────────────────────

  async function deleteChat() {
    if (!_activePhone) return;
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await api('/conversations/' + encodeURIComponent(_activePhone), { method: 'DELETE' });
      _activePhone = null;
      document.getElementById('lc-active-chat').style.display = 'none';
      document.getElementById('lc-empty-state').style.display = '';
      loadLiveChat();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  async function sendReply() {
    if (!_activePhone) return;

    if (_selectedFile) {
      await sendMedia();
      return;
    }

    var input = document.getElementById('lc-input-box');
    var message = input ? input.value.trim() : '';
    if (!message && !_replyingToContent) return;

    // If replying, prepend quoted text so it shows as reply in thread
    if (_replyingToContent) {
      message = '> ' + _replyingToContent.replace(/\n/g, '\n> ') + '\n\n' + (message || '');
      cancelReply();
    }

    // When translation preview is visible, Send button = send translated (same as Enter)
    if (_translatePreview) {
      sendTranslated();
      return;
    }

    var btn = document.getElementById('lc-send-btn');
    btn.disabled = true;

    try {
      var log = _conversations.find(function (c) { return c.phone === _activePhone; });
      var instanceId = log ? log.instanceId : undefined;

      await api('/conversations/' + encodeURIComponent(_activePhone) + '/send', {
        method: 'POST',
        body: { message: message, instanceId: instanceId }
      });

      input.value = '';
      input.style.height = '42px';
      await refreshChat();
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  // ─── File Attachment ────────────────────────────────────────────

  function toggleAttachMenu() {
    var menu = document.getElementById('lc-attach-menu');
    if (!menu) return;
    var isVisible = menu.style.display !== 'none';
    menu.style.display = isVisible ? 'none' : '';
  }

  function pickFile(type) {
    var menu = document.getElementById('lc-attach-menu');
    if (menu) menu.style.display = 'none';

    var input = type === 'photo'
      ? document.getElementById('lc-file-photo')
      : document.getElementById('lc-file-doc');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  function fileSelected(inputEl, type) {
    if (!inputEl.files || !inputEl.files[0]) return;
    var file = inputEl.files[0];

    // 16MB limit
    if (file.size > 16 * 1024 * 1024) {
      alert('File too large. Maximum size is 16 MB.');
      inputEl.value = '';
      return;
    }

    _selectedFile = { file: file, type: type };
    showFilePreview(file);
  }

  function showFilePreview(file) {
    var preview = document.getElementById('lc-file-preview');
    var thumbEl = document.getElementById('lc-file-preview-thumb');
    var nameEl = document.getElementById('lc-file-preview-name');
    var sizeEl = document.getElementById('lc-file-preview-size');
    if (!preview) return;

    nameEl.textContent = file.name;
    var sizeKB = file.size / 1024;
    sizeEl.textContent = sizeKB < 1024
      ? sizeKB.toFixed(1) + ' KB'
      : (sizeKB / 1024).toFixed(1) + ' MB';

    // Thumbnail
    if (file.type.startsWith('image/')) {
      var url = URL.createObjectURL(file);
      thumbEl.innerHTML = '<img src="' + url + '" alt="preview" style="width:48px;height:48px;object-fit:cover;border-radius:6px;">';
    } else if (file.type.startsWith('video/')) {
      thumbEl.innerHTML = '<div class="lc-file-thumb-icon" style="background:#e8f5e9;"><svg width="24" height="24" viewBox="0 0 24 24" fill="#00a884"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></div>';
    } else {
      thumbEl.innerHTML = '<div class="lc-file-thumb-icon" style="background:#e3f2fd;"><svg width="24" height="24" viewBox="0 0 24 24" fill="#1976d2"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg></div>';
    }

    preview.style.display = '';
  }

  function clearFile() {
    _selectedFile = null;
    var preview = document.getElementById('lc-file-preview');
    if (preview) preview.style.display = 'none';
    var captionEl = document.getElementById('lc-file-caption');
    if (captionEl) captionEl.value = '';
    var photoInput = document.getElementById('lc-file-photo');
    if (photoInput) photoInput.value = '';
    var docInput = document.getElementById('lc-file-doc');
    if (docInput) docInput.value = '';
  }

  async function sendMedia() {
    if (!_activePhone || !_selectedFile) return;

    var btn = document.getElementById('lc-send-btn');
    btn.disabled = true;

    var caption = (document.getElementById('lc-file-caption')?.value || '').trim();
    var log = _conversations.find(function (c) { return c.phone === _activePhone; });
    var instanceId = log ? log.instanceId : '';

    var formData = new FormData();
    formData.append('file', _selectedFile.file);
    formData.append('caption', caption);
    formData.append('instanceId', instanceId || '');

    try {
      var response = await fetch(API + '/conversations/' + encodeURIComponent(_activePhone) + '/send-media', {
        method: 'POST',
        body: formData
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      clearFile();
      await refreshChat();
      if (window.toast) window.toast('Sent ' + (data.mediaType || 'file'), 'success');
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
    }
  }

  // ─── Message context menu (WhatsApp-style: select message → reactions + Reply, Copy, Forward, Pin, Star) ───

  function getMessageDisplayText(msg) {
    if (!msg || !msg.content) return '';
    var content = msg.role === 'assistant' ? getUserMessage(msg.content) : msg.content;
    var mediaMatch = content.match(/^\[(photo|video|document):\s*(.+?)\](.*)$/s);
    if (mediaMatch) {
      var caption = mediaMatch[3].trim();
      return (caption ? '[' + mediaMatch[1] + ': ' + mediaMatch[2] + '] ' + caption : '[' + mediaMatch[1] + ': ' + mediaMatch[2] + ']');
    }
    return content;
  }

  function openMessageContextMenu(idx, event) {
    if (idx < 0 || idx >= _lastMessages.length) return;
    event.preventDefault();
    event.stopPropagation();
    _contextMenuMsgIdx = idx;

    var menu = document.getElementById('lc-msg-context-menu');
    if (!menu) return;

    var bubbleWrap = document.querySelector('#lc-messages [data-msg-idx="' + idx + '"]');
    if (bubbleWrap) {
      var rect = bubbleWrap.getBoundingClientRect();
      menu.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 260)) + 'px';
      menu.style.top = (rect.bottom + 8) + 'px';
    }
    menu.style.display = '';

    if (_contextMenuCloseHandler) {
      document.removeEventListener('click', _contextMenuCloseHandler, true);
    }
    _contextMenuCloseHandler = function (e) {
      if (menu.contains(e.target)) return;
      closeMessageContextMenu();
      document.removeEventListener('click', _contextMenuCloseHandler, true);
      _contextMenuCloseHandler = null;
    };
    setTimeout(function () {
      document.addEventListener('click', _contextMenuCloseHandler, true);
    }, 0);
  }

  function closeMessageContextMenu() {
    _contextMenuMsgIdx = null;
    var menu = document.getElementById('lc-msg-context-menu');
    if (menu) menu.style.display = 'none';
    if (_contextMenuCloseHandler) {
      document.removeEventListener('click', _contextMenuCloseHandler, true);
      _contextMenuCloseHandler = null;
    }
  }

  function handleMessageChevronClick(e) {
    var chevron = e.target.closest('.lc-bubble-chevron');
    if (!chevron) return;
    e.preventDefault();
    e.stopPropagation();
    var idx = chevron.getAttribute('data-msg-idx');
    if (idx !== null) openMessageContextMenu(parseInt(idx, 10), e);
  }

  function doMessageReply() {
    if (_contextMenuMsgIdx == null || _contextMenuMsgIdx >= _lastMessages.length) return;
    var msg = _lastMessages[_contextMenuMsgIdx];
    var text = getMessageDisplayText(msg);
    _replyingToMsgIdx = _contextMenuMsgIdx;
    _replyingToContent = text;
    closeMessageContextMenu();

    var preview = document.getElementById('lc-reply-preview');
    var previewText = document.getElementById('lc-reply-preview-text');
    if (preview && previewText) {
      previewText.textContent = text.length > 80 ? text.substring(0, 77) + '...' : text;
      preview.style.display = 'flex';
    }
    var input = document.getElementById('lc-input-box');
    if (input) input.focus();
  }

  function cancelReply() {
    _replyingToMsgIdx = null;
    _replyingToContent = '';
    var preview = document.getElementById('lc-reply-preview');
    if (preview) preview.style.display = 'none';
  }

  function doMessageCopy() {
    if (_contextMenuMsgIdx == null || _contextMenuMsgIdx >= _lastMessages.length) return;
    var text = getMessageDisplayText(_lastMessages[_contextMenuMsgIdx]);
    closeMessageContextMenu();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (window.toast) window.toast('Copied to clipboard', 'success');
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (window.toast) window.toast('Copied to clipboard', 'success');
    } catch (e) { }
    document.body.removeChild(ta);
  }

  function doMessageForward() {
    if (_contextMenuMsgIdx == null || _contextMenuMsgIdx >= _lastMessages.length) return;
    var text = getMessageDisplayText(_lastMessages[_contextMenuMsgIdx]);
    closeMessageContextMenu();

    var listEl = document.getElementById('lc-forward-list');
    var modal = document.getElementById('lc-forward-modal');
    if (!listEl || !modal) return;

    var others = _conversations.filter(function (c) { return c.phone !== _activePhone; });
    listEl.innerHTML = others.map(function (c) {
      var initials = (c.pushName || '?').slice(0, 2).toUpperCase();
      return '<button type="button" class="lc-forward-item" data-phone="' + escapeAttr(c.phone) + '">' +
        '<span class="lc-avatar">' + escapeHtml(initials) + '</span>' +
        '<div><span class="lc-name">' + escapeHtml(c.pushName || formatPhoneForDisplay(c.phone)) + '</span><br><span class="lc-phone">+' + escapeHtml(formatPhoneForDisplay(c.phone)) + '</span></div>' +
        '</button>';
    }).join('');

    if (others.length === 0) {
      listEl.innerHTML = '<div class="lc-sidebar-empty" style="padding:24px;"><p>No other conversations to forward to.</p></div>';
    }

    listEl.onclick = function (e) {
      var btn = e.target.closest('.lc-forward-item');
      if (!btn) return;
      var phone = btn.getAttribute('data-phone');
      if (!phone) return;
      forwardMessageTo(phone, text);
      modal.style.display = 'none';
    };
    modal.style.display = 'flex';
  }

  async function forwardMessageTo(phone, text) {
    try {
      var log = _conversations.find(function (c) { return c.phone === phone; });
      var instanceId = log ? log.instanceId : undefined;
      await api('/conversations/' + encodeURIComponent(phone) + '/send', {
        method: 'POST',
        body: { message: text, instanceId: instanceId }
      });
      if (window.toast) window.toast('Forwarded', 'success');
    } catch (err) {
      alert('Failed to forward: ' + err.message);
    }
  }

  function closeForwardModal() {
    var modal = document.getElementById('lc-forward-modal');
    if (modal) modal.style.display = 'none';
  }

  function doMessagePin() {
    if (!_activePhone) return;
    closeMessageContextMenu();
    togglePinChat(_activePhone);
    if (window.toast) window.toast('Conversation pinned', 'success');
  }

  function doMessageStar() {
    if (!_activePhone) return;
    closeMessageContextMenu();
    toggleFavouriteChat(_activePhone);
    if (window.toast) window.toast('Conversation starred', 'success');
  }

  function doMessageReaction(emoji) {
    if (_contextMenuMsgIdx == null) return;
    closeMessageContextMenu();
    if (window.toast) window.toast('Reaction: ' + emoji, 'success');
    // Backend could support sending WhatsApp reaction here when messageId is available
  }

  function bindContextMenuActions() {
    var menu = document.getElementById('lc-msg-context-menu');
    if (!menu) return;
    menu.querySelectorAll('.lc-msg-action').forEach(function (btn) {
      var action = btn.getAttribute('data-action');
      var emoji = btn.getAttribute('data-emoji');
      btn.onclick = function () {
        if (action === 'emoji' && emoji) doMessageReaction(emoji);
        else if (action === 'reply') doMessageReply();
        else if (action === 'copy') doMessageCopy();
        else if (action === 'forward') doMessageForward();
        else if (action === 'pin') doMessagePin();
        else if (action === 'star') doMessageStar();
      };
    });
  }

  // Escape key exits focus mode; when approval panel visible: Esc=Reject, Ctrl+Enter=Send
  document.addEventListener('keydown', function (e) {
    var panel = document.getElementById('lc-approval-panel');
    var panelVisible = panel && panel.style.display !== 'none' && _currentApprovalId;
    if (panelVisible) {
      if (e.key === 'Escape') {
        e.preventDefault();
        rejectApproval();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        approveResponse();
        return;
      }
    }
    if (e.key === 'Escape' && document.body.classList.contains('lc-maximized')) {
      toggleMaximize();
    }
  });

  // Close attach menu when clicking outside
  document.addEventListener('click', function (e) {
    var menu = document.getElementById('lc-attach-menu');
    var btn = document.getElementById('lc-attach-btn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.style.display = 'none';
    }
    // Close header dropdown when clicking outside
    var wrap = document.querySelector('.lc-header-menu-wrap');
    var dropdown = document.getElementById('lc-header-dropdown');
    if (dropdown && dropdown.classList.contains('open') && wrap && !wrap.contains(e.target)) {
      closeHeaderMenu();
    }
    // Close mode dropdown when clicking outside
    var modeMenu = document.getElementById('lc-mode-dropdown');
    var modeBtn = document.getElementById('lc-mode-btn');
    if (modeMenu && modeBtn && !modeMenu.contains(e.target) && !modeBtn.contains(e.target)) {
      modeMenu.style.display = 'none';
    }
  });

  // ─── Translation ───────────────────────────────────────────────

  function toggleTranslate() {
    _translateMode = !_translateMode;
    var btn = document.getElementById('lc-translate-toggle');
    var selector = document.getElementById('lc-lang-selector');
    if (_translateMode) {
      btn.classList.add('active');
      selector.style.display = '';
      selector.value = _translateLang;
    } else {
      btn.classList.remove('active');
      selector.style.display = 'none';
      hideTranslatePreview();
    }
  }

  function handleLangChange() {
    _translateLang = document.getElementById('lc-lang-selector').value;
    clearTimeout(_translateDebounce);
    _translateDebounce = null;
    hideTranslatePreview();
  }

  function getTranslateLangLabel(lang) {
    var labels = { en: 'English', ms: 'Malay', zh: 'Chinese', id: 'Indonesian', th: 'Thai', vi: 'Vietnamese' };
    return labels[lang] || lang;
  }

  function showTranslatePreview(data) {
    _translatePreview = data;
    var el = document.getElementById('lc-translate-preview');
    var langEl = document.getElementById('lc-translate-preview-lang');
    var textEl = document.getElementById('lc-translate-preview-text');
    if (el && langEl && textEl) {
      langEl.textContent = 'Translation (' + getTranslateLangLabel(data.targetLang) + ')';
      textEl.textContent = data.translated;
      el.style.display = '';
    }
  }

  function hideTranslatePreview() {
    _translatePreview = null;
    var el = document.getElementById('lc-translate-preview');
    if (el) el.style.display = 'none';
  }

  function onInputTranslate() {
    if (!_translateMode || _translateLang === 'en') {
      hideTranslatePreview();
      return;
    }
    var input = document.getElementById('lc-input-box');
    var text = (input ? input.value : '').trim();
    if (!text) {
      hideTranslatePreview();
      return;
    }
    clearTimeout(_translateDebounce);
    _translateDebounce = setTimeout(function () {
      var textToTranslate = (document.getElementById('lc-input-box') && document.getElementById('lc-input-box').value.trim()) || '';
      var langAtRequest = _translateLang;
      if (!textToTranslate) {
        hideTranslatePreview();
        return;
      }
      if (!api) {
        hideTranslatePreview();
        if (typeof window !== 'undefined' && window.toast) window.toast('Translation not available', 'error');
        return;
      }
      api('/translate', { method: 'POST', body: { text: textToTranslate, targetLang: langAtRequest } })
        .then(function (result) {
          var current = (document.getElementById('lc-input-box') && document.getElementById('lc-input-box').value.trim()) || '';
          if (current !== textToTranslate) return;
          if (langAtRequest !== _translateLang) return;
          var translated = result && (result.translated != null) ? String(result.translated) : '';
          if (!translated) {
            hideTranslatePreview();
            if (typeof window !== 'undefined' && window.toast) window.toast('Translation failed', 'error');
            return;
          }
          showTranslatePreview({
            original: textToTranslate,
            translated: translated,
            targetLang: langAtRequest
          });
        })
        .catch(function (err) {
          hideTranslatePreview();
          if (typeof window !== 'undefined' && window.toast) window.toast('Translation failed: ' + (err && err.message ? err.message : 'network error'), 'error');
        });
    }, 400);
  }

  async function sendTranslated() {
    if (!_activePhone || !_translatePreview) return;
    var btn = document.getElementById('lc-send-btn');
    var input = document.getElementById('lc-input-box');
    btn.disabled = true;
    try {
      var log = _conversations.find(function (c) { return c.phone === _activePhone; });
      var instanceId = log ? log.instanceId : undefined;
      await api('/conversations/' + encodeURIComponent(_activePhone) + '/send', {
        method: 'POST',
        body: { message: _translatePreview.translated, instanceId: instanceId }
      });
      if (input) { input.value = ''; input.style.height = '42px'; }
      hideTranslatePreview();
      await refreshChat();
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
      if (input) input.focus();
    }
  }

  async function sendOriginal() {
    if (!_activePhone || !_translatePreview) return;
    var btn = document.getElementById('lc-send-btn');
    var input = document.getElementById('lc-input-box');
    btn.disabled = true;
    try {
      var log = _conversations.find(function (c) { return c.phone === _activePhone; });
      var instanceId = log ? log.instanceId : undefined;
      await api('/conversations/' + encodeURIComponent(_activePhone) + '/send', {
        method: 'POST',
        body: { message: _translatePreview.original, instanceId: instanceId }
      });
      if (input) { input.value = ''; input.style.height = '42px'; }
      hideTranslatePreview();
      await refreshChat();
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
      if (input) input.focus();
    }
  }

  function showTranslateModal() {
    if (!_pendingTranslation) return;
    document.getElementById('lc-translate-original').textContent = _pendingTranslation.original;
    document.getElementById('lc-translate-translated').textContent = _pendingTranslation.translated;
    document.getElementById('lc-translate-lang-label').textContent = _pendingTranslation.targetLang.toUpperCase();
    document.getElementById('lc-translate-modal').style.display = 'flex';
  }

  function closeTranslateModal() {
    document.getElementById('lc-translate-modal').style.display = 'none';
    _pendingTranslation = null;
    document.getElementById('lc-send-btn').disabled = false;
    document.getElementById('lc-input-box').focus();
  }

  async function confirmTranslation() {
    if (!_pendingTranslation || !_activePhone) {
      closeTranslateModal();
      return;
    }

    var confirmBtn = document.querySelector('#lc-translate-modal .lc-modal-btn-send');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Sending...';

    try {
      var log = _conversations.find(function (c) { return c.phone === _activePhone; });
      var instanceId = log ? log.instanceId : undefined;

      await api('/conversations/' + encodeURIComponent(_activePhone) + '/send', {
        method: 'POST',
        body: { message: _pendingTranslation.translated, instanceId: instanceId }
      });

      document.getElementById('lc-input-box').value = '';
      document.getElementById('lc-input-box').style.height = '42px';
      closeTranslateModal();
      await refreshChat();
    } catch (err) {
      alert('Failed to send message: ' + (err.message || 'Unknown error'));
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Send Translation';
    }
  }

  // ─── Header 3-dot menu (WhatsApp Web style) ───────────────────────

  function closeHeaderMenu() {
    var dropdown = document.getElementById('lc-header-dropdown');
    var btn = document.getElementById('lc-header-menu-btn');
    if (dropdown) dropdown.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleHeaderMenu() {
    var dropdown = document.getElementById('lc-header-dropdown');
    var btn = document.getElementById('lc-header-menu-btn');
    if (!dropdown || !btn) return;
    var isOpen = dropdown.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function updateHeaderMenuActive() {
    var btn = document.getElementById('lc-header-menu-btn');
    if (!btn) return;
    if (_searchOpen || _contactPanelOpen) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  function onMenuContactInfo() {
    closeHeaderMenu();
    toggleContactPanel();
  }

  function onMenuSearch() {
    closeHeaderMenu();
    toggleSearch();
  }

  // ─── Message Search ──────────────────────────────────────────────

  function toggleSearch() {
    _searchOpen = !_searchOpen;
    var bar = document.getElementById('lc-msg-search-bar');
    if (!bar) return;

    if (_searchOpen) {
      bar.style.display = '';
      var input = document.getElementById('lc-msg-search-input');
      if (input) { input.value = ''; input.focus(); }
      _searchQuery = '';
      _searchMatches = [];
      _searchCurrent = -1;
      updateSearchCount();
    } else {
      bar.style.display = 'none';
      _searchQuery = '';
      _searchMatches = [];
      _searchCurrent = -1;
      // Re-render to remove highlights
      rerenderMessages();
    }
    updateHeaderMenuActive();
  }

  function msgSearchInput() {
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(function () {
      var input = document.getElementById('lc-msg-search-input');
      _searchQuery = (input ? input.value : '').trim();
      executeSearch();
    }, 200);
  }

  function executeSearch() {
    _searchMatches = [];
    _searchCurrent = -1;
    var query = _searchQuery.toLowerCase();

    if (query.length > 0) {
      for (var i = 0; i < _lastMessages.length; i++) {
        var content = (_lastMessages[i].content || '').toLowerCase();
        if (content.includes(query)) {
          _searchMatches.push(i);
        }
      }
      if (_searchMatches.length > 0) {
        _searchCurrent = _searchMatches.length - 1; // start at last (most recent)
      }
    }

    updateSearchCount();
    rerenderMessages();
  }

  function msgSearchNav(direction) {
    if (_searchMatches.length === 0) return;
    _searchCurrent += direction;
    if (_searchCurrent < 0) _searchCurrent = _searchMatches.length - 1;
    if (_searchCurrent >= _searchMatches.length) _searchCurrent = 0;
    updateSearchCount();
    rerenderMessages();
  }

  function msgSearchKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      msgSearchNav(event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape') {
      toggleSearch();
    }
  }

  function updateSearchCount() {
    var el = document.getElementById('lc-msg-search-count');
    if (!el) return;
    if (!_searchQuery || _searchMatches.length === 0) {
      el.textContent = _searchQuery ? 'No results' : '';
    } else {
      el.textContent = (_searchCurrent + 1) + ' of ' + _searchMatches.length;
    }
  }

  function scrollToMatch(msgIdx) {
    var container = document.getElementById('lc-messages');
    if (!container) return;
    var el = container.querySelector('[data-msg-idx="' + msgIdx + '"]');
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /**
   * Re-render messages in-place using cached _lastMessages (for search highlight updates).
   */
  function rerenderMessages() {
    if (!_lastMessages.length) return;
    // Build a minimal log object for renderChat
    var fakeLog = {
      pushName: document.getElementById('lc-header-name')?.textContent || '',
      phone: (document.getElementById('lc-header-phone')?.textContent || '').replace(/^\+/, ''),
      messages: _lastMessages
    };
    // Preserve header text — renderChat will overwrite it with same values
    var container = document.getElementById('lc-messages');
    var html = '';
    var lastDate = '';
    var query = _searchOpen ? _searchQuery.toLowerCase() : '';

    for (var i = 0; i < _lastMessages.length; i++) {
      var msg = _lastMessages[i];
      var msgDate = new Date(msg.timestamp).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
      if (msgDate !== lastDate) {
        html += '<div class="lc-date-sep"><span>' + msgDate + '</span></div>';
        lastDate = msgDate;
      }

      var isGuest = msg.role === 'user';
      var side = isGuest ? 'guest' : 'bot';
      var time = new Date(msg.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
      var content = msg.content || '';
      var isSystemMsg = !isGuest && hasSystemContent(content);
      var displayContent = isGuest ? content : (isSystemMsg ? content : getUserMessage(content));

      var checkmark = '';
      if (!isGuest) {
        checkmark = '<svg class="lc-checkmark" viewBox="0 0 16 11" fill="currentColor"><path d="M11.07.65l-6.53 6.53L1.97 4.6l-.72.72 3.29 3.29 7.25-7.25-.72-.71z"/><path d="M5.54 7.18L4.82 6.46l-.72.72 1.44 1.44.72-.72-.72-.72z"/></svg>';
      }

      var manualTag = '';
      if (!isGuest && msg.manual) {
        manualTag = '<span class="lc-manual-tag">Staff</span>';
      }

      var isCurrentMatch = _searchCurrent >= 0 && _searchMatches[_searchCurrent] === i;
      var isAnyMatch = query && displayContent.toLowerCase().includes(query);

      var bubbleContent = '';
      var nonTextPlaceholder = getNonTextPlaceholder(displayContent);
      var mediaMatch = displayContent.match(/^\[(photo|video|document):\s*(.+?)\](.*)$/s);

      if (isSystemMsg) {
        // System message with debug info - show full formatted content
        bubbleContent = '<div class="lc-bubble-text">' + formatSystemContent(displayContent) + '</div>';
      } else if (nonTextPlaceholder) {
        bubbleContent = '<div class="lc-media-placeholder">' + nonTextPlaceholder.icon + '<span class="lc-media-filename">' + escapeHtml(nonTextPlaceholder.label) + '</span></div>';
      } else if (mediaMatch) {
        var mediaType = mediaMatch[1];
        var fileName = mediaMatch[2];
        var caption = mediaMatch[3].trim();
        var icon = mediaType === 'photo' ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>'
          : mediaType === 'video' ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>'
            : '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>';
        bubbleContent = '<div class="lc-media-placeholder">' + icon + '<span class="lc-media-filename">' + escapeHtml(fileName) + '</span></div>';
        if (caption) {
          bubbleContent += '<div class="lc-bubble-text">' + highlightText(caption, query, isCurrentMatch) + '</div>';
        }
      } else {
        bubbleContent = '<div class="lc-bubble-text">' + highlightText(displayContent, query, isCurrentMatch) + '</div>';
      }

      var matchClass = isCurrentMatch ? ' lc-search-focus' : (isAnyMatch ? ' lc-search-match' : '');
      var systemClass = isSystemMsg ? ' lc-system-msg' : '';
      var chevronSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

      html += '<div class="lc-bubble-wrap ' + side + '" data-msg-idx="' + i + '">' +
        '<div class="lc-bubble ' + side + matchClass + systemClass + '">' +
        bubbleContent +
        '<div class="lc-bubble-meta">' +
        manualTag +
        '<span class="lc-bubble-time">' + time + '</span>' +
        checkmark +
        '<button type="button" class="lc-bubble-chevron" data-msg-idx="' + i + '" title="Message options" aria-label="Message options">' + chevronSvg + '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    }

    container.innerHTML = html;

    if (_searchCurrent >= 0 && _searchMatches.length > 0) {
      scrollToMatch(_searchMatches[_searchCurrent]);
    }
  }

  // ─── Filter Chips ──────────────────────────────────────────────

  function setFilter(filter) {
    _activeFilter = filter;
    var chips = document.querySelectorAll('#lc-filter-chips .lc-chip');
    chips.forEach(function (chip) {
      if (chip.getAttribute('data-filter') === filter) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
    renderList(_conversations);
  }

  // ─── Pin & Favourite ──────────────────────────────────────────

  async function togglePinChat(phone) {
    try {
      var result = await api('/conversations/' + encodeURIComponent(phone) + '/pin', { method: 'PATCH' });
      for (var i = 0; i < _conversations.length; i++) {
        if (_conversations[i].phone === phone) {
          _conversations[i].pinned = result.pinned;
          break;
        }
      }
      renderList(_conversations);
      if (window.toast) window.toast(result.pinned ? 'Chat pinned' : 'Chat unpinned', 'success');
    } catch (e) {
      console.error('[LiveChat] Pin toggle failed:', e);
      if (window.toast) window.toast('Pin failed', 'error');
    }
  }

  async function toggleFavouriteChat(phone) {
    try {
      var result = await api('/conversations/' + encodeURIComponent(phone) + '/favourite', { method: 'PATCH' });
      for (var i = 0; i < _conversations.length; i++) {
        if (_conversations[i].phone === phone) {
          _conversations[i].favourite = result.favourite;
          break;
        }
      }
      renderList(_conversations);
      if (window.toast) window.toast(result.favourite ? 'Chat starred' : 'Chat unstarred', 'success');
    } catch (e) {
      console.error('[LiveChat] Favourite toggle failed:', e);
      if (window.toast) window.toast('Star failed', 'error');
    }
  }

  // ─── Sidebar 3-dot Menu ───────────────────────────────────────

  function toggleSidebarMenu() {
    var menu = document.getElementById('lc-sidebar-dropdown');
    if (!menu) return;
    var isOpen = menu.style.display !== 'none';
    menu.style.display = isOpen ? 'none' : '';
    if (!isOpen) {
      setTimeout(function () {
        document.addEventListener('click', closeSidebarMenuOnClick, { once: true });
      }, 0);
    }
  }

  function closeSidebarMenuOnClick() {
    var menu = document.getElementById('lc-sidebar-dropdown');
    if (menu) menu.style.display = 'none';
  }

  function showStarredMessages() {
    var menu = document.getElementById('lc-sidebar-dropdown');
    if (menu) menu.style.display = 'none';
    setFilter('favourites');
  }

  async function markAllAsRead() {
    var menu = document.getElementById('lc-sidebar-dropdown');
    if (menu) menu.style.display = 'none';
    var unreadConvos = _conversations.filter(function (c) { return (c.unreadCount || 0) > 0; });
    for (var i = 0; i < unreadConvos.length; i++) {
      try {
        await api('/conversations/' + encodeURIComponent(unreadConvos[i].phone) + '/read', { method: 'PATCH' });
        unreadConvos[i].unreadCount = 0;
      } catch (e) { }
    }
    renderList(_conversations);
    if (window.toast) window.toast('All conversations marked as read', 'success');
  }

  // ─── Per-chat chevron dropdown ────────────────────────────────

  var _chatDropdownPhone = null;

  function toggleChatDropdown(phone, btnEl) {
    var existing = document.getElementById('lc-chat-dropdown');
    if (existing) {
      existing.remove();
      if (_chatDropdownPhone === phone) { _chatDropdownPhone = null; return; }
    }
    _chatDropdownPhone = phone;

    var conv = _conversations.find(function (c) { return c.phone === phone; });
    var isPinned = conv && conv.pinned;
    var isFav = conv && conv.favourite;

    var dropdown = document.createElement('div');
    dropdown.id = 'lc-chat-dropdown';
    dropdown.className = 'lc-chat-dropdown';
    dropdown.innerHTML =
      '<button type="button" onclick="event.stopPropagation();lcTogglePin(\'' + escapeAttr(phone) + '\');lcCloseChatDropdown()">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4v6l-2 4h10l-2-4V4"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="8" y1="4" x2="16" y2="4"/></svg>' +
      '<span>' + (isPinned ? 'Unpin chat' : 'Pin chat') + '</span>' +
      '</button>' +
      '<button type="button" onclick="event.stopPropagation();lcToggleFavourite(\'' + escapeAttr(phone) + '\');lcCloseChatDropdown()">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
      '<span>' + (isFav ? 'Unstar chat' : 'Star chat') + '</span>' +
      '</button>' +
      '<button type="button" onclick="event.stopPropagation();lcMarkOneAsRead(\'' + escapeAttr(phone) + '\');lcCloseChatDropdown()">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
      '<span>Mark as read</span>' +
      '</button>';

    // Position relative to the button
    var rect = btnEl.getBoundingClientRect();
    var sidebar = document.getElementById('lc-sidebar');
    var sidebarRect = sidebar ? sidebar.getBoundingClientRect() : { left: 0, top: 0 };
    dropdown.style.position = 'fixed';
    dropdown.style.left = (rect.right - 160) + 'px';
    dropdown.style.top = (rect.bottom + 2) + 'px';
    dropdown.style.zIndex = '1000';

    document.body.appendChild(dropdown);
    setTimeout(function () {
      document.addEventListener('click', function handler() {
        closeChatDropdown();
        document.removeEventListener('click', handler);
      }, { once: true });
    }, 0);
  }

  function closeChatDropdown() {
    _chatDropdownPhone = null;
    var el = document.getElementById('lc-chat-dropdown');
    if (el) el.remove();
  }

  async function markOneAsRead(phone) {
    try {
      await api('/conversations/' + encodeURIComponent(phone) + '/read', { method: 'PATCH' });
      for (var i = 0; i < _conversations.length; i++) {
        if (_conversations[i].phone === phone) {
          _conversations[i].unreadCount = 0;
          break;
        }
      }
      renderList(_conversations);
      if (window.toast) window.toast('Marked as read', 'success');
    } catch (e) { }
  }

  // ─── Focus Mode (Maximize) ─────────────────────────────────────

  function toggleMaximize() {
    var isMax = document.body.classList.toggle('lc-maximized');
    var maxIcon = document.getElementById('lc-maximize-icon');
    var minIcon = document.getElementById('lc-minimize-icon');
    var btn = document.getElementById('lc-maximize-btn');
    if (maxIcon) maxIcon.style.display = isMax ? 'none' : '';
    if (minIcon) minIcon.style.display = isMax ? '' : 'none';
    if (btn) {
      btn.title = isMax ? 'Exit focus mode' : 'Focus mode (maximize)';
      if (isMax) btn.classList.add('active'); else btn.classList.remove('active');
    }
  }

  // ─── Contact Details Panel ─────────────────────────────────────

  function toggleContactPanel() {
    _contactPanelOpen = !_contactPanelOpen;
    var panel = document.getElementById('lc-contact-panel');
    if (!panel) return;

    if (_contactPanelOpen) {
      panel.style.display = 'flex';
      loadContactDetails();
    } else {
      panel.style.display = 'none';
    }
    updateHeaderMenuActive();
  }

  async function loadContactDetails() {
    if (!_activePhone) return;
    try {
      _contactDetails = await api('/conversations/' + encodeURIComponent(_activePhone) + '/contact');
    } catch (e) {
      _contactDetails = {};
    }
    renderContactFields();
  }

  function renderContactFields() {
    var d = _contactDetails || {};
    var avatarEl = document.getElementById('lc-contact-avatar');
    var phoneEl = document.getElementById('lc-contact-phone-display');

    // Auto-fill name from pushName if empty
    var headerName = document.getElementById('lc-header-name');
    var pushName = headerName ? headerName.textContent : '';
    var displayName = d.name || pushName || '?';
    if (avatarEl) avatarEl.textContent = displayName.slice(0, 2).toUpperCase();
    if (phoneEl) phoneEl.textContent = '+' + formatPhoneForDisplay(_activePhone || '');

    var nameEl = document.getElementById('lc-cd-name');
    if (nameEl) nameEl.value = d.name || pushName || '';

    var fields = {
      'lc-cd-email': d.email || '',
      'lc-cd-country': d.country || '',
      'lc-cd-language': d.language || '',
      'lc-cd-checkin': d.checkIn || '',
      'lc-cd-checkout': d.checkOut || '',
      'lc-cd-unit': d.unit || '',
      'lc-cd-contact-status': d.contactStatus || '',
      'lc-cd-payment-status': d.paymentStatus || '',
      'lc-cd-notes': d.notes || ''
    };
    for (var id in fields) {
      var el = document.getElementById(id);
      if (el) el.value = fields[id];
    }

    renderTags(d.tags || []);
  }

  function collectContactFields() {
    return {
      name: (document.getElementById('lc-cd-name')?.value || '').trim(),
      email: (document.getElementById('lc-cd-email')?.value || '').trim(),
      country: document.getElementById('lc-cd-country')?.value || '',
      language: document.getElementById('lc-cd-language')?.value || '',
      checkIn: document.getElementById('lc-cd-checkin')?.value || '',
      checkOut: document.getElementById('lc-cd-checkout')?.value || '',
      unit: (document.getElementById('lc-cd-unit')?.value || '').trim(),
      contactStatus: document.getElementById('lc-cd-contact-status')?.value || '',
      paymentStatus: document.getElementById('lc-cd-payment-status')?.value || '',
      notes: (document.getElementById('lc-cd-notes')?.value || '').trim(),
      tags: _contactDetails.tags || []
    };
  }

  function contactFieldChanged() {
    clearTimeout(_contactSaveTimer);
    showSaveIndicator('saving');
    _contactSaveTimer = setTimeout(function () {
      var data = collectContactFields();
      saveContactDetails(data);
    }, 500);
  }

  async function saveContactDetails(data) {
    if (!_activePhone) return;
    try {
      _contactDetails = await api('/conversations/' + encodeURIComponent(_activePhone) + '/contact', {
        method: 'PATCH',
        body: data
      });
      showSaveIndicator('saved');
    } catch (e) {
      showSaveIndicator('error');
    }
  }

  function showSaveIndicator(state) {
    var el = document.getElementById('lc-contact-save-indicator');
    if (!el) return;
    el.className = 'lc-contact-save-indicator ' + state;
    if (state === 'saving') {
      el.textContent = 'Saving...';
    } else if (state === 'saved') {
      el.textContent = 'Saved';
      setTimeout(function () {
        if (el.textContent === 'Saved') { el.textContent = ''; el.className = 'lc-contact-save-indicator'; }
      }, 2000);
    } else if (state === 'error') {
      el.textContent = 'Save failed';
    }
  }

  function renderTags(tags) {
    var container = document.getElementById('lc-cd-tags');
    if (!container) return;
    container.innerHTML = tags.map(function (tag, i) {
      return '<span class="lc-tag-chip">' + escapeHtml(tag) +
        '<button onclick="lcRemoveTag(' + i + ')" title="Remove">&times;</button></span>';
    }).join('');
  }

  function addTag(text) {
    var tag = text.trim();
    if (!tag) return;
    if (!_contactDetails.tags) _contactDetails.tags = [];
    if (_contactDetails.tags.indexOf(tag) !== -1) return;
    _contactDetails.tags.push(tag);
    renderTags(_contactDetails.tags);
    var data = collectContactFields();
    data.tags = _contactDetails.tags;
    saveContactDetails(data);
  }

  function removeTag(index) {
    if (!_contactDetails.tags) return;
    _contactDetails.tags.splice(index, 1);
    renderTags(_contactDetails.tags);
    var data = collectContactFields();
    data.tags = _contactDetails.tags;
    saveContactDetails(data);
  }

  function tagKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      var input = document.getElementById('lc-cd-tag-input');
      if (input && input.value.trim()) {
        addTag(input.value);
        input.value = '';
      }
    }
  }

  // ─── Input Handlers ─────────────────────────────────────────────

  function autoResize(textarea) {
    textarea.style.height = '42px';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  function handleKeydown(event) {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return; // Shift+Enter = new line (default)

    if (_translatePreview) {
      event.preventDefault();
      if (event.ctrlKey) {
        sendOriginal();
      } else {
        sendTranslated();
      }
      return;
    }
    event.preventDefault();
    sendReply();
  }

  // ─── Response Mode Management (Autopilot/Copilot/Manual) ───────

  async function setMode(mode) {
    if (!_activePhone) return;

    try {
      // Check if "Set as default" checkbox is checked
      var setDefaultCheckbox = document.getElementById('lc-mode-set-default');
      var setAsGlobalDefault = setDefaultCheckbox ? setDefaultCheckbox.checked : false;

      await api('/conversations/' + encodeURIComponent(_activePhone) + '/mode', {
        method: 'POST',
        body: {
          mode: mode,
          setAsGlobalDefault: setAsGlobalDefault
        }
      });

      _currentMode = mode;
      updateModeUI(mode);
      toggleModeMenu();

      // Reset checkbox after use
      if (setDefaultCheckbox) setDefaultCheckbox.checked = false;

      var message = 'Switched to ' + mode + ' mode';
      if (setAsGlobalDefault) {
        message += ' (set as default for all chats)';
      }
      showToast(message, 'success');
    } catch (err) {
      showToast('Failed to change mode: ' + err.message, 'error');
    }
  }

  function updateModeUI(mode) {
    // Update mode label
    var label = document.getElementById('lc-mode-label');
    if (label) {
      var labels = {
        autopilot: '✈️ Autopilot',
        copilot: '🤝 Copilot',
        manual: '✍️ Manual'
      };
      label.textContent = labels[mode] || mode;
    }

    // Update active state in dropdown
    document.querySelectorAll('.lc-mode-option').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Show/hide Help Me button in manual mode
    var helpBtn = document.getElementById('lc-help-me-btn');
    if (helpBtn) {
      helpBtn.style.display = mode === 'manual' ? '' : 'none';
    }

    // Refresh approvals in copilot mode
    if (mode === 'copilot') {
      checkPendingApprovals();
    } else {
      var panel = document.getElementById('lc-approval-panel');
      if (panel) panel.style.display = 'none';
    }
  }

  function toggleModeMenu() {
    var menu = document.getElementById('lc-mode-dropdown');
    if (!menu) return;
    menu.style.display = menu.style.display === 'none' ? '' : 'none';
  }

  async function checkPendingApprovals() {
    if (!_activePhone || _currentMode !== 'copilot') return;

    try {
      var data = await api('/conversations/' + encodeURIComponent(_activePhone) + '/approvals');
      _pendingApprovals = data.approvals || [];

      if (_pendingApprovals.length > 0) {
        showApprovalPanel(_pendingApprovals[0]);
      } else {
        var panel = document.getElementById('lc-approval-panel');
        if (panel) panel.style.display = 'none';
      }
    } catch (err) {
      console.error('[Copilot] Failed to check approvals:', err);
    }
  }

  function showApprovalPanel(approval) {
    _currentApprovalId = approval.id;

    var panel = document.getElementById('lc-approval-panel');
    var text = document.getElementById('lc-approval-text');
    var intent = document.getElementById('lc-approval-intent');
    var confidence = document.getElementById('lc-approval-confidence');

    if (panel) panel.style.display = '';
    if (text) text.value = approval.suggestedResponse;
    if (intent) intent.innerHTML = 'Intent: <strong>' + escapeHtml(approval.intent) + '</strong>';
    if (confidence) confidence.innerHTML = 'Confidence: <strong>' + approval.confidence.toFixed(2) + '</strong>';

    // Auto-scroll to show approval panel
    var container = document.getElementById('lc-messages');
    if (container) {
      setTimeout(function () {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  }

  async function approveResponse() {
    if (!_activePhone || !_currentApprovalId) return;

    var text = document.getElementById('lc-approval-text');
    var editedResponse = text ? text.value.trim() : '';

    if (!editedResponse) {
      showToast('Response cannot be empty', 'error');
      return;
    }

    try {
      var wasEdited = _pendingApprovals[0] && editedResponse !== _pendingApprovals[0].suggestedResponse;
      await api(
        '/conversations/' + encodeURIComponent(_activePhone) + '/approvals/' + _currentApprovalId + '/approve',
        {
          method: 'POST',
          body: { editedResponse: wasEdited ? editedResponse : null }
        }
      );

      showToast('Response sent', 'success');
      _currentApprovalId = null;
      var panel = document.getElementById('lc-approval-panel');
      if (panel) panel.style.display = 'none';

      // Check for more approvals
      await refreshChat();
      await checkPendingApprovals();
    } catch (err) {
      showToast('Failed to send message: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  async function rejectApproval() {
    if (!_activePhone || !_currentApprovalId) return;

    try {
      await api(
        '/conversations/' + encodeURIComponent(_activePhone) + '/approvals/' + _currentApprovalId + '/reject',
        { method: 'POST' }
      );

      showToast('Suggestion rejected', 'info');
      _currentApprovalId = null;
      var panel = document.getElementById('lc-approval-panel');
      if (panel) panel.style.display = 'none';

      // Check for more approvals
      await checkPendingApprovals();
    } catch (err) {
      showToast('Failed to reject: ' + err.message, 'error');
    }
  }

  function dismissApproval() {
    var panel = document.getElementById('lc-approval-panel');
    if (panel) panel.style.display = 'none';
    _currentApprovalId = null;
  }

  async function getAIHelp() {
    if (!_activePhone || _aiHelpLoading) return;

    var btn = document.getElementById('lc-help-me-btn');
    var input = document.getElementById('lc-input-box');

    _aiHelpLoading = true;
    if (btn) btn.classList.add('loading');

    try {
      var data = await api('/conversations/' + encodeURIComponent(_activePhone) + '/suggest', {
        method: 'POST',
        body: { context: input ? input.value : null }
      });

      // Insert AI suggestion into input box
      if (input && data.suggestion) {
        input.value = data.suggestion;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        input.focus();
      }

      showToast('AI suggestion generated (edit before sending)', 'success');
    } catch (err) {
      showToast('Failed to generate suggestion: ' + err.message, 'error');
    } finally {
      _aiHelpLoading = false;
      if (btn) btn.classList.remove('loading');
    }
  }

  function showToast(message, type) {
    // Create toast element
    var toast = document.createElement('div');
    toast.className = 'lc-toast lc-toast-' + type;
    toast.textContent = message;

    // Add to body
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(function () {
      toast.classList.add('lc-toast-show');
    }, 10);

    // Auto-remove after 3 seconds
    setTimeout(function () {
      toast.classList.remove('lc-toast-show');
      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // ─── Public API ─────────────────────────────────────────────────

  return {
    loadLiveChat: loadLiveChat,
    filterConversations: filterConversations,
    openConversation: openConversation,
    refreshChat: refreshChat,
    deleteChat: deleteChat,
    sendReply: sendReply,
    toggleTranslate: toggleTranslate,
    handleLangChange: handleLangChange,
    closeTranslateModal: closeTranslateModal,
    confirmTranslation: confirmTranslation,
    autoResize: autoResize,
    handleKeydown: handleKeydown,
    toggleAttachMenu: toggleAttachMenu,
    pickFile: pickFile,
    fileSelected: fileSelected,
    clearFile: clearFile,
    toggleHeaderMenu: toggleHeaderMenu,
    onMenuContactInfo: onMenuContactInfo,
    onMenuSearch: onMenuSearch,
    toggleSearch: toggleSearch,
    msgSearchInput: msgSearchInput,
    msgSearchNav: msgSearchNav,
    msgSearchKeydown: msgSearchKeydown,
    setFilter: setFilter,
    togglePin: togglePinChat,
    toggleFavourite: toggleFavouriteChat,
    toggleMaximize: toggleMaximize,
    toggleContactPanel: toggleContactPanel,
    contactFieldChanged: contactFieldChanged,
    tagKeydown: tagKeydown,
    removeTag: removeTag,
    onInputTranslate: onInputTranslate,
    cancelReply: cancelReply,
    closeForwardModal: closeForwardModal,
    toggleSidebarMenu: toggleSidebarMenu,
    showStarredMessages: showStarredMessages,
    markAllAsRead: markAllAsRead,
    toggleChatDropdown: toggleChatDropdown,
    closeChatDropdown: closeChatDropdown,
    markOneAsRead: markOneAsRead,
    // Response mode functions
    setMode: setMode,
    toggleModeMenu: toggleModeMenu,
    approveResponse: approveResponse,
    rejectApproval: rejectApproval,
    dismissApproval: dismissApproval,
    getAIHelp: getAIHelp
  };
})();

// Expose to global scope for onclick handlers
window.loadLiveChat = LiveChat.loadLiveChat;
window.lcFilterConversations = LiveChat.filterConversations;
window.lcOpenConversation = LiveChat.openConversation;
window.lcRefreshChat = LiveChat.refreshChat;
window.lcDeleteChat = LiveChat.deleteChat;
window.lcSendReply = LiveChat.sendReply;
window.lcToggleTranslate = LiveChat.toggleTranslate;
window.lcHandleLangChange = LiveChat.handleLangChange;
window.lcCloseTranslateModal = LiveChat.closeTranslateModal;
window.lcConfirmTranslation = LiveChat.confirmTranslation;
window.lcAutoResize = LiveChat.autoResize;
window.lcHandleKeydown = LiveChat.handleKeydown;
window.lcToggleAttachMenu = LiveChat.toggleAttachMenu;
window.lcPickFile = LiveChat.pickFile;
window.lcFileSelected = LiveChat.fileSelected;
window.lcClearFile = LiveChat.clearFile;
window.lcToggleSearch = LiveChat.toggleSearch;
window.lcMsgSearchInput = LiveChat.msgSearchInput;
window.lcMsgSearchNav = LiveChat.msgSearchNav;
window.lcMsgSearchKeydown = LiveChat.msgSearchKeydown;
window.lcSetFilter = LiveChat.setFilter;
window.lcTogglePin = LiveChat.togglePin;
window.lcToggleFavourite = LiveChat.toggleFavourite;
window.lcToggleMaximize = LiveChat.toggleMaximize;
window.lcToggleHeaderMenu = LiveChat.toggleHeaderMenu;
window.lcOnMenuContactInfo = LiveChat.onMenuContactInfo;
window.lcOnMenuSearch = LiveChat.onMenuSearch;
window.lcToggleContactPanel = LiveChat.toggleContactPanel;
window.lcContactFieldChanged = LiveChat.contactFieldChanged;
window.lcTagKeydown = LiveChat.tagKeydown;
window.lcRemoveTag = LiveChat.removeTag;
window.lcCancelReply = LiveChat.cancelReply;
window.lcCloseForwardModal = LiveChat.closeForwardModal;
window.lcOnInputTranslate = LiveChat.onInputTranslate;
window.lcToggleSidebarMenu = LiveChat.toggleSidebarMenu;
window.lcShowStarredMessages = LiveChat.showStarredMessages;
window.lcMarkAllAsRead = LiveChat.markAllAsRead;
window.lcToggleChatDropdown = LiveChat.toggleChatDropdown;
window.lcCloseChatDropdown = LiveChat.closeChatDropdown;
window.lcMarkOneAsRead = LiveChat.markOneAsRead;
window.lcSetMode = LiveChat.setMode;
window.lcToggleModeMenu = LiveChat.toggleModeMenu;
window.lcApproveResponse = LiveChat.approveResponse;
window.lcRejectApproval = LiveChat.rejectApproval;
window.lcDismissApproval = LiveChat.dismissApproval;
window.lcGetAIHelp = LiveChat.getAIHelp;

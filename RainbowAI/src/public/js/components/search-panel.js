// ═══════════════════════════════════════════════════════════════════
// Search Panel — Reusable message search with highlighting
// ═══════════════════════════════════════════════════════════════════
//
// Used by: Live Simulation (real-chat.js) dev mode
// Pattern: Regular script, functions exposed on window.SearchPanel
//
// Dependencies: escapeHtml (from utils-global.js)
// ═══════════════════════════════════════════════════════════════════

const SearchPanel = (function () {
  const esc = typeof escapeHtml === 'function' ? escapeHtml : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ─── State ──────────────────────────────────────────────────────

  let _query = '';
  let _matches = [];   // Array of { index, element } for matched messages
  let _currentIdx = -1; // Current match index
  let _debounceTimer = null;
  let _onSearchCallback = null;
  let _containerId = '';
  let _messagesContainerId = '';

  // ─── Init ───────────────────────────────────────────────────────

  /**
   * Initialize search panel
   * @param {object} opts
   * @param {string} opts.containerId - ID of search bar container
   * @param {string} opts.messagesContainerId - ID of messages scroll container
   * @param {function} [opts.onSearch] - Callback when search query changes (receives query string)
   */
  function init(opts) {
    _containerId = opts.containerId;
    _messagesContainerId = opts.messagesContainerId;
    _onSearchCallback = opts.onSearch || null;
  }

  // ─── Open / Close ───────────────────────────────────────────────

  /**
   * Show search bar and focus input
   */
  function open() {
    var container = document.getElementById(_containerId);
    if (!container) return;
    container.style.display = '';
    var input = container.querySelector('.rc-msg-search-input');
    if (input) input.focus();
  }

  /**
   * Hide search bar and clear results
   */
  function close() {
    var container = document.getElementById(_containerId);
    if (container) container.style.display = 'none';
    clear();
  }

  /**
   * Check if search is open
   * @returns {boolean}
   */
  function isOpen() {
    var container = document.getElementById(_containerId);
    return container ? container.style.display !== 'none' : false;
  }

  // ─── Search Logic ───────────────────────────────────────────────

  /**
   * Handle input change with debounce
   * @param {string} text
   */
  function handleInput(text) {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      _query = (text || '').toLowerCase().trim();
      if (_query.length < 2) {
        _matches = [];
        _currentIdx = -1;
        updateCount();
        removeHighlights();
        return;
      }
      performSearch();
      if (_onSearchCallback) _onSearchCallback(_query);
    }, 300);
  }

  /**
   * Perform search across messages in the container
   */
  function performSearch() {
    _matches = [];
    _currentIdx = -1;

    var container = document.getElementById(_messagesContainerId);
    if (!container || !_query) {
      updateCount();
      return;
    }

    // Find all message bubble elements
    var bubbles = container.querySelectorAll('.rc-bubble-text, .rc-bubble');
    bubbles.forEach(function (el, i) {
      var text = (el.textContent || '').toLowerCase();
      if (text.indexOf(_query) !== -1) {
        _matches.push({ index: i, element: el });
      }
    });

    if (_matches.length > 0) {
      _currentIdx = 0;
      scrollToMatch(0);
    }

    updateCount();
    highlightMatches();
  }

  /**
   * Navigate to next/previous match
   * @param {number} direction - 1 for next, -1 for previous
   */
  function navigate(direction) {
    if (_matches.length === 0) return;
    _currentIdx = (_currentIdx + direction + _matches.length) % _matches.length;
    scrollToMatch(_currentIdx);
    highlightMatches();
  }

  /**
   * Clear search state
   */
  function clear() {
    _query = '';
    _matches = [];
    _currentIdx = -1;
    removeHighlights();

    var container = document.getElementById(_containerId);
    if (container) {
      var input = container.querySelector('.rc-msg-search-input');
      if (input) input.value = '';
    }
    updateCount();
  }

  // ─── Highlighting ───────────────────────────────────────────────

  /**
   * Highlight search text in a string (returns HTML)
   * @param {string} text - Original text (already escaped)
   * @param {boolean} isFocused - If true, use focused highlight style
   * @returns {string} HTML with <mark> tags
   */
  function highlightText(text, isFocused) {
    if (!_query || !text) return text;
    var escapedQuery = _query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + escapedQuery + ')', 'gi');
    var cls = isFocused ? 'rc-search-focus' : 'rc-search-highlight';
    return text.replace(regex, '<mark class="' + cls + '">$1</mark>');
  }

  /**
   * Apply highlighting CSS classes to matched elements
   */
  function highlightMatches() {
    // Remove existing highlights first
    var container = document.getElementById(_messagesContainerId);
    if (!container) return;

    // Remove all existing search decorations
    container.querySelectorAll('.rc-search-match, .rc-search-current').forEach(function (el) {
      el.classList.remove('rc-search-match', 'rc-search-current');
    });

    _matches.forEach(function (m, i) {
      var bubble = m.element.closest('.rc-bubble-wrap') || m.element.closest('.rc-bubble');
      if (bubble) {
        bubble.classList.add('rc-search-match');
        if (i === _currentIdx) {
          bubble.classList.add('rc-search-current');
        }
      }
    });
  }

  /**
   * Remove all search highlights
   */
  function removeHighlights() {
    var container = document.getElementById(_messagesContainerId);
    if (!container) return;
    container.querySelectorAll('.rc-search-match, .rc-search-current').forEach(function (el) {
      el.classList.remove('rc-search-match', 'rc-search-current');
    });
  }

  // ─── UI Updates ─────────────────────────────────────────────────

  /**
   * Scroll to a match by index
   * @param {number} idx
   */
  function scrollToMatch(idx) {
    if (idx < 0 || idx >= _matches.length) return;
    var el = _matches[idx].element;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Update match count display
   */
  function updateCount() {
    var container = document.getElementById(_containerId);
    if (!container) return;
    var countEl = container.querySelector('.rc-msg-search-count');
    if (!countEl) return;

    if (_matches.length === 0) {
      countEl.textContent = _query ? 'No matches' : '';
    } else {
      countEl.textContent = (_currentIdx + 1) + ' / ' + _matches.length;
    }
  }

  // ─── Getters ────────────────────────────────────────────────────

  /**
   * Get current search query
   * @returns {string}
   */
  function getQuery() {
    return _query;
  }

  /**
   * Get match count
   * @returns {number}
   */
  function getMatchCount() {
    return _matches.length;
  }

  /**
   * Re-run search (e.g., after re-render from auto-refresh)
   */
  function refresh() {
    if (_query) {
      performSearch();
    }
  }

  // ─── Public API ─────────────────────────────────────────────────

  return {
    init: init,
    open: open,
    close: close,
    isOpen: isOpen,
    handleInput: handleInput,
    navigate: navigate,
    clear: clear,
    highlightText: highlightText,
    refresh: refresh,
    getQuery: getQuery,
    getMatchCount: getMatchCount
  };
})();

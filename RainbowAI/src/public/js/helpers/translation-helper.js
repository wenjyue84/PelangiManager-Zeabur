/**
 * @fileoverview Shared translation helper for Live Chat and Chat Simulator
 * Provides translation mode toggle, preview, and send functionality
 * @module translation-helper
 */

/**
 * Creates a translation handler with configurable element ID prefix
 *
 * @param {Object} config - Configuration object
 * @param {string} config.prefix - Element ID prefix (e.g., 'lc-' for live-chat, 'rc-' for chat-simulator)
 * @param {Function} config.api - API function for making requests
 * @param {Function} config.toast - Toast notification function
 * @param {Function} [config.onSend] - Optional callback after sending message
 * @returns {Object} Translation handler methods
 */
export function createTranslationHelper(config) {
  const { prefix, api, toast, onSend } = config;

  // Internal state
  let translateMode = false;
  let translateLang = 'ms';
  let translatePreview = null; // { original, translated, targetLang }
  let translateDebounce = null;

  /**
   * Language code to label mapping
   */
  const LANG_LABELS = {
    en: 'English',
    ms: 'Malay',
    zh: 'Chinese',
    id: 'Indonesian',
    th: 'Thai',
    vi: 'Vietnamese'
  };

  /**
   * Get element by ID with prefix
   */
  function getEl(id) {
    return document.getElementById(prefix + id);
  }

  /**
   * Toggle translation mode on/off
   */
  function toggleTranslate() {
    translateMode = !translateMode;
    const btn = getEl('translate-toggle');
    const selector = getEl('lang-selector');

    if (translateMode) {
      if (btn) btn.classList.add('active');
      if (selector) {
        selector.style.display = '';
        selector.value = translateLang;
      }
    } else {
      if (btn) btn.classList.remove('active');
      if (selector) selector.style.display = 'none';
      hideTranslatePreview();
    }
  }

  /**
   * Handle language selector change
   */
  function handleLangChange() {
    const selector = getEl('lang-selector');
    if (selector) translateLang = selector.value;
    clearTimeout(translateDebounce);
    translateDebounce = null;
    hideTranslatePreview();
  }

  /**
   * Get human-readable language label
   */
  function getTranslateLangLabel(lang) {
    return LANG_LABELS[lang] || lang;
  }

  /**
   * Show translation preview below input box
   */
  function showTranslatePreview(data) {
    translatePreview = data;
    const el = getEl('translate-preview');
    const langEl = getEl('translate-preview-lang');
    const textEl = getEl('translate-preview-text');

    if (el && langEl && textEl) {
      langEl.textContent = 'Translation (' + getTranslateLangLabel(data.targetLang) + ')';
      textEl.textContent = data.translated;
      el.style.display = '';
    }
  }

  /**
   * Hide translation preview
   */
  function hideTranslatePreview() {
    translatePreview = null;
    const el = getEl('translate-preview');
    if (el) el.style.display = 'none';
  }

  /**
   * Handle input change and trigger translation with debounce
   * Call this from the input box's oninput event
   */
  function onInputTranslate() {
    if (!translateMode || translateLang === 'en') {
      hideTranslatePreview();
      return;
    }

    const input = getEl('input-box');
    const text = (input ? input.value : '').trim();

    if (!text) {
      hideTranslatePreview();
      return;
    }

    clearTimeout(translateDebounce);
    translateDebounce = setTimeout(async function() {
      const textToTranslate = (getEl('input-box') && getEl('input-box').value.trim()) || '';
      const langAtRequest = translateLang;

      if (!textToTranslate) {
        hideTranslatePreview();
        return;
      }

      if (!api) {
        hideTranslatePreview();
        if (toast) toast('Translation not available', 'error');
        return;
      }

      try {
        const result = await api('/translate', {
          method: 'POST',
          body: { text: textToTranslate, targetLang: langAtRequest }
        });

        // Check if input changed during API call
        const current = (getEl('input-box') && getEl('input-box').value.trim()) || '';
        if (current !== textToTranslate) return;
        if (langAtRequest !== translateLang) return;

        const translated = result && (result.translated != null) ? String(result.translated) : '';

        if (!translated) {
          hideTranslatePreview();
          if (toast) toast('Translation failed', 'error');
          return;
        }

        showTranslatePreview({
          original: textToTranslate,
          translated: translated,
          targetLang: langAtRequest
        });
      } catch (err) {
        hideTranslatePreview();
        if (toast) toast('Translation failed: ' + (err && err.message ? err.message : 'network error'), 'error');
      }
    }, 400);
  }

  /**
   * Send translated message
   * Returns the message object for the caller to handle sending
   * @returns {Object|null} { text: string, type: 'translated'|'original' } or null if no preview
   */
  function getMessageToSend(useOriginal = false) {
    if (!translatePreview) return null;

    return {
      text: useOriginal ? translatePreview.original : translatePreview.translated,
      type: useOriginal ? 'original' : 'translated'
    };
  }

  /**
   * Clear input box and translation preview after sending
   */
  function clearAfterSend() {
    const input = getEl('input-box');
    if (input) {
      input.value = '';
      input.style.height = '42px';
    }
    hideTranslatePreview();
  }

  /**
   * Show translation confirmation modal
   * @param {Object} data - { original, translated, targetLang }
   */
  function showTranslateModal(data) {
    if (!data) return;

    const originalEl = getEl('translate-original');
    const translatedEl = getEl('translate-translated');
    const langLabelEl = getEl('translate-lang-label') || getEl('translate-lang-name');
    const modal = getEl('translate-modal');

    if (originalEl) originalEl.textContent = data.original;
    if (translatedEl) translatedEl.textContent = data.translated;
    if (langLabelEl) langLabelEl.textContent = data.targetLang.toUpperCase();
    if (modal) modal.style.display = 'flex';
  }

  /**
   * Close translation modal
   */
  function closeTranslateModal() {
    const modal = getEl('translate-modal');
    if (modal) modal.style.display = 'none';

    const sendBtn = getEl('send-btn');
    const input = getEl('input-box');
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }

  // Public API
  return {
    // State getters
    get mode() { return translateMode; },
    get lang() { return translateLang; },
    get preview() { return translatePreview; },

    // Core functions
    toggleTranslate,
    handleLangChange,
    onInputTranslate,
    showTranslatePreview,
    hideTranslatePreview,
    getTranslateLangLabel,

    // Message handling
    getMessageToSend,
    clearAfterSend,

    // Modal handling
    showTranslateModal,
    closeTranslateModal,

    // Restore state (for page refresh)
    restoreState: () => {
      const btn = getEl('translate-toggle');
      const selector = getEl('lang-selector');
      if (translateMode && btn) {
        btn.classList.add('active');
        if (selector) {
          selector.style.display = '';
          selector.value = translateLang;
        }
      }
    }
  };
}

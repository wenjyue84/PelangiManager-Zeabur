// ═══════════════════════════════════════════════════════════════════
// Metadata Badges — Reusable badge generation utilities
// ═══════════════════════════════════════════════════════════════════
//
// Shared by: Quick Test (legacy-functions.js), Live Simulation (real-chat.js)
//
// Pattern: UMD — works as <script> (global MetadataBadges) and as ES module import.
// ═══════════════════════════════════════════════════════════════════

(function (root, factory) {
  const mod = factory();
  // ES‑module interop: if someone `import`s this file, they get named exports
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    Object.assign(module.exports, mod);
  }
  // Always expose globally so onclick handlers work
  root.MetadataBadges = mod;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Tiny HTML escaper (standalone — no dependency on window.escapeHtml)
  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Tier Badge (T1–T5 classification source) ─────────────────────

  const TIER_LABELS = {
    'regex':    '🚨 Priority Keywords',
    'fuzzy':    '⚡ Smart Matching',
    'semantic': '📚 Learning Examples',
    'llm':      '🤖 AI Fallback'
  };

  // ── Edit Type Configurations ─────────────────────────────────
  const EDIT_TYPES = {
    knowledge: { label: 'Quick Reply', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    workflow: { label: 'Workflow Step', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    template: { label: 'System Message', color: 'bg-sky-50 text-sky-700 border-sky-200' }
  };

  const TIER_COLORS = {
    'regex':    'bg-red-50 text-red-700',
    'fuzzy':    'bg-yellow-50 text-yellow-700',
    'semantic': 'bg-purple-50 text-purple-700',
    'llm':      'bg-blue-50 text-blue-700'
  };

  function getTierBadge(source) {
    if (!source) return '';
    var label = TIER_LABELS[source] || source;
    var color = TIER_COLORS[source] || 'bg-neutral-50 text-neutral-700';
    return '<span class="rb-badge px-1.5 py-0.5 ' + color + ' rounded font-medium text-xs">' + label + '</span>';
  }

  /** Return plain text tier label (no HTML) */
  function getTierLabel(source) {
    return TIER_LABELS[source] || source || '';
  }

  // ── Message Type Badge ───────────────────────────────────────────

  var MSG_TYPE_ICONS  = { 'info': 'ℹ️', 'problem': '⚠️', 'complaint': '🔴' };
  var MSG_TYPE_COLORS = { 'info': 'bg-green-50 text-green-700', 'problem': 'bg-orange-50 text-orange-700', 'complaint': 'bg-red-50 text-red-700' };

  function getMessageTypeBadge(type) {
    if (!type) return '';
    var icon  = MSG_TYPE_ICONS[type]  || 'ℹ️';
    var color = MSG_TYPE_COLORS[type] || 'bg-green-50 text-green-700';
    return '<span class="rb-badge px-1.5 py-0.5 ' + color + ' rounded font-medium text-xs">' + icon + ' ' + type + '</span>';
  }

  // ── Sentiment Badge ──────────────────────────────────────────────

  var SENTIMENT_ICONS  = { 'positive': '😊', 'neutral': '😐', 'negative': '😠' };
  var SENTIMENT_COLORS = { 'positive': 'bg-green-100 text-green-800', 'neutral': 'bg-gray-100 text-gray-700', 'negative': 'bg-red-100 text-red-800' };

  function getSentimentBadge(sentiment) {
    if (!sentiment) return '';
    var icon  = SENTIMENT_ICONS[sentiment]  || '😐';
    var color = SENTIMENT_COLORS[sentiment] || 'bg-gray-100 text-gray-700';
    return '<span class="rb-badge px-1.5 py-0.5 ' + color + ' rounded font-medium text-xs">' + icon + ' ' + sentiment + '</span>';
  }

  // ── KB Files Badge ───────────────────────────────────────────────

  function getKBFilesBadge(files, onClick) {
    if (!files || files.length === 0) return '';
    onClick = onClick || 'openKBFileFromPreview';
    var chips = files.map(function (f) {
      return '<span onclick="' + onClick + '(\'' + esc(f) + '\')" ' +
        'class="px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded font-mono text-xs cursor-pointer hover:bg-violet-100 transition" ' +
        'title="Click to view ' + esc(f) + '">' + esc(f) + '</span>';
    }).join('');
    return '<div class="mt-1 flex items-center gap-1 flex-wrap"><span class="text-neutral-400">📂</span>' + chips + '</div>';
  }

  // ── Simple value badges ──────────────────────────────────────────

  function getConfidenceBadge(confidence) {
    if (confidence === null || confidence === undefined) return '';
    var pct = (confidence * 100).toFixed(0);
    return '<span class="rb-badge px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded font-medium text-xs">' + pct + '%</span>';
  }

  function getResponseTimeBadge(ms) {
    if (!ms) return '';
    var text = ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms';
    return '<span class="rb-badge px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded font-medium text-xs">' + text + '</span>';
  }

  function getModelBadge(model) {
    if (!model) return '';
    return '<span class="rb-badge px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-mono text-xs">' + esc(model) + '</span>';
  }

  function getIntentBadge(intent) {
    if (!intent) return '';
    return '<span class="rb-badge px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded font-mono text-xs">' + esc(intent) + '</span>';
  }

  function getActionBadge(action) {
    if (!action) return '';
    return '<span class="rb-badge px-1.5 py-0.5 bg-success-50 text-success-700 rounded font-medium text-xs">' + esc(action) + '</span>';
  }

  function getLanguageBadge(langCode) {
    if (!langCode) return '';
    var map = { 'en': 'EN', 'ms': 'BM', 'zh': 'ZH' };
    var display = map[langCode] || langCode.toUpperCase();
    return '<span class="rb-badge px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded font-medium text-xs">' + display + '</span>';
  }

  function getOverrideBadge(problemOverride) {
    if (!problemOverride) return '';
    return '<span class="rb-badge px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium text-xs">🔀 Override</span>';
  }

  // ── Combined badge generator ─────────────────────────────────────

  /**
   * Build all metadata badges for a message.
   *
   * @param {Object} meta  — metadata object (source, messageType, intent, etc.)
   * @param {Object} opts  — per-badge visibility overrides; all default true except showSentiment
   * @returns {{ inline: string, kbFiles: string }}
   *   inline = concatenated badge HTML for the inline row
   *   kbFiles = separate KB file chips HTML (own div wrapper)
   */
  function getMetadataBadges(meta, opts) {
    if (!meta) return { inline: '', kbFiles: '' };
    opts = opts || {};
    var show = function (key, dflt) { return opts[key] !== undefined ? opts[key] : dflt; };

    var badges = [];
    if (show('showTier', true)         && meta.source)           badges.push(getTierBadge(meta.source));
    if (show('showMessageType', true)  && meta.messageType)      badges.push(getMessageTypeBadge(meta.messageType));
    if (show('showOverride', true)     && meta.problemOverride)  badges.push(getOverrideBadge(meta.problemOverride));
    if (show('showIntent', true)       && meta.intent)           badges.push(getIntentBadge(meta.intent));
    if (show('showAction', true)       && meta.routedAction)     badges.push(getActionBadge(meta.routedAction));
    if (show('showLanguage', true)     && meta.detectedLanguage) badges.push(getLanguageBadge(meta.detectedLanguage));
    if (show('showModel', true)        && meta.model)            badges.push(getModelBadge(meta.model));
    if (show('showResponseTime', true) && meta.responseTime)     badges.push(getResponseTimeBadge(meta.responseTime));
    if (show('showConfidence', true)   && meta.confidence != null) badges.push(getConfidenceBadge(meta.confidence));
    if (show('showSentiment', false)   && meta.sentiment)        badges.push(getSentimentBadge(meta.sentiment));

    var kb = show('showKBFiles', true) && meta.kbFiles
      ? getKBFilesBadge(meta.kbFiles, opts.kbClickHandler)
      : '';

    return { inline: badges.join(''), kbFiles: kb };
  }

  // ── Public API ───────────────────────────────────────────────────

  // ── Edit Button Generator ────────────────────────────────────

  /**
   * Generate an edit button for inline editing
   * @param {Object} em - Edit metadata { type, intent, workflowId, templateKey, etc. }
   * @param {string} editId - Unique ID for the edit panel
   * @returns {string} HTML for edit button
   */
  function getEditButton(em, editId) {
    if (!em || !editId) return '';

    var editTypeInfo = EDIT_TYPES[em.type] || { label: 'Edit', color: 'bg-neutral-50 text-neutral-700 border-neutral-200' };
    var editLabel = editTypeInfo.label;
    var editBadgeColor = editTypeInfo.color;

    return '<button onclick="toggleInlineEdit(\'' + esc(editId) + '\')" ' +
      'class="inline-flex items-center gap-0.5 px-1.5 py-0.5 ' + editBadgeColor + ' border rounded text-xs cursor-pointer hover:opacity-80 transition" ' +
      'title="Click to edit this ' + (editLabel || 'reply') + '" role="button" tabindex="0">' +
      '✏️ ' + editLabel + '</button>';
  }

  /**
   * Generate "also template" edit button for system message variant
   * @param {Object} alsoTemplate - Template metadata { key, languages }
   * @param {string} editId - Base edit ID (will append '-tmpl')
   * @returns {string} HTML for also-template button
   */
  function getAlsoTemplateButton(alsoTemplate, editId) {
    if (!alsoTemplate || !editId) return '';

    return '<button onclick="toggleInlineEdit(\'' + esc(editId) + '-tmpl\')" ' +
      'class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-xs cursor-pointer hover:opacity-80 transition" ' +
      'title="Also edit the System Message version">' +
      '✏️ System Message</button>';
  }

  // ── Public API ───────────────────────────────────────────────

  return {
    getTierBadge: getTierBadge,
    getTierLabel: getTierLabel,
    getMessageTypeBadge: getMessageTypeBadge,
    getSentimentBadge: getSentimentBadge,
    getKBFilesBadge: getKBFilesBadge,
    getConfidenceBadge: getConfidenceBadge,
    getResponseTimeBadge: getResponseTimeBadge,
    getModelBadge: getModelBadge,
    getIntentBadge: getIntentBadge,
    getActionBadge: getActionBadge,
    getLanguageBadge: getLanguageBadge,
    getOverrideBadge: getOverrideBadge,
    getMetadataBadges: getMetadataBadges,
    // Expose helpers for consumers
    esc: esc,
    TIER_LABELS: TIER_LABELS,
    // Edit button utilities
    EDIT_TYPES: EDIT_TYPES,
    getEditButton: getEditButton,
    getAlsoTemplateButton: getAlsoTemplateButton
  };
});

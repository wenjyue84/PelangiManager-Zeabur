/**
 * Chat Preview Module
 * Manages chat sessions for Preview tab (chat simulator)
 * - Session persistence (localStorage)
 * - Session switching, creation, deletion
 * - Message rendering with metadata badges
 * - Inline edit support for quick replies/workflows
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

// Module-level state (referenced by global chat functions)
// NOTE: chatSessions and currentSessionId must be accessible to preview tab
export let chatSessions = [];
export let currentSessionId = null;

// Initialize from localStorage
function initializeChatSessions() {
  const saved = localStorage.getItem('rainbowChatSessions');
  if (saved) {
    chatSessions = JSON.parse(saved);
  } else {
    chatSessions = [{
      id: Date.now().toString(),
      title: 'New Chat',
      history: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    }];
  }
  currentSessionId = localStorage.getItem('rainbowCurrentSession') || chatSessions[0].id;
}

initializeChatSessions();

/**
 * Save chat sessions to localStorage
 */
export function saveSessions() {
  localStorage.setItem('rainbowChatSessions', JSON.stringify(chatSessions));
  localStorage.setItem('rainbowCurrentSession', currentSessionId);
}

/**
 * Get current active session
 */
export function getCurrentSession() {
  return chatSessions.find(s => s.id === currentSessionId) || chatSessions[0];
}

/**
 * Update session title from first user message
 */
export function updateSessionTitle(sessionId) {
  const session = chatSessions.find(s => s.id === sessionId);
  if (!session) return;
  const firstUserMsg = session.history.find(m => m.role === 'user');
  if (firstUserMsg) {
    session.title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
  }
  renderSessionsList();
  saveSessions();
}

/**
 * Render sessions list sidebar
 */
export function renderSessionsList() {
  const container = document.getElementById('chat-sessions');
  if (!container) return;
  const sortedSessions = [...chatSessions].sort((a, b) => b.lastActivity - a.lastActivity);
  container.innerHTML = sortedSessions.map(session => {
    const isActive = session.id === currentSessionId;
    const messageCount = session.history.length;
    return `
      <div class="px-3 py-2 rounded-2xl cursor-pointer transition ${isActive ? 'bg-primary-500 text-white' : 'hover:bg-white'}" onclick="switchToSession('${session.id}')">
        <div class="text-sm font-medium truncate">${esc(session.title)}</div>
        <div class="text-xs ${isActive ? 'text-primary-100' : 'text-neutral-500'} flex items-center justify-between mt-1">
          <span>${messageCount} messages</span>
          ${!isActive ? `<button onclick="deleteSession(event, '${session.id}')" class="hover:text-danger-500 transition">🗑️</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Switch to a different session
 */
export function switchToSession(sessionId) {
  currentSessionId = sessionId;
  const session = getCurrentSession();
  session.lastActivity = Date.now();
  saveSessions();
  renderSessionsList();
  renderChatMessages();
}

/**
 * Create a new chat session
 */
export function createNewChat() {
  const newSession = {
    id: Date.now().toString(),
    title: 'New Chat',
    history: [],
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  chatSessions.push(newSession);
  currentSessionId = newSession.id;
  saveSessions();
  renderSessionsList();
  renderChatMessages();
  document.getElementById('chat-input').focus();
}

/**
 * Delete a chat session
 */
export function deleteSession(event, sessionId) {
  event.stopPropagation();
  if (chatSessions.length === 1) {
    toast('Cannot delete the last session', 'error');
    return;
  }
  if (!confirm('Delete this chat session?')) return;
  chatSessions = chatSessions.filter(s => s.id !== sessionId);
  if (currentSessionId === sessionId) {
    currentSessionId = chatSessions[0].id;
  }
  saveSessions();
  renderSessionsList();
  renderChatMessages();
}

/**
 * Clear current chat session history
 */
export function clearCurrentChat() {
  const session = getCurrentSession();
  session.history = [];
  session.title = 'New Chat';
  saveSessions();
  renderChatMessages();
  renderSessionsList();
}

/**
 * Alias for clearCurrentChat (used by onclick handlers)
 */
export function clearChat() {
  clearCurrentChat();
}

/**
 * Render chat messages in current session
 * Supports inline editing for quick replies/workflows
 */
export function renderChatMessages() {
  const messagesEl = document.getElementById('chat-messages');
  const metaEl = document.getElementById('chat-meta');
  const session = getCurrentSession();

  if (session.history.length === 0) {
    messagesEl.innerHTML = `
      <div class="text-center text-neutral-400 text-sm py-8">
        <p>👋 Start a conversation by typing a message below</p>
        <p class="text-xs mt-1">Try: "What's the wifi password?" or "I want to book a room"</p>
      </div>
    `;
    metaEl.innerHTML = '';
    return;
  }

  // Render messages in reverse order (newest at top)
  const historyLen = session.history.length;
  messagesEl.innerHTML = session.history.slice().reverse().map((msg, idx) => {
    if (msg.role === 'user') {
      return `<div class="flex justify-end"><div class="bg-primary-500 text-white rounded-2xl px-4 py-2 max-w-md"><div class="text-sm">${esc(msg.content)}</div></div></div>`;
    } else {
      // Use shared MetadataBadges component for badge generation
      const sourceBadge = window.MetadataBadges.getTierBadge(msg.meta?.source);
      const kbBadges = window.MetadataBadges.getKBFilesBadge(msg.meta?.kbFiles);
      const hMsgTypeBadge = window.MetadataBadges.getMessageTypeBadge(msg.meta?.messageType);
      const hOverrideBadge = window.MetadataBadges.getOverrideBadge(msg.meta?.problemOverride);

      // Editable static reply / workflow / system message: full inline-edit UI + clickable message body
      const em = msg.meta?.editMeta;
      if (em) {
        const editId = msg.meta.messageId || `edit-msg-${historyLen - 1 - idx}`;
        let editLabel = '';
        let editBadgeColor = '';
        if (em.type === 'knowledge') { editLabel = 'Quick Reply'; editBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }
        if (em.type === 'workflow') { editLabel = 'Workflow Step'; editBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200'; }
        if (em.type === 'template') { editLabel = 'System Message'; editBadgeColor = 'bg-sky-50 text-sky-700 border-sky-200'; }
        const langs = em.languages || { en: '', ms: '', zh: '' };
        const sourceLabel = em.type === 'knowledge' ? `Quick Reply: ${em.intent}` : em.type === 'workflow' ? `${em.workflowName || em.workflowId} → Step ${(em.stepIndex || 0) + 1}` : `Template: ${em.templateKey || ''}`;
        const editBtnHtml = '<button onclick="toggleInlineEdit(\'' + editId + '\')" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 ' + editBadgeColor + ' border rounded text-xs cursor-pointer hover:opacity-80 transition" title="Click to edit this ' + (editLabel || 'reply') + '" role="button" tabindex="0">✏️ ' + editLabel + '</button>';
        const alsoTemplateHtml = (em.alsoTemplate)
          ? '<button onclick="toggleInlineEdit(\'' + editId + '-tmpl\')" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-xs cursor-pointer hover:opacity-80 transition" title="Also edit the System Message version">✏️ System Message</button>'
          : '';
        const langBadge = window.MetadataBadges.getLanguageBadge(msg.meta.detectedLanguage);
        const editPanelHtml = `
        <div id="${editId}" class="hidden mt-2 pt-2 border-t border-dashed" data-edit-meta='${JSON.stringify(em).replace(/'/g, "&#39;")}'>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-neutral-600">Editing ${editLabel}: <span class="font-mono">${esc(sourceLabel)}</span></span>
          </div>
          <div class="space-y-1.5">
            <div><label class="text-xs text-neutral-400 font-medium">English</label><textarea data-lang="en" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="3">${esc(langs.en)}</textarea></div>
            <div><label class="text-xs text-neutral-400 font-medium">Malay</label><textarea data-lang="ms" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">${esc(langs.ms)}</textarea></div>
            <div><label class="text-xs text-neutral-400 font-medium">Chinese</label><textarea data-lang="zh" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">${esc(langs.zh)}</textarea></div>
          </div>
          <div class="flex gap-2 mt-2 flex-wrap">
            <button type="button" onclick="translateInlineEditPanel('${editId}')" class="px-3 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600 transition font-medium" title="Fill missing languages (same AI as LLM reply)">Translate</button>
            <button onclick="saveInlineEdit('${editId}')" class="px-3 py-1 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 transition font-medium">Save</button>
            <button onclick="toggleInlineEdit('${editId}')" class="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg hover:bg-neutral-200 transition">Cancel</button>
          </div>
        </div>`;
        let alsoTemplatePanelHtml = '';
        if (em.alsoTemplate) {
          const tLangs = em.alsoTemplate.languages || { en: '', ms: '', zh: '' };
          const tmplMeta = JSON.stringify({ type: 'template', templateKey: em.alsoTemplate.key, languages: em.alsoTemplate.languages }).replace(/'/g, "&#39;");
          alsoTemplatePanelHtml = `
        <div id="${editId}-tmpl" class="hidden mt-2 pt-2 border-t border-dashed" data-edit-meta='${tmplMeta}'>
          <div class="flex items-center justify-between mb-1.5"><span class="text-xs font-semibold text-neutral-600">Editing System Message: <span class="font-mono">${esc(em.alsoTemplate.key)}</span></span></div>
          <div class="space-y-1.5">
            <div><label class="text-xs text-neutral-400 font-medium">English</label><textarea data-lang="en" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="3">${esc(tLangs.en)}</textarea></div>
            <div><label class="text-xs text-neutral-400 font-medium">Malay</label><textarea data-lang="ms" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">${esc(tLangs.ms)}</textarea></div>
            <div><label class="text-xs text-neutral-400 font-medium">Chinese</label><textarea data-lang="zh" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">${esc(tLangs.zh)}</textarea></div>
          </div>
          <div class="flex gap-2 mt-2 flex-wrap">
            <button type="button" onclick="translateInlineEditPanel('${editId}-tmpl')" class="px-3 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600 transition font-medium" title="Fill missing languages (same AI as LLM reply)">Translate</button>
            <button onclick="saveInlineEdit('${editId}-tmpl')" class="px-3 py-1 bg-sky-500 text-white text-xs rounded-lg hover:bg-sky-600 transition font-medium">Save System Message</button>
            <button onclick="toggleInlineEdit('${editId}-tmpl')" class="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg hover:bg-neutral-200 transition">Cancel</button>
          </div>
        </div>`;
        }
        const usageBadge = msg.meta.usage ? '<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono text-xs" title="Token usage: prompt + completion = total">' + (msg.meta.usage.prompt_tokens || 'N/A') + 'p+' + (msg.meta.usage.completion_tokens || 'N/A') + 'c=' + (msg.meta.usage.total_tokens || 'N/A') + '</span>' : '';
        const contentClickable = `cursor-pointer hover:bg-neutral-50 rounded -mx-1 px-1 py-0.5 transition`;
        const contentOnclick = `onclick="toggleInlineEdit('${editId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleInlineEdit('${editId}')}" title="Click to edit this ${editLabel || 'reply'}" role="button" tabindex="0"`;
        return `<div class="flex justify-start"><div class="bg-white border rounded-2xl px-4 py-2 max-w-md group">
        <div id="${editId}-text" class="text-sm whitespace-pre-wrap ${contentClickable}" ${contentOnclick}>${esc(msg.content)}</div>
        <div class="mt-2 pt-2 border-t flex items-center gap-1.5 text-xs text-neutral-500 flex-wrap">${sourceBadge}${hMsgTypeBadge}${hOverrideBadge}<span class="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded font-mono">${esc(msg.meta.intent)}</span><span class="px-1.5 py-0.5 bg-success-50 text-success-700 rounded">${esc(msg.meta.routedAction)}</span>${langBadge}${msg.meta.model ? `<span class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-mono text-xs">${esc(msg.meta.model)}</span>` : ''}${msg.meta.responseTime ? `<span class="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded">${msg.meta.responseTime >= 1000 ? (msg.meta.responseTime / 1000).toFixed(1) + 's' : msg.meta.responseTime + 'ms'}</span>` : ''}${msg.meta.confidence ? `<span>${(msg.meta.confidence * 100).toFixed(0)}%</span>` : ''}${usageBadge}${editBtnHtml}${alsoTemplateHtml}</div>${kbBadges}${editPanelHtml}${alsoTemplatePanelHtml}</div></div>`;
      }

      const isSystem = window.hasSystemContent(msg.content);
      const displayContent = isSystem ? window.formatSystemContent(msg.content) : window.getUserMessage(msg.content);
      const systemClass = isSystem ? ' lc-system-msg' : '';

      const langBadge = window.MetadataBadges.getLanguageBadge(msg.meta?.detectedLanguage);
      const intentBadge = window.MetadataBadges.getIntentBadge(msg.meta?.intent);
      const actionBadge = window.MetadataBadges.getActionBadge(msg.meta?.routedAction);
      const modelBadge = window.MetadataBadges.getModelBadge(msg.meta?.model);
      const timeBadge = window.MetadataBadges.getResponseTimeBadge(msg.meta?.responseTime);
      const confBadge = window.MetadataBadges.getConfidenceBadge(msg.meta?.confidence);
      const usageBadge = msg.meta?.usage ? '<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono text-xs" title="Token usage: prompt + completion = total">' + (msg.meta.usage.prompt_tokens || 'N/A') + 'p+' + (msg.meta.usage.completion_tokens || 'N/A') + 'c=' + (msg.meta.usage.total_tokens || 'N/A') + '</span>' : '';

      const contentHtml = `<div class="text-sm whitespace-pre-wrap">${isSystem ? displayContent : esc(displayContent)}</div>`;

      return `<div class="flex justify-start"><div class="bg-white border rounded-2xl px-4 py-2 max-w-md${systemClass}">${contentHtml}${msg.meta ? `<div class="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-neutral-500">${sourceBadge}${hMsgTypeBadge}${hOverrideBadge}${intentBadge}${actionBadge}${langBadge}${modelBadge}${timeBadge}${confBadge}${usageBadge}</div>${kbBadges}` : ''}</div></div>`;
    }
  }).join('');
  messagesEl.scrollTop = 0;

  const lastMsg = session.history[session.history.length - 1];
  if (lastMsg.role === 'assistant' && lastMsg.meta) {
    const timeStr = lastMsg.meta.responseTime ? (lastMsg.meta.responseTime >= 1000 ? (lastMsg.meta.responseTime / 1000).toFixed(1) + 's' : lastMsg.meta.responseTime + 'ms') : 'N/A';

    // Get detection method label (using shared component)
    const detectionMethod = window.MetadataBadges.getTierLabel(lastMsg.meta.source);
    const detectionPrefix = detectionMethod ? `Detection: <b>${detectionMethod}</b> | ` : '';
    const kbFilesStr = lastMsg.meta.kbFiles && lastMsg.meta.kbFiles.length > 0 ? ` | KB: <b>${lastMsg.meta.kbFiles.join(', ')}</b>` : '';
    const hMsgTypeStr = lastMsg.meta.messageType ? ` | Type: <b>${lastMsg.meta.messageType}</b>` : '';
    const hOverrideStr = lastMsg.meta.problemOverride ? ' | <b style="color:#d97706">🔀 Problem Override</b>' : '';

    const usageStr = lastMsg.meta.usage
      ? ' | Tokens: <b>' + (lastMsg.meta.usage.prompt_tokens || 'N/A') + 'p + ' + (lastMsg.meta.usage.completion_tokens || 'N/A') + 'c = ' + (lastMsg.meta.usage.total_tokens || 'N/A') + '</b>'
      : '';

    metaEl.innerHTML = `${detectionPrefix}Intent: <b>${esc(lastMsg.meta.intent)}</b> | Routed to: <b>${esc(lastMsg.meta.routedAction)}</b>${hMsgTypeStr}${hOverrideStr}${lastMsg.meta.model ? ` | Model: <b>${esc(lastMsg.meta.model)}</b>` : ''} | Time: <b>${timeStr}</b> | Confidence: ${lastMsg.meta.confidence ? (lastMsg.meta.confidence * 100).toFixed(0) + '%' : 'N/A'}${kbFilesStr}${usageStr}`;
  }
}

/**
 * Load preview tab (initialize sessions list and messages)
 */
export function loadPreview() {
  renderSessionsList();
  renderChatMessages();
}

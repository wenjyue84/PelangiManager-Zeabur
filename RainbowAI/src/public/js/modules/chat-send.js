/**
 * Chat Send Module
 * Handles sending messages in the Quick Test (Guest Simulation) chat.
 * Extracted from legacy-functions.js during refactoring.
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';
import {
    getCurrentSession,
    saveSessions,
    updateSessionTitle,
    renderSessionsList,
    renderChatMessages
} from './chat-preview.js';

/**
 * Send a chat message in the Guest Simulation (Quick Test) tab.
 * Called from: chat-simulator.html onsubmit="sendChatMessage(event)"
 */
export async function sendChatMessage(event) {
    event.preventDefault();

    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const sendBtn = document.getElementById('send-btn');
    const messagesEl = document.getElementById('chat-messages');
    const session = getCurrentSession();

    // Update session activity
    session.lastActivity = Date.now();

    // Clear placeholder if first message
    if (session.history.length === 0) {
        messagesEl.innerHTML = '';
    }

    // Add user message to session history
    session.history.push({ role: 'user', content: message });

    // Add user message to UI
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'flex justify-end';
    userMsgEl.innerHTML = `
    <div class="bg-primary-500 text-white rounded-2xl px-4 py-2 max-w-md">
      <div class="text-sm">${esc(message)}</div>
    </div>
  `;
    messagesEl.prepend(userMsgEl);
    messagesEl.scrollTop = 0;

    // Update session title if it's the first message
    if (session.history.length === 1) {
        updateSessionTitle(session.id);
    }

    // Clear input and disable button
    input.value = '';
    sendBtn.disabled = true;
    const origBtnHtml = sendBtn.innerHTML;
    sendBtn.innerHTML = '<span>Thinking…</span>';

    // Show typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'flex justify-start';
    typingEl.id = 'typing-indicator';
    typingEl.innerHTML = `
    <div class="bg-white border rounded-2xl px-4 py-2">
      <div class="flex gap-1">
        <div class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
      </div>
    </div>
  `;
    messagesEl.prepend(typingEl);
    messagesEl.scrollTop = 0;

    try {
        // Send to API (exclude last user message from history)
        const result = await api('/preview/chat', {
            method: 'POST',
            body: {
                message,
                history: session.history.slice(0, -1),
                sessionId: session.id
            },
            timeout: 90000
        });

        // Remove typing indicator
        typingEl.remove();

        // Inline edit: generate stable id
        const em = result.editMeta;
        const isEditable = !!em;
        const editId = isEditable ? `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : '';

        // Add assistant message to session history with metadata
        session.history.push({
            role: 'assistant',
            content: result.message,
            meta: {
                intent: result.intent,
                source: result.source,
                routedAction: result.routedAction,
                confidence: result.confidence,
                model: result.model,
                responseTime: result.responseTime,
                kbFiles: result.kbFiles || [],
                messageType: result.messageType || 'info',
                problemOverride: result.problemOverride || false,
                sentiment: result.sentiment || null,
                editMeta: result.editMeta || null,
                messageId: editId || undefined
            }
        });

        // Save sessions
        saveSessions();
        renderSessionsList();

        // Re-render all messages (reuse existing rendering logic from chat-preview)
        renderChatMessages();

        // Update meta info bar
        const metaEl = document.getElementById('chat-meta');
        if (metaEl && window.MetadataBadges) {
            const timeStr = result.responseTime
                ? (result.responseTime >= 1000 ? (result.responseTime / 1000).toFixed(1) + 's' : result.responseTime + 'ms')
                : 'N/A';
            const detectionMethod = window.MetadataBadges.getTierLabel(result.source) || result.source || 'Unknown';
            const langMap = { 'en': 'EN', 'ms': 'BM', 'zh': 'ZH' };
            const langCode = result.detectedLanguage;
            const langDisplay = langCode ? (langMap[langCode] || langCode.toUpperCase()) : '?';
            const kbFilesStr = result.kbFiles && result.kbFiles.length > 0
                ? ` | KB: <b>${result.kbFiles.join(', ')}</b>`
                : '';
            const msgTypeStr = result.messageType ? ` | Type: <b>${result.messageType}</b>` : '';
            const sentimentStr = result.sentiment
                ? ` | Sentiment: <b>${result.sentiment === 'positive' ? '😊 positive' : result.sentiment === 'negative' ? '😠 negative' : '😐 neutral'}</b>`
                : '';
            const overrideStr = result.problemOverride ? ' | <b style="color:#d97706">🔀 Problem Override</b>' : '';

            metaEl.innerHTML = `Detection: <b>${detectionMethod}</b> | Lang: <b>${langDisplay}</b> | Intent: <b>${esc(result.intent)}</b> | Routed to: <b>${esc(result.routedAction)}</b>${msgTypeStr}${sentimentStr}${overrideStr}${result.model ? ` | Model: <b>${esc(result.model)}</b>` : ''} | Time: <b>${timeStr}</b> | Confidence: ${result.confidence ? (result.confidence * 100).toFixed(0) + '%' : 'N/A'}${kbFilesStr}`;
        }

    } catch (error) {
        // Remove typing indicator
        typingEl.remove();

        // Show error inline
        const errorMsgEl = document.createElement('div');
        errorMsgEl.className = 'flex justify-start';
        errorMsgEl.innerHTML = `
      <div class="bg-danger-50 border border-red-200 text-danger-800 rounded-2xl px-4 py-2 max-w-md">
        <div class="text-sm">❌ Error: ${esc(error.message || 'Failed to get response')}</div>
      </div>
    `;
        messagesEl.prepend(errorMsgEl);
        messagesEl.scrollTop = 0;

        toast(error.message || 'Failed to send message', 'error');

    } finally {
        // Re-enable button
        sendBtn.disabled = false;
        sendBtn.innerHTML = origBtnHtml;
        input.focus();
    }
}

// ═══════════════════════════════════════════════════════════════════
// Live Chat Actions - Send/reply, context menu, file attachment, input
// ═══════════════════════════════════════════════════════════════════

import { $ } from './live-chat-state.js';
import { refreshChat, loadLiveChat, getUserMessage, renderList, formatPhoneForDisplay } from './live-chat-core.js';
import { sendTranslated, sendOriginal } from './live-chat-features.js';
import { togglePinChat, toggleFavouriteChat } from './live-chat-panels.js';

var api = window.api;
var API = window.API || '';

// ─── Actions ─────────────────────────────────────────────────────

export async function deleteChat() {
  if (!$.activePhone) return;
  if (!confirm('Delete this conversation? This cannot be undone.')) return;
  try {
    await api('/conversations/' + encodeURIComponent($.activePhone), { method: 'DELETE' });
    $.activePhone = null;
    document.getElementById('lc-active-chat').style.display = 'none';
    document.getElementById('lc-empty-state').style.display = '';
    loadLiveChat();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

export async function sendReply() {
  if (!$.activePhone) return;

  if ($.selectedFile) {
    await sendMedia();
    return;
  }

  var input = document.getElementById('lc-input-box');
  var message = input ? input.value.trim() : '';
  if (!message && !$.replyingToContent) return;

  if ($.replyingToContent) {
    message = '> ' + $.replyingToContent.replace(/\n/g, '\n> ') + '\n\n' + (message || '');
    cancelReply();
  }

  // When translation preview is visible, Send button = send translated
  if ($.translatePreview) {
    sendTranslated();
    return;
  }

  var btn = document.getElementById('lc-send-btn');
  btn.disabled = true;

  try {
    var log = $.conversations.find(function (c) { return c.phone === $.activePhone; });
    var instanceId = log ? log.instanceId : undefined;

    await api('/conversations/' + encodeURIComponent($.activePhone) + '/send', {
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

// ─── File Attachment ─────────────────────────────────────────────

export function toggleAttachMenu() {
  var menu = document.getElementById('lc-attach-menu');
  if (!menu) return;
  var isVisible = menu.style.display !== 'none';
  menu.style.display = isVisible ? 'none' : '';
}

export function pickFile(type) {
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

export function fileSelected(inputEl, type) {
  if (!inputEl.files || !inputEl.files[0]) return;
  var file = inputEl.files[0];

  if (file.size > 16 * 1024 * 1024) {
    alert('File too large. Maximum size is 16 MB.');
    inputEl.value = '';
    return;
  }

  $.selectedFile = { file: file, type: type };
  showFilePreview(file);
}

export function showFilePreview(file) {
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

export function clearFile() {
  $.selectedFile = null;
  var preview = document.getElementById('lc-file-preview');
  if (preview) preview.style.display = 'none';
  var captionEl = document.getElementById('lc-file-caption');
  if (captionEl) captionEl.value = '';
  var photoInput = document.getElementById('lc-file-photo');
  if (photoInput) photoInput.value = '';
  var docInput = document.getElementById('lc-file-doc');
  if (docInput) docInput.value = '';
}

export async function sendMedia() {
  if (!$.activePhone || !$.selectedFile) return;

  var btn = document.getElementById('lc-send-btn');
  btn.disabled = true;

  var caption = (document.getElementById('lc-file-caption')?.value || '').trim();
  var log = $.conversations.find(function (c) { return c.phone === $.activePhone; });
  var instanceId = log ? log.instanceId : '';

  var formData = new FormData();
  formData.append('file', $.selectedFile.file);
  formData.append('caption', caption);
  formData.append('instanceId', instanceId || '');

  try {
    var response = await fetch(API + '/conversations/' + encodeURIComponent($.activePhone) + '/send-media', {
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

// ─── Message context menu ────────────────────────────────────────

export function getMessageDisplayText(msg) {
  if (!msg || !msg.content) return '';
  var content = msg.role === 'assistant' ? getUserMessage(msg.content) : msg.content;
  var mediaMatch = content.match(/^\[(photo|video|document):\s*(.+?)\](.*)$/s);
  if (mediaMatch) {
    var caption = mediaMatch[3].trim();
    return (caption ? '[' + mediaMatch[1] + ': ' + mediaMatch[2] + '] ' + caption : '[' + mediaMatch[1] + ': ' + mediaMatch[2] + ']');
  }
  return content;
}

export function openMessageContextMenu(idx, event) {
  if (idx < 0 || idx >= $.lastMessages.length) return;
  event.preventDefault();
  event.stopPropagation();
  $.contextMenuMsgIdx = idx;

  var menu = document.getElementById('lc-msg-context-menu');
  if (!menu) return;

  var bubbleWrap = document.querySelector('#lc-messages [data-msg-idx="' + idx + '"]');
  if (bubbleWrap) {
    var rect = bubbleWrap.getBoundingClientRect();
    menu.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 260)) + 'px';
    menu.style.top = (rect.bottom + 8) + 'px';
  }
  menu.style.display = '';

  if ($.contextMenuCloseHandler) {
    document.removeEventListener('click', $.contextMenuCloseHandler, true);
  }
  $.contextMenuCloseHandler = function (e) {
    if (menu.contains(e.target)) return;
    closeMessageContextMenu();
    document.removeEventListener('click', $.contextMenuCloseHandler, true);
    $.contextMenuCloseHandler = null;
  };
  setTimeout(function () {
    document.addEventListener('click', $.contextMenuCloseHandler, true);
  }, 0);
}

export function closeMessageContextMenu() {
  $.contextMenuMsgIdx = null;
  var menu = document.getElementById('lc-msg-context-menu');
  if (menu) menu.style.display = 'none';
  if ($.contextMenuCloseHandler) {
    document.removeEventListener('click', $.contextMenuCloseHandler, true);
    $.contextMenuCloseHandler = null;
  }
}

export function handleMessageChevronClick(e) {
  var chevron = e.target.closest('.lc-bubble-chevron');
  if (!chevron) return;
  e.preventDefault();
  e.stopPropagation();
  var idx = chevron.getAttribute('data-msg-idx');
  if (idx !== null) openMessageContextMenu(parseInt(idx, 10), e);
}

export function doMessageReply() {
  if ($.contextMenuMsgIdx == null || $.contextMenuMsgIdx >= $.lastMessages.length) return;
  var msg = $.lastMessages[$.contextMenuMsgIdx];
  var text = getMessageDisplayText(msg);
  $.replyingToMsgIdx = $.contextMenuMsgIdx;
  $.replyingToContent = text;
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

export function cancelReply() {
  $.replyingToMsgIdx = null;
  $.replyingToContent = '';
  var preview = document.getElementById('lc-reply-preview');
  if (preview) preview.style.display = 'none';
}

export function doMessageCopy() {
  if ($.contextMenuMsgIdx == null || $.contextMenuMsgIdx >= $.lastMessages.length) return;
  var text = getMessageDisplayText($.lastMessages[$.contextMenuMsgIdx]);
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

export function fallbackCopy(text) {
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

export function doMessageForward() {
  if ($.contextMenuMsgIdx == null || $.contextMenuMsgIdx >= $.lastMessages.length) return;
  var text = getMessageDisplayText($.lastMessages[$.contextMenuMsgIdx]);
  closeMessageContextMenu();

  var listEl = document.getElementById('lc-forward-list');
  var modal = document.getElementById('lc-forward-modal');
  if (!listEl || !modal) return;

  var others = $.conversations.filter(function (c) { return c.phone !== $.activePhone; });
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

export async function forwardMessageTo(phone, text) {
  try {
    var log = $.conversations.find(function (c) { return c.phone === phone; });
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

export function closeForwardModal() {
  var modal = document.getElementById('lc-forward-modal');
  if (modal) modal.style.display = 'none';
}

export function doMessagePin() {
  if (!$.activePhone) return;
  closeMessageContextMenu();
  togglePinChat($.activePhone);
  if (window.toast) window.toast('Conversation pinned', 'success');
}

export function doMessageStar() {
  if (!$.activePhone) return;
  closeMessageContextMenu();
  toggleFavouriteChat($.activePhone);
  if (window.toast) window.toast('Conversation starred', 'success');
}

export function doMessageReaction(emoji) {
  if ($.contextMenuMsgIdx == null) return;
  closeMessageContextMenu();
  if (window.toast) window.toast('Reaction: ' + emoji, 'success');
}

export function bindContextMenuActions() {
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

// ─── Input Handlers ──────────────────────────────────────────────

export function autoResize(textarea) {
  textarea.style.height = '42px';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

export function handleKeydown(event) {
  if (event.key !== 'Enter') return;
  if (event.shiftKey) return;

  if ($.translatePreview) {
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

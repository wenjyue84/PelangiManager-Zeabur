// ═══════════════════════════════════════════════════════════════════
// Real Chat Messaging - Translation, send/reply, input, file attachment
// ═══════════════════════════════════════════════════════════════════

import { $, translationHelper } from './real-chat-state.js';

const api = window.api;

// ─── Translation Mode ────────────────────────────────────────────

export function toggleTranslateMode() {
  translationHelper.toggleTranslate();
  const btn = document.getElementById('rc-translate-toggle');
  if (btn) {
    btn.textContent = translationHelper.mode ? '🌐 Translate ✓' : '🌐 Translate';
  }
}

export function handleLangChange() {
  translationHelper.handleLangChange();
}

export function onInputChange() {
  translationHelper.onInputTranslate();
}

// ─── Translation Modal ──────────────────────────────────────────

export function showTranslateModal() {
  if (!$.pendingTranslation) return;

  const modal = document.getElementById('rc-translate-modal');
  const originalEl = document.getElementById('rc-translate-original');
  const translatedEl = document.getElementById('rc-translate-translated');
  const langEl = document.getElementById('rc-translate-lang-name');

  originalEl.textContent = $.pendingTranslation.original;
  translatedEl.textContent = $.pendingTranslation.translated;
  langEl.textContent = $.pendingTranslation.targetLang.toUpperCase();

  modal.style.display = 'flex';
}

export function closeTranslateModal() {
  const modal = document.getElementById('rc-translate-modal');
  modal.style.display = 'none';
  $.pendingTranslation = null;

  const btn = document.getElementById('rc-send-btn');
  btn.disabled = false;

  const input = document.getElementById('rc-input-box');
  input.focus();
}

export async function confirmTranslation() {
  if (!$.pendingTranslation || !$.activePhone) {
    closeTranslateModal();
    return;
  }

  const modal = document.getElementById('rc-translate-modal');
  const confirmBtn = modal.querySelector('.rc-translate-btn.send');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Sending...';

  try {
    const log = $.conversations.find(c => c.phone === $.activePhone);
    const instanceId = log?.instanceId;

    await api('/conversations/' + encodeURIComponent($.activePhone) + '/send', {
      method: 'POST',
      body: { message: $.pendingTranslation.translated, instanceId }
    });

    const input = document.getElementById('rc-input-box');
    input.value = '';
    input.style.height = '40px';

    closeTranslateModal();
    await refreshActiveChat();
  } catch (err) {
    alert('Failed to send message: ' + (err.message || 'Unknown error'));
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Send';
  }
}

// ─── Send Messages ───────────────────────────────────────────────

export async function sendManualReply() {
  if (!$.activePhone) return;
  const input = document.getElementById('rc-input-box');
  const message = input.value.trim();

  if ($.selectedFile) {
    await sendRcMedia();
    return;
  }

  if (!message) return;

  const btn = document.getElementById('rc-send-btn');
  btn.disabled = true;

  try {
    let messageToSend = message;
    if (translationHelper.preview) {
      const translatedMsg = translationHelper.getMessageToSend(false);
      if (translatedMsg) {
        messageToSend = translatedMsg.text;
      }
    }

    const log = $.conversations.find(c => c.phone === $.activePhone);
    const instanceId = log?.instanceId;

    await api('/conversations/' + encodeURIComponent($.activePhone) + '/send', {
      method: 'POST',
      body: { message: messageToSend, instanceId }
    });

    translationHelper.clearAfterSend();
    await refreshActiveChat();
  } catch (err) {
    alert('Failed to send message: ' + (err.message || 'Unknown error'));
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

export async function sendOriginalMessage() {
  if (!$.activePhone || !translationHelper.preview) return;

  const input = document.getElementById('rc-input-box');
  const btn = document.getElementById('rc-send-btn');
  btn.disabled = true;

  try {
    const originalMsg = translationHelper.getMessageToSend(true);
    if (!originalMsg) return;

    const log = $.conversations.find(c => c.phone === $.activePhone);
    const instanceId = log?.instanceId;

    await api('/conversations/' + encodeURIComponent($.activePhone) + '/send', {
      method: 'POST',
      body: { message: originalMsg.text, instanceId }
    });

    translationHelper.clearAfterSend();
    await refreshActiveChat();
  } catch (err) {
    alert('Failed to send message: ' + (err.message || 'Unknown error'));
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

export async function refreshActiveChat() {
  if (!$.activePhone) return;
  try {
    const log = await api('/conversations/' + encodeURIComponent($.activePhone));
    // Dynamic import to avoid circular dependency at top level
    const { renderChatView } = await import('./real-chat-core.js');
    renderChatView(log);
  } catch { }
}

// ─── Input Handlers ──────────────────────────────────────────────

export function autoResizeInput(textarea) {
  textarea.style.height = '40px';
  textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  onInputChange();
}

export function handleInputKeydown(event) {
  if (event.key !== 'Enter') return;
  if (event.shiftKey) return;

  if (translationHelper.preview) {
    event.preventDefault();
    if (event.ctrlKey) {
      sendOriginalMessage();
    } else {
      sendManualReply();
    }
    return;
  }

  if (!event.ctrlKey) {
    event.preventDefault();
    sendManualReply();
  }
}

// ─── File Attachment ─────────────────────────────────────────────

export function toggleRcAttachMenu() {
  const menu = document.getElementById('rc-attach-menu');
  if (!menu) return;
  const isVisible = menu.style.display !== 'none';
  menu.style.display = isVisible ? 'none' : '';
}

export function pickRcFile(type) {
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

export function rcFileSelected(inputEl, type) {
  if (!inputEl.files || !inputEl.files[0]) return;
  const file = inputEl.files[0];

  if (file.size > 16 * 1024 * 1024) {
    alert('File too large. Maximum size is 16 MB.');
    inputEl.value = '';
    return;
  }

  $.selectedFile = { file: file, type: type };
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

export function clearRcFile() {
  $.selectedFile = null;
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
  if (!$.activePhone || !$.selectedFile) return;

  const btn = document.getElementById('rc-send-btn');
  btn.disabled = true;

  const caption = (document.getElementById('rc-file-caption')?.value || '').trim();
  const log = $.conversations.find(c => c.phone === $.activePhone);
  const instanceId = log ? log.instanceId : '';

  const formData = new FormData();
  formData.append('file', $.selectedFile.file);
  formData.append('caption', caption);
  formData.append('instanceId', instanceId || '');

  try {
    const response = await fetch((typeof window !== 'undefined' ? window.API : '') + '/conversations/' + encodeURIComponent($.activePhone) + '/send-media', {
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

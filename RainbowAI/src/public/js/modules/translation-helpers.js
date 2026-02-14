/**
 * Translation Helpers Module
 * Handles multi-language translation for quick replies and inline edit panels
 */

import { api, toast } from '../core/utils.js';

/**
 * Translate quick reply fields (EN, MS, ZH)
 * Called from quick reply edit forms
 * @param {string} enId - Element ID for English field
 * @param {string} msId - Element ID for Malay field
 * @param {string} zhId - Element ID for Chinese field
 */
export async function translateQuickReplyFields(enId, msId, zhId) {
  const enEl = document.getElementById(enId);
  const msEl = document.getElementById(msId);
  const zhEl = document.getElementById(zhId);
  if (!enEl || !msEl || !zhEl) return;
  const en = (enEl.value || '').trim();
  const ms = (msEl.value || '').trim();
  const zh = (zhEl.value || '').trim();
  if (!en && !ms && !zh) {
    toast('Fill in at least one language (EN, MS, or ZH) to translate', 'error');
    return;
  }
  const btn = event && event.target ? event.target : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Translating...'; }
  try {
    const result = await api('/knowledge/translate', { method: 'POST', body: { en, ms, zh } });
    if (result.en !== undefined) enEl.value = result.en;
    if (result.ms !== undefined) msEl.value = result.ms;
    if (result.zh !== undefined) zhEl.value = result.zh;
    toast('Translation done. Uses same model as LLM reply.');
  } catch (e) {
    toast(e.message || 'Translation failed', 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Translate'; }
}

/**
 * Translate in Chat Simulator inline edit panel
 * Panel has textareas with data-lang="en|ms|zh" attributes
 * @param {string} editId - ID of the edit panel container
 */
export async function translateInlineEditPanel(editId) {
  const panel = document.getElementById(editId);
  if (!panel) return;
  const enEl = panel.querySelector('[data-lang="en"]');
  const msEl = panel.querySelector('[data-lang="ms"]');
  const zhEl = panel.querySelector('[data-lang="zh"]');
  if (!enEl || !msEl || !zhEl) return;
  const en = (enEl.value || '').trim();
  const ms = (msEl.value || '').trim();
  const zh = (zhEl.value || '').trim();
  if (!en && !ms && !zh) {
    toast('Fill in at least one language (EN, MS, or ZH) to translate', 'error');
    return;
  }
  const btn = event && event.target ? event.target : null;
  if (btn) { btn.disabled = true; btn.textContent = 'Translating...'; }
  try {
    const result = await api('/knowledge/translate', { method: 'POST', body: { en, ms, zh } });
    if (result.en !== undefined) enEl.value = result.en;
    if (result.ms !== undefined) msEl.value = result.ms;
    if (result.zh !== undefined) zhEl.value = result.zh;
    toast('Translation done. Uses same model as LLM reply.');
  } catch (e) {
    toast(e.message || 'Translation failed', 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Translate'; }
}

/**
 * Inline Edit Module
 * Provides inline editing functionality for knowledge base quick replies and workflow steps
 */

import { api, toast } from '../core/utils.js';

/**
 * Toggle visibility of an inline edit panel
 * @param {string} editId - Element ID of the edit panel
 */
export function toggleInlineEdit(editId) {
  const panel = document.getElementById(editId);
  if (!panel) return;
  panel.classList.toggle('hidden');
  // Auto-focus the first textarea when opening
  if (!panel.classList.contains('hidden')) {
    const firstTextarea = panel.querySelector('textarea');
    if (firstTextarea) firstTextarea.focus();
  }
}

/**
 * Save inline edit — routes to the correct API based on editMeta.type
 * @param {string} editId - Element ID of the edit panel
 */
export async function saveInlineEdit(editId) {
  const panel = document.getElementById(editId);
  if (!panel) return;

  let meta;
  try {
    meta = JSON.parse(panel.dataset.editMeta);
  } catch { toast('Invalid edit metadata', 'error'); return; }

  const en = panel.querySelector('[data-lang="en"]')?.value || '';
  const ms = panel.querySelector('[data-lang="ms"]')?.value || '';
  const zh = panel.querySelector('[data-lang="zh"]')?.value || '';

  // Find save button and show loading state
  const saveBtn = panel.querySelector('button');
  const originalText = saveBtn?.textContent;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

  try {
    if (meta.type === 'knowledge') {
      await api(`/knowledge/${encodeURIComponent(meta.intent)}`, {
        method: 'PUT',
        body: { response: { en, ms, zh } }
      });
      toast(`Quick Reply "${meta.intent}" updated`, 'success');

    } else if (meta.type === 'workflow') {
      await api(`/workflows/${encodeURIComponent(meta.workflowId)}/steps/${encodeURIComponent(meta.stepId)}`, {
        method: 'PATCH',
        body: { message: { en, ms, zh } }
      });
      toast(`Workflow step updated (${meta.workflowName || meta.workflowId})`, 'success');

    } else if (meta.type === 'intent-example') {
      await api(`/intent-examples/${encodeURIComponent(meta.intent)}`, {
        method: 'PATCH',
        body: { oldExample: meta.oldExample, newExample: { en, ms, zh } }
      });
      toast(`Intent example updated for "${meta.intent}"`, 'success');
      window.location.reload(); // Reload to refresh examples list

    } else {
      toast('Unknown edit type', 'error');
      return;
    }

    // Update the panel's metadata (in case we need it later)
    meta.response = { en, ms, zh };
    panel.dataset.editMeta = JSON.stringify(meta);

    // Collapse the edit panel
    panel.classList.add('hidden');

  } catch (err) {
    toast(`Failed to save: ${err.message || 'Unknown error'}`, 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalText; }
  }
}

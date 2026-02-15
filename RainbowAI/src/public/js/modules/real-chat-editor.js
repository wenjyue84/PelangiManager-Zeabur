// ═══════════════════════════════════════════════════════════════════
// Real Chat Editor - Edit modals, training examples
// ═══════════════════════════════════════════════════════════════════

import { $ } from './real-chat-state.js';

const api = window.api;

const RC_EDIT_LONG_THRESHOLD = 300;

// ─── Edit Response Modal ─────────────────────────────────────────

export async function openRcEditModal(msgIndex) {
  if (!$.lastLog || !$.lastLog.messages[msgIndex]) return;
  const msg = $.lastLog.messages[msgIndex];
  if (msg.role !== 'assistant' || msg.manual) return;

  const isStatic = msg.routedAction === 'static_reply' && msg.intent;
  const isWorkflow = msg.routedAction === 'workflow' && msg.workflowId && msg.stepId;
  if (!isStatic && !isWorkflow) return;

  const formEl = document.getElementById('rc-edit-form');
  const saveBtnsEl = document.getElementById('rc-edit-save-buttons');
  const modal = document.getElementById('rc-edit-modal');
  if (!formEl || !saveBtnsEl || !modal) return;

  formEl.innerHTML = '<div class="text-sm text-neutral-500">Loading…</div>';
  saveBtnsEl.innerHTML = '';
  modal.style.display = 'flex';

  let languages = { en: msg.content || '', ms: '', zh: '' };
  let templateLangs = null;
  let workflowName = '';
  let stepIndex = 0;

  try {
    if (isStatic) {
      const [knowledge, templates] = await Promise.all([
        api('/knowledge'),
        api('/templates')
      ]);
      const staticEntry = (knowledge.static || []).find(e => e.intent === msg.intent);
      if (staticEntry && staticEntry.response) {
        languages = {
          en: staticEntry.response.en || '',
          ms: staticEntry.response.ms || '',
          zh: staticEntry.response.zh || ''
        };
      }
      const tmpl = templates && templates[msg.intent];
      if (tmpl) {
        templateLangs = { en: tmpl.en || '', ms: tmpl.ms || '', zh: tmpl.zh || '' };
      }
    } else if (isWorkflow) {
      const wfData = await api('/workflows');
      const workflow = (wfData.workflows || []).find(w => w.id === msg.workflowId);
      if (workflow) {
        workflowName = workflow.name || msg.workflowId;
        const step = (workflow.steps || []).find(s => s.id === msg.stepId);
        if (step && step.message) {
          stepIndex = workflow.steps.indexOf(step) + 1;
          languages = {
            en: step.message.en || '',
            ms: step.message.ms || '',
            zh: step.message.zh || ''
          };
        }
      }
    }
  } catch (err) {
    formEl.innerHTML = '<div class="text-sm text-red-600">Failed to load: ' + escapeHtml(err.message) + '</div>';
    return;
  }

  const isLong = msg.content && msg.content.length > RC_EDIT_LONG_THRESHOLD;

  window._rcEditState = {
    msgIndex,
    isStatic,
    isWorkflow,
    intent: msg.intent,
    workflowId: msg.workflowId,
    stepId: msg.stepId,
    templateKey: msg.intent,
    isLong,
    templateLangs,
    currentStaticLangs: isStatic ? { en: languages.en, ms: languages.ms, zh: languages.zh } : null,
    currentWorkflowLangs: isWorkflow ? { en: languages.en, ms: languages.ms, zh: languages.zh } : null
  };

  if (isLong) {
    formEl.innerHTML =
      '<p class="text-xs text-neutral-500 mb-2">Message is long. Edit below and save to update the response template (the message already sent cannot be changed).</p>' +
      '<textarea id="rc-edit-single" class="w-full border border-neutral-300 rounded-lg p-3 text-sm resize-y" rows="8" placeholder="Response text">' +
      escapeHtml(languages.en) +
      '</textarea>';
  } else {
    formEl.innerHTML =
      '<div class="space-y-2">' +
      '<div><label class="text-xs text-neutral-500 font-medium">English</label><textarea id="rc-edit-en" class="w-full border border-neutral-300 rounded-lg p-2 text-sm resize-y" rows="3">' + escapeHtml(languages.en) + '</textarea></div>' +
      '<div><label class="text-xs text-neutral-500 font-medium">Malay</label><textarea id="rc-edit-ms" class="w-full border border-neutral-300 rounded-lg p-2 text-sm resize-y" rows="2">' + escapeHtml(languages.ms) + '</textarea></div>' +
      '<div><label class="text-xs text-neutral-500 font-medium">Chinese</label><textarea id="rc-edit-zh" class="w-full border border-neutral-300 rounded-lg p-2 text-sm resize-y" rows="2">' + escapeHtml(languages.zh) + '</textarea></div>' +
      '</div>';
  }

  let saveButtons = '';
  if (isStatic) {
    saveButtons += '<button type="button" class="rc-translate-btn send" onclick="saveRcEdit(\'static_reply\')">Save to Static Reply</button>';
    if (templateLangs) saveButtons += ' <button type="button" class="rc-translate-btn send" style="background:#0ea5e9" onclick="saveRcEdit(\'template\')">Save to System Message</button>';
  }
  if (isWorkflow) {
    saveButtons += '<button type="button" class="rc-translate-btn send" style="background:#6366f1" onclick="saveRcEdit(\'workflow\')">Save to Workflow Step</button>';
  }
  saveBtnsEl.innerHTML = saveButtons;
}

export function closeRcEditModal() {
  const modal = document.getElementById('rc-edit-modal');
  if (modal) modal.style.display = 'none';
  window._rcEditState = null;
}

export async function saveRcEdit(target) {
  const state = window._rcEditState;
  if (!state) return;

  let en, ms, zh;
  if (state.isLong) {
    const single = document.getElementById('rc-edit-single');
    en = single ? single.value.trim() : '';
    if (target === 'static_reply' && state.currentStaticLangs) {
      ms = state.currentStaticLangs.ms || '';
      zh = state.currentStaticLangs.zh || '';
    } else if (target === 'template' && state.templateLangs) {
      ms = state.templateLangs.ms || '';
      zh = state.templateLangs.zh || '';
    } else if (target === 'workflow' && state.currentWorkflowLangs) {
      ms = state.currentWorkflowLangs.ms || '';
      zh = state.currentWorkflowLangs.zh || '';
    } else {
      ms = '';
      zh = '';
    }
  } else {
    en = (document.getElementById('rc-edit-en') && document.getElementById('rc-edit-en').value) || '';
    ms = (document.getElementById('rc-edit-ms') && document.getElementById('rc-edit-ms').value) || '';
    zh = (document.getElementById('rc-edit-zh') && document.getElementById('rc-edit-zh').value) || '';
  }

  const toast = window.toast;
  try {
    if (target === 'static_reply' && state.isStatic) {
      await api('/knowledge/' + encodeURIComponent(state.intent), {
        method: 'PUT',
        body: { response: { en, ms, zh } }
      });
      if (toast) toast('Static reply "' + state.intent + '" updated', 'success');
    } else if (target === 'template' && state.isStatic && state.templateKey) {
      await api('/templates/' + encodeURIComponent(state.templateKey), {
        method: 'PUT',
        body: { en, ms, zh }
      });
      if (toast) toast('System message "' + state.templateKey + '" updated', 'success');
    } else if (target === 'workflow' && state.isWorkflow) {
      await api('/workflows/' + encodeURIComponent(state.workflowId) + '/steps/' + encodeURIComponent(state.stepId), {
        method: 'PATCH',
        body: { message: { en, ms, zh } }
      });
      if (toast) toast('Workflow step updated', 'success');
    }
    closeRcEditModal();
  } catch (err) {
    if (toast) toast('Failed to save: ' + (err.message || 'Unknown error'), 'error');
    else alert('Failed to save: ' + err.message);
  }
}

// ─── Add to Training Example Modal ───────────────────────────────

export async function openAddToTrainingExampleModal(msgIndex) {
  if (!$.lastLog || !$.lastLog.messages[msgIndex]) return;
  const msg = $.lastLog.messages[msgIndex];
  if (msg.role !== 'user') return;

  const modal = document.getElementById('rc-add-example-modal');
  const textEl = document.getElementById('rc-add-example-text');
  const selectEl = document.getElementById('rc-add-example-intent');
  const btnEl = document.getElementById('rc-add-example-btn');
  if (!modal || !textEl || !selectEl || !btnEl) return;

  $.addExampleText = (msg.content || '').trim();
  if (!$.addExampleText) return;

  textEl.textContent = $.addExampleText;
  selectEl.innerHTML = '<option value="">Loading intents…</option>';
  modal.style.display = 'flex';

  let suggestedIntent = '';
  const nextMsg = $.lastLog.messages[msgIndex + 1];
  if (nextMsg && nextMsg.role === 'assistant' && nextMsg.intent) {
    suggestedIntent = nextMsg.intent;
  }

  try {
    const data = await api('/intent-manager/examples');
    const intents = (data && data.intents) ? data.intents : [];
    selectEl.innerHTML = intents.length === 0
      ? '<option value="">No intents in examples</option>'
      : intents.map(function (i) {
        const intent = i.intent || '';
        const selected = intent === suggestedIntent ? ' selected' : '';
        return '<option value="' + escapeAttr(intent) + '"' + selected + '>' + escapeHtml(intent) + '</option>';
      }).join('');
    if (suggestedIntent && !intents.some(function (i) { return i.intent === suggestedIntent; })) {
      selectEl.selectedIndex = 0;
    }
  } catch (err) {
    selectEl.innerHTML = '<option value="">Failed to load intents</option>';
    console.error('[RealChat] Failed to load examples:', err);
  }
}

export function closeAddToTrainingExampleModal() {
  const modal = document.getElementById('rc-add-example-modal');
  if (modal) modal.style.display = 'none';
  $.addExampleText = '';
}

export async function confirmAddToTrainingExample() {
  const selectEl = document.getElementById('rc-add-example-intent');
  const btnEl = document.getElementById('rc-add-example-btn');
  if (!selectEl || !btnEl || !$.addExampleText) return;

  const intent = (selectEl.value || '').trim();
  if (!intent) {
    if (window.toast) window.toast('Select an intent', 'error');
    else alert('Select an intent');
    return;
  }

  btnEl.disabled = true;
  btnEl.textContent = 'Saving…';

  const toast = window.toast;
  try {
    const data = await api('/intent-manager/examples');
    const intents = (data && data.intents) ? data.intents : [];
    const intentData = intents.find(function (i) { return i.intent === intent; });
    if (!intentData) {
      if (toast) toast('Intent not found', 'error');
      else alert('Intent not found');
      btnEl.disabled = false;
      btnEl.textContent = 'Add to Training Examples';
      return;
    }

    let payload;
    if (Array.isArray(intentData.examples)) {
      const examples = intentData.examples.slice();
      if (examples.includes($.addExampleText)) {
        if (toast) toast('Example already exists for this intent', 'warning');
        else alert('Example already exists for this intent');
        btnEl.disabled = false;
        btnEl.textContent = 'Add to Training Examples';
        return;
      }
      examples.push($.addExampleText);
      payload = { examples };
    } else if (intentData.examples && typeof intentData.examples === 'object') {
      const flat = Object.values(intentData.examples).flat();
      if (flat.includes($.addExampleText)) {
        if (toast) toast('Example already exists for this intent', 'warning');
        else alert('Example already exists for this intent');
        btnEl.disabled = false;
        btnEl.textContent = 'Add to Training Examples';
        return;
      }
      const updated = { ...intentData.examples };
      if (!updated.en) updated.en = [];
      updated.en.push($.addExampleText);
      payload = { examples: updated };
    } else {
      payload = { examples: [$.addExampleText] };
    }

    await api('/intent-manager/examples/' + encodeURIComponent(intent), {
      method: 'PUT',
      body: payload
    });

    if (toast) toast('Added to training examples. Restart server to reload semantic matcher.', 'success');
    else alert('Added to training examples. Restart server to reload semantic matcher.');
    closeAddToTrainingExampleModal();
  } catch (err) {
    if (toast) toast('Failed to save: ' + (err.message || 'Unknown error'), 'error');
    else alert('Failed to save: ' + err.message);
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = 'Add to Training Examples';
  }
}

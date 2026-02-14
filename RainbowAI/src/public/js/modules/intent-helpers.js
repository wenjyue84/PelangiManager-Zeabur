/**
 * Intent Management Helpers Module
 * Handles intent CRUD operations and classifier testing
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';
import { getCachedWorkflows, getCachedRouting, getCachedKnowledge, loadIntents } from './intents.js';

// Use global closeModal function
const closeModal = window.closeModal || ((id) => document.getElementById(id)?.classList.add('hidden'));

/**
 * Show the "Add Intent" modal
 * Populates workflow dropdown with available workflows
 */
export function showAddIntent() {
  document.getElementById('add-intent-modal').classList.remove('hidden');
  document.getElementById('add-i-category').value = '';
  document.getElementById('add-i-patterns').value = '';
  document.getElementById('add-i-routing').value = 'llm_reply';
  document.getElementById('add-i-workflow-picker').classList.add('hidden');

  // Populate workflow options
  const sel = document.getElementById('add-i-workflow-id');
  const workflows = getCachedWorkflows()?.workflows || [];
  sel.innerHTML = workflows.map(w =>
    `<option value="${esc(w.id)}">${esc(w.name)}</option>`
  ).join('');

  document.getElementById('add-i-category').focus();
}

/**
 * Handle routing action change in "Add Intent" form
 * Shows/hides workflow picker based on selected action
 * @param {string} value - Selected routing action ('workflow', 'llm_reply', 'static_reply')
 */
export function onAddIntentRoutingChange(value) {
  const picker = document.getElementById('add-i-workflow-picker');

  if (value === 'workflow') {
    picker.classList.remove('hidden');
    // Populate workflow options
    const sel = document.getElementById('add-i-workflow-id');
    const workflows = getCachedWorkflows()?.workflows || [];
    sel.innerHTML = workflows.map(w =>
      `<option value="${esc(w.id)}">${esc(w.name)}</option>`
    ).join('');
  } else {
    picker.classList.add('hidden');
  }
}

/**
 * Submit the "Add Intent" form
 * Creates intent in intents.json and routing rule in routing.json
 * @param {Event} e - Form submit event
 */
export async function submitAddIntent(e) {
  e.preventDefault();

  const category = document.getElementById('add-i-category').value.trim().toLowerCase().replace(/\s+/g, '_');
  const routingAction = document.getElementById('add-i-routing').value;
  const patternsText = document.getElementById('add-i-patterns').value;
  const patterns = patternsText ? patternsText.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const enabled = document.getElementById('add-i-enabled').checked;

  try {
    // Create intent
    await api('/intents', { method: 'POST', body: { category, patterns, flags: 'i', enabled } });

    // Create routing rule
    const routingBody = { action: routingAction };
    if (routingAction === 'workflow') {
      routingBody.workflow_id = document.getElementById('add-i-workflow-id').value;
    }
    await api('/routing/' + encodeURIComponent(category), { method: 'PATCH', body: routingBody });

    toast('Intent added: ' + category);
    closeModal('add-intent-modal');
    loadIntents();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Test the intent classifier with a sample message
 * Displays detection method, confidence, intent, and routed action
 */
export async function testClassifier() {
  const input = document.getElementById('test-input');
  const msg = input.value.trim();
  if (!msg) return;

  const resultEl = document.getElementById('test-result');
  resultEl.classList.remove('hidden');
  document.getElementById('test-response').textContent = 'Thinking...';
  document.getElementById('test-intent').textContent = '...';
  document.getElementById('test-source').textContent = '...';
  document.getElementById('test-action').textContent = '...';
  document.getElementById('test-routed').textContent = '...';
  document.getElementById('test-confidence').textContent = '...';

  try {
    const d = await api('/intents/test', { method: 'POST', body: { message: msg } });
    document.getElementById('test-intent').textContent = d.intent || 'unknown';

    // Display detection method with icon and color
    const sourceEl = document.getElementById('test-source');
    const sourceIcons = {
      'regex': '🚨 Priority Keywords',
      'fuzzy': '⚡ Smart Matching',
      'semantic': '📚 Learning Examples',
      'llm': '🤖 AI Fallback'
    };
    const sourceColors = {
      'regex': 'text-red-600',
      'fuzzy': 'text-yellow-600',
      'semantic': 'text-purple-600',
      'llm': 'text-blue-600'
    };
    sourceEl.textContent = sourceIcons[d.source] || d.source;
    sourceEl.className = 'font-medium ' + (sourceColors[d.source] || 'text-neutral-600');

    document.getElementById('test-action').textContent = d.action || 'reply';

    // Show the actual routed action
    const cachedRouting = getCachedRouting();
    const routedAction = cachedRouting?.[d.intent]?.action || d.action;
    document.getElementById('test-routed').textContent = routedAction;

    const conf = typeof d.confidence === 'number' ? (d.confidence * 100).toFixed(0) + '%' : '?';
    document.getElementById('test-confidence').textContent = conf;

    // Display response preview
    if (routedAction === 'static_reply') {
      const cachedKnowledge = getCachedKnowledge();
      const staticEntry = cachedKnowledge?.static?.find(e => e.intent === d.intent);
      document.getElementById('test-response').textContent = staticEntry
        ? '[STATIC] ' + (staticEntry.response?.en || '(empty)')
        : '[STATIC] (no static reply configured — would fall back to LLM)';
    } else {
      document.getElementById('test-response').textContent = d.response || '(empty)';
    }
  } catch (e) {
    document.getElementById('test-response').textContent = 'Error: ' + e.message;
  }
}

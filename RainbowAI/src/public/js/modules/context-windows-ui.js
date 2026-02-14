import { api } from '../api.js';
import { toast } from '../toast.js';

const DEFAULTS = { classify: 5, reply: 10, combined: 20 };

/**
 * Render the Context Windows configuration card HTML.
 * @param {{ classify: number, reply: number, combined: number }} cw - Current context window values
 * @returns {string} HTML string
 */
export function renderContextWindowsCard(cw) {
  const vals = cw || DEFAULTS;
  return '<div class="bg-white border rounded-2xl p-6 mt-6">'
    + '<div class="flex items-start justify-between mb-4">'
    + '<div>'
    + '<h3 class="font-semibold text-lg">Context Windows</h3>'
    + '<p class="text-sm text-neutral-500 font-medium">How many conversation messages the LLM reads for each operation. Lower = faster/cheaper, higher = more context.</p>'
    + '</div>'
    + '</div>'
    + '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">'
    + renderInput('cw-classify', 'Classification', vals.classify,
        'T4 intent detection + workflow eval',
        'How many past messages the LLM sees when deciding what the guest is asking about (e.g. pricing, wifi, complaint). Lower is faster — intent detection rarely needs deep history. Used by: classifyIntent, classifyOnly, evaluateWorkflowStep')
    + renderInput('cw-reply', 'Reply Generation', vals.reply,
        'Reply-only after fast-tier classify',
        'How many past messages the LLM sees when writing a reply after the intent is already known from a fast tier (regex/fuzzy/semantic). Needs more context than classification for conversational continuity. Used by: generateReplyOnly')
    + renderInput('cw-combined', 'Combined', vals.combined,
        'Classify + reply in one LLM call',
        'How many past messages the LLM sees when it must both figure out the intent AND write a reply in a single call. This happens when all fast tiers (T1-T3) fail. Needs the most context since it does double duty. Used by: classifyAndRespond, chat, smartFallback')
    + '</div>'
    + '<div class="flex items-center gap-3 mt-4">'
    + '<button type="button" onclick="saveContextWindows()" class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl transition">Save</button>'
    + '<button type="button" onclick="resetContextWindows()" class="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition">Reset Defaults</button>'
    + '<span id="cw-status" class="text-xs text-neutral-400 ml-2"></span>'
    + '</div>'
    + '</div>';
}

function renderInput(id, label, value, hint, tooltip) {
  return '<div>'
    + '<label for="' + id + '" class="flex items-center gap-1.5 text-sm font-medium text-neutral-700 mb-1">'
    + label
    + '<span class="relative group cursor-help">'
    + '<svg class="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
    + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    + '</svg>'
    + '<span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-800 text-white text-[11px] leading-relaxed rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">'
    + tooltip
    + '<span class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800"></span>'
    + '</span>'
    + '</span>'
    + '</label>'
    + '<input type="number" id="' + id + '" value="' + value + '" min="1" max="50" step="1"'
    + ' class="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition" />'
    + '<p class="text-[11px] text-neutral-400 mt-1">' + hint + '</p>'
    + '</div>';
}

function readInputs() {
  var classify = parseInt(document.getElementById('cw-classify').value, 10);
  var reply = parseInt(document.getElementById('cw-reply').value, 10);
  var combined = parseInt(document.getElementById('cw-combined').value, 10);
  return { classify: classify, reply: reply, combined: combined };
}

function validate(cw) {
  for (var key of ['classify', 'reply', 'combined']) {
    var v = cw[key];
    if (!Number.isInteger(v) || v < 1 || v > 50) {
      return key + ' must be an integer between 1 and 50';
    }
  }
  return null;
}

export async function saveContextWindows() {
  var cw = readInputs();
  var err = validate(cw);
  if (err) { toast(err, 'error'); return; }

  try {
    // Fetch current settings, merge contextWindows, then PUT
    var current = await api('/intent-manager/llm-settings');
    current.contextWindows = cw;
    await api('/intent-manager/llm-settings', { method: 'PUT', body: current });
    toast('Context windows saved!', 'success');
    var statusEl = document.getElementById('cw-status');
    if (statusEl) statusEl.textContent = 'Saved';
  } catch (e) {
    toast('Failed to save context windows: ' + e.message, 'error');
  }
}
window.saveContextWindows = saveContextWindows;

export async function resetContextWindows() {
  document.getElementById('cw-classify').value = DEFAULTS.classify;
  document.getElementById('cw-reply').value = DEFAULTS.reply;
  document.getElementById('cw-combined').value = DEFAULTS.combined;
  await saveContextWindows();
}
window.resetContextWindows = resetContextWindows;

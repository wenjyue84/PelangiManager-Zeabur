/**
 * settings-ai-models.js — AI Models tab for Settings page
 * (Single Responsibility: AI provider rendering, drag/drop, speed testing, diagnostics)
 *
 * Extracted from settings.js (SRP Phase 6).
 */
import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';
import { renderContextWindowsCard } from './context-windows-ui.js';

/**
 * Module-private state
 */
let testSession = {
  active: false,
  total: 0,
  completed: 0,
  errors: []
};

let draggedProviderId = null;

/**
 * Shared state accessors — injected by settings.js coordinator
 */
let _getSettingsData = () => null;
let _setSettingsData = () => {};

export function initAiModelsState(getter, setter) {
  _getSettingsData = getter;
  _setSettingsData = setter;
}

// ─── Main Renderer ─────────────────────────────────────────────────

export function renderAiModelsTab(container) {
  const settingsData = _getSettingsData();
  const providers = (settingsData.ai?.providers || []).sort((a, b) => a.priority - b.priority);

  const descriptions = {
    'groq-llama': 'Ultra-fast, open-source model optimized for speed. Best for quick chat interactions.',
    'openai-gpt4o': 'High intelligence, reasoning, and instruction following. Best for complex queries.',
    'deepseek-r1': 'Powerful open-weights model with strong reasoning capabilities.',
    'google-gemini': 'Google\'s multimodal model with large context window.',
    'anthropic-claude': 'Excel at nuanced conversation and coding tasks.'
  };

  container.innerHTML = `
    <div class="bg-white border rounded-2xl p-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="font-semibold text-lg">AI Models</h3>
          <p class="text-sm text-neutral-500 font-medium">Rainbow uses these models to generate responses when no pre-written reply is found. Enable multiple to create a robust fallback chain.</p>
        </div>
      </div>

      <div id="ai-providers-list" class="space-y-3">
        ${providers.map((p, index) => {
    const isDefault = p.priority === 0;
    return `
          <div
            class="provider-card border rounded-2xl p-4 hover:border-primary-200 transition-colors bg-neutral-50/50 cursor-move relative group"
            draggable="true"
            data-provider-id="${esc(p.id)}"
            ondragstart="handleProviderDragStart(event)"
            ondragover="handleProviderDragOver(event)"
            ondrop="handleProviderDrop(event)"
            ondragend="handleProviderDragEnd(event)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-4 flex-1">
                <div class="w-12 h-12 rounded-2xl bg-white border shadow-soft flex items-center justify-center font-bold text-lg text-primary-500 flex-shrink-0 mt-1">
                  ${p.name.charAt(0)}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-neutral-800">${esc(p.name)}</span>
                    <span class="text-[10px] font-mono bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded uppercase tracking-wider">${esc(p.id)}</span>
                    ${isDefault ? `
                      <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border border-amber-200 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.227-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        Default
                      </span>
                    ` : ''}
                  </div>
                  <p class="text-xs text-neutral-500 mt-1 leading-relaxed max-w-lg">
                    ${descriptions[p.id] || p.description || 'General purpose AI model.'}
                  </p>
                  <div class="flex items-center gap-3 mt-2 flex-wrap">
                    <span class="text-xs ${p.available ? 'text-success-600' : 'text-danger-500'} font-medium bg-white px-2 py-0.5 rounded border border-neutral-100 shadow-sm inline-flex items-center gap-1">
                      ${p.available ? '✓ Ready' : '✗ Missing Key'}
                    </span>
                    ${!p.available ? `
                    <button type="button" onclick="troubleshootProvider('${esc(p.id)}', this)" class="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2 py-0.5 rounded transition inline-flex items-center gap-1 font-medium">
                      Troubleshoot
                    </button>
                    ` : ''}
                    <span id="latency-${p.id}" class="text-xs text-neutral-400 font-mono hidden"></span>

                    <span class="text-[10px] text-neutral-400 font-medium bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                      Priority ${p.priority + 1}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex flex-col items-end gap-3 flex-shrink-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium ${p.enabled ? 'text-primary-600' : 'text-neutral-400'}">${p.enabled ? 'Active' : 'Off'}</span>
                  <input type="checkbox" class="w-10 h-6 rounded-full border-neutral-300 text-primary-600 focus:ring-primary-500 transition cursor-pointer appearance-none bg-neutral-200 checked:bg-primary-500 relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all checked:after:translate-x-4" ${p.enabled ? 'checked' : ''} onchange="toggleProvider('${esc(p.id)}', this.checked)">
                </div>
                <div class="flex gap-2">
                  ${!isDefault ? `
                    <button onclick="setAsDefaultProvider('${esc(p.id)}')" class="text-[10px] bg-white hover:bg-amber-50 border border-neutral-200 hover:border-amber-200 text-neutral-600 hover:text-amber-700 px-2 py-1 rounded transition flex items-center gap-1 font-medium">
                      Set as Default
                    </button>
                  ` : ''}
                  ${p.available ? `
                    <button onclick="testModelLatency('${esc(p.id)}')" class="text-[10px] bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 px-2 py-1 rounded transition flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      Test Speed
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Drag Handle indicator (visible on hover) -->
            <div class="absolute left[-8px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300 flex flex-col gap-0.5">
              <div class="flex gap-0.5"><span>●</span><span>●</span></div>
              <div class="flex gap-0.5"><span>●</span><span>●</span></div>
              <div class="flex gap-0.5"><span>●</span><span>●</span></div>
            </div>
          </div>
        `;
  }).join('')}
      </div>

      <div class="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex gap-3">
        <span class="text-blue-500 text-xl">💡</span>
        <div class="text-xs text-blue-700 leading-relaxed">
          <p><strong>Note:</strong> Drag and drop models to change their <strong>fallback priority</strong>. The top-most model is used first.</p>
          <p class="mt-1">The <strong>Default</strong> model is the primary choice, while others act as secondary and tertiary fallbacks if the primary is slow or offline.</p>
        </div>
      </div>
    </div>
  `;

  // Append Context Windows card (loads current values from API)
  api('/intent-manager/llm-settings').then(llm => {
    container.insertAdjacentHTML('beforeend', renderContextWindowsCard(llm.contextWindows));
  }).catch(() => {
    container.insertAdjacentHTML('beforeend', renderContextWindowsCard(null));
  });

  // Stagger auto speed tests (one every 600ms) so providers aren't hit concurrently.
  const available = providers.filter(p => p.available);
  testSession = { active: true, total: available.length, completed: 0, errors: [] };
  available.forEach((p, i) => {
    setTimeout(() => testModelLatency(p.id, true), i * 600);
  });
}

// ─── Troubleshoot ──────────────────────────────────────────────────

export async function troubleshootProvider(providerId, btn) {
  const origText = btn?.textContent || 'Troubleshoot';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }
  try {
    const r = await api('/troubleshoot-provider', {
      method: 'POST',
      body: { providerId }
    });
    const msg = r.hint ? `${r.message} ${r.hint}` : r.message;
    if (r.ok) {
      toast(msg, 'success');
      _setSettingsData(await api('/settings'));
      const container = document.getElementById('settings-tab-content');
      if (container && window.activeSettingsTab === 'ai-models') {
        renderAiModelsTab(container);
      }
    } else {
      toast(msg, 'error');
    }
  } catch (e) {
    toast(e.message || 'Troubleshoot failed', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}
window.troubleshootProvider = troubleshootProvider;

// ─── Drag and Drop ─────────────────────────────────────────────────

export function handleProviderDragStart(e) {
  draggedProviderId = e.currentTarget.dataset.providerId;
  e.currentTarget.classList.add('opacity-40', 'border-primary-500', 'border-dashed');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedProviderId);
}
window.handleProviderDragStart = handleProviderDragStart;

export function handleProviderDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if (target.dataset.providerId !== draggedProviderId) {
    target.classList.add('border-primary-300', 'bg-primary-50/30');
  }
}
window.handleProviderDragOver = handleProviderDragOver;

export function handleProviderDragEnd(e) {
  e.currentTarget.classList.remove('opacity-40', 'border-primary-500', 'border-dashed');
  document.querySelectorAll('.provider-card').forEach(c => {
    c.classList.remove('border-primary-300', 'bg-primary-50/30');
  });
}
window.handleProviderDragEnd = handleProviderDragEnd;

export async function handleProviderDrop(e) {
  e.preventDefault();
  const settingsData = _getSettingsData();
  const targetId = e.currentTarget.dataset.providerId;
  if (targetId === draggedProviderId) return;

  const providers = settingsData.ai.providers || [];
  const draggedIdx = providers.findIndex(p => p.id === draggedProviderId);
  const targetIdx = providers.findIndex(p => p.id === targetId);

  if (draggedIdx === -1 || targetIdx === -1) return;

  const [draggedItem] = providers.splice(draggedIdx, 1);
  providers.splice(targetIdx, 0, draggedItem);
  providers.forEach((p, i) => { p.priority = i; });

  renderAiModelsTab(document.getElementById('settings-tab-content'));

  try {
    await api('/settings/providers', {
      method: 'PUT',
      body: providers
    });
    toast('Fallback priority updated');
  } catch (err) {
    toast(err.message, 'error');
    _setSettingsData(await api('/settings'));
    renderAiModelsTab(document.getElementById('settings-tab-content'));
  }
}
window.handleProviderDrop = handleProviderDrop;

// ─── Provider Actions ──────────────────────────────────────────────

export async function setAsDefaultProvider(id) {
  const settingsData = _getSettingsData();
  const providers = settingsData.ai.providers || [];
  const idx = providers.findIndex(p => p.id === id);
  if (idx === -1) return;

  const [item] = providers.splice(idx, 1);
  providers.unshift(item);
  providers.forEach((p, i) => { p.priority = i; });

  renderAiModelsTab(document.getElementById('settings-tab-content'));

  try {
    await api('/settings/providers', {
      method: 'PUT',
      body: providers
    });
    toast(`Model "${item.name}" set as default`);
  } catch (err) {
    toast(err.message, 'error');
    _setSettingsData(await api('/settings'));
    renderAiModelsTab(document.getElementById('settings-tab-content'));
  }
}
window.setAsDefaultProvider = setAsDefaultProvider;

export async function toggleProvider(id, enabled) {
  try {
    await api('/settings/providers/' + id, { method: 'PATCH', body: { enabled } });
    toast(`Model ${id}: ${enabled ? 'enabled' : 'disabled'}`);
    _setSettingsData(await api('/settings'));
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.toggleProvider = toggleProvider;

// ─── Speed Testing ─────────────────────────────────────────────────

export async function testModelLatency(providerId, isAutoTest = false) {
  const latencyBadge = document.getElementById(`latency-${providerId}`);
  if (!latencyBadge) return;

  latencyBadge.classList.remove('hidden', 'text-success-600', 'text-warning-600', 'text-danger-500');
  latencyBadge.classList.add('text-neutral-400', 'animate-pulse');
  latencyBadge.textContent = 'Testing...';

  const startTime = performance.now();
  try {
    await api('/test/llm-latency', {
      method: 'POST',
      body: { providerId }
    });

    const duration = Math.round(performance.now() - startTime);
    latencyBadge.classList.remove('animate-pulse', 'text-neutral-400');

    if (duration < 800) latencyBadge.classList.add('text-success-600');
    else if (duration < 2000) latencyBadge.classList.add('text-warning-600');
    else latencyBadge.classList.add('text-danger-500');

    latencyBadge.textContent = `${duration}ms`;
  } catch (e) {
    latencyBadge.classList.remove('animate-pulse', 'text-neutral-400');
    latencyBadge.classList.add('text-danger-500');
    latencyBadge.textContent = 'Error';

    if (isAutoTest) {
      testSession.errors.push({ id: providerId, error: e.message });
    } else {
      toast(`Test failed: ${e.message}`, 'error');
    }
  } finally {
    if (isAutoTest) {
      testSession.completed++;
      if (testSession.completed === testSession.total && testSession.errors.length > 0) {
        showTestSummaryToast();
        testSession.active = false;
      }
    }
  }
}
window.testModelLatency = testModelLatency;

function showTestSummaryToast() {
  const count = testSession.errors.length;
  const msg = '<div class="flex items-center gap-2">'
    + '<span>⚠️ ' + count + ' model' + (count > 1 ? 's' : '') + ' failed speed test.</span>'
    + '<button onclick="viewDiagnosticDetails()" class="underline font-bold hover:text-white transition">View Details</button>'
    + '</div>';
  toast(msg, 'error', true);
}
window.showTestSummaryToast = showTestSummaryToast;

export function viewDiagnosticDetails() {
  const container = document.getElementById('diagnostic-content');
  const settingsData = _getSettingsData();
  const providers = settingsData.ai?.providers || [];

  container.innerHTML = testSession.errors.map(err => {
    const p = providers.find(x => x.id === err.id);
    return '<div class="p-3 bg-danger-50 border border-danger-100 rounded-xl">'
      + '<div class="flex items-center gap-2 mb-1">'
      + '<span class="font-bold text-danger-700">' + (p ? esc(p.name) : err.id) + '</span>'
      + '<span class="text-[10px] font-mono bg-danger-100 text-danger-700 px-1.5 py-0.5 rounded uppercase">' + esc(err.id) + '</span>'
      + '</div>'
      + '<p class="text-xs text-danger-600 leading-relaxed">' + esc(err.error) + '</p>'
      + '</div>';
  }).join('');

  window.openModal('diagnostic-modal');
}
window.viewDiagnosticDetails = viewDiagnosticDetails;

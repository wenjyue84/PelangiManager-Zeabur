/**
 * Tab Management System
 * Handles tab switching and dynamic template loading
 */

// Track loaded templates to avoid reloading
const loadedTemplates = new Set();

// Track the currently active tab for cleanup (US-160)
let _currentTab = null;

/**
 * Map old tab names to new ones for backward compatibility
 */
const tabNameMapping = {
  // Main tabs
  'dashboard': 'dashboard',
  'real-chat': 'live-chat',
  'live-chat': 'live-chat',
  'chat-simulator': 'chat-simulator',
  'history': 'history',
  'settings': 'settings',
  'status': 'system-status', // Redirect to status
  'system-status': 'system-status',
  'monitor': 'performance',
  'performance': 'performance',
  'help': 'help',

  // Knowledge/Response tabs
  'responses': 'responses',
  'knowledge': 'responses', // Old Knowledge Base -> new Responses
  'static-replies': 'responses', // Old Static Messages -> new Responses
  'workflow': 'responses', // Old Workflow -> new Responses
  'templates': 'responses',

  // Understanding
  'understanding': 'understanding',
  // 'intents': 'understanding', // Removed: Smart Routing is now its own tab

  // WhatsApp
  'whatsapp': 'system-status', // Redirect to status
  'whatsapp-accounts': 'system-status',

  // Old aliases
  'preview': 'chat-simulator',
  'chat': 'live-chat',
  'feedback-stats': 'performance',
  'intent-accuracy': 'performance'
};

/**
 * Get current tab and sub-tab from URL
 * @returns {{main: string, sub: string|null}}
 */
function getTabInfoFromUrl() {
  const hash = window.location.hash.slice(1); // Remove #
  if (!hash) return { main: 'dashboard', sub: null };

  // Handle query params if any (e.g. ?audience=developer)
  const cleanHash = hash.split('?')[0];

  const parts = cleanHash.split('/');
  const rawMain = parts[0];
  const sub = parts.length > 1 ? parts[1] : null;

  return {
    main: tabNameMapping[rawMain] || rawMain || 'dashboard',
    sub: sub
  };
}

/**
 * Load template for a tab if not already loaded
 * @param {HTMLElement} tabSection - Tab section element
 * @returns {Promise<void>}
 */
async function loadTabTemplate(tabSection) {
  const templateName = tabSection.dataset.template;
  if (!templateName || loadedTemplates.has(templateName)) {
    return; // Already loaded or no template needed
  }

  try {
    const response = await fetch(`/api/rainbow/templates/${templateName}`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Template ${templateName} not found (${response.status})`);
    }

    const html = await response.text();
    tabSection.innerHTML = html;
    loadedTemplates.add(templateName);

    console.log(`[Tabs] Loaded template: ${templateName}`);
  } catch (err) {
    console.error(`[Tabs] Failed to load template ${templateName}:`, err);
    tabSection.innerHTML = `
      <div class="p-8 text-center text-danger-500">
        <p>Failed to load ${templateName} tab</p>
        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600">
          Reload Page
        </button>
      </div>
    `;
  }
}

/**
 * US-160: Clean up intervals and event listeners from the previous tab
 * before switching to a new one. Each tab module exposes a cleanup function
 * that clears its setInterval/setTimeout/SSE handlers.
 *
 * @param {string|null} previousTab - The tab being deactivated
 * @param {string} nextTab - The tab being activated
 */
function cleanupCurrentTab(previousTab, nextTab) {
  if (!previousTab || previousTab === nextTab) return;

  switch (previousTab) {
    case 'dashboard':
      // Dashboard has: status poll timer, SSE activity stream, activity timestamp updater
      if (typeof window.stopStatusPolling === 'function') window.stopStatusPolling();
      if (typeof window.cleanupDashboardHelpers === 'function') window.cleanupDashboardHelpers();
      break;

    case 'live-chat':
      // Live Chat has: autoRefresh (10s), waStatusPoll (15s)
      if (typeof window.cleanupLiveChat === 'function') window.cleanupLiveChat();
      break;

    case 'chat-simulator':
      // Chat Simulator contains Live Simulation sub-tab with: autoRefresh (3s), waStatusPoll (15s), timestampUpdater (1s)
      if (typeof window.cleanupRealChat === 'function') window.cleanupRealChat();
      break;

    case 'performance':
      // Performance has: feedbackRefreshInterval (30s), intentAccuracyRefreshInterval (30s)
      if (typeof window.cleanupPerformance === 'function') window.cleanupPerformance();
      break;

    default:
      break;
  }

  console.log(`[Tabs] Cleanup: ${previousTab} -> ${nextTab}`);
}

/**
 * Load tab and call its loader function
 * @param {string} tabName - Tab name (e.g., 'status', 'intents')
 * @param {string|null} subTab - Optional sub-tab ID
 */
async function loadTab(tabName, subTab = null) {
  // Normalize tab name
  const effectiveTabName = tabNameMapping[tabName] || tabName;

  // ── US-160: Clean up intervals/listeners from the previous tab ──
  cleanupCurrentTab(_currentTab, effectiveTabName);
  _currentTab = effectiveTabName;

  // Hide Prisma Bot FAB when navigating away from responses tab
  if (typeof window.hidePrismaBotFab === 'function') {
    window.hidePrismaBotFab();
  }

  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });

  // Remove active class from all nav tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    // Check if the button targets this tab (or one of its aliases)
    const btnTab = tabNameMapping[btn.dataset.tab] || btn.dataset.tab;
    const isMatch = btnTab === effectiveTabName;

    // Toggle active classes
    if (isMatch) {
      btn.classList.add('bg-primary-50', 'text-primary-700');
      btn.classList.remove('text-neutral-600', 'hover:bg-neutral-50');
    } else {
      btn.classList.remove('bg-primary-50', 'text-primary-700');
      btn.classList.add('text-neutral-600', 'hover:bg-neutral-50');
    }
  });

  // Show selected tab
  const tabSection = document.getElementById('tab-' + effectiveTabName);
  if (!tabSection) {
    console.error(`[Tabs] Tab not found: tab-${effectiveTabName}`);
    return;
  }

  tabSection.classList.remove('hidden');

  // Load template if needed
  await loadTabTemplate(tabSection);

  // ── US-158: Lazy-load tab modules on demand ──────────────────
  // Ensures the tab's JS modules are imported before calling the loader.
  // window._ensureTabModules is provided by lazy-loader.js (loaded via module-registry.js).
  if (typeof window._ensureTabModules === 'function') {
    try {
      await window._ensureTabModules(effectiveTabName);
    } catch (err) {
      console.error(`[Tabs] Failed to lazy-load modules for ${effectiveTabName}:`, err);
    }
  }

  // Call tab-specific loader function if exists
  const loaderFunctionName = 'load' + effectiveTabName.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');

  if (typeof window[loaderFunctionName] === 'function') {
    try {
      // Pass subTab to the loader function
      await window[loaderFunctionName](subTab);
      console.log(`[Tabs] Loaded: ${effectiveTabName} ${subTab ? `(${subTab})` : ''}`);
    } catch (err) {
      console.error(`[Tabs] Error loading ${effectiveTabName}:`, err);
    }
  }

  // Handle sub-tab switching logic for specific tabs
  // This ensures that even if loader doesn't handle it, we try to switch
  if (subTab) {
    // Wait a bit for any internal rendering
    setTimeout(() => {
      if (effectiveTabName === 'settings' && typeof window.switchSettingsTab === 'function') {
        window.switchSettingsTab(subTab, false);
      } else if (effectiveTabName === 'responses' && typeof window.switchResponseTab === 'function') {
        window.switchResponseTab(subTab, false);
      } else if (effectiveTabName === 'chat-simulator' && typeof window.switchSimulatorTab === 'function') {
        window.switchSimulatorTab(subTab, false);
      } else if (effectiveTabName === 'understanding' && typeof window.toggleTier === 'function') {
        // Check if already open to avoid toggle spam
        const content = document.getElementById(subTab + '-content');
        if (content && content.classList.contains('hidden')) {
          window.toggleTier(subTab);
        }
        // Scroll to it
        if (content) content.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
}

/**
 * Wait for the lazy-loader to be bootstrapped by module-registry.js.
 * Because module-registry.js is a `type="module"` script, it runs after
 * DOMContentLoaded.  This helper polls briefly (max ~500ms) so the
 * initial loadTab() can use lazy loading.  If the loader never appears
 * (e.g. script error), we proceed anyway — the tab will just show the
 * template without its JS module.
 *
 * @returns {Promise<void>}
 */
function waitForLazyLoader() {
  if (typeof window._ensureTabModules === 'function') {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    let attempts = 0;
    const maxAttempts = 50; // 50 * 10ms = 500ms max wait
    const interval = setInterval(() => {
      attempts++;
      if (typeof window._ensureTabModules === 'function' || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.warn('[Tabs] Lazy loader not available after 500ms, proceeding without it');
        }
        resolve();
      }
    }, 10);
  });
}

/**
 * Initialize tabs on page load
 */
async function initTabs() {
  // Convert path-based URLs (e.g., /understanding) to hash-based URLs (/#understanding)
  const path = window.location.pathname || '/';
  if (path !== '/') {
    const pathTab = path.slice(1); // Remove leading /
    const existingHash = window.location.hash || '';
    // Use the path as the tab name if no hash exists
    const hash = existingHash || '#' + pathTab;
    window.history.replaceState(null, '', window.location.origin + '/' + hash);
  }

  // US-158: Wait for lazy-loader bootstrap before first loadTab
  await waitForLazyLoader();

  // Initial load
  const { main, sub } = getTabInfoFromUrl();
  loadTab(main, sub);

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    const { main, sub } = getTabInfoFromUrl();
    loadTab(main, sub);
  });

  // Add click handlers
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tabNameMapping[btn.dataset.tab] || btn.dataset.tab;

      // Update URL hash
      window.location.hash = tabName;
      // hashchange event will trigger loadTab
    });
  });

  console.log('[Tabs] Initialized with lazy-loading support');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTabs);
} else {
  initTabs();
}

// Export functions to global scope
window.loadTab = loadTab;
window.initTabs = initTabs;
window.getTabInfoFromUrl = getTabInfoFromUrl;

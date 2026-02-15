/**
 * Chat Simulator Tab Helper Functions
 *
 * Utilities for the Chat Simulator tab:
 * - Sub-tab switching (Quick Test / Live Simulation)
 * - Tab state management
 * - Fullscreen mode toggle
 */

/**
 * Switch between sub-tabs in the Chat Simulator tab
 * @param {string} tabName - 'quick-test' or 'live-simulation'
 * @param {boolean} updateHash - Whether to update the URL hash (default: true)
 */
export function switchSimulatorTab(tabName, updateHash = true) {
  // Update hash if requested
  if (updateHash) {
    const newHash = 'chat-simulator/' + tabName;
    if (window.location.hash.slice(1) !== newHash) {
      history.replaceState(null, '', '#' + newHash);
    }
  }

  // Hide all simulator tab contents
  document.querySelectorAll('.simulator-tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  // Remove active state from all simulator tab buttons
  const tabs = ['tab-quick-test', 'tab-live-simulation'];
  tabs.forEach(tabId => {
    const btn = document.getElementById(tabId);
    if (btn) {
      btn.classList.remove('text-primary-600', 'border-b-2', 'border-primary-500', 'bg-primary-50');
      btn.classList.add('text-neutral-600', 'hover:text-neutral-800', 'hover:bg-neutral-50');
    }
  });

  // Show selected content
  const content = document.getElementById(tabName + '-content');
  if (content) {
    content.classList.remove('hidden');
  }

  // Reload Real Chat if switching to that tab (restarts auto-refresh)
  if (tabName === 'live-simulation' && typeof window.loadRealChat === 'function') {
    window.loadRealChat();
  }

  // Highlight active button
  const button = document.getElementById('tab-' + tabName);
  if (button) {
    button.classList.remove('text-neutral-600', 'hover:text-neutral-800', 'hover:bg-neutral-50');
    button.classList.add('text-primary-600', 'border-b-2', 'border-primary-500', 'bg-primary-50');
  }
}

/**
 * Toggle fullscreen mode for chat containers
 * @param {string} containerId - ID of the container to toggle fullscreen
 */
export function toggleChatFullscreen(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Chat container not found:', containerId);
    return;
  }

  const isFullscreen = container.classList.contains('chat-fullscreen');

  if (isFullscreen) {
    // Exit fullscreen
    container.classList.remove('chat-fullscreen');
    const closeBtn = container.querySelector('.fullscreen-close');
    if (closeBtn) {
      closeBtn.remove();
    }
  } else {
    // Enter fullscreen
    container.classList.add('chat-fullscreen');

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'fullscreen-close';
    closeBtn.setAttribute('title', 'Exit fullscreen');
    closeBtn.setAttribute('aria-label', 'Exit fullscreen');
    closeBtn.onclick = function() {
      toggleChatFullscreen(containerId);
    };

    // Create close icon (X)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('d', 'M6 18L18 6M6 6l12 12');
    svg.appendChild(path);
    closeBtn.appendChild(svg);

    container.appendChild(closeBtn);
  }
}

/**
 * Handle escape key to exit fullscreen mode
 */
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const fullscreenElements = document.querySelectorAll('.chat-fullscreen');
    fullscreenElements.forEach(function(element) {
      element.classList.remove('chat-fullscreen');
      const closeBtn = element.querySelector('.fullscreen-close');
      if (closeBtn) {
        closeBtn.remove();
      }
    });
  }
});

// Make toggleChatFullscreen available globally for onclick handlers
window.toggleChatFullscreen = toggleChatFullscreen;

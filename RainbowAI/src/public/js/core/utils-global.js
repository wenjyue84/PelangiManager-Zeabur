// ═══════════════════════════════════════════════════════════════════
// Global Utility Functions (loaded as regular script)
// These MUST be available globally before legacy-functions.js
// Module consumers should import from core/utils.js instead
// ═══════════════════════════════════════════════════════════════════

function toast(msg, type) {
  type = type || 'success';
  var el = document.createElement('div');
  var colors = type === 'success' ? 'bg-success-500' : type === 'error' ? 'bg-danger-500' : 'bg-blue-500';
  el.className = 'toast ' + colors + ' text-white text-sm px-4 py-2 rounded-2xl shadow-medium';
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(function() { el.remove(); }, 3000);
}

function api(path, opts) {
  opts = opts || {};
  var timeout = opts.timeout || 30000;
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, timeout);

  return fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: controller.signal
  }).then(function(res) {
    clearTimeout(timeoutId);
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      return data;
    });
  }).catch(function(error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout after ' + timeout + 'ms');
    }
    throw error;
  });
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeAttr(s) {
  if (!s) return '';
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function formatRelativeTime(ts) {
  var now = Date.now();
  var then = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  var diff = now - then;
  var seconds = Math.floor(diff / 1000);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  var days = Math.floor(hours / 24);
  if (days > 0) return days + 'd ago';
  if (hours > 0) return hours + 'h ago';
  if (minutes > 0) return minutes + 'm ago';
  return seconds + 's ago';
}

function formatDateTime(ts) {
  var date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

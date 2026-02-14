import type { RateLimitResult } from './types.js';
import { configStore } from './config-store.js';
import { StateManager } from './state-manager.js';

interface WindowEntry {
  timestamps: number[];
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

// Use StateManager for automatic TTL-based cleanup of rate limit windows
const windowManager = new StateManager<WindowEntry>(HOUR_MS, CLEANUP_INTERVAL_MS);
const staffPhones = new Set<string>();

function refreshStaffPhones(): void {
  staffPhones.clear();
  for (const phone of configStore.getSettings().staff.phones) {
    staffPhones.add(phone.replace(/\D/g, ''));
  }
}

export function initRateLimiter(): void {
  refreshStaffPhones();
  // StateManager handles periodic cleanup automatically
  configStore.on('reload', (domain: string) => {
    if (domain === 'settings' || domain === 'all') {
      refreshStaffPhones();
      console.log('[RateLimiter] Staff phones reloaded');
    }
  });
}

export function destroyRateLimiter(): void {
  windowManager.destroy();
}

export function checkRate(phone: string): RateLimitResult {
  const normalized = phone.replace(/\D/g, '');

  // Staff are exempt
  if (staffPhones.has(normalized)) {
    return { allowed: true };
  }

  const limits = configStore.getSettings().rate_limits;
  const now = Date.now();

  // StateManager.getOrCreate() handles TTL checking automatically
  const entry = windowManager.getOrCreate(normalized, () => ({ timestamps: [] }));

  // Remove timestamps older than 1 hour
  entry.timestamps = entry.timestamps.filter(t => now - t < HOUR_MS);

  // Check per-hour limit
  if (entry.timestamps.length >= limits.per_hour) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + HOUR_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: 'hourly limit exceeded'
    };
  }

  // Check per-minute limit
  const recentMinute = entry.timestamps.filter(t => now - t < MINUTE_MS);
  if (recentMinute.length >= limits.per_minute) {
    const oldest = recentMinute[0];
    const retryAfter = Math.ceil((oldest + MINUTE_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: 'per-minute limit exceeded'
    };
  }

  // Record this request
  entry.timestamps.push(now);
  return { allowed: true };
}

// Cleanup is now handled automatically by StateManager

// For testing
export function _getWindowsSize(): number {
  return windowManager.size();
}

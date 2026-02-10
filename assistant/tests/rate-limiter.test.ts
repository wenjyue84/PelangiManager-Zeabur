import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initRateLimiter, destroyRateLimiter, checkRate, _getWindowsSize } from '../src/rate-limiter.js';

describe('Rate Limiter', () => {
  beforeEach(() => {
    initRateLimiter(['60127088789']);
  });

  afterEach(() => {
    destroyRateLimiter();
  });

  it('allows messages under the limit', () => {
    const result = checkRate('60123456789');
    expect(result.allowed).toBe(true);
  });

  it('blocks after 20 messages per minute', () => {
    for (let i = 0; i < 20; i++) {
      expect(checkRate('60111111111').allowed).toBe(true);
    }
    const blocked = checkRate('60111111111');
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe('per-minute limit exceeded');
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('staff phones are exempt from rate limits', () => {
    for (let i = 0; i < 50; i++) {
      expect(checkRate('60127088789').allowed).toBe(true);
    }
  });

  it('tracks different phones independently', () => {
    for (let i = 0; i < 20; i++) {
      checkRate('60111111111');
    }
    // Different phone should still be allowed
    expect(checkRate('60222222222').allowed).toBe(true);
  });

  it('blocks after 100 messages per hour', () => {
    const now = Date.now();
    // Spread messages 4 seconds apart to avoid per-minute limit (20 in 60s)
    // 4s apart means max 15 per minute window, well under the 20/min limit
    for (let i = 0; i < 100; i++) {
      vi.spyOn(Date, 'now').mockReturnValue(now + i * 4000);
      checkRate('60333333333');
    }
    // Next request at same time window
    vi.spyOn(Date, 'now').mockReturnValue(now + 100 * 4000);
    const blocked = checkRate('60333333333');
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe('hourly limit exceeded');
    vi.restoreAllMocks();
  });

  it('creates window entries for new phones', () => {
    checkRate('60444444444');
    expect(_getWindowsSize()).toBeGreaterThan(0);
  });
});

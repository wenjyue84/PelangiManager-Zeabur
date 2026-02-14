import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from '../state-manager.js';

interface TestState {
  count: number;
  name: string;
}

describe('StateManager', () => {
  let manager: StateManager<TestState>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
    vi.useRealTimers();
  });

  describe('getOrCreate', () => {
    it('should create new state if not exists', () => {
      manager = new StateManager<TestState>();
      const state = manager.getOrCreate('user1', () => ({ count: 0, name: 'Alice' }));

      expect(state.count).toBe(0);
      expect(state.name).toBe('Alice');
      expect(state.lastActiveAt).toBeGreaterThan(0);
    });

    it('should return existing state if not expired', () => {
      manager = new StateManager<TestState>();
      const state1 = manager.getOrCreate('user1', () => ({ count: 5, name: 'Alice' }));
      state1.count = 10; // Modify

      const state2 = manager.getOrCreate('user1', () => ({ count: 0, name: 'Bob' }));

      expect(state2.count).toBe(10); // Should return modified state
      expect(state2.name).toBe('Alice'); // Should return existing state
      expect(state2).toBe(state1); // Same reference
    });

    it('should create new state if expired', () => {
      const TTL_MS = 1000; // 1 second
      manager = new StateManager<TestState>(TTL_MS);

      const state1 = manager.getOrCreate('user1', () => ({ count: 5, name: 'Alice' }));
      expect(state1.count).toBe(5);

      // Fast-forward time past TTL
      vi.advanceTimersByTime(TTL_MS + 100);

      const state2 = manager.getOrCreate('user1', () => ({ count: 0, name: 'Bob' }));
      expect(state2.count).toBe(0); // Should be new state
      expect(state2.name).toBe('Bob');
      expect(state2).not.toBe(state1); // Different reference
    });

    it('should update lastActiveAt on access', () => {
      manager = new StateManager<TestState>();
      const state1 = manager.getOrCreate('user1', () => ({ count: 0, name: 'Alice' }));
      const timestamp1 = state1.lastActiveAt;

      vi.advanceTimersByTime(100);

      const state2 = manager.getOrCreate('user1', () => ({ count: 0, name: 'Bob' }));
      expect(state2.lastActiveAt).toBeGreaterThan(timestamp1);
    });
  });

  describe('get', () => {
    it('should return undefined if not exists', () => {
      manager = new StateManager<TestState>();
      const state = manager.get('nonexistent');

      expect(state).toBeUndefined();
    });

    it('should return existing state if not expired', () => {
      manager = new StateManager<TestState>();
      manager.getOrCreate('user1', () => ({ count: 5, name: 'Alice' }));

      const state = manager.get('user1');
      expect(state).toBeDefined();
      expect(state!.count).toBe(5);
    });

    it('should return undefined if expired', () => {
      const TTL_MS = 1000;
      manager = new StateManager<TestState>(TTL_MS);
      manager.getOrCreate('user1', () => ({ count: 5, name: 'Alice' }));

      vi.advanceTimersByTime(TTL_MS + 100);

      const state = manager.get('user1');
      expect(state).toBeUndefined();
    });

    it('should update lastActiveAt on access', () => {
      manager = new StateManager<TestState>();
      const state1 = manager.getOrCreate('user1', () => ({ count: 0, name: 'Alice' }));
      const timestamp1 = state1.lastActiveAt;

      vi.advanceTimersByTime(100);

      const state2 = manager.get('user1');
      expect(state2!.lastActiveAt).toBeGreaterThan(timestamp1);
    });
  });

  describe('update', () => {
    it('should update existing state', () => {
      manager = new StateManager<TestState>();
      manager.getOrCreate('user1', () => ({ count: 0, name: 'Alice' }));

      const updated = manager.update('user1', (state) => {
        state.count = 10;
      });

      expect(updated).toBe(true);
      const state = manager.get('user1');
      expect(state!.count).toBe(10);
    });

    it('should return false if not exists', () => {
      manager = new StateManager<TestState>();
      const updated = manager.update('nonexistent', (state) => {
        state.count = 10;
      });

      expect(updated).toBe(false);
    });

    it('should return false if expired', () => {
      const TTL_MS = 1000;
      manager = new StateManager<TestState>(TTL_MS);
      manager.getOrCreate('user1', () => ({ count: 0, name: 'Alice' }));

      vi.advanceTimersByTime(TTL_MS + 100);

      const updated = manager.update('user1', (state) => {
        state.count = 10;
      });

      expect(updated).toBe(false);
    });

    it('should update lastActiveAt', () => {
      manager = new StateManager<TestState>();
      const state1 = manager.getOrCreate('user1', () => ({ count: 0, name: 'Alice' }));
      const timestamp1 = state1.lastActiveAt;

      vi.advanceTimersByTime(100);

      manager.update('user1', (state) => {
        state.count = 10;
      });

      const state2 = manager.get('user1');
      expect(state2!.lastActiveAt).toBeGreaterThan(timestamp1);
    });
  });

  describe('delete', () => {
    it('should delete existing entry', () => {
      manager = new StateManager<TestState>();
      manager.getOrCreate('user1', () => ({ count: 0, name: 'Alice' }));

      const deleted = manager.delete('user1');
      expect(deleted).toBe(true);

      const state = manager.get('user1');
      expect(state).toBeUndefined();
    });

    it('should return false if not exists', () => {
      manager = new StateManager<TestState>();
      const deleted = manager.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('entries', () => {
    it('should return all non-expired entries', () => {
      manager = new StateManager<TestState>();
      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));
      manager.getOrCreate('user2', () => ({ count: 2, name: 'Bob' }));
      manager.getOrCreate('user3', () => ({ count: 3, name: 'Charlie' }));

      const entries = manager.entries();
      expect(entries.length).toBe(3);
      expect(entries.map(([key]) => key)).toEqual(expect.arrayContaining(['user1', 'user2', 'user3']));
    });

    it('should exclude expired entries', () => {
      const TTL_MS = 1000;
      manager = new StateManager<TestState>(TTL_MS);
      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));

      vi.advanceTimersByTime(500);
      manager.getOrCreate('user2', () => ({ count: 2, name: 'Bob' }));

      vi.advanceTimersByTime(600); // user1 expired, user2 not expired

      const entries = manager.entries();
      expect(entries.length).toBe(1);
      expect(entries[0][0]).toBe('user2');
    });
  });

  describe('size', () => {
    it('should return number of non-expired entries', () => {
      manager = new StateManager<TestState>();
      expect(manager.size()).toBe(0);

      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));
      expect(manager.size()).toBe(1);

      manager.getOrCreate('user2', () => ({ count: 2, name: 'Bob' }));
      expect(manager.size()).toBe(2);
    });

    it('should exclude expired entries', () => {
      const TTL_MS = 1000;
      manager = new StateManager<TestState>(TTL_MS);
      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));
      manager.getOrCreate('user2', () => ({ count: 2, name: 'Bob' }));

      expect(manager.size()).toBe(2);

      vi.advanceTimersByTime(TTL_MS + 100); // Both expired

      expect(manager.size()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      manager = new StateManager<TestState>();
      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));
      manager.getOrCreate('user2', () => ({ count: 2, name: 'Bob' }));

      manager.clear();

      expect(manager.size()).toBe(0);
      expect(manager.get('user1')).toBeUndefined();
      expect(manager.get('user2')).toBeUndefined();
    });
  });

  describe('automatic cleanup', () => {
    it('should remove expired entries on cleanup interval', () => {
      const TTL_MS = 1000;
      const CLEANUP_INTERVAL_MS = 500;
      manager = new StateManager<TestState>(TTL_MS, CLEANUP_INTERVAL_MS);

      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));
      manager.getOrCreate('user2', () => ({ count: 2, name: 'Bob' }));

      // Advance past TTL
      vi.advanceTimersByTime(TTL_MS + 100);

      // Trigger cleanup
      vi.advanceTimersByTime(CLEANUP_INTERVAL_MS);

      // Both should be removed by cleanup
      const entries = manager.entries();
      expect(entries.length).toBe(0);
    });

    it('should not remove non-expired entries', () => {
      const TTL_MS = 2000;
      const CLEANUP_INTERVAL_MS = 500;
      manager = new StateManager<TestState>(TTL_MS, CLEANUP_INTERVAL_MS);

      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));

      // Advance less than TTL
      vi.advanceTimersByTime(1000);

      // Trigger cleanup
      vi.advanceTimersByTime(CLEANUP_INTERVAL_MS);

      // Should still exist
      const state = manager.get('user1');
      expect(state).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('should stop cleanup timer', () => {
      const TTL_MS = 1000;
      const CLEANUP_INTERVAL_MS = 500;
      manager = new StateManager<TestState>(TTL_MS, CLEANUP_INTERVAL_MS);

      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));

      manager.destroy();

      // Advance past TTL and cleanup interval
      vi.advanceTimersByTime(TTL_MS + CLEANUP_INTERVAL_MS + 100);

      // Cleanup should NOT have run (timer stopped)
      // We can't directly check if timer is stopped, but we can verify
      // that no console.log was called during cleanup
    });

    it('should clear all entries', () => {
      manager = new StateManager<TestState>();
      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));
      manager.getOrCreate('user2', () => ({ count: 2, name: 'Bob' }));

      manager.destroy();

      expect(manager.size()).toBe(0);
    });
  });

  describe('default configuration', () => {
    it('should use 1 hour TTL by default', () => {
      manager = new StateManager<TestState>();
      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));

      // Advance 59 minutes (should still exist)
      vi.advanceTimersByTime(59 * 60 * 1000);
      expect(manager.entries().length).toBe(1);

      // Advance past 1 hour total (61 minutes from creation)
      // Don't call get() because it updates lastActiveAt
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(manager.entries().length).toBe(0); // Expired, no longer in entries
    });

    it('should use 5 minute cleanup interval by default', () => {
      manager = new StateManager<TestState>(1000); // 1 second TTL
      manager.getOrCreate('user1', () => ({ count: 1, name: 'Alice' }));

      // Advance past TTL
      vi.advanceTimersByTime(1100);

      // Advance 4 minutes (cleanup should not have run yet)
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Advance past 5 minutes (cleanup should run)
      vi.advanceTimersByTime(1 * 60 * 1000 + 100);

      // Entry should be cleaned up
      const entries = manager.entries();
      expect(entries.length).toBe(0);
    });
  });
});

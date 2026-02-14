/**
 * Generic state manager with TTL-based expiration and automatic cleanup.
 *
 * Replaces 6 duplicate Map implementations across:
 * - conversation.ts
 * - sentiment-tracker.ts
 * - feedback.ts
 * - escalation.ts
 * - approval-queue.ts
 * - rate-limiter.ts
 *
 * @example
 * ```ts
 * interface MyState {
 *   count: number;
 * }
 *
 * const manager = new StateManager<MyState>(3600000); // 1 hour TTL
 *
 * const state = manager.getOrCreate('user123', () => ({ count: 0 }));
 * manager.update('user123', (s) => { s.count++; });
 * ```
 */

export interface StatefulEntry<T> extends Record<string, any> {
  lastActiveAt: number;
}

/**
 * Generic state manager with automatic TTL-based expiration and cleanup.
 */
export class StateManager<T> {
  private store = new Map<string, T & StatefulEntry<T>>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * @param ttlMs Time-to-live in milliseconds (default: 1 hour)
   * @param cleanupIntervalMs Cleanup interval in milliseconds (default: 5 minutes)
   */
  constructor(
    private ttlMs: number = 3_600_000,
    private cleanupIntervalMs: number = 300_000
  ) {
    this.startCleanup();
  }

  /**
   * Get existing state or create new one using factory function.
   * Updates `lastActiveAt` timestamp on access.
   *
   * @param key Unique identifier (e.g., phone number)
   * @param factory Function to create initial state if not found
   * @returns State object with `lastActiveAt` timestamp
   */
  getOrCreate(
    key: string,
    factory: () => T
  ): T & StatefulEntry<T> {
    const existing = this.store.get(key);
    const now = Date.now();

    // Return existing if not expired
    if (existing && (now - existing.lastActiveAt) < this.ttlMs) {
      existing.lastActiveAt = now;
      return existing;
    }

    // Create new state
    const newState = {
      ...factory(),
      lastActiveAt: now
    } as T & StatefulEntry<T>;

    this.store.set(key, newState);
    return newState;
  }

  /**
   * Get existing state without creating new one.
   * Updates `lastActiveAt` if found and not expired.
   *
   * @param key Unique identifier
   * @returns State object or undefined if not found/expired
   */
  get(key: string): (T & StatefulEntry<T>) | undefined {
    const existing = this.store.get(key);
    const now = Date.now();

    if (existing && (now - existing.lastActiveAt) < this.ttlMs) {
      existing.lastActiveAt = now;
      return existing;
    }

    // Remove expired entry
    if (existing) {
      this.store.delete(key);
    }

    return undefined;
  }

  /**
   * Update existing state using updater function.
   * Updates `lastActiveAt` timestamp.
   *
   * @param key Unique identifier
   * @param updater Function to modify state
   * @returns true if updated, false if not found/expired
   */
  update(key: string, updater: (state: T & StatefulEntry<T>) => void): boolean {
    const state = this.get(key);
    if (!state) return false;

    updater(state);
    state.lastActiveAt = Date.now();
    return true;
  }

  /**
   * Delete state entry.
   *
   * @param key Unique identifier
   * @returns true if deleted, false if not found
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Get all non-expired entries.
   *
   * @returns Array of [key, state] tuples
   */
  entries(): Array<[string, T & StatefulEntry<T>]> {
    const now = Date.now();
    const result: Array<[string, T & StatefulEntry<T>]> = [];

    for (const [key, state] of this.store.entries()) {
      if ((now - state.lastActiveAt) < this.ttlMs) {
        result.push([key, state]);
      }
    }

    return result;
  }

  /**
   * Get number of non-expired entries.
   */
  size(): number {
    const now = Date.now();
    let count = 0;

    for (const state of this.store.values()) {
      if ((now - state.lastActiveAt) < this.ttlMs) {
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Stop cleanup timer and clear all entries.
   * Call this before disposing of the StateManager instance.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  /**
   * Start periodic cleanup of expired entries.
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupIntervalMs);
  }

  /**
   * Remove all expired entries from store.
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, state] of this.store.entries()) {
      if ((now - state.lastActiveAt) >= this.ttlMs) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.store.delete(key);
    }

    if (toDelete.length > 0) {
      console.log(`[StateManager] Cleaned up ${toDelete.length} expired entries`);
    }
  }
}

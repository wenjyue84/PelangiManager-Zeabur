/**
 * Circuit Breaker Pattern for AI Provider Fault Tolerance
 *
 * Prevents cascading failures by "opening" the circuit after repeated failures,
 * allowing fast-fail instead of sequential timeouts.
 *
 * States:
 * - CLOSED: Normal operation (provider healthy)
 * - OPEN: Circuit broken (provider failing, skip for cooldown period)
 * - HALF_OPEN: Testing recovery (allow 1 request to test if provider recovered)
 *
 * Behavior:
 * - 3 consecutive failures → OPEN
 * - OPEN for 60 seconds → HALF_OPEN
 * - 1 success in HALF_OPEN → CLOSED
 * - 1 failure in HALF_OPEN → back to OPEN
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit broken (skip provider)
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number;  // Consecutive failures to open circuit (default: 3)
  cooldownMs: number;        // Time before testing recovery (default: 60000ms = 60s)
  successThreshold: number;  // Successes in HALF_OPEN to close circuit (default: 1)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  private providerId: string;

  constructor(providerId: string, config?: Partial<CircuitBreakerConfig>) {
    this.providerId = providerId;
    this.config = {
      failureThreshold: config?.failureThreshold ?? 3,
      cooldownMs: config?.cooldownMs ?? 60000, // 60 seconds
      successThreshold: config?.successThreshold ?? 1
    };
  }

  /**
   * Check if circuit is open (should skip provider)
   */
  isOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      // Check if cooldown period has elapsed
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.cooldownMs) {
        console.log(`[CircuitBreaker:${this.providerId}] Cooldown elapsed (${elapsed}ms), entering HALF_OPEN`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0; // Reset success counter for testing
        return false; // Allow test request
      }
      return true; // Still in cooldown
    }
    return false;
  }

  /**
   * Record successful provider call
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        console.log(`[CircuitBreaker:${this.providerId}] Recovery verified (${this.successCount} successes), closing circuit`);
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Record failed provider call
   */
  recordFailure(): void {
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed recovery test → back to OPEN
      console.log(`[CircuitBreaker:${this.providerId}] Recovery test failed, reopening circuit`);
      this.state = CircuitState.OPEN;
      this.failureCount = this.config.failureThreshold; // Max failures
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount++;
      if (this.failureCount >= this.config.failureThreshold) {
        console.log(`[CircuitBreaker:${this.providerId}] Threshold reached (${this.failureCount} failures), opening circuit`);
        this.state = CircuitState.OPEN;
      }
    }
  }

  /**
   * Get current circuit state and stats (for monitoring)
   */
  getStatus(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    cooldownRemaining: number;
  } {
    const cooldownRemaining = this.state === CircuitState.OPEN
      ? Math.max(0, this.config.cooldownMs - (Date.now() - this.lastFailureTime))
      : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      cooldownRemaining
    };
  }

  /**
   * Manually reset circuit (for testing or admin intervention)
   */
  reset(): void {
    console.log(`[CircuitBreaker:${this.providerId}] Manual reset`);
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Global circuit breaker registry for AI providers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  getOrCreate(providerId: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let breaker = this.breakers.get(providerId);
    if (!breaker) {
      breaker = new CircuitBreaker(providerId, config);
      this.breakers.set(providerId, breaker);
    }
    return breaker;
  }

  get(providerId: string): CircuitBreaker | undefined {
    return this.breakers.get(providerId);
  }

  reset(providerId: string): void {
    this.breakers.get(providerId)?.reset();
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  getAllStatuses(): Record<string, ReturnType<CircuitBreaker['getStatus']>> {
    const statuses: Record<string, ReturnType<CircuitBreaker['getStatus']>> = {};
    for (const [id, breaker] of this.breakers.entries()) {
      statuses[id] = breaker.getStatus();
    }
    return statuses;
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

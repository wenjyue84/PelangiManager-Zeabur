/**
 * State Persistence — Saves conversation state to PostgreSQL.
 *
 * Strategy:
 *   - Regular updates (addMessage, updateLastIntent): debounced 5 seconds
 *   - Critical updates (bookingState, workflowState): written immediately
 *   - On startup: loads all active states from DB (within TTL window)
 *   - On expire: deletes row from DB
 *   - If DB unavailable: silently no-ops (system works as in-memory only)
 *
 * Uses upsert (INSERT ... ON CONFLICT DO UPDATE) for idempotent writes.
 */
import { eq, gt } from 'drizzle-orm';
import { db, dbReady } from '../lib/db.js';
import { rainbowConversationState } from '../../../shared/schema.js';
import type { ConversationState } from './types.js';

let dbAvailable = false;
const debounceTimers = new Map<string, NodeJS.Timeout>();

const DEBOUNCE_MS = 5_000; // 5 seconds for non-critical writes

// ─── Init ────────────────────────────────────────────────────────

/**
 * Initialize persistence layer. Checks if DB is available.
 * Safe to call — never throws.
 */
export async function initStatePersistence(): Promise<void> {
  try {
    const ready = await dbReady;
    if (ready) {
      dbAvailable = true;
      console.log('[StatePersistence] Database available — state will be persisted');
    } else {
      dbAvailable = false;
      console.log('[StatePersistence] Database unavailable — running in-memory only');
    }
  } catch {
    dbAvailable = false;
    console.log('[StatePersistence] Database check failed — running in-memory only');
  }
}

// ─── Load ────────────────────────────────────────────────────────

/**
 * Load all active conversation states from DB (those within TTL window).
 * Returns an array of [phone, state] tuples ready to hydrate the StateManager.
 */
export async function loadActiveStates(
  ttlMs: number
): Promise<Array<{ phone: string; state: Omit<ConversationState, 'lastActiveAt' | 'messages'> & { lastActiveAt: number } }>> {
  if (!dbAvailable) return [];

  try {
    const cutoff = new Date(Date.now() - ttlMs);
    const rows = await db
      .select()
      .from(rainbowConversationState)
      .where(gt(rainbowConversationState.lastActiveAt, cutoff));

    const results = rows.map(row => ({
      phone: row.phone,
      state: {
        phone: row.phone,
        pushName: row.pushName,
        messages: [], // Messages are persisted by conversation-logger, not here
        language: (row.language || 'en') as 'en' | 'ms' | 'zh',
        bookingState: row.bookingStateJson ? JSON.parse(row.bookingStateJson) : null,
        workflowState: row.workflowStateJson ? JSON.parse(row.workflowStateJson) : null,
        unknownCount: row.unknownCount,
        createdAt: row.createdAt.getTime(),
        lastActiveAt: row.lastActiveAt.getTime(),
        lastIntent: row.lastIntent,
        lastIntentConfidence: row.lastIntentConfidence,
        lastIntentTimestamp: row.lastIntentTimestamp ? row.lastIntentTimestamp.getTime() : null,
        slots: row.slotsJson ? JSON.parse(row.slotsJson) : {},
        repeatCount: row.repeatCount
      }
    }));

    console.log(`[StatePersistence] Loaded ${results.length} active conversation state(s) from DB`);
    return results;
  } catch (err: any) {
    console.error('[StatePersistence] Failed to load states:', err.message);
    return [];
  }
}

// ─── Persist ─────────────────────────────────────────────────────

/**
 * Schedule a state persist to DB. Debounced by default.
 * Use `immediate: true` for critical state changes (booking, workflow).
 */
export function schedulePersist(
  phone: string,
  state: ConversationState,
  immediate: boolean = false
): void {
  if (!dbAvailable) return;

  if (immediate) {
    // Cancel any pending debounce and write now
    const timer = debounceTimers.get(phone);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.delete(phone);
    }
    persistState(phone, state).catch(err => {
      console.error(`[StatePersistence] Immediate persist failed for ${phone}:`, err.message);
    });
    return;
  }

  // Debounced write
  const existing = debounceTimers.get(phone);
  if (existing) clearTimeout(existing);

  debounceTimers.set(phone, setTimeout(() => {
    debounceTimers.delete(phone);
    persistState(phone, state).catch(err => {
      console.error(`[StatePersistence] Debounced persist failed for ${phone}:`, err.message);
    });
  }, DEBOUNCE_MS));
}

/**
 * Upsert conversation state to DB.
 */
async function persistState(phone: string, state: ConversationState): Promise<void> {
  const now = new Date();
  const values = {
    phone,
    pushName: state.pushName,
    language: state.language,
    bookingStateJson: state.bookingState ? JSON.stringify(state.bookingState) : null,
    workflowStateJson: state.workflowState ? JSON.stringify(state.workflowState) : null,
    unknownCount: state.unknownCount,
    lastIntent: state.lastIntent,
    lastIntentConfidence: state.lastIntentConfidence,
    lastIntentTimestamp: state.lastIntentTimestamp ? new Date(state.lastIntentTimestamp) : null,
    slotsJson: state.slots && Object.keys(state.slots).length > 0
      ? JSON.stringify(state.slots)
      : null,
    repeatCount: state.repeatCount,
    lastActiveAt: now,
    updatedAt: now,
    createdAt: now,
  };

  await db
    .insert(rainbowConversationState)
    .values(values)
    .onConflictDoUpdate({
      target: rainbowConversationState.phone,
      set: {
        pushName: values.pushName,
        language: values.language,
        bookingStateJson: values.bookingStateJson,
        workflowStateJson: values.workflowStateJson,
        unknownCount: values.unknownCount,
        lastIntent: values.lastIntent,
        lastIntentConfidence: values.lastIntentConfidence,
        lastIntentTimestamp: values.lastIntentTimestamp,
        slotsJson: values.slotsJson,
        repeatCount: values.repeatCount,
        lastActiveAt: values.lastActiveAt,
        updatedAt: values.updatedAt,
      }
    });
}

// ─── Delete ──────────────────────────────────────────────────────

/**
 * Delete persisted state for a phone number (on clear or expire).
 */
export async function deletePersistedState(phone: string): Promise<void> {
  if (!dbAvailable) return;

  // Cancel any pending debounce
  const timer = debounceTimers.get(phone);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(phone);
  }

  try {
    await db
      .delete(rainbowConversationState)
      .where(eq(rainbowConversationState.phone, phone));
  } catch (err: any) {
    console.error(`[StatePersistence] Delete failed for ${phone}:`, err.message);
  }
}

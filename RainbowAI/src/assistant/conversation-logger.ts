/**
 * Persistent Conversation Logger — PostgreSQL Backend
 *
 * Stores real chat messages to Postgres for admin review.
 * Tables: rainbow_conversations + rainbow_messages
 *
 * Maintains the same public API as the old JSON-file version
 * so all callers (pipeline, routes, etc.) work unchanged.
 */

import { eq, desc, gt, sql, and } from 'drizzle-orm';
import { db, dbReady } from '../lib/db.js';
// Import from .ts directly to bypass stale build artifacts
import { rainbowConversations, rainbowMessages } from '../../../shared/schema-tables.ts';

// ─── Types (unchanged — callers still import these) ─────────────────

export interface LoggedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;       // Unix ms
  intent?: string;
  confidence?: number;
  action?: string;
  manual?: boolean;
  source?: string;
  model?: string;
  responseTime?: number;
  kbFiles?: string[];
  messageType?: string;
  routedAction?: string;
  workflowId?: string;
  stepId?: string;
}

export interface ContactDetails {
  name?: string;
  email?: string;
  country?: string;
  language?: string;
  checkIn?: string;
  checkOut?: string;
  unit?: string;
  notes?: string;
  contactStatus?: string;
  paymentStatus?: string;
  tags?: string[];
}

export interface ConversationLog {
  phone: string;
  pushName: string;
  instanceId?: string;
  messages: LoggedMessage[];
  contactDetails?: ContactDetails;
  pinned?: boolean;
  favourite?: boolean;
  lastReadAt?: number;
  responseMode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSummary {
  phone: string;
  pushName: string;
  instanceId?: string;
  lastMessage: string;
  lastMessageRole: 'user' | 'assistant';
  lastMessageAt: number;
  messageCount: number;
  unreadCount: number;
  pinned?: boolean;
  favourite?: boolean;
  createdAt: number;
}

// ─── DB availability guard ──────────────────────────────────────────

let dbAvailable = false;

async function ensureDb(): Promise<boolean> {
  if (dbAvailable) return true;
  try {
    const ready = await dbReady;
    dbAvailable = !!ready;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}

// ─── Canonical phone key (same as before) ───────────────────────────

function canonicalPhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits || phone.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

// ─── DB row → LoggedMessage ─────────────────────────────────────────

function rowToMessage(row: typeof rainbowMessages.$inferSelect): LoggedMessage {
  const msg: LoggedMessage = {
    role: row.role as 'user' | 'assistant',
    content: row.content,
    timestamp: row.timestamp.getTime(),
  };
  if (row.intent) msg.intent = row.intent;
  if (row.confidence != null) msg.confidence = row.confidence;
  if (row.action) msg.action = row.action;
  if (row.manual) msg.manual = row.manual;
  if (row.source) msg.source = row.source;
  if (row.model) msg.model = row.model;
  if (row.responseTime != null) msg.responseTime = row.responseTime;
  if (row.kbFilesJson) {
    try { msg.kbFiles = JSON.parse(row.kbFilesJson); } catch { /* ignore */ }
  }
  if (row.messageType) msg.messageType = row.messageType;
  if (row.routedAction) msg.routedAction = row.routedAction;
  if (row.workflowId) msg.workflowId = row.workflowId;
  if (row.stepId) msg.stepId = row.stepId;
  return msg;
}

// ─── Upsert conversation row ───────────────────────────────────────

async function upsertConversation(
  phone: string,
  pushName: string,
  instanceId?: string
): Promise<void> {
  const key = canonicalPhoneKey(phone);
  const now = new Date();

  await db
    .insert(rainbowConversations)
    .values({
      phone: key,
      pushName,
      instanceId: instanceId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: rainbowConversations.phone,
      set: {
        pushName,
        ...(instanceId ? { instanceId } : {}),
        updatedAt: now,
      },
    });
}

// ─── Public API (same signatures as before) ─────────────────────────

/** Log a single message to a conversation */
export async function logMessage(
  phone: string,
  pushName: string,
  role: 'user' | 'assistant',
  content: string,
  meta?: {
    intent?: string;
    confidence?: number;
    action?: string;
    instanceId?: string;
    manual?: boolean;
    source?: string;
    model?: string;
    responseTime?: number;
    kbFiles?: string[];
    messageType?: string;
    routedAction?: string;
    workflowId?: string;
    stepId?: string;
    // Allow extra keys from copilot approval flow
    [key: string]: unknown;
  }
): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    const key = canonicalPhoneKey(phone);
    const now = new Date();

    // Upsert conversation
    await upsertConversation(key, pushName, meta?.instanceId);

    // Insert message
    await db.insert(rainbowMessages).values({
      phone: key,
      role,
      content,
      timestamp: now,
      intent: meta?.intent ?? null,
      confidence: meta?.confidence ?? null,
      action: meta?.action ?? null,
      manual: meta?.manual ?? null,
      source: meta?.source ?? null,
      model: meta?.model ?? null,
      responseTime: meta?.responseTime ?? null,
      kbFilesJson: meta?.kbFiles ? JSON.stringify(meta.kbFiles) : null,
      messageType: meta?.messageType ?? null,
      routedAction: meta?.routedAction ?? null,
      workflowId: meta?.workflowId ?? null,
      stepId: meta?.stepId ?? null,
    });

    // Cap at 500 messages per conversation
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rainbowMessages)
      .where(eq(rainbowMessages.phone, key));

    const totalCount = Number(countResult[0]?.count ?? 0);
    if (totalCount > 500) {
      // Delete oldest messages beyond 500
      const excess = totalCount - 500;
      await db.execute(sql`
        DELETE FROM rainbow_messages
        WHERE id IN (
          SELECT id FROM rainbow_messages
          WHERE phone = ${key}
          ORDER BY timestamp ASC
          LIMIT ${excess}
        )
      `);
    }

    invalidateListCache();
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to log message for ${phone}:`, err.message);
  }
}

/** Log a user non-text message and the assistant reply in one write. */
export async function logNonTextExchange(
  phone: string,
  pushName: string,
  userPlaceholder: string,
  assistantReply: string,
  instanceId?: string
): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    const key = canonicalPhoneKey(phone);
    const now = new Date();
    const nowPlus1 = new Date(now.getTime() + 1);

    await upsertConversation(key, pushName, instanceId);

    // Insert both messages
    await db.insert(rainbowMessages).values([
      { phone: key, role: 'user', content: userPlaceholder, timestamp: now },
      { phone: key, role: 'assistant', content: assistantReply, timestamp: nowPlus1, responseTime: 0 },
    ]);
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to log non-text exchange for ${phone}:`, err.message);
  }
}

// ─── List cache (same TTL approach) ─────────────────────────────────

let _listCache: { data: ConversationSummary[]; ts: number } | null = null;
const LIST_CACHE_TTL = 3_000;

function invalidateListCache(): void {
  _listCache = null;
}

/** List all conversations with summaries. */
export async function listConversations(): Promise<ConversationSummary[]> {
  if (_listCache && Date.now() - _listCache.ts < LIST_CACHE_TTL) {
    return _listCache.data;
  }

  if (!(await ensureDb())) return [];

  try {
    // Single query: join conversations with latest message + count
    const convos = await db
      .select()
      .from(rainbowConversations);

    const summaries: ConversationSummary[] = [];

    for (const convo of convos) {
      // Get last message
      const lastMsgRows = await db
        .select()
        .from(rainbowMessages)
        .where(eq(rainbowMessages.phone, convo.phone))
        .orderBy(desc(rainbowMessages.timestamp))
        .limit(1);

      if (lastMsgRows.length === 0) continue;

      const lastMsg = lastMsgRows[0];

      // Get message count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(rainbowMessages)
        .where(eq(rainbowMessages.phone, convo.phone));

      // Get unread count (user messages after lastReadAt)
      const lastReadAt = convo.lastReadAt;
      let unreadCount = 0;
      if (lastReadAt) {
        const unreadResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(rainbowMessages)
          .where(
            and(
              eq(rainbowMessages.phone, convo.phone),
              eq(rainbowMessages.role, 'user'),
              gt(rainbowMessages.timestamp, lastReadAt)
            )
          );
        unreadCount = Number(unreadResult[0]?.count ?? 0);
      } else {
        // No read marker → all user messages are unread
        const unreadResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(rainbowMessages)
          .where(
            and(
              eq(rainbowMessages.phone, convo.phone),
              eq(rainbowMessages.role, 'user')
            )
          );
        unreadCount = Number(unreadResult[0]?.count ?? 0);
      }

      summaries.push({
        phone: convo.phone,
        pushName: convo.pushName,
        instanceId: convo.instanceId ?? undefined,
        lastMessage: lastMsg.content.slice(0, 100),
        lastMessageRole: lastMsg.role as 'user' | 'assistant',
        lastMessageAt: lastMsg.timestamp.getTime(),
        messageCount: Number(countResult[0]?.count ?? 0),
        unreadCount,
        pinned: convo.pinned,
        favourite: convo.favourite,
        createdAt: convo.createdAt.getTime(),
      });
    }

    summaries.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    _listCache = { data: summaries, ts: Date.now() };
    return summaries;
  } catch (err: any) {
    console.error('[ConvoLogger] Failed to list conversations:', err.message);
    return [];
  }
}

/** Get full conversation log for a phone number */
export async function getConversation(phone: string): Promise<ConversationLog | null> {
  if (!(await ensureDb())) return null;

  try {
    const key = canonicalPhoneKey(phone);

    const convoRows = await db
      .select()
      .from(rainbowConversations)
      .where(eq(rainbowConversations.phone, key))
      .limit(1);

    if (convoRows.length === 0) return null;
    const convo = convoRows[0];

    // Get all messages ordered by timestamp
    const msgRows = await db
      .select()
      .from(rainbowMessages)
      .where(eq(rainbowMessages.phone, key))
      .orderBy(rainbowMessages.timestamp);

    const messages = msgRows.map(rowToMessage);

    let contactDetails: ContactDetails | undefined;
    if (convo.contactDetailsJson) {
      try { contactDetails = JSON.parse(convo.contactDetailsJson); } catch { /* ignore */ }
    }

    return {
      phone: convo.phone,
      pushName: convo.pushName,
      instanceId: convo.instanceId ?? undefined,
      messages,
      contactDetails,
      pinned: convo.pinned,
      favourite: convo.favourite,
      lastReadAt: convo.lastReadAt?.getTime(),
      responseMode: convo.responseMode ?? undefined,
      createdAt: convo.createdAt.getTime(),
      updatedAt: convo.updatedAt.getTime(),
    };
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to get conversation for ${phone}:`, err.message);
    return null;
  }
}

/** Mark conversation as read */
export async function markConversationAsRead(phone: string): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    const key = canonicalPhoneKey(phone);
    await db
      .update(rainbowConversations)
      .set({ lastReadAt: new Date(), updatedAt: new Date() })
      .where(eq(rainbowConversations.phone, key));
    invalidateListCache();
  } catch (err: any) {
    console.error(`[ConvoLogger] markConversationAsRead failed for ${phone}:`, err.message);
  }
}

/** Delete a conversation log */
export async function deleteConversation(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  try {
    const key = canonicalPhoneKey(phone);

    // Delete messages first (no FK constraint, but good practice)
    await db.delete(rainbowMessages).where(eq(rainbowMessages.phone, key));
    const result = await db.delete(rainbowConversations).where(eq(rainbowConversations.phone, key));

    invalidateListCache();
    return true;
  } catch (err: any) {
    console.error(`[ConvoLogger] deleteConversation failed for ${phone}:`, err.message);
    return false;
  }
}

/** Toggle pin state for a conversation */
export async function togglePin(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  try {
    const key = canonicalPhoneKey(phone);
    const rows = await db
      .select({ pinned: rainbowConversations.pinned })
      .from(rainbowConversations)
      .where(eq(rainbowConversations.phone, key))
      .limit(1);

    if (rows.length === 0) return false;
    const newPinned = !rows[0].pinned;

    await db
      .update(rainbowConversations)
      .set({ pinned: newPinned, updatedAt: new Date() })
      .where(eq(rainbowConversations.phone, key));

    invalidateListCache();
    return newPinned;
  } catch (err: any) {
    console.error(`[ConvoLogger] togglePin failed for ${phone}:`, err.message);
    return false;
  }
}

/** Toggle favourite state for a conversation */
export async function toggleFavourite(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  try {
    const key = canonicalPhoneKey(phone);
    const rows = await db
      .select({ favourite: rainbowConversations.favourite })
      .from(rainbowConversations)
      .where(eq(rainbowConversations.phone, key))
      .limit(1);

    if (rows.length === 0) return false;
    const newFav = !rows[0].favourite;

    await db
      .update(rainbowConversations)
      .set({ favourite: newFav, updatedAt: new Date() })
      .where(eq(rainbowConversations.phone, key));

    invalidateListCache();
    return newFav;
  } catch (err: any) {
    console.error(`[ConvoLogger] toggleFavourite failed for ${phone}:`, err.message);
    return false;
  }
}

/** Get contact details for a phone number */
export async function getContactDetails(phone: string): Promise<ContactDetails> {
  if (!(await ensureDb())) return {};

  try {
    const key = canonicalPhoneKey(phone);
    const rows = await db
      .select({ json: rainbowConversations.contactDetailsJson })
      .from(rainbowConversations)
      .where(eq(rainbowConversations.phone, key))
      .limit(1);

    if (rows.length === 0 || !rows[0].json) return {};
    return JSON.parse(rows[0].json);
  } catch (err: any) {
    console.error(`[ConvoLogger] getContactDetails failed for ${phone}:`, err.message);
    return {};
  }
}

/** Merge partial contact details update for a phone number */
export async function updateContactDetails(phone: string, partial: Partial<ContactDetails>): Promise<ContactDetails> {
  if (!(await ensureDb())) return {};

  try {
    const key = canonicalPhoneKey(phone);

    // Ensure conversation exists
    await db
      .insert(rainbowConversations)
      .values({ phone: key, pushName: '', createdAt: new Date(), updatedAt: new Date() })
      .onConflictDoNothing();

    // Get existing details
    const rows = await db
      .select({ json: rainbowConversations.contactDetailsJson })
      .from(rainbowConversations)
      .where(eq(rainbowConversations.phone, key))
      .limit(1);

    let existing: ContactDetails = {};
    if (rows.length > 0 && rows[0].json) {
      try { existing = JSON.parse(rows[0].json); } catch { /* ignore */ }
    }

    const merged = { ...existing, ...partial };

    await db
      .update(rainbowConversations)
      .set({ contactDetailsJson: JSON.stringify(merged), updatedAt: new Date() })
      .where(eq(rainbowConversations.phone, key));

    return merged;
  } catch (err: any) {
    console.error(`[ConvoLogger] updateContactDetails failed for ${phone}:`, err.message);
    return {};
  }
}

/** Update the response mode for a conversation (persists to DB). */
export async function updateConversationMode(phone: string, mode: string): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    const key = canonicalPhoneKey(phone);
    await db
      .update(rainbowConversations)
      .set({ responseMode: mode, updatedAt: new Date() })
      .where(eq(rainbowConversations.phone, key));
  } catch (err: any) {
    console.error(`[ConvoLogger] updateConversationMode failed for ${phone}:`, err.message);
  }
}

/** Aggregate response time from all messages (for dashboard avg). */
export async function getResponseTimeStats(): Promise<{ count: number; sumMs: number; avgMs: number | null }> {
  if (!(await ensureDb())) return { count: 0, sumMs: 0, avgMs: null };

  try {
    const result = await db
      .select({
        count: sql<number>`count(*)`,
        sumMs: sql<number>`coalesce(sum(response_time_ms), 0)`,
      })
      .from(rainbowMessages)
      .where(
        and(
          eq(rainbowMessages.role, 'assistant'),
          gt(rainbowMessages.responseTime, 0)
        )
      );

    const count = Number(result[0]?.count ?? 0);
    const sumMs = Number(result[0]?.sumMs ?? 0);

    return {
      count,
      sumMs,
      avgMs: count > 0 ? Math.round(sumMs / count) : null,
    };
  } catch (err: any) {
    console.error('[ConvoLogger] getResponseTimeStats failed:', err.message);
    return { count: 0, sumMs: 0, avgMs: null };
  }
}

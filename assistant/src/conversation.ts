import type { ConversationState, ChatMessage } from './types.js';
import { detectLanguage } from './formatter.js';

const TTL_MS = 3_600_000; // 1 hour
const MAX_MESSAGES = 20;
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

const conversations = new Map<string, ConversationState>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function initConversations(): void {
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
}

export function destroyConversations(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  conversations.clear();
}

export function getOrCreate(phone: string, pushName: string): ConversationState {
  const existing = conversations.get(phone);
  const now = Date.now();

  if (existing && (now - existing.lastActiveAt) < TTL_MS) {
    existing.lastActiveAt = now;
    return existing;
  }

  // Expired or new — create fresh
  const state: ConversationState = {
    phone,
    pushName,
    messages: [],
    language: 'en',
    bookingState: null,
    unknownCount: 0,
    createdAt: now,
    lastActiveAt: now
  };
  conversations.set(phone, state);
  return state;
}

export function addMessage(phone: string, role: 'user' | 'assistant', content: string): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  convo.messages.push({
    role,
    content,
    timestamp: Math.floor(Date.now() / 1000)
  });

  // Trim to max messages
  if (convo.messages.length > MAX_MESSAGES) {
    convo.messages = convo.messages.slice(-MAX_MESSAGES);
  }

  // Update language detection from user messages
  if (role === 'user') {
    convo.language = detectLanguage(content);
  }

  convo.lastActiveAt = Date.now();
}

export function getMessages(phone: string): ChatMessage[] {
  return conversations.get(phone)?.messages || [];
}

export function updateBookingState(phone: string, bookingState: ConversationState['bookingState']): void {
  const convo = conversations.get(phone);
  if (convo) {
    convo.bookingState = bookingState;
  }
}

export function incrementUnknown(phone: string): number {
  const convo = conversations.get(phone);
  if (!convo) return 0;
  convo.unknownCount++;
  return convo.unknownCount;
}

export function resetUnknown(phone: string): void {
  const convo = conversations.get(phone);
  if (convo) {
    convo.unknownCount = 0;
  }
}

export function clearConversation(phone: string): void {
  conversations.delete(phone);
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [phone, convo] of conversations.entries()) {
    if (now - convo.lastActiveAt >= TTL_MS) {
      conversations.delete(phone);
    }
  }
}

// For testing
export function _getConversationsSize(): number {
  return conversations.size;
}

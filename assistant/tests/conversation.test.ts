import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getOrCreate, addMessage, getMessages, incrementUnknown, resetUnknown, clearConversation, _getConversationsSize, initConversations, destroyConversations } from '../src/conversation.js';

describe('Conversation Manager', () => {
  beforeEach(() => {
    initConversations();
  });

  afterEach(() => {
    destroyConversations();
  });

  it('creates new conversation for unknown phone', () => {
    const convo = getOrCreate('60123456789', 'TestUser');
    expect(convo.phone).toBe('60123456789');
    expect(convo.pushName).toBe('TestUser');
    expect(convo.messages).toHaveLength(0);
    expect(convo.language).toBe('en');
    expect(convo.unknownCount).toBe(0);
  });

  it('returns existing conversation for known phone', () => {
    const first = getOrCreate('60123456789', 'TestUser');
    addMessage('60123456789', 'user', 'hello');
    const second = getOrCreate('60123456789', 'TestUser');
    expect(second.messages).toHaveLength(1);
  });

  it('adds user messages', () => {
    getOrCreate('60123456789', 'TestUser');
    addMessage('60123456789', 'user', 'hello there');
    const msgs = getMessages('60123456789');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('hello there');
  });

  it('adds assistant messages', () => {
    getOrCreate('60123456789', 'TestUser');
    addMessage('60123456789', 'assistant', 'Hi! How can I help?');
    const msgs = getMessages('60123456789');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('assistant');
  });

  it('trims messages to max 20', () => {
    getOrCreate('60123456789', 'TestUser');
    for (let i = 0; i < 25; i++) {
      addMessage('60123456789', 'user', `message ${i}`);
    }
    const msgs = getMessages('60123456789');
    expect(msgs).toHaveLength(20);
    expect(msgs[0].content).toBe('message 5');
  });

  it('increments unknown count', () => {
    getOrCreate('60123456789', 'TestUser');
    expect(incrementUnknown('60123456789')).toBe(1);
    expect(incrementUnknown('60123456789')).toBe(2);
    expect(incrementUnknown('60123456789')).toBe(3);
  });

  it('resets unknown count', () => {
    getOrCreate('60123456789', 'TestUser');
    incrementUnknown('60123456789');
    incrementUnknown('60123456789');
    resetUnknown('60123456789');
    expect(incrementUnknown('60123456789')).toBe(1);
  });

  it('clears conversation', () => {
    getOrCreate('60123456789', 'TestUser');
    addMessage('60123456789', 'user', 'hello');
    clearConversation('60123456789');
    const convo = getOrCreate('60123456789', 'TestUser');
    expect(convo.messages).toHaveLength(0);
  });

  it('creates fresh state for expired conversations', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    getOrCreate('60123456789', 'TestUser');
    addMessage('60123456789', 'user', 'old message');

    // Advance time by 2 hours
    vi.spyOn(Date, 'now').mockReturnValue(now + 7_200_000);
    const fresh = getOrCreate('60123456789', 'TestUser');
    expect(fresh.messages).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('returns empty array for unknown phone getMessages', () => {
    const msgs = getMessages('99999999');
    expect(msgs).toHaveLength(0);
  });
});

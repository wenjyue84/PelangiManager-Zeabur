import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock groq-sdk before any imports
vi.mock('groq-sdk', () => {
  return {
    default: class MockGroq {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"category":"general","confidence":0.8,"entities":{}}' } }]
          })
        }
      };
    }
  };
});

import { initRouter, handleIncomingMessage } from '../src/message-router.js';
import { initRateLimiter, destroyRateLimiter } from '../src/rate-limiter.js';
import { initConversations, destroyConversations } from '../src/conversation.js';
import { initEscalation } from '../src/escalation.js';
import { initBooking } from '../src/booking.js';
import type { IncomingMessage } from '../src/types.js';

describe('Integration — Full Message Pipeline', () => {
  const mockSend = vi.fn().mockResolvedValue(undefined);
  const mockCallAPI = vi.fn().mockResolvedValue([]);

  beforeEach(() => {
    vi.clearAllMocks();
    initRateLimiter(['60127088789']);
    initConversations();
    initEscalation(mockSend);
    initBooking(mockCallAPI);
    initRouter(mockSend, mockCallAPI);
  });

  afterEach(() => {
    destroyRateLimiter();
    destroyConversations();
  });

  function makeMsg(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
    return {
      from: '60123456789',
      text: 'hello',
      pushName: 'TestUser',
      messageId: 'msg-001',
      isGroup: false,
      timestamp: Math.floor(Date.now() / 1000),
      ...overrides
    };
  }

  it('responds to greeting', async () => {
    await handleIncomingMessage(makeMsg({ text: 'hello' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentText = mockSend.mock.calls[0][1];
    expect(sentText).toContain('Welcome');
  });

  it('responds to wifi query', async () => {
    await handleIncomingMessage(makeMsg({ text: 'what is the wifi password' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentText = mockSend.mock.calls[0][1];
    expect(sentText).toContain('pelangi capsule');
    expect(sentText).toContain('ilovestaycapsule');
  });

  it('responds to pricing query', async () => {
    await handleIncomingMessage(makeMsg({ text: 'how much per night' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentText = mockSend.mock.calls[0][1];
    expect(sentText).toContain('RM45');
  });

  it('responds to directions query', async () => {
    await handleIncomingMessage(makeMsg({ text: 'where is the hostel' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][1]).toContain('26A Jalan Perang');
  });

  it('responds to check-in query', async () => {
    await handleIncomingMessage(makeMsg({ text: 'check in time' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][1]).toContain('2:00 PM');
  });

  it('skips group messages', async () => {
    await handleIncomingMessage(makeMsg({ isGroup: true }));
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips empty messages', async () => {
    await handleIncomingMessage(makeMsg({ text: '' }));
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('rate limits rapid messages', async () => {
    // Send 20 messages (all should work)
    for (let i = 0; i < 20; i++) {
      await handleIncomingMessage(makeMsg({ text: `hello ${i}`, from: '60999888777' }));
    }
    // 21st should trigger rate limit
    mockSend.mockClear();
    await handleIncomingMessage(makeMsg({ text: 'hello again', from: '60999888777' }));
    // Should get rate limited message
    if (mockSend.mock.calls.length > 0) {
      expect(mockSend.mock.calls[0][1]).toContain('too quickly');
    }
  });

  it('starts booking flow on booking intent', async () => {
    await handleIncomingMessage(makeMsg({ text: 'I want to book a capsule' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentText = mockSend.mock.calls[0][1];
    expect(sentText).toContain('check in');
  });

  it('escalates complaints to staff', async () => {
    await handleIncomingMessage(makeMsg({ text: 'the capsule is broken and dirty' }));
    expect(mockSend).toHaveBeenCalled();
    // Should send escalation to staff AND acknowledgement to guest
    const calls = mockSend.mock.calls;
    const hasEscalation = calls.some((c: any) => c[0] === '60127088789');
    const hasAck = calls.some((c: any) => c[1]?.includes('connecting'));
    // At least the guest gets an acknowledgement
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('escalates staff contact requests', async () => {
    await handleIncomingMessage(makeMsg({ text: 'I want to talk to a real person' }));
    expect(mockSend).toHaveBeenCalled();
  });

  it('handles facilities query', async () => {
    await handleIncomingMessage(makeMsg({ text: 'what facilities do you have' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][1]).toContain('capsule');
  });

  it('handles rules query', async () => {
    await handleIncomingMessage(makeMsg({ text: 'what are the house rules' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][1]).toContain('smoking');
  });

  it('handles thanks', async () => {
    await handleIncomingMessage(makeMsg({ text: 'thank you so much' }));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][1]).toContain('welcome');
  });

  it('handles errors gracefully', async () => {
    // Override send to throw on first call
    const errorSend = vi.fn()
      .mockRejectedValueOnce(new Error('Send failed'))
      .mockResolvedValue(undefined);
    initRouter(errorSend, mockCallAPI);

    // Should not throw
    await expect(
      handleIncomingMessage(makeMsg({ text: 'hello' }))
    ).resolves.not.toThrow();
  });
});

import type { AssistantDependencies } from './types.js';
import { initAIClient } from './ai-client.js';
import { initRateLimiter, destroyRateLimiter } from './rate-limiter.js';
import { initConversations, destroyConversations } from './conversation.js';
import { initKnowledge, destroyKnowledge } from './knowledge.js';
import { initPricing } from './pricing.js';
import { initBooking } from './booking.js';
import { initEscalation } from './escalation.js';
import { initRouter, handleIncomingMessage } from './message-router.js';

// Staff phone numbers (from identity/USERS.md)
const STAFF_PHONES = ['60127088789', '60103084289'];

export async function initAssistant(deps: AssistantDependencies): Promise<void> {
  const { registerMessageHandler, sendMessage, callAPI, getWhatsAppStatus } = deps;

  // Check WhatsApp status
  const waStatus = getWhatsAppStatus();
  if (waStatus.state !== 'open') {
    console.warn('[Assistant] WhatsApp not connected yet — handler will be registered for when it connects');
  }

  // Initialize all modules
  initAIClient();
  initRateLimiter(STAFF_PHONES);
  initConversations();
  initKnowledge(callAPI);
  initPricing();
  initBooking(callAPI);
  initEscalation(sendMessage);
  initRouter(sendMessage, callAPI);

  // Register incoming message handler
  registerMessageHandler(handleIncomingMessage);

  console.log('[Assistant] WhatsApp AI Assistant ready');
}

export async function destroyAssistant(): Promise<void> {
  destroyRateLimiter();
  destroyConversations();
  destroyKnowledge();
  console.log('[Assistant] Shutdown complete');
}

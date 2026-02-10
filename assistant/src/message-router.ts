import type { IncomingMessage, SendMessageFn, CallAPIFn, IntentCategory } from './types.js';
import { classifyMessage } from './intents.js';
import { getAnswer } from './knowledge.js';
import { getOrCreate, addMessage, getMessages, updateBookingState, incrementUnknown, resetUnknown } from './conversation.js';
import { checkRate } from './rate-limiter.js';
import { detectLanguage, getTemplate } from './formatter.js';
import { escalateToStaff, shouldEscalate } from './escalation.js';
import { handleBookingStep, createBookingState } from './booking.js';
import { isAIAvailable, chat } from './ai-client.js';

let sendMessage: SendMessageFn;
let callAPI: CallAPIFn;

const SYSTEM_PROMPT = `You are the Pelangi Capsule Hostel AI assistant in Johor Bahru, Malaysia. You help guests with check-in info, pricing, availability, bookings, and general hostel questions. Be warm, concise, and helpful. Reply in the same language as the guest (English, Malay, or Chinese). Keep responses under 300 characters when possible. If unsure, suggest contacting staff.`;

export function initRouter(send: SendMessageFn, api: CallAPIFn): void {
  sendMessage = send;
  callAPI = api;
}

export async function handleIncomingMessage(msg: IncomingMessage): Promise<void> {
  // Skip group messages
  if (msg.isGroup) return;

  // Skip empty
  const text = msg.text.trim();
  if (!text) return;

  const phone = msg.from;
  console.log(`[Router] ${phone} (${msg.pushName}): ${text.slice(0, 100)}`);

  try {
    // Rate limit check
    const rateResult = checkRate(phone);
    if (!rateResult.allowed) {
      const lang = detectLanguage(text);
      const response = getTemplate('rate_limited', lang);
      if (rateResult.reason === 'per-minute limit exceeded') {
        await sendMessage(phone, response);
      }
      // For hourly limit, silently ignore
      return;
    }

    // Get or create conversation
    const convo = getOrCreate(phone, msg.pushName);
    addMessage(phone, 'user', text);
    const lang = convo.language;

    // If in active booking flow, route to booking handler
    if (convo.bookingState && !['done', 'cancelled'].includes(convo.bookingState.stage)) {
      const result = await handleBookingStep(convo.bookingState, text, lang);
      updateBookingState(phone, result.newState);
      addMessage(phone, 'assistant', result.response);
      await sendMessage(phone, result.response);
      return;
    }

    // Classify intent
    const intent = await classifyMessage(text, convo.messages.slice(0, -1));
    console.log(`[Router] Intent: ${intent.category} (${intent.confidence.toFixed(2)}, ${intent.source})`);

    // Handle by intent
    let response: string | null = null;

    switch (intent.category) {
      case 'greeting':
      case 'thanks':
        resetUnknown(phone);
        response = getTemplate(intent.category, lang);
        break;

      case 'wifi':
      case 'directions':
      case 'checkin_info':
      case 'checkout_info':
      case 'pricing':
      case 'facilities':
      case 'rules':
        resetUnknown(phone);
        response = getAnswer(intent.category, lang);
        break;

      case 'availability': {
        resetUnknown(phone);
        try {
          const data = await callAPI<any>('GET', '/api/capsules/available-with-status');
          const available = Array.isArray(data) ? data.filter((c: any) => c.status === 'available').length : 0;
          const msgs: Record<typeof lang, string> = {
            en: `🏨 We currently have *${available}* capsules available.\n\nWant to book? Just say *"book"*!`,
            ms: `🏨 Kami ada *${available}* kapsul tersedia sekarang.\n\nNak tempah? Cakap *"tempah"*!`,
            zh: `🏨 目前有 *${available}* 个胶囊空位。\n\n想预订吗？直接说 *"预订"*！`
          };
          response = msgs[lang];
        } catch {
          const msgs: Record<typeof lang, string> = {
            en: "Sorry, I couldn't check availability right now. Please try again later or contact staff.",
            ms: 'Maaf, saya tidak dapat menyemak ketersediaan sekarang. Sila cuba lagi atau hubungi staf.',
            zh: '抱歉，暂时无法查询空位。请稍后再试或联系工作人员。'
          };
          response = msgs[lang];
        }
        break;
      }

      case 'booking':
        resetUnknown(phone);
        const bookingState = createBookingState();
        const result = await handleBookingStep(bookingState, text, lang);
        updateBookingState(phone, result.newState);
        response = result.response;
        break;

      case 'complaint': {
        const escResponse = await escalateToStaff({
          phone,
          pushName: msg.pushName,
          reason: 'complaint',
          recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
          originalMessage: text
        });
        response = escResponse;
        break;
      }

      case 'contact_staff': {
        const escResponse = await escalateToStaff({
          phone,
          pushName: msg.pushName,
          reason: 'human_request',
          recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
          originalMessage: text
        });
        response = escResponse;
        break;
      }

      case 'general': {
        resetUnknown(phone);
        if (isAIAvailable()) {
          try {
            response = await chat(SYSTEM_PROMPT, convo.messages.slice(0, -1), text);
          } catch {
            response = getTemplate('unavailable', lang);
          }
        } else {
          response = getTemplate('unavailable', lang);
        }
        break;
      }

      case 'unknown':
      default: {
        const unknownCount = incrementUnknown(phone);
        const escReason = shouldEscalate(null, unknownCount);

        if (escReason) {
          const escResponse = await escalateToStaff({
            phone,
            pushName: msg.pushName,
            reason: escReason,
            recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
            originalMessage: text
          });
          response = escResponse;
          resetUnknown(phone);
        } else if (isAIAvailable()) {
          try {
            response = await chat(SYSTEM_PROMPT, convo.messages.slice(0, -1), text);
            resetUnknown(phone);
          } catch {
            response = getTemplate('unavailable', lang);
          }
        } else {
          response = getTemplate('unavailable', lang);
        }
        break;
      }
    }

    if (response) {
      addMessage(phone, 'assistant', response);
      await sendMessage(phone, response);
    }
  } catch (err: any) {
    console.error(`[Router] Error processing message from ${phone}:`, err.message);
    try {
      const lang = detectLanguage(text);
      await sendMessage(phone, getTemplate('error', lang));
    } catch {
      // Can't even send error message — give up silently
    }
  }
}

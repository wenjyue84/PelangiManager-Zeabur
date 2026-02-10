import type { EscalationContext, EscalationReason, SendMessageFn } from './types.js';
import { getTemplate } from './formatter.js';

const STAFF_PHONE = '60127088789'; // Jay

let sendMessageFn: SendMessageFn | null = null;

export function initEscalation(sendMessage: SendMessageFn): void {
  sendMessageFn = sendMessage;
}

export async function escalateToStaff(context: EscalationContext): Promise<string> {
  if (!sendMessageFn) {
    console.error('[Escalation] sendMessage not initialized');
    return getTemplate('error', 'en');
  }

  const reasonLabels: Record<EscalationReason, string> = {
    human_request: 'Guest requested human assistance',
    complaint: 'Guest complaint',
    unknown_repeated: 'Bot unable to understand (3+ attempts)',
    group_booking: 'Group booking request (5+ guests)',
    error: 'System error during conversation'
  };

  const label = reasonLabels[context.reason] || 'Unknown reason';
  const recentMsgs = context.recentMessages.slice(-3).join('\n> ');

  const staffMessage = [
    `*[ESCALATION]* ${label}`,
    ``,
    `*Guest:* ${context.pushName} (+${context.phone})`,
    `*Reason:* ${label}`,
    `*Last message:* ${context.originalMessage}`,
    ``,
    `*Recent conversation:*`,
    `> ${recentMsgs}`
  ].join('\n');

  try {
    await sendMessageFn(STAFF_PHONE, staffMessage);
    console.log(`[Escalation] Forwarded to staff: ${context.reason} from +${context.phone}`);
  } catch (err: any) {
    console.error('[Escalation] Failed to forward to staff:', err.message);
  }

  return getTemplate('escalating', 'en');
}

export function shouldEscalate(
  reason: EscalationReason | null,
  unknownCount: number,
  guestCount?: number
): EscalationReason | null {
  if (reason === 'human_request' || reason === 'complaint') return reason;
  if (unknownCount >= 3) return 'unknown_repeated';
  if (guestCount && guestCount >= 5) return 'group_booking';
  return null;
}

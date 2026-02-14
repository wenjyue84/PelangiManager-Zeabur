import { loadAdminNotificationSettings, type OperatorContact } from './admin-notification-settings.js';

/**
 * Operator Escalation Service
 *
 * Manages cascading operator notifications for operational messages
 * (workflow completions, check-ins, etc.) with automatic fallback to
 * next operator if no response within configured time.
 */

export interface EscalationContext {
  sendMessage: (phone: string, text: string, instanceId?: string) => Promise<any>;
  checkForReply?: (phone: string, sinceTimestamp: number) => Promise<boolean>;
}

interface PendingEscalation {
  messageId: string;
  operators: OperatorContact[];
  currentIndex: number;
  message: string;
  sentAt: number;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

let escalationContext: EscalationContext | null = null;
const pendingEscalations = new Map<string, PendingEscalation>();

/**
 * Initialize the operator escalation service with WhatsApp send capabilities.
 */
export function initOperatorEscalation(context: EscalationContext): void {
  escalationContext = context;
  console.log('[OperatorEscalation] ✅ Initialized');
}

/**
 * Send message to operators with automatic escalation fallback.
 *
 * @param messageId - Unique ID for tracking this escalation chain
 * @param message - Message content to send
 * @param context - Optional context (e.g., "check-in", "complaint")
 * @returns Phone number of the operator who received the message
 */
export async function sendToOperatorWithEscalation(
  messageId: string,
  message: string,
  context?: string
): Promise<string> {
  if (!escalationContext) {
    throw new Error('[OperatorEscalation] Not initialized');
  }

  const settings = await loadAdminNotificationSettings();
  if (settings.operators.length === 0) {
    throw new Error('[OperatorEscalation] No operators configured');
  }

  // If there's already a pending escalation for this message, cancel it
  cancelEscalation(messageId);

  const operators = settings.operators;
  const firstOperator = operators[0];

  // Send to first operator
  const contextPrefix = context ? `[${context}] ` : '';
  const fullMessage = `${contextPrefix}${message}\n\n_Please reply to acknowledge. Auto-escalates in ${firstOperator.fallbackMinutes} min._`;

  try {
    await escalationContext.sendMessage(firstOperator.phone, fullMessage);
    console.log(`[OperatorEscalation] Sent to ${firstOperator.label} (+${firstOperator.phone})`);

    // Set up escalation chain if there are more operators
    if (operators.length > 1) {
      const escalation: PendingEscalation = {
        messageId,
        operators,
        currentIndex: 0,
        message,
        sentAt: Date.now(),
        timeoutHandle: null
      };

      // Schedule next escalation
      escalation.timeoutHandle = setTimeout(() => {
        escalateToNext(messageId, context).catch(err => {
          console.error(`[OperatorEscalation] Auto-escalation failed for ${messageId}:`, err.message);
        });
      }, firstOperator.fallbackMinutes * 60 * 1000);

      pendingEscalations.set(messageId, escalation);
    }

    return firstOperator.phone;
  } catch (err: any) {
    console.error(`[OperatorEscalation] Failed to send to first operator:`, err.message);
    // Try next operator immediately if first fails
    if (operators.length > 1) {
      return sendToSpecificOperator(messageId, message, 1, context);
    }
    throw err;
  }
}

/**
 * Escalate to the next operator in the chain
 */
async function escalateToNext(messageId: string, context?: string): Promise<void> {
  const escalation = pendingEscalations.get(messageId);
  if (!escalation) return;

  const nextIndex = escalation.currentIndex + 1;
  if (nextIndex >= escalation.operators.length) {
    console.log(`[OperatorEscalation] ${messageId} reached end of chain, no more operators`);
    pendingEscalations.delete(messageId);
    return;
  }

  // Check if there was a reply from current operator (if checkForReply is available)
  if (escalationContext?.checkForReply) {
    const currentOperator = escalation.operators[escalation.currentIndex];
    const hasReply = await escalationContext.checkForReply(currentOperator.phone, escalation.sentAt);
    if (hasReply) {
      console.log(`[OperatorEscalation] ${messageId} received reply from ${currentOperator.label}, canceling escalation`);
      pendingEscalations.delete(messageId);
      return;
    }
  }

  await sendToSpecificOperator(messageId, escalation.message, nextIndex, context);
}

/**
 * Send to a specific operator index in the chain
 */
async function sendToSpecificOperator(
  messageId: string,
  message: string,
  operatorIndex: number,
  context?: string
): Promise<string> {
  if (!escalationContext) {
    throw new Error('[OperatorEscalation] Not initialized');
  }

  const escalation = pendingEscalations.get(messageId);
  if (!escalation) {
    throw new Error(`[OperatorEscalation] No escalation found for ${messageId}`);
  }

  const operator = escalation.operators[operatorIndex];
  const previousOperator = escalation.operators[operatorIndex - 1];

  const contextPrefix = context ? `[${context}] ` : '';
  const escalationNote = `⚠️ _Escalated from ${previousOperator.label} (no response)_\n\n`;
  const fullMessage = `${contextPrefix}${escalationNote}${message}\n\n_Please reply to acknowledge. Auto-escalates in ${operator.fallbackMinutes} min._`;

  try {
    await escalationContext.sendMessage(operator.phone, fullMessage);
    console.log(`[OperatorEscalation] Escalated ${messageId} to ${operator.label} (+${operator.phone})`);

    // Update escalation tracking
    escalation.currentIndex = operatorIndex;
    escalation.sentAt = Date.now();

    // Schedule next escalation if there are more operators
    if (operatorIndex + 1 < escalation.operators.length) {
      if (escalation.timeoutHandle) clearTimeout(escalation.timeoutHandle);
      escalation.timeoutHandle = setTimeout(() => {
        escalateToNext(messageId, context).catch(err => {
          console.error(`[OperatorEscalation] Auto-escalation failed for ${messageId}:`, err.message);
        });
      }, operator.fallbackMinutes * 60 * 1000);
    } else {
      // Last operator in chain
      pendingEscalations.delete(messageId);
    }

    return operator.phone;
  } catch (err: any) {
    console.error(`[OperatorEscalation] Failed to escalate to ${operator.label}:`, err.message);
    // Try next operator immediately if this one fails
    if (operatorIndex + 1 < escalation.operators.length) {
      return sendToSpecificOperator(messageId, message, operatorIndex + 1, context);
    }
    throw err;
  }
}

/**
 * Manually acknowledge a message to stop escalation
 */
export function acknowledgeMessage(messageId: string): void {
  const escalation = pendingEscalations.get(messageId);
  if (escalation) {
    if (escalation.timeoutHandle) clearTimeout(escalation.timeoutHandle);
    pendingEscalations.delete(messageId);
    console.log(`[OperatorEscalation] ${messageId} acknowledged, escalation canceled`);
  }
}

/**
 * Cancel a pending escalation
 */
export function cancelEscalation(messageId: string): void {
  const escalation = pendingEscalations.get(messageId);
  if (escalation) {
    if (escalation.timeoutHandle) clearTimeout(escalation.timeoutHandle);
    pendingEscalations.delete(messageId);
    console.log(`[OperatorEscalation] ${messageId} escalation canceled`);
  }
}

/**
 * Get all pending escalations (for monitoring)
 */
export function getPendingEscalations(): Array<{
  messageId: string;
  currentOperator: string;
  sentAt: Date;
  nextEscalationIn: number;
}> {
  const now = Date.now();
  return Array.from(pendingEscalations.entries()).map(([messageId, esc]) => {
    const currentOp = esc.operators[esc.currentIndex];
    const nextEscalationMs = (esc.sentAt + currentOp.fallbackMinutes * 60 * 1000) - now;
    return {
      messageId,
      currentOperator: currentOp.label,
      sentAt: new Date(esc.sentAt),
      nextEscalationIn: Math.max(0, Math.ceil(nextEscalationMs / 60000))
    };
  });
}

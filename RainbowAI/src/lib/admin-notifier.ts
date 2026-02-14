import { loadAdminNotificationSettings } from './admin-notification-settings.js';
import { createModuleLogger } from './logger.js';

const logger = createModuleLogger('AdminNotifications');

/**
 * Admin Notifier
 *
 * Centralized service for sending critical alerts to system administrator
 * via WhatsApp. Used for instance disconnections, unlinks, and server events.
 */

export interface NotificationContext {
  sendMessage: (phone: string, text: string, instanceId?: string) => Promise<any>;
  getConnectedInstance?: () => { id: string; state: string } | null;
}

let notificationContext: NotificationContext | null = null;

/**
 * Initialize the admin notifier with WhatsApp send capabilities.
 * Must be called once at server startup after WhatsApp instances are ready.
 */
export function initAdminNotifier(context: NotificationContext): void {
  notificationContext = context;
  logger.info('✅ Initialized');
}

/**
 * Send WhatsApp instance disconnection alert to system admin
 */
export async function notifyAdminDisconnection(
  instanceId: string,
  instanceLabel: string,
  reason: string
): Promise<void> {
  if (!notificationContext) {
    logger.warn('Not initialized — cannot send disconnect notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled || !settings.notifyOnDisconnect) {
    logger.info('Disconnect notifications disabled in settings');
    return;
  }

  const message = `⚠️ *WhatsApp Instance Disconnected*\n\n` +
    `Instance: *${instanceLabel}*\n` +
    `ID: ${instanceId}\n` +
    `Reason: ${reason}\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `Please check the Rainbow Admin dashboard:\n` +
    `http://localhost:3002/dashboard`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    logger.info('Sent disconnect notification', { toPhone: settings.systemAdminPhone });
  } catch (err: any) {
    logger.error('Failed to send disconnect notification', { error: err.message, stack: err.stack });
  }
}

/**
 * Send WhatsApp instance unlink alert to system admin
 */
export async function notifyAdminUnlink(
  instanceId: string,
  instanceLabel: string,
  instancePhone: string
): Promise<void> {
  if (!notificationContext) {
    logger.warn('Not initialized — cannot send unlink notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled || !settings.notifyOnUnlink) {
    logger.info('Unlink notifications disabled in settings');
    return;
  }

  const message = `🚨 *WhatsApp Instance Unlinked*\n\n` +
    `Your WhatsApp instance *"${instanceLabel}"* (${instancePhone}) has been unlinked from WhatsApp.\n\n` +
    `This usually means someone logged out from WhatsApp > Linked Devices, or the session expired.\n\n` +
    `To reconnect:\n` +
    `1. Visit: http://localhost:3002/dashboard\n` +
    `2. Click "Pair QR" next to the instance\n` +
    `3. Scan with WhatsApp > Linked Devices > Link a Device\n\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    logger.info('Sent unlink notification', { toPhone: settings.systemAdminPhone });
  } catch (err: any) {
    logger.error('Failed to send unlink notification', { error: err.message, stack: err.stack });
  }
}

/** Cooldown: only one reconnect notification per instance per 10 minutes */
const RECONNECT_NOTIFY_COOLDOWN_MS = 10 * 60 * 1000;
const lastReconnectNotifyAt = new Map<string, number>();

/** Max server startup notifications per number per calendar day (Asia/Kuala_Lumpur) */
const MAX_SERVER_STARTUP_PER_DAY = 3;
const serverStartupSendCount = new Map<string, { date: string; count: number }>();

function getTodayKL(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); // YYYY-MM-DD
}

/**
 * Send MCP server reconnection alert to system admin.
 * Throttled to at most one notification per instance per 10 minutes.
 */
export async function notifyAdminReconnect(
  instanceId: string,
  instanceLabel: string,
  instancePhone: string
): Promise<void> {
  if (!notificationContext) {
    logger.warn('Not initialized — cannot send reconnect notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled || !settings.notifyOnReconnect) {
    logger.info('Reconnect notifications disabled in settings');
    return;
  }

  const now = Date.now();
  const lastAt = lastReconnectNotifyAt.get(instanceId) ?? 0;
  if (now - lastAt < RECONNECT_NOTIFY_COOLDOWN_MS) {
    logger.info('Reconnect notification skipped (cooldown)', { instanceId });
    return;
  }
  lastReconnectNotifyAt.set(instanceId, now);

  const message = `✅ *WhatsApp Instance Reconnected*\n\n` +
    `Instance: *${instanceLabel}*\n` +
    `Phone: ${instancePhone}\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `The Rainbow AI assistant is now active and monitoring guest messages.`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    logger.info('Sent reconnect notification', { toPhone: settings.systemAdminPhone });
  } catch (err: any) {
    logger.error('Failed to send reconnect notification', { error: err.message, stack: err.stack });
  }
}

/**
 * Send MCP server startup alert to system admin.
 * Limited to 3 sends per number per calendar day (Asia/Kuala_Lumpur).
 * On the 3rd send, informs the user they will not receive this message again until 12am.
 */
export async function notifyAdminServerStartup(): Promise<void> {
  if (!notificationContext) {
    logger.warn('Not initialized — cannot send startup notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled || !settings.notifyOnReconnect) {
    logger.info('Server startup notifications disabled in settings');
    return;
  }

  const phone = settings.systemAdminPhone;
  const today = getTodayKL();
  let entry = serverStartupSendCount.get(phone);
  if (!entry || entry.date !== today) {
    entry = { date: today, count: 0 };
    serverStartupSendCount.set(phone, entry);
  }

  if (entry.count >= MAX_SERVER_STARTUP_PER_DAY) {
    logger.info('Server startup notification skipped (max daily limit)', { phone, maxPerDay: MAX_SERVER_STARTUP_PER_DAY });
    return;
  }

  entry.count += 1;
  const isLastOfDay = entry.count === MAX_SERVER_STARTUP_PER_DAY;

  let message = `🔄 *Rainbow MCP Server Started*\n\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `The MCP server has restarted successfully.\n` +
    `WhatsApp instances are initializing...\n\n` +
    `Dashboard: http://localhost:3002/dashboard`;
  if (isLastOfDay) {
    message += `\n\n_You will not receive this message again until 12am today._`;
  }

  try {
    await notificationContext.sendMessage(phone, message);
    logger.info('Sent server startup notification', {
      toPhone: phone,
      count: entry.count,
      maxPerDay: MAX_SERVER_STARTUP_PER_DAY
    });
  } catch (err: any) {
    entry.count -= 1; // rollback on failure so they can still get up to 3
    logger.error('Failed to send startup notification', { error: err.message, stack: err.stack });
  }
}

/**
 * Send config corruption alert to system admin
 * Notifies when JSON config files fail to load and system falls back to defaults
 */
export async function notifyAdminConfigCorruption(corruptedFiles: string[]): Promise<void> {
  if (!notificationContext) {
    logger.warn('Not initialized — cannot send config corruption notification');
    return;
  }

  if (corruptedFiles.length === 0) {
    return; // Nothing to notify
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled) {
    logger.info('Admin notifications disabled in settings');
    return;
  }

  const fileList = corruptedFiles.map(f => `  • ${f}`).join('\n');
  const message = `⚠️ *Configuration Error Detected*\n\n` +
    `The following config files failed to load:\n${fileList}\n\n` +
    `**Action Taken:**\n` +
    `✅ Server started with safe default configs\n` +
    `✅ Rainbow AI is operational in safe mode\n` +
    `⚠️ Some features may be limited\n\n` +
    `**What You Need to Do:**\n` +
    `1. Check the config files for JSON syntax errors\n` +
    `2. Fix any malformed JSON or missing required fields\n` +
    `3. Restart the server to reload configs\n\n` +
    `💡 *Tip:* Use the Rainbow Admin dashboard to edit configs:\n` +
    `http://localhost:3002/dashboard\n\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    logger.info('✅ Sent config corruption notification', { toPhone: settings.systemAdminPhone });
  } catch (err: any) {
    logger.error('Failed to send config corruption notification', { error: err.message, stack: err.stack });
  }
}

/**
 * Send AI provider rate limit alert to system admin
 * Notifies when a provider hits too many consecutive 429 errors
 */
export async function notifyAdminRateLimit(
  providerId: string,
  providerName: string,
  errorCount: number,
  totalErrors: number
): Promise<void> {
  if (!notificationContext) {
    logger.warn('Not initialized — cannot send rate limit notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled) {
    logger.info('Admin notifications disabled in settings');
    return;
  }

  const message = `⚠️ *AI Provider Rate Limit Alert*\n\n` +
    `Provider: *${providerName}*\n` +
    `ID: ${providerId}\n` +
    `Consecutive errors: ${errorCount}\n` +
    `Total errors (lifetime): ${totalErrors}\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `**What This Means:**\n` +
    `This AI provider has hit its rate limit (429 errors) multiple times. ` +
    `The system is using exponential backoff and will automatically retry after cooldown.\n\n` +
    `**Impact:**\n` +
    `✅ Other providers are still working\n` +
    `⚠️ Responses may be slower if all providers are limited\n\n` +
    `**What You Can Do:**\n` +
    `1. Check if you have API quota remaining for this provider\n` +
    `2. Consider disabling this provider temporarily\n` +
    `3. Upgrade your API plan if needed\n` +
    `4. Monitor via Rainbow Admin dashboard:\n` +
    `   http://localhost:3002/dashboard#settings\n\n` +
    `_This is an automated alert. You'll receive at most 1 per hour per provider._`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    logger.info('✅ Sent rate limit notification', { toPhone: settings.systemAdminPhone });
  } catch (err: any) {
    logger.error('Failed to send rate limit notification', { error: err.message, stack: err.stack });
  }
}

/** Cooldown: only one KB failure notification per hour */
const KB_FAILURE_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000;
let lastKBFailureNotifyAt = 0;

/**
 * Send knowledge base failure alert to system admin
 * Notifies when KB fails to load and system falls back to static replies
 */
export async function notifyAdminKBFailure(
  failureCount: number,
  filesLoaded: number
): Promise<void> {
  if (!notificationContext) {
    logger.warn('Not initialized — cannot send KB failure notification');
    return;
  }

  // Check cooldown
  const now = Date.now();
  if (now - lastKBFailureNotifyAt < KB_FAILURE_NOTIFY_COOLDOWN_MS) {
    logger.debug('KB failure notification skipped (cooldown)');
    return;
  }
  lastKBFailureNotifyAt = now;

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled) {
    logger.debug('Admin notifications disabled in settings');
    return;
  }

  const message = `⚠️ *Knowledge Base Load Failure*\n\n` +
    `The Rainbow AI knowledge base failed to load.\n\n` +
    `**Status:**\n` +
    `Consecutive failures: ${failureCount}\n` +
    `Files loaded: ${filesLoaded}\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `**Action Taken:**\n` +
    `✅ System activated static fallback mode\n` +
    `✅ Basic responses still working\n` +
    `⚠️ Limited information available to guests\n\n` +
    `**Impact:**\n` +
    `- Guests can still get basic info (WiFi, check-in, etc.)\n` +
    `- Complex queries will be directed to staff\n` +
    `- No access to recent memory or detailed KB topics\n\n` +
    `**What You Need to Do:**\n` +
    `1. Check .rainbow-kb/ directory exists and is readable\n` +
    `2. Verify KB markdown files are not corrupted\n` +
    `3. Check server logs for specific error messages\n` +
    `4. Restart MCP server to reload KB\n\n` +
    `💡 *Tip:* Monitor KB health via:\n` +
    `http://localhost:3002/dashboard\n\n` +
    `_You'll receive at most 1 notification per hour._`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    logger.info('✅ Sent KB failure notification', { toPhone: settings.systemAdminPhone });
  } catch (err: any) {
    logger.error('Failed to send KB failure notification', { error: err.message, stack: err.stack });
  }
}

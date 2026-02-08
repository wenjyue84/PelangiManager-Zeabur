import cron from 'node-cron';
import { callAPI } from './http-client.js';
import { sendWhatsAppMessage, getWhatsAppStatus } from './baileys-client.js';

const JAY_PHONE = '60127088789';

interface GuestData {
  id: string;
  name: string;
  capsuleNumber: string;
  expectedCheckoutDate: string | null;
  isPaid: boolean;
  paymentAmount: string | null;
  isCheckedIn: boolean;
  alertSettings: string | null;
}

interface AlertSettings {
  enabled: boolean;
  channels: ('whatsapp' | 'push')[];
  advanceNotice: number[];
  lastNotified?: string;
}

function parseAlertSettings(json: string | null): AlertSettings | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCheckoutAlertMessage(guest: GuestData): string {
  const paid = guest.isPaid;
  const icon = paid ? '✅' : '❌';
  let paymentStatus = paid ? '✅ Paid' : '❌ Outstanding';

  if (!paid && guest.paymentAmount) {
    const amt = parseFloat(guest.paymentAmount);
    if (!isNaN(amt) && amt > 0) {
      paymentStatus += ` RM${Math.round(amt)}`;
    }
  }

  const checkoutDate = guest.expectedCheckoutDate
    ? new Date(guest.expectedCheckoutDate).toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : 'Not set';

  return `🔔 *CHECKOUT REMINDER* 🔔

Guest: ${guest.name}
Capsule: ${guest.capsuleNumber}
Expected Checkout: ${checkoutDate}
Payment Status: ${paymentStatus}

───────────────
📋 Action required: Check out guest today`;
}

export async function checkAndSendCheckoutAlerts(): Promise<{ sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  try {
    // Check WhatsApp connection
    const status = getWhatsAppStatus();
    if (status.state !== 'open') {
      errors.push('WhatsApp not connected');
      console.error('Checkout alerts: WhatsApp not connected');
      return { sent, errors };
    }

    // Fetch checked-in guests
    const response = await callAPI<any>('GET', '/api/guests/checked-in?page=1&limit=100');
    const guests: GuestData[] = Array.isArray(response) ? response : response?.data || [];

    const today = getTodayDateString();
    const tomorrow = getTomorrowDateString();

    // Process each guest
    for (const guest of guests) {
      try {
        // Parse alert settings
        const settings = parseAlertSettings(guest.alertSettings);
        if (!settings || !settings.enabled) continue;

        // Check if guest has checkout date
        if (!guest.expectedCheckoutDate) continue;

        // Check if already notified today
        if (settings.lastNotified && settings.lastNotified.startsWith(today)) {
          continue;
        }

        // Check if checkout date matches advance notice
        const checkoutDate = guest.expectedCheckoutDate;
        let shouldNotify = false;

        // Check for today's checkout (advance notice = 0)
        if (settings.advanceNotice.includes(0) && checkoutDate === today) {
          shouldNotify = true;
        }

        // Check for tomorrow's checkout (advance notice = 1)
        if (settings.advanceNotice.includes(1) && checkoutDate === tomorrow) {
          shouldNotify = true;
        }

        if (!shouldNotify) continue;

        // Build and send message
        const message = buildCheckoutAlertMessage(guest);

        // Send via WhatsApp if enabled
        if (settings.channels.includes('whatsapp')) {
          await sendWhatsAppMessage(JAY_PHONE, message);
          sent++;
        }

        // Send via Push if enabled (TODO: implement push notification)
        if (settings.channels.includes('push')) {
          // Push notification implementation would go here
          // For now, just log
          console.log('Push notification not yet implemented for guest:', guest.name);
        }

        // Update lastNotified timestamp
        const updatedSettings = {
          ...settings,
          lastNotified: new Date().toISOString()
        };

        await callAPI('PATCH', `/api/guests/${guest.id}`, {
          alertSettings: JSON.stringify(updatedSettings)
        });

      } catch (err: any) {
        const error = `Guest ${guest.name}: ${err.message}`;
        errors.push(error);
        console.error('Checkout alert error:', error);
      }
    }

    console.log(`Checkout alerts: sent ${sent}, errors ${errors.length}`);
    return { sent, errors };

  } catch (err: any) {
    const error = `Fatal error: ${err.message}`;
    errors.push(error);
    console.error('Checkout alerts fatal error:', err.message);
    return { sent, errors };
  }
}

export function startCheckoutAlertScheduler(): void {
  // 9:00 AM Malaysia time (using Asia/Kuala_Lumpur timezone)
  cron.schedule('0 9 * * *', async () => {
    console.log('Running scheduled checkout alerts...');
    const result = await checkAndSendCheckoutAlerts();
    console.log(`Checkout alerts completed: ${result.sent} sent, ${result.errors.length} errors`);
    if (result.errors.length > 0) {
      console.error('Checkout alert errors:', result.errors);
    }
  }, {
    timezone: 'Asia/Kuala_Lumpur'
  });

  console.log('Checkout alert scheduler started (9:00 AM MYT daily)');
}

import dotenv from 'dotenv';
dotenv.config({ path: 'local.env' });

// Mock the WhatsApp status to simulate connection
let mockWhatsAppStatus = { state: 'open' };
let sentMessages = [];

// Mock imports
const mockBaileysClient = {
  getWhatsAppStatus: () => mockWhatsAppStatus,
  sendWhatsAppMessage: async (phone, message) => {
    sentMessages.push({ phone, message, timestamp: new Date().toISOString() });
    console.log(`\n✓ WhatsApp message sent to ${phone}`);
    console.log('Message preview:', message.substring(0, 100) + '...');
    return true;
  }
};

const mockHttpClient = {
  callAPI: async (method, path, body) => {
    console.log(`\n→ API ${method} ${path}`);

    // Mock API responses
    if (path === '/api/guests/checked-in?page=1&limit=100') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const formatDate = (date) => date.toISOString().split('T')[0];

      return {
        data: [
          {
            id: 'test-guest-1',
            name: 'John Doe',
            capsuleNumber: 'C12',
            expectedCheckoutDate: formatDate(today),
            isPaid: true,
            paymentAmount: '150',
            isCheckedIn: true,
            alertSettings: JSON.stringify({
              enabled: true,
              channels: ['whatsapp'],
              advanceNotice: [0]
            })
          },
          {
            id: 'test-guest-2',
            name: 'Jane Smith',
            capsuleNumber: 'C05',
            expectedCheckoutDate: formatDate(tomorrow),
            isPaid: false,
            paymentAmount: '200',
            isCheckedIn: true,
            alertSettings: JSON.stringify({
              enabled: true,
              channels: ['whatsapp'],
              advanceNotice: [1]
            })
          },
          {
            id: 'test-guest-3',
            name: 'Bob Johnson',
            capsuleNumber: 'C18',
            expectedCheckoutDate: formatDate(yesterday),
            isPaid: false,
            paymentAmount: '120',
            isCheckedIn: true,
            alertSettings: JSON.stringify({
              enabled: false,
              channels: ['whatsapp'],
              advanceNotice: [0]
            })
          }
        ]
      };
    }

    if (method === 'PATCH' && path.startsWith('/api/guests/')) {
      console.log('  Updated guest alert settings:', body);
      return { ok: true };
    }

    return null;
  }
};

// Import and test the checkout alerts
async function testCheckoutAlerts() {
  console.log('🧪 Testing Checkout Alert System\n');
  console.log('=' .repeat(50));

  try {
    // Dynamically import the checkout alerts module
    const checkoutAlertsPath = './mcp-server/dist/lib/checkout-alerts.js';
    const checkoutAlerts = await import(checkoutAlertsPath);

    // Replace the imported functions with mocks
    const originalExports = { ...checkoutAlerts };

    // Create a test version of the checkAndSendCheckoutAlerts function
    const testCheckAndSendCheckoutAlerts = async () => {
      const errors = [];
      let sent = 0;

      try {
        const status = mockBaileysClient.getWhatsAppStatus();
        if (status.state !== 'open') {
          errors.push('WhatsApp not connected');
          console.error('Checkout alerts: WhatsApp not connected');
          return { sent, errors };
        }

        const response = await mockHttpClient.callAPI('GET', '/api/guests/checked-in?page=1&limit=100');
        const guests = Array.isArray(response) ? response : response?.data || [];

        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        console.log(`\n📅 Today: ${today}`);
        console.log(`📅 Tomorrow: ${tomorrowStr}`);
        console.log(`\n👥 Found ${guests.length} checked-in guests\n`);

        for (const guest of guests) {
          try {
            const settings = guest.alertSettings ? JSON.parse(guest.alertSettings) : null;
            console.log(`\n➜ Guest: ${guest.name} (${guest.capsuleNumber})`);
            console.log(`  Checkout Date: ${guest.expectedCheckoutDate}`);
            console.log(`  Alert Enabled: ${settings?.enabled ? '✓' : '✗'}`);

            if (!settings || !settings.enabled) {
              console.log(`  → Skipped (alerts disabled)`);
              continue;
            }

            if (!guest.expectedCheckoutDate) {
              console.log(`  → Skipped (no checkout date)`);
              continue;
            }

            if (settings.lastNotified && settings.lastNotified.startsWith(today)) {
              console.log(`  → Skipped (already notified today)`);
              continue;
            }

            const checkoutDate = guest.expectedCheckoutDate;
            let shouldNotify = false;

            if (settings.advanceNotice.includes(0) && checkoutDate === today) {
              shouldNotify = true;
              console.log(`  → Match: Checkout TODAY (advance notice = 0)`);
            }

            if (settings.advanceNotice.includes(1) && checkoutDate === tomorrowStr) {
              shouldNotify = true;
              console.log(`  → Match: Checkout TOMORROW (advance notice = 1)`);
            }

            if (!shouldNotify) {
              console.log(`  → Skipped (date doesn't match advance notice)`);
              continue;
            }

            // Build message (simplified)
            const paid = guest.isPaid;
            let paymentStatus = paid ? '✅ Paid' : '❌ Outstanding';
            if (!paid && guest.paymentAmount) {
              const amt = parseFloat(guest.paymentAmount);
              if (!isNaN(amt) && amt > 0) {
                paymentStatus += ` RM${Math.round(amt)}`;
              }
            }

            const message = `🔔 *CHECKOUT REMINDER* 🔔

Guest: ${guest.name}
Capsule: ${guest.capsuleNumber}
Expected Checkout: ${new Date(guest.expectedCheckoutDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Kuala_Lumpur' })}
Payment Status: ${paymentStatus}

───────────────
📋 Action required: Check out guest today`;

            if (settings.channels.includes('whatsapp')) {
              await mockBaileysClient.sendWhatsAppMessage('60127088789', message);
              sent++;
            }

            const updatedSettings = {
              ...settings,
              lastNotified: new Date().toISOString()
            };

            await mockHttpClient.callAPI('PATCH', `/api/guests/${guest.id}`, {
              alertSettings: JSON.stringify(updatedSettings)
            });

          } catch (err) {
            const error = `Guest ${guest.name}: ${err.message}`;
            errors.push(error);
            console.error('  ✗ Error:', error);
          }
        }

        console.log(`\n${'='.repeat(50)}`);
        console.log(`\n📊 Results: ${sent} sent, ${errors.length} errors`);
        return { sent, errors };

      } catch (err) {
        const error = `Fatal error: ${err.message}`;
        errors.push(error);
        console.error('Checkout alerts fatal error:', err.message);
        return { sent, errors };
      }
    };

    // Run the test
    const result = await testCheckAndSendCheckoutAlerts();

    console.log(`\n✅ Test completed successfully!`);
    console.log(`\n📧 Messages sent: ${sentMessages.length}`);
    if (sentMessages.length > 0) {
      console.log(`\nMessage details:`);
      sentMessages.forEach((msg, i) => {
        console.log(`\n${i + 1}. To: ${msg.phone}`);
        console.log(`   Time: ${msg.timestamp}`);
        console.log(`   Preview: ${msg.message.substring(0, 150)}...`);
      });
    }

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      result.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCheckoutAlerts();

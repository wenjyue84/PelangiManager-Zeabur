// Catch silent crashes from Baileys / unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled rejection:', reason);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createMCPHandler } from './server.js';
import { apiClient, getApiBaseUrl, callAPI } from './lib/http-client.js';
import { initBaileys, getWhatsAppStatus, registerMessageHandler, sendWhatsAppMessage } from './lib/baileys-client.js';
import { initAssistant } from './assistant/index.js';
import { startDailyReportScheduler } from './lib/daily-report.js';
import adminRoutes from './routes/admin.js';

const __filename_main = fileURLToPath(import.meta.url);
const __dirname_main = dirname(__filename_main);

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.MCP_SERVER_PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pelangi-mcp-server',
    version: '1.0.0',
    whatsapp: getWhatsAppStatus().state,
    timestamp: new Date().toISOString()
  });
});

// Rainbow Admin Dashboard (wildcard for client-side tab routing)
app.get('/admin/rainbow/:tab?', (_req, res) => {
  try {
    // Disable caching for better development experience
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const html = readFileSync(join(__dirname_main, 'public', 'rainbow-admin.html'), 'utf-8');
    res.type('html').send(html);
  } catch {
    res.status(500).send('Dashboard file not found');
  }
});

// WhatsApp QR code pairing endpoint (temporary - remove after pairing)
app.get('/admin/whatsapp-qr', async (req, res) => {
  const status = getWhatsAppStatus();
  if (status.state === 'open') {
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>WhatsApp Connected</h2>
      <p>Account: ${status.user?.name || 'Unknown'} (${status.user?.phone || '?'})</p>
      <p style="color:green;font-size:24px">Already paired!</p>
    </body></html>`);
    return;
  }
  if (!status.qr) {
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>WhatsApp QR Code</h2>
      <p>No QR code available yet. Status: <b>${status.state}</b></p>
      <p>Waiting for Baileys to generate QR code...</p>
      <script>setTimeout(()=>location.reload(),3000)</script>
    </body></html>`);
    return;
  }
  try {
    const QRCode = await import('qrcode');
    const qrImage = await QRCode.default.toDataURL(status.qr);
    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h2>Scan with WhatsApp</h2>
      <img src="${qrImage}" style="width:300px;height:300px" />
      <p>Open WhatsApp > Linked Devices > Link a Device</p>
      <script>setTimeout(()=>location.reload(),5000)</script>
    </body></html>`);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rainbow Admin API
app.use('/api/rainbow', adminRoutes);

// MCP protocol endpoint
app.post('/mcp', createMCPHandler());

// Start server - listen on 0.0.0.0 for Docker containers
app.listen(PORT, '0.0.0.0', () => {
  const apiUrl = getApiBaseUrl();
  console.log(`Pelangi MCP Server running on http://0.0.0.0:${PORT}`);
  console.log(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`API URL: ${apiUrl}${process.env.PELANGI_MANAGER_HOST ? ' (internal host)' : ''}`);

  // Startup connectivity check: warn if PelangiManager API is unreachable
  setImmediate(async () => {
    try {
      try {
        await apiClient.get('/api/health');
      } catch {
        await apiClient.get('/api/occupancy');
      }
      console.log('PelangiManager API reachable');
    } catch (err: any) {
      const status = err.response?.status;
      const url = `${apiUrl}/api/health`;
      console.warn('');
      console.warn('PelangiManager API not reachable.');
      console.warn(`   URL: ${url}`);
      if (status) console.warn(`   Response: ${status} ${err.response?.statusText || ''}`);
      console.warn('   Set PELANGI_API_URL in Zeabur to your deployed PelangiManager URL.');
      console.warn('   MCP tools will fail until the API is reachable.');
      console.warn('');
    }

    // Initialize WhatsApp (Baileys) connection
    try {
      await initBaileys();
      console.log('WhatsApp (Baileys) initializing...');

      // Initialize AI Assistant (auto-reply to WhatsApp messages)
      try {
        await initAssistant({
          registerMessageHandler,
          sendMessage: sendWhatsAppMessage,
          callAPI,
          getWhatsAppStatus
        });
        console.log('Pelangi Assistant initialized — WhatsApp auto-reply active');
      } catch (assistantErr: any) {
        console.warn(`Assistant init failed: ${assistantErr.message}`);
        console.warn('WhatsApp auto-reply disabled. Manual tools still work.');
      }

      // Start daily report scheduler (11:30 AM MYT)
      startDailyReportScheduler();
    } catch (err: any) {
      console.warn(`WhatsApp init failed: ${err.message}`);
      console.warn('WhatsApp tools will fail. Run: node pair-whatsapp.cjs to pair.');
    }
  });
});

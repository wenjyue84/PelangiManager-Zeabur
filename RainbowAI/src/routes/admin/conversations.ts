import { Router } from 'express';
import type { Request, Response } from 'express';
import { listConversations, getConversation, deleteConversation } from '../../assistant/conversation-logger.js';
import { whatsappManager } from '../../lib/baileys-client.js';
import { translateText } from '../../assistant/ai-client.js';

const router = Router();

// ─── Conversation History (Real Chat) ─────────────────────────────────

router.get('/conversations', async (_req: Request, res: Response) => {
  try {
    const conversations = await listConversations();
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversations/:phone', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const log = await getConversation(phone);
    if (!log) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/conversations/:phone', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const deleted = await deleteConversation(phone);
    res.json({ ok: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send manual message to guest
router.post('/conversations/:phone/send', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { message, instanceId } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message (string) required' });
      return;
    }

    const log = await getConversation(phone);
    const pushName = log?.pushName || 'Guest';

    let targetInstanceId = instanceId;
    if (instanceId) {
      const status = whatsappManager.getInstanceStatus(instanceId);
      if (!status || status.state !== 'open') {
        console.warn(`[Admin] Instance "${instanceId}" not connected, finding fallback...`);
        const instances = whatsappManager.getAllStatuses();
        const connectedInstance = instances.find(i => i.state === 'open');
        if (connectedInstance) {
          targetInstanceId = connectedInstance.id;
          console.log(`[Admin] Using fallback instance: ${targetInstanceId}`);
        } else {
          res.status(503).json({ error: 'No WhatsApp instances connected. Please check WhatsApp connection.' });
          return;
        }
      }
    }

    const { sendWhatsAppMessage } = await import('../../lib/baileys-client.js');
    await sendWhatsAppMessage(phone, message, targetInstanceId);

    const { logMessage } = await import('../../assistant/conversation-logger.js');
    await logMessage(phone, pushName, 'assistant', message, { manual: true, instanceId: targetInstanceId });

    console.log(`[Admin] Manual message sent to ${phone} via ${targetInstanceId || 'default'}: ${message.substring(0, 50)}...`);
    res.json({ ok: true, message: 'Message sent successfully', usedInstance: targetInstanceId });
  } catch (err: any) {
    console.error('[Admin] Failed to send manual message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Translate text to target language
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLang } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text (string) required' });
      return;
    }

    if (!targetLang || typeof targetLang !== 'string') {
      res.status(400).json({ error: 'targetLang (string) required' });
      return;
    }

    const langMap: Record<string, string> = {
      'en': 'English',
      'ms': 'Malay',
      'zh': 'Chinese',
      'id': 'Indonesian',
      'th': 'Thai',
      'vi': 'Vietnamese'
    };

    const sourceLang = 'auto';
    const targetLangName = langMap[targetLang] || targetLang;

    const translated = await translateText(text, sourceLang, targetLangName);

    if (!translated) {
      res.status(500).json({ error: 'Translation failed' });
      return;
    }

    console.log(`[Admin] Translated text to ${targetLangName}: ${text.substring(0, 50)}... -> ${translated.substring(0, 50)}...`);
    res.json({ translated, targetLang });
  } catch (err: any) {
    console.error('[Admin] Translation error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

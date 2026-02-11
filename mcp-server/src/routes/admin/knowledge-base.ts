import { Router } from 'express';
import type { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { configStore } from '../../assistant/config-store.js';
import { getKnowledgeMarkdown, setKnowledgeMarkdown, buildSystemPrompt, guessTopicFiles } from '../../assistant/knowledge-base.js';
import { isAIAvailable, classifyAndRespond, chat } from '../../assistant/ai-client.js';
import { KB_FILES_DIR } from './utils.js';

const router = Router();

// ─── Markdown Knowledge Base (LLM-first) ───────────────────────────

router.get('/knowledge-base', (_req: Request, res: Response) => {
  res.json({ content: getKnowledgeMarkdown() });
});

router.put('/knowledge-base', (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content (string) required' });
    return;
  }
  setKnowledgeMarkdown(content);
  res.json({ ok: true, length: content.length });
});

// ─── KB Files (Progressive Disclosure Multi-File System) ─────────

router.get('/kb-files', async (_req: Request, res: Response) => {
  try {
    const files = await fsPromises.readdir(KB_FILES_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
    const fileList = await Promise.all(
      mdFiles.map(async (filename) => {
        const stats = await fsPromises.stat(path.join(KB_FILES_DIR, filename));
        return { filename, size: stats.size, modified: stats.mtime };
      })
    );
    res.json({ files: fileList });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/kb-files/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }
  try {
    const content = await fsPromises.readFile(path.join(KB_FILES_DIR, filename), 'utf-8');
    res.json({ filename, content });
  } catch (e: any) {
    if (e.code === 'ENOENT') res.status(404).json({ error: 'File not found' });
    else res.status(500).json({ error: e.message });
  }
});

router.put('/kb-files/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const { content } = req.body;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }
  if (content === undefined) {
    res.status(400).json({ error: 'content required' });
    return;
  }
  try {
    const filePath = path.join(KB_FILES_DIR, filename);
    await fsPromises.access(filePath);
    const original = await fsPromises.readFile(filePath, 'utf-8');
    await fsPromises.writeFile(path.join(KB_FILES_DIR, `.${filename}.backup`), original, 'utf-8');
    await fsPromises.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, filename, backup: `.${filename}.backup` });
  } catch (e: any) {
    if (e.code === 'ENOENT') res.status(404).json({ error: 'File not found' });
    else res.status(500).json({ error: e.message });
  }
});

// ─── Knowledge Base (Legacy FAQ) ────────────────────────────────────

router.get('/knowledge', (_req: Request, res: Response) => {
  res.json(configStore.getKnowledge());
});

router.post('/knowledge', (req: Request, res: Response) => {
  const { intent, response, dynamic } = req.body;
  const data = configStore.getKnowledge();

  if (dynamic) {
    if (!intent || typeof intent !== 'string') {
      res.status(400).json({ error: 'intent (string) required' });
      return;
    }
    data.dynamic[intent.toLowerCase()] = typeof response === 'string' ? response : JSON.stringify(response);
    configStore.setKnowledge(data);
    res.json({ ok: true, type: 'dynamic', intent });
    return;
  }

  if (!intent || !response?.en) {
    res.status(400).json({ error: 'intent and response.en required' });
    return;
  }
  const exists = data.static.find(e => e.intent === intent);
  if (exists) {
    res.status(409).json({ error: `Intent "${intent}" already exists. Use PUT to update.` });
    return;
  }
  data.static.push({ intent, response: { en: response.en, ms: response.ms || '', zh: response.zh || '' } });
  configStore.setKnowledge(data);
  res.json({ ok: true, type: 'static', intent });
});

router.put('/knowledge/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const { response } = req.body;
  const data = configStore.getKnowledge();

  if (req.query.dynamic === 'true') {
    if (!response) {
      res.status(400).json({ error: 'response required' });
      return;
    }
    data.dynamic[intent.toLowerCase()] = typeof response === 'string' ? response : JSON.stringify(response);
    configStore.setKnowledge(data);
    res.json({ ok: true, type: 'dynamic', intent });
    return;
  }

  const entry = data.static.find(e => e.intent === intent);
  if (!entry) {
    res.status(404).json({ error: `Intent "${intent}" not found` });
    return;
  }
  if (response?.en !== undefined) entry.response.en = response.en;
  if (response?.ms !== undefined) entry.response.ms = response.ms;
  if (response?.zh !== undefined) entry.response.zh = response.zh;
  configStore.setKnowledge(data);
  res.json({ ok: true, type: 'static', intent, entry });
});

router.delete('/knowledge/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const data = configStore.getKnowledge();

  if (req.query.dynamic === 'true') {
    const key = intent.toLowerCase();
    if (!(key in data.dynamic)) {
      res.status(404).json({ error: `Dynamic intent "${intent}" not found` });
      return;
    }
    delete data.dynamic[key];
    configStore.setKnowledge(data);
    res.json({ ok: true, type: 'dynamic', deleted: intent });
    return;
  }

  const idx = data.static.findIndex(e => e.intent === intent);
  if (idx === -1) {
    res.status(404).json({ error: `Static intent "${intent}" not found` });
    return;
  }
  data.static.splice(idx, 1);
  configStore.setKnowledge(data);
  res.json({ ok: true, type: 'static', deleted: intent });
});

// ─── Generate Static Reply via AI ────────────────────────────────────

router.post('/knowledge/generate', async (req: Request, res: Response) => {
  const { intent } = req.body;
  if (!intent || typeof intent !== 'string') {
    res.status(400).json({ error: 'intent (string) required' });
    return;
  }
  if (!isAIAvailable()) {
    res.status(503).json({ error: 'AI not available — configure NVIDIA or Groq API key' });
    return;
  }

  const kb = getKnowledgeMarkdown();
  const prompt = `You are a helpful assistant for Pelangi Capsule Hostel. Generate a short, friendly static reply for the WhatsApp bot intent "${intent}".

Use ONLY information from the knowledge base below. If the knowledge base doesn't have specific info for this intent, write a generic but helpful hostel response.

Rules:
- Keep each response under 300 characters
- Be warm, concise, and professional
- Do NOT sign off as Rainbow or use emojis excessively
- The reply should feel natural for a WhatsApp message

<knowledge_base>
${kb}
</knowledge_base>

Return ONLY valid JSON (no markdown fences):
{"en": "English reply", "ms": "Malay reply", "zh": "Chinese reply"}`;

  try {
    const raw = await chat(prompt, [], `Generate static reply for intent: ${intent}`);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const response = {
      en: typeof parsed.en === 'string' ? parsed.en : '',
      ms: typeof parsed.ms === 'string' ? parsed.ms : '',
      zh: typeof parsed.zh === 'string' ? parsed.zh : '',
    };
    res.json({ ok: true, intent, response });
  } catch (err: any) {
    res.status(500).json({ error: `AI generation failed: ${err.message}` });
  }
});

export default router;

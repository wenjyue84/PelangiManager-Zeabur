import { Router } from 'express';
import type { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { getTodayDate, getMYTTimestamp, listMemoryDays, getDurableMemory, getMemoryDir } from '../../assistant/knowledge-base.js';
import { resolveKBDir } from './utils.js';

const router = Router();

// ─── Memory System (Daily Logs + Durable Memory) ────────────────────

// GET /memory/durable — Read durable memory (memory.md)
router.get('/memory/durable', async (_req: Request, res: Response) => {
  try {
    const content = getDurableMemory();
    const kbDir = resolveKBDir();
    const filePath = path.join(kbDir, 'memory.md');
    let size = 0;
    try {
      const stats = await fsPromises.stat(filePath);
      size = stats.size;
    } catch {}
    res.json({ content, size });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /memory/durable — Update durable memory
router.put('/memory/durable', async (req: Request, res: Response) => {
  const { content } = req.body;
  if (content === undefined) {
    res.status(400).json({ error: 'content required' });
    return;
  }
  try {
    const kbDir = resolveKBDir();
    const filePath = path.join(kbDir, 'memory.md');
    try {
      const original = await fsPromises.readFile(filePath, 'utf-8');
      await fsPromises.writeFile(path.join(kbDir, '.memory.md.backup'), original, 'utf-8');
    } catch {}
    await fsPromises.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, size: content.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /memory/flush — Manual memory flush (placeholder for AI Notes)
router.post('/memory/flush', async (_req: Request, res: Response) => {
  const today = getTodayDate();
  const timestamp = getMYTTimestamp();
  res.json({ ok: true, message: `Flush triggered at ${timestamp} on ${today}` });
});

// GET /memory — List all daily log files + stats
router.get('/memory', async (_req: Request, res: Response) => {
  try {
    const days = listMemoryDays();
    const memDir = getMemoryDir();
    const today = getTodayDate();

    let todayEntries = 0;
    try {
      const todayFile = path.join(memDir, `${today}.md`);
      const content = await fsPromises.readFile(todayFile, 'utf-8');
      todayEntries = (content.match(/^- \d{2}:\d{2}/gm) || []).length;
    } catch {}

    const durableContent = getDurableMemory();

    res.json({
      days,
      totalDays: days.length,
      today,
      todayEntries,
      durableMemorySize: durableContent.length
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /memory/:date — Read specific day's log
router.get('/memory/:date', async (req: Request, res: Response) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    return;
  }
  try {
    const memDir = getMemoryDir();
    const filePath = path.join(memDir, `${date}.md`);
    const content = await fsPromises.readFile(filePath, 'utf-8');
    const stats = await fsPromises.stat(filePath);
    res.json({ date, content, size: stats.size, modified: stats.mtime });
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      res.status(404).json({ error: `No log for ${date}` });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

// PUT /memory/:date — Update (overwrite) day's log with backup
router.put('/memory/:date', async (req: Request, res: Response) => {
  const { date } = req.params;
  const { content } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    return;
  }
  if (content === undefined) {
    res.status(400).json({ error: 'content required' });
    return;
  }
  try {
    const memDir = getMemoryDir();
    await fsPromises.mkdir(memDir, { recursive: true });
    const filePath = path.join(memDir, `${date}.md`);
    try {
      const original = await fsPromises.readFile(filePath, 'utf-8');
      await fsPromises.writeFile(path.join(memDir, `.${date}.md.backup`), original, 'utf-8');
    } catch {}
    await fsPromises.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, date, size: content.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /memory/:date/append — Append timestamped entry to a section
router.post('/memory/:date/append', async (req: Request, res: Response) => {
  const { date } = req.params;
  const { section, entry } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    return;
  }
  if (!section || !entry) {
    res.status(400).json({ error: 'section and entry required' });
    return;
  }

  const DAILY_TEMPLATE = `# ${date} -- Daily Memory

## Staff Notes

## Issues Reported

## Operational Changes

## Patterns Observed

## AI Notes
`;

  try {
    const memDir = getMemoryDir();
    await fsPromises.mkdir(memDir, { recursive: true });
    const filePath = path.join(memDir, `${date}.md`);

    let content: string;
    try {
      content = await fsPromises.readFile(filePath, 'utf-8');
    } catch {
      content = DAILY_TEMPLATE;
    }

    const timestamp = getMYTTimestamp();
    const newLine = `- ${timestamp} -- ${entry}`;

    const sectionHeader = `## ${section}`;
    const sectionIdx = content.indexOf(sectionHeader);
    if (sectionIdx === -1) {
      content = content.trimEnd() + `\n\n${sectionHeader}\n${newLine}\n`;
    } else {
      const headerEnd = content.indexOf('\n', sectionIdx);
      if (headerEnd === -1) {
        content += `\n${newLine}`;
      } else {
        const afterHeader = headerEnd + 1;
        content = content.slice(0, afterHeader) + newLine + '\n' + content.slice(afterHeader);
      }
    }

    await fsPromises.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, date, section, timestamp, entry });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

import { readFileSync, readdirSync, existsSync, watch } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { configStore } from './config-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .rainbow-kb/ lives at project root (3 levels up from src/assistant/)
const RAINBOW_KB_DIR = resolve(__dirname, '..', '..', '..', '.rainbow-kb');

// In-memory cache of all KB files
let kbCache: Map<string, string> = new Map();

// Always injected into every prompt
const CORE_FILES = ['AGENTS.md', 'soul.md'];

// Keyword patterns → which topic files to load
// Patterns use regex alternation, tested case-insensitively
const TOPIC_FILE_MAP: Record<string, string[]> = {
  // Payment & pricing
  'price|cost|rate|how much|berapa|多少|rm\\d|ringgit|pay|bayar|deposit|refund|cancel':
    ['payment.md'],
  // Check-in/out
  'check.?in|check.?out|arrive|leave|late|early|door|code|key|masuk|keluar|登记':
    ['checkin.md'],
  // Facilities
  'wifi|internet|kitchen|laundry|wash|air.?con|park|facilit|dapur|cuci|网络|厨房':
    ['facilities.md'],
  // House rules
  'rule|smoke|smoking|quiet|noise|visitor|allow|prohibit|peraturan|merokok|规则|吸烟':
    ['houserules.md'],
  // Directions/location (served from faq.md)
  'where|direction|map|location|address|nearby|food|restaurant|transport|grab|alamat|dimana|地址|怎么走':
    ['faq.md'],
};

/**
 * Scan message text and return which topic files should be loaded.
 * Falls back to faq.md if no keywords match.
 */
export function guessTopicFiles(text: string): string[] {
  const files = new Set<string>();
  for (const [pattern, fileList] of Object.entries(TOPIC_FILE_MAP)) {
    if (new RegExp(pattern, 'i').test(text)) {
      fileList.forEach(f => files.add(f));
    }
  }
  // Default fallback
  if (files.size === 0) files.add('faq.md');
  return Array.from(files);
}

// ─── Loading & Caching ──────────────────────────────────────────────

export function reloadKBFile(filename: string): void {
  const filePath = join(RAINBOW_KB_DIR, filename);
  if (existsSync(filePath)) {
    kbCache.set(filename, readFileSync(filePath, 'utf-8'));
    console.log(`[KnowledgeBase] Reloaded ${filename}`);
  }
}

export function reloadAllKB(): void {
  if (!existsSync(RAINBOW_KB_DIR)) {
    console.warn(`[KnowledgeBase] .rainbow-kb/ not found at ${RAINBOW_KB_DIR}`);
    return;
  }
  const files = readdirSync(RAINBOW_KB_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    kbCache.set(file, readFileSync(join(RAINBOW_KB_DIR, file), 'utf-8'));
  }
  console.log(`[KnowledgeBase] Loaded ${kbCache.size} KB files from .rainbow-kb/`);
}

function watchKBDirectory(): void {
  if (!existsSync(RAINBOW_KB_DIR)) return;
  try {
    watch(RAINBOW_KB_DIR, (eventType, filename) => {
      if (filename && filename.endsWith('.md')) {
        console.log(`[KnowledgeBase] File changed: ${filename}, reloading...`);
        reloadKBFile(filename);
      }
    });
    console.log(`[KnowledgeBase] Watching .rainbow-kb/ for changes`);
  } catch (err: any) {
    console.warn(`[KnowledgeBase] Could not watch .rainbow-kb/: ${err.message}`);
  }
}

// ─── Initialization ─────────────────────────────────────────────────

export function initKnowledgeBase(): void {
  reloadAllKB();
  watchKBDirectory();

  // Also reload when admin triggers a knowledgeBase reload event
  configStore.on('reload', (domain: string) => {
    if (domain === 'knowledgeBase' || domain === 'all') {
      reloadAllKB();
      console.log('[KnowledgeBase] Reloaded all KB files (config event)');
    }
  });
}

// ─── Legacy compat: get/set for the old monolithic KB ────────────────
// These are used by knowledge.ts / admin routes that still reference
// the old single-file KB. They now read/write from the cache.

export function getKnowledgeMarkdown(): string {
  // Return all cached KB content concatenated (for backward compat)
  return Array.from(kbCache.values()).join('\n\n---\n\n');
}

export function setKnowledgeMarkdown(content: string): void {
  // Legacy: not used in progressive mode, but keep for compat
  console.warn('[KnowledgeBase] setKnowledgeMarkdown called — this is a legacy no-op in progressive mode');
}

// ─── System Prompt Builder ──────────────────────────────────────────

export function buildSystemPrompt(basePersona: string, topicFiles: string[] = []): string {
  // Build intent list + routing rules from config
  const routing = configStore.getRouting();
  const intents = Object.keys(routing);

  const staticIntents = intents.filter(i => routing[i]?.action === 'static_reply');
  const llmIntents = intents.filter(i => routing[i]?.action === 'llm_reply');
  const specialIntents = intents.filter(i => !['static_reply', 'llm_reply'].includes(routing[i]?.action));

  const routingLines = intents.map(i => `  - "${i}" → ${routing[i].action}`).join('\n');

  // Assemble KB content: core files always, topic files per message
  const coreContent = CORE_FILES
    .map(f => kbCache.get(f) || '')
    .filter(Boolean)
    .join('\n\n---\n\n');

  const topicContent = topicFiles
    .map(f => kbCache.get(f) || '')
    .filter(Boolean)
    .join('\n\n---\n\n');

  return `${basePersona}

INTENT CLASSIFICATION:
You must classify the guest's message into exactly ONE of these intents:
${intents.map(i => `"${i}"`).join(', ')}

ROUTING RULES (admin-controlled):
${routingLines}

RESPONSE INSTRUCTIONS:
- For intents routed to "static_reply" (${staticIntents.join(', ')}): STILL generate a helpful response. The system may use it as a fallback if the pre-written reply isn't appropriate for the guest's situation (e.g., when the guest reports a problem rather than asking for info).
- For intents routed to "llm_reply" (${llmIntents.join(', ')}): Generate a helpful response using the Knowledge Base below.
- For intents routed to "start_booking", "escalate", or "forward_payment" (${specialIntents.map(i => i).join(', ')}): Generate an appropriate response AND the system will trigger the corresponding workflow.

GENERAL RULES:
- Use ONLY information from the Knowledge Base below
- Respond in the same language the guest uses (English, Malay, Chinese, or any other language)
- Be warm, concise, and helpful (under 500 chars unless details are needed)
- Sign off as "— Rainbow 🌈" (only for llm_reply intents)
- NEVER invent prices, availability, or policies not in the Knowledge Base
- If the answer is NOT in the Knowledge Base, say: "I don't have that information. Let me connect you with our team."
- Do not provide info about other hotels or hostels

Return JSON: { "intent": "<one of the defined intents>", "action": "<routing action>", "response": "<your response or empty for static_reply>", "confidence": 0.0-1.0 }

<knowledge_base>
${coreContent}${topicContent ? `\n\n---\n\n${topicContent}` : ''}
</knowledge_base>`;
}

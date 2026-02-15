/**
 * ai-utilities.ts — Translation, testing, and workflow evaluation
 * (Single Responsibility: utility AI operations that don't fit classification or response)
 */
import type { ChatMessage } from './types.js';
import { getContextWindows } from './context-windows.js';
import { getAISettings, providerChat, chatWithFallback } from './ai-provider-manager.js';

// ─── Translation ────────────────────────────────────────────────────

export async function translateText(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string | null> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a translator. Translate the following text from ${fromLang} to ${toLang}. Return ONLY the translated text, no explanations.`
    },
    { role: 'user' as const, content: text }
  ];

  const transCfg = getAISettings();
  const { content } = await chatWithFallback(messages, transCfg.max_chat_tokens, 0.3);
  return content;
}

// ─── Provider Testing ───────────────────────────────────────────────

export async function testProvider(providerId: string): Promise<{
  ok: boolean;
  model?: string;
  reply?: string;
  responseTime?: number;
  error?: string;
}> {
  const ai = getAISettings();
  const provider = (ai.providers || []).find(p => p.id === providerId);
  if (!provider) return { ok: false, error: `Provider "${providerId}" not found` };

  const startTime = Date.now();
  try {
    const messages = [{ role: 'user', content: 'Say OK' }];
    const result = await providerChat(provider, messages, 100, 1.0);
    const elapsed = Date.now() - startTime;
    return { ok: true, model: provider.model, reply: result?.content || '', responseTime: elapsed };
  } catch (e: any) {
    const elapsed = Date.now() - startTime;
    return { ok: false, error: e.message, responseTime: elapsed };
  }
}

// ─── Workflow Step Evaluation ────────────────────────────────────────

/**
 * Evaluate a workflow step condition using AI.
 * Used for smart skipping/branching in workflows.
 */
export async function evaluateWorkflowStep(
  prompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const systemPrompt = `You are a workflow logic engine.
ANALYZE the conversation history and the latest user message.
ANSWER the following question with ONLY a single key from the allowed options.

QUESTION: ${prompt}

RULES:
- Respond with ONLY the answer key (e.g. "YES", "NO")
- Do NOT include markdown or explanations.
- Be conservative: if unsure, choose the negative/default option.`;

  const cw = getContextWindows();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = history.slice(-cw.classify);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const { content } = await chatWithFallback(messages, 50, 0.1);
  return content ? content.trim().toUpperCase() : 'NO';
}

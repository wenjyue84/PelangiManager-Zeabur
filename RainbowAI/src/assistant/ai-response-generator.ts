/**
 * ai-response-generator.ts — Response generation + parsing
 * (Single Responsibility: generate AI responses for classified intents)
 */
import axios from 'axios';
import type { ChatMessage } from './types.js';
import { configStore } from './config-store.js';
import { getContextWindows } from './context-windows.js';
import {
  isAIAvailable, getAISettings, getProviders, resolveApiKey,
  getGroqInstance, providerChat, chatWithFallback
} from './ai-provider-manager.js';

// ─── Types ──────────────────────────────────────────────────────────

export type AIAction = 'reply' | 'static_reply' | 'start_booking' | 'escalate' | 'forward_payment' | 'llm_reply';

export interface AIResponse {
  intent: string;
  action: AIAction;
  response: string;
  confidence: number;
  model?: string;
  responseTime?: number;
}

const VALID_ACTIONS: AIAction[] = ['reply', 'static_reply', 'llm_reply', 'start_booking', 'escalate', 'forward_payment'];

// ─── Chat (simple prompt → response) ────────────────────────────────

export async function chat(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  if (!isAIAvailable()) {
    throw new Error('AI not available');
  }

  const cw = getContextWindows();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = history.slice(-cw.combined);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const chatCfg = getAISettings();
  const { content } = await chatWithFallback(messages, chatCfg.max_chat_tokens, chatCfg.chat_temperature);

  if (content) return content;
  throw new Error('AI temporarily unavailable');
}

// ─── Classify + Respond (unified LLM call) ──────────────────────────

export async function classifyAndRespond(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<AIResponse> {
  try {
    if (!isAIAvailable()) {
      return { intent: 'unknown', action: 'reply', response: '', confidence: 0, model: 'none' };
    }

    const cw = getContextWindows();
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    const recentHistory = history.slice(-cw.combined);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: userMessage });

    const aiCfg = getAISettings();
    const startTime = Date.now();
    const { content, provider } = await chatWithFallback(messages, aiCfg.max_chat_tokens, aiCfg.chat_temperature, true);
    const responseTime = Date.now() - startTime;

    if (content) {
      const result = parseAIResponse(content);
      result.model = provider?.name || provider?.model || 'unknown';
      result.responseTime = responseTime;
      return result;
    }

    return { intent: 'unknown', action: 'reply', response: '', confidence: 0, model: 'failed', responseTime };
  } catch (err: any) {
    console.error('[AI] classifyAndRespond error:', err);
    return {
      intent: 'unknown',
      action: 'reply',
      response: 'I apologize, but I encountered an error processing your message. Please try again or contact staff.',
      confidence: 0,
      model: 'error',
      responseTime: 0
    };
  }
}

// ─── Smart Fallback (Layer 2) ───────────────────────────────────────

/**
 * Fallback handler for low-confidence responses (Layer 2).
 * Uses smartest available models + increased context for full re-classification.
 */
export async function classifyAndRespondWithSmartFallback(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<AIResponse> {
  const startTime = Date.now();

  const allProviders = getProviders();
  const smartProviders = allProviders.filter(p =>
    p.id === 'deepseek-r1-distill-70b' ||
    p.id === 'kimi-k2.5' ||
    p.id === 'gpt-oss-120b' ||
    p.priority <= 1
  );

  if (smartProviders.length === 0) {
    console.warn('[AI] No smart providers available for fallback, using all enabled');
    return classifyAndRespond(systemPrompt, history, userMessage);
  }

  const cw = getContextWindows();
  const expandedHistory = history.slice(-cw.combined);

  console.log(
    `[AI] Smart fallback: ${smartProviders.length} providers, ` +
    `${expandedHistory.length} context messages`
  );

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...expandedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage }
  ];

  const ai = getAISettings();
  let lastError: Error | null = null;

  for (const provider of smartProviders) {
    try {
      const apiKey = resolveApiKey(provider);
      if (!apiKey && provider.type !== 'ollama') continue;

      let content: string | null = null;

      if (provider.type === 'groq') {
        const groq = getGroqInstance(provider.id);
        if (!groq) continue;

        const completion = await groq.chat.completions.create({
          model: provider.model,
          messages,
          max_tokens: Math.floor(ai.max_chat_tokens * 1.5),
          temperature: ai.chat_temperature,
          response_format: { type: 'json_object' }
        });

        content = completion.choices[0]?.message?.content?.trim() || null;
      } else {
        const body: any = {
          model: provider.model,
          messages,
          max_tokens: Math.floor(ai.max_chat_tokens * 1.5),
          temperature: ai.chat_temperature,
          response_format: { type: 'json_object' }
        };

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey && provider.type !== 'ollama') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const res = await axios.post(`${provider.base_url}/chat/completions`, body, {
          headers,
          timeout: 90000,
          validateStatus: () => true
        });

        if (res.status === 200) {
          content = res.data.choices?.[0]?.message?.content?.trim() || null;
        } else {
          throw new Error(`${provider.name} ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
        }
      }

      if (!content) continue;

      const parsed = JSON.parse(content);
      const responseTime = Date.now() - startTime;

      console.log(
        `[AI] Smart fallback success: ${provider.name} (${responseTime}ms) ` +
        `confidence: ${parsed.confidence}`
      );

      return {
        intent: parsed.intent || 'unknown',
        action: VALID_ACTIONS.includes(parsed.action) ? parsed.action : 'reply',
        response: parsed.response || '',
        confidence: parseFloat(parsed.confidence || 0),
        model: provider.name,
        responseTime
      };
    } catch (error: any) {
      lastError = error;
      console.warn(`[AI] Smart provider ${provider.name} failed: ${error.message}`);
      continue;
    }
  }

  console.error('[AI] Smart fallback exhausted all providers');
  return {
    intent: 'unknown',
    action: 'reply',
    response: '',
    confidence: 0,
    responseTime: Date.now() - startTime
  };
}

// ─── Generate Reply Only (skip classification) ──────────────────────

/**
 * Generate a reply for a known intent without re-classifying.
 * Used by T4 Smart-Fast and T5 Tiered-Hybrid when classification is already done.
 */
export async function generateReplyOnly(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  intent: string
): Promise<{ response: string; confidence?: number; model?: string; responseTime?: number }> {
  if (!isAIAvailable()) {
    return { response: '', confidence: 0, model: 'none' };
  }

  const replyPrompt = systemPrompt + `\n\nThe user's intent has been classified as "${intent}". Generate a helpful response. Reply in the same language as the user.

IMPORTANT: Include a confidence score for your response:
- Set confidence < 0.5 if: answer is partial, information is incomplete, or you're not sure
- Set confidence < 0.7 if: answer requires interpretation or combines multiple KB sections
- Set confidence >= 0.7 if: answer is directly stated in KB and complete
- Set confidence >= 0.9 if: answer is exact quote from KB with no ambiguity

Respond with ONLY valid JSON: {"response":"<your reply>", "confidence": 0.0-1.0}`;

  const cw = getContextWindows();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: replyPrompt }
  ];

  const recentHistory = history.slice(-cw.reply);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const aiCfg = getAISettings();
  const startTime = Date.now();
  const { content, provider } = await chatWithFallback(messages, aiCfg.max_chat_tokens, aiCfg.chat_temperature, true);
  const responseTime = Date.now() - startTime;

  if (content) {
    try {
      const parsed = JSON.parse(content);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.7;

      const responseText = typeof parsed.response === 'string' ? parsed.response.trim() : '';
      return {
        response: responseText,
        confidence,
        model: provider?.name || provider?.model || 'unknown',
        responseTime
      };
    } catch {
      if (looksLikeJson(content)) {
        console.warn('[AI] generateReplyOnly: LLM returned JSON-like content, using empty response');
        return { response: '', confidence: 0.5, model: provider?.name || 'unknown', responseTime };
      }
      return {
        response: content,
        confidence: 0.5,
        model: provider?.name || 'unknown',
        responseTime
      };
    }
  }

  return { response: '', confidence: 0, model: 'failed', responseTime };
}

// ─── Response Parsing ───────────────────────────────────────────────

export function parseAIResponse(raw: string): AIResponse {
  try {
    const parsed = JSON.parse(raw);

    const routing = configStore.getRouting();
    const definedIntents = Object.keys(routing);
    const intent = typeof parsed.intent === 'string' && definedIntents.includes(parsed.intent)
      ? parsed.intent
      : 'general';

    return {
      intent,
      action: VALID_ACTIONS.includes(parsed.action) ? parsed.action : 'reply',
      response: (typeof parsed.response === 'string' && !looksLikeJson(parsed.response)) ? parsed.response : '',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5
    };
  } catch {
    const lastBrace = raw.lastIndexOf('}');
    if (lastBrace >= 0) {
      for (let start = raw.lastIndexOf('{'); start >= 0; start = raw.lastIndexOf('{', start - 1)) {
        if (start > lastBrace) continue;
        try {
          const candidate = raw.slice(start, lastBrace + 1);
          const parsed = JSON.parse(candidate);
          if (
            typeof parsed.intent === 'string' &&
            typeof parsed.response === 'string' &&
            typeof parsed.confidence === 'number'
          ) {
            const routing = configStore.getRouting();
            const definedIntents = Object.keys(routing);
            const intent = definedIntents.includes(parsed.intent) ? parsed.intent : 'general';
            const responseText = parsed.response.trim();
            if (responseText) {
              return {
                intent,
                action: VALID_ACTIONS.includes(parsed.action) ? parsed.action : 'reply',
                response: responseText,
                confidence: Math.min(1, Math.max(0, parsed.confidence))
              };
            }
          }
        } catch {
          continue;
        }
        break;
      }
      const jsonStart = raw.lastIndexOf('\n\n{');
      if (jsonStart > 0) {
        const stripped = raw.slice(0, jsonStart).trim();
        if (stripped && !looksLikeJson(stripped)) return { intent: 'general', action: 'reply', response: stripped, confidence: 0.5 };
      }
    }
    console.warn('[AI] parseAIResponse: could not extract plain-text response, using empty');
    return { intent: 'general', action: 'reply', response: '', confidence: 0.5 };
  }
}

/** True if the string looks like raw JSON to avoid leaking to guests. */
export function looksLikeJson(s: string): boolean {
  const t = s.trim();
  return (t.startsWith('{') && t.includes('"')) || (t.startsWith('[{') && t.includes('"'));
}

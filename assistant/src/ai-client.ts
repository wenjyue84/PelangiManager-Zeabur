import Groq from 'groq-sdk';
import type { AIClassifyResult, IntentCategory, ChatMessage } from './types.js';

const MODEL = 'llama-3.3-70b-versatile';
const MAX_CLASSIFY_TOKENS = 200;
const MAX_CHAT_TOKENS = 500;

let groq: Groq | null = null;

export function initAIClient(): void {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('[AI] GROQ_API_KEY not set — LLM features disabled');
    return;
  }
  groq = new Groq({ apiKey });
  console.log('[AI] Groq client initialized');
}

export function isAIAvailable(): boolean {
  return groq !== null;
}

const VALID_CATEGORIES: IntentCategory[] = [
  'greeting', 'thanks', 'wifi', 'directions', 'checkin_info', 'checkout_info',
  'pricing', 'availability', 'booking', 'complaint', 'contact_staff',
  'facilities', 'rules', 'general', 'unknown'
];

const CLASSIFY_SYSTEM_PROMPT = `You are an intent classifier for a capsule hostel WhatsApp bot.
Given the user message, classify it into exactly ONE category and extract entities.

Categories: greeting, thanks, wifi, directions, checkin_info, checkout_info, pricing, availability, booking, complaint, contact_staff, facilities, rules, general, unknown

Extract entities when present: dates (check_in, check_out), guest_count, language.

Respond with ONLY valid JSON (no markdown):
{"category":"<category>","confidence":<0-1>,"entities":{}}`;

export async function classifyIntent(
  text: string,
  history: ChatMessage[] = []
): Promise<AIClassifyResult> {
  if (!groq) {
    return { category: 'unknown', confidence: 0, entities: {} };
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: CLASSIFY_SYSTEM_PROMPT }
  ];

  // Include last 3 messages for context
  const recentHistory = history.slice(-3);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: text });

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: MAX_CLASSIFY_TOKENS,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return { category: 'unknown', confidence: 0, entities: {} };

    const parsed = JSON.parse(content);
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'unknown';
    const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5;
    const entities = typeof parsed.entities === 'object' && parsed.entities !== null ? parsed.entities : {};

    return { category, confidence, entities };
  } catch (err: any) {
    console.error('[AI] Classification error:', err.message);
    return { category: 'unknown', confidence: 0, entities: {} };
  }
}

export async function chat(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  if (!groq) {
    throw new Error('AI not available');
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  // Include last 5 messages for context
  const recentHistory = history.slice(-5);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: MAX_CHAT_TOKENS,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.';
  } catch (err: any) {
    console.error('[AI] Chat error:', err.message);
    throw new Error('AI temporarily unavailable');
  }
}
